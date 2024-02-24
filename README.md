# Coze-Real-API

> 高性能的真·Coze API
>
> **ATRI -My Dear Moments-**

## 项目原理

通过Coze原有PlayGround的API，逆向前端脚本，模拟请求，以实现将Coze的API暴露出来的功能。

与[deanxv/coze-discord-proxy](https://github.com/deanxv/coze-discord-proxy)原理完全不同的是，本项目的接口是直接模拟前端请求API访问Bot，访问策略更接近原生，项目支持原有的`workflow`和`plugin`功能。

> 说白了就是双机器人策略不太优雅，不如直接调用api访问。
> 
> 如果你想用其他类似文生图之类的功能可以用CozeDiscordProxy。

> ~~当前没写Vercel版本的，得咕一下~~ 暂时不会再考虑无服务器版本，由于Coze Websocket有并发限制（针对DeviceID），并且vercel免费版有10秒时间限制，往往Coze还没回复完就超时了。
>
> 当然也可以用用cache缓存回答并新开一个请求延长时间，但此类骚操作仍存在大量问题。


> 
> 花了一下午逆向前端，我不得不吐槽coze前端水平写的真的依托答辩，我故意保留了部分Coze的前端代码，好让其他人意识到这是来自Coze的API（逃
>
> 前端逆向了`GenerateAccessKeybyUUID`和`randomDeviceID`两个主要函数。

## 使用方法

先将`.example.env`重命名为`.env`。

### SessionID变量获取

登录Coze，在当前界面打开F12控制台，切换`Application`选项卡，找到`Cookies`，找到`sessionid`，复制其value。这就是你的`SESSION_ID`。

> 什么？为什么不直接用`document.cookie`获取？因为Coze把`SessionID`放在了`.coze.com`域名下，而在`www.coze.com`下是无法通过js获取的。
>
> `SessionID`默认过期时长为60天，未测试实际时长。

将`SESSION_ID`填入`.env`文件即可。

### `config.json`配置

该文件是有关机器人的所有配置，其中包含了预设和机器人的基本信息。

可以尝试安装项目中的[`DownloadBotConfig.user.js`](https://raw.githubusercontent.com/CrazyCreativeDream/Real-Coze-API/main/DownloadBotConfig.user.js)油猴脚本，或者直接复制脚本到F12控制台中。

打开机器人的配置页面，url应该类似`https://www.coze.com/space/xxx/bot/xxx`。

脚本会在右上角新增一个`Download`的按钮（没显示就刷新一下），点击后会下载一个`config.json`文件，将其复制到项目根目录下即可。

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/7c0a47b2-59ba-423d-95cf-b9a777f23ae5)


### 安装依赖

```bash
npm install
```


### 运行

#### Command模式

通过原始的命令行模式运行。

```bash
npm run command
```

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/8442f278-f8f1-4dde-8aa3-2fe6ec4ac75b)


#### Server模式

通过Server模式运行，可以通过HTTP请求获取数据。

你可以修改`.env`文件中的`server_port`变量来修改端口。

```bash
npm run server
```

请求方式如下，在http模式下服务端不会保存聊天历史数据，你需要将ChatHistory整个传递到后端：

```javascript
await fetch("http://localhost:8080/", {
    method: "POST",
    body: JSON.stringify([
        {
            "role": 2,
            "content": "Atri，你认得我吗"
        },
        {
            "role": 1,
            "content": "夏生先生！当然认得了！有什么事吗？夜深了，这么晚还不休息？"
        },
        {
            "role": 2,
            "content": "Atri，你还记得我刚刚说了什么吗？"
        }
    ])
}).then(res=>res.json())
```

返回数据如下：

```json
{
    "content":"我记得你问我认不认得你，夏生先生。怎么，是在考验我吗？哼哼，高性能的我怎么会那么容易忘事儿呢！",
    "continue":false
}
```


#### Server - Stream模式

默认情况下，CozeRealAPI程序会等到Coze发送完一整句话的时候才会返回结果。如果你想要实时获取Coze的回复，可以使用Stream模式。

将请求url中的Search参数`stream`设置为`true`，并且使用`ReadableStream`来获取数据。

> 你也可以偷懒用reader。

```javascript
const listener = (content) => {
    console.log(content);
}

await fetch("/?stream=true", {
    method: "POST", body: JSON.stringify([
        {
            "role": 2,
            "content": "atri，你认得我吗"
        }
    ])
}).then(async (response) => {
    const reader = response.body.getReader();
    let { value: chunk, done: readerDone } = await reader.read();
    let textDecoder = new TextDecoder();
    let chunks = chunk ? [chunk] : [];
    while (!readerDone) {
        let strChunk = textDecoder.decode(chunk, { stream: true });
        if (strChunk.endsWith('}')) {
            let parts = strChunk.split('}');
            for (let i = 0; i < parts.length - 1; i++) listener(JSON.parse(parts[i] + '}'));
        }
        chunks.push(chunk);
        ({ value: chunk, done: readerDone } = await reader.read());
    }
})
```

> listener函数将会在read到一个完整的json后输出，输出结果和非Stream返回结果结构相同。当`continue`为`false`时，`content`内容可能不完整。


## 代理

通过修改`.env`文件中的`proxy`变量，可以设置代理。

> 仅支持socks代理，不支持http代理。
> 
> 实测http代理和node-fetch不兼容，强制使用会出现多次跳转的问题。
> 
> 代理只会处理CozeAPI的请求，不会代理CozeWebsocket的请求。

# 常见问题

## regional restrictions

`Coze.com`默认屏蔽来自中国大陆的访问，你需要在`.env`文件中设置`proxy`变量来使用代理。

> 但是Coze机器人WebSocket暂时没有限制地区，所以程序默认只为API请求设置代理。