# Coze-Real-API

> 高性能的真·Coze API
>
> **ATRI -My Dear Moments-**

## 项目原理

通过Coze原有PlayGround的API，逆向前端脚本，模拟请求，以实现取得Coze的真实数据。

> 当前没写Vercel版本的，得咕一下
> 
> 花了一下午逆向前端，我不得不吐槽coze前端水平写的真的依托答辩，我故意保留了部分Coze的前端代码，好让其他人意识到这是来自Coze的API（逃

## 使用方法

先将`.env.example`重命名为`.env`。

### 变量获取

登录Coze的机器人页面，你会发现URL中已经包含了`SPACE_ID`和`BOT_ID`。

```url
https://www.coze.com/space/{SPACE_ID}/bot/{BOT_ID}
```

在当前界面打开F12控制台，切换`Application`选项卡，找到`Cookies`，找到`sessionid`，复制其value。这就是你的`SESSION_ID`。

> 什么？为什么不直接用`document.cookie`获取？因为Coze把`SessionID`放在了`.coze.com`域名下，而在`www.coze.com`下是无法通过js获取的。

将`SPACE_ID`、`BOT_ID`和`SESSION_ID`填入`.env`文件即可。

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

请求方式如下，在http模式下服务端不会保存聊天历史数据：

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

## 代理

通过修改`.env`文件中的`proxy`变量，可以设置代理。

> 仅支持socks代理，不支持http代理。
> 
> 实测http代理和node-fetch不兼容，强制使用会出现多次跳转的问题。
> 
> 代理只会处理CozeAPI的请求，不会代理CozeWebsocket的请求。

## 预设

修改根目录下`prompt.txt`即可修改预设，默认文本来自[Abudu](https://github.com/am-abudu)的Atri - 亚托莉预设
