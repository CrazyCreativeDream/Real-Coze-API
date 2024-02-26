<div align="center">

# Real-Coze-API

高性能的真·Coze API

**ATRI -My Dear Moments-**
</div>

## 项目原理

通过Coze原有PlayGround的API，逆向前端脚本，模拟请求，以实现将Coze的API暴露为NodeJS API。

与[deanxv/coze-discord-proxy](https://github.com/deanxv/coze-discord-proxy)原理完全不同的是，本项目的接口是直接模拟前端请求API访问Bot，访问策略更接近原生，项目支持原有的`workflow`和`plugin`功能。

| 项目 | RealCozeAPI | coze-discord-proxy |
| --- | --- | --- |
| 模拟方式 | 模拟前端请求API | 通过控制两个Discord机器人互相模拟聊天 |
| 直接与Coze交互 | ✅ | ❌ |
| 总调用限制 | ❓没有明确限制（但远超机器人限制） | ❌根据单用户和模型限制 |
| 开箱即用 | ❌仅提供NodeJS API | ✅ |
| 支持插件和工作流 | ✅ | ✅ |
| 对话隔离 | ✅ | ✅ |
| 伪造对话历史 | ✅ | ❌ |
| 捕获机器人“思考”内容（包含插件自动生成的Knowledge和Search摘要） | ✅ | ❌ |
| 上传文件/图片 | ✅ | ✅ |
| 生成图片 | ✅（md格式，ciciai的CDN） | ✅ |
| 流式返回 | ✅（WebSocket与BodyStream） | ✅ |
| 多机器人 | ✅（通过不同的配置文件指定）| ✅ |

> 目前没有计划写适配openai API的打算。请自行使用RealCozeAPI NodeJS API来构建自己的程序。

## 使用方法

### NodeJS API

#### 安装

```bash
npm i real-coze-api
```

#### 使用

##### 构建实例

```javascript
import RealCozeAPI from 'real-coze-api';
const Bot = new RealCozeAPI({
    session: "{SESSION_ID}", //你的SessionID
    bot: "{BOT_CONFIG}",//机器人配置，JSONObject，可用fs.readFileSync读取
    tmppath: "./temp",//缓存CozePlayground信息的临时文件夹
    proxy: "socks5://127.0.0.1:7890"//代理
}) //构建RealCozeAPI实例
await Bot.connect() //等待Bot实例连接到Coze的API和WebSocket服务器
```

> SessionID（`session`）和Botconfig（`bot`）请参见下文获取。

##### 发送文本消息

你可以用`Bot`实例的`send`方法来发送消息。`send`默认支持同步`callback`和异步两种模式，你可以同时使用两种模式。

> 请注意Send发送的是整个聊天记录。RealCozeAPI会自动将提交的记录和机器人原有的部分记录合并。

> `Bot.send(ChatHistory,callback,subscribeRole)`方法允许携带三个参数：聊天记录、CallBack和订阅的消息类型。其中`subscribe`为一个数组,表示允许CallBack的类型，默认为`[1]`。

```javascript
const replay = await Bot.send(
    [
        {
            role: 2,
            content: "你好，Coze！"
        }
    ],
    (data) => {
        console.log(data.data)
    }
)
console.log(replay)
```

使用CallBack返回的数据格式如下：

```json
{
    "success": true,
    "data": {
        "content": "你好，Coze！",
        "continue": true
    }
}
```

异步则会等待Coze返回完整的回复后返回，返回格式如下：

```json
{
    "content": "你好，Coze！",
    "continue": true
}
```

你可以用bot实例自带的`generateChatHistory`方法来快速生成聊天记录。
    
```javascript
Bot.generateChatHistory("你好，Coze！")
```

这将会返回：

```json
[
    {
        "role": 2,
        "content": "你好，Coze！",
        "contentType":1
    }
]
```

你可以用push的方式来添加聊天记录。

```javascript
ChatHistory.push(...Bot.generateChatHistory("你好，Coze！"))
```

> `generateChatHistory`方法允许携带三个参数：输入内容、内容类型和`role`
>
> 内容类型允许`text`、`image`和`file`三种类型，未指定或使用不允许的类型时默认为`text`。
>
> 有关于`role`的更多信息请参见READEME底部常见问题。默认为`2`用户。
> 
> 方法只会返回生成的聊天记录，不会合并到原有的聊天记录中。请自行合并。

##### 上传图片

首先你需要将图片上传到Coze，Bot实例提供了`uploadFile`方法来上传文件/图片，建议使用内置的`generateChatHistory`方法来生成聊天记录。

> 你也可以手动生成一个`contentType`为`6`的聊天记录。但是我们仍然建议使用内置的方法来生成聊天记录。

```javascript
//文件 文件后缀名
const key = await Bot.uploadFile(fs.readFileSync("test.jpg"), ".jpg").then(res=>res.data)
```

这将返回一个类似`tos-alisg-i-xxx-sg/xxxxx.jpg`的文本，这是存储在Coze S3存储桶里的图片地址。

待上传图片后，我们建议使用`generateChatHistory`方法来生成聊天记录。

```javascript
Bot.generateChatHistory(key,"image")
```

##### 上传文件

与上传图片相同，但聊天记录中的`contentType`应当为`9`。我们仍然建议用内置的`generateChatHistory`方法来生成聊天记录。

```javascript
Bot.generateChatHistory(key,"file")
```

##### 订阅非机器人生成的消息（返回“思考”内容）

Coze在机器人生成消息时也会返回其他来自插件生成的消息（如KnowLedge生成的内容摘要，搜索插件总结的问题和返回的结果），但RealCozeAPI默认只允许`role`为`1`（即机器人最终返回的消息）。在Bot的`send`方法中，你可以通过指定第三个`subscribe`参数来订阅非机器人生成的消息。

```javascript
Bot.send(Bot.generateChatHistory("你好，Coze！"),console.log,[1,2,3,4,6])
```

这将会返回所有的消息，包括机器人 **“思考”** 的内容。

> 订阅仅对CallBack有效。异步`Bot.send`只会返回机器人最终的消息。

##### 断开连接

通过bot实例的`disconnect`方法可以断开连接。

```javascript
Bot.disconnect()
```

> 你可以参照[`demo/index.js`](https://github.com/CrazyCreativeDream/Real-Coze-API/blob/main/demo/index.js)来查看更多的使用方法。

### 直接使用 - 部署到CloudFlareWorker

> 参照[`如何部署到CloudFlare`](https://github.com/CrazyCreativeDream/Real-Coze-API/blob/main/cfworker/README.md)

### 直接使用 - 以Node Demo形式部署到服务器

先将`.example.env`重命名为`.env`。

#### SessionID变量获取

登录Coze，在当前界面打开F12控制台，切换`Application`选项卡，找到`Cookies`，找到`sessionid`，复制其value。这就是你的`SESSION_ID`。

> 什么？为什么不直接用`document.cookie`获取？因为Coze把`SessionID`放在了`.coze.com`域名下，而在`www.coze.com`下是无法通过js获取的。
>
> `SessionID`默认过期时长为60天，未测试实际时长。

将`SESSION_ID`填入`.env`文件即可。

#### `config.json`配置

该文件是有关机器人的所有配置，其中包含了预设和机器人的基本信息。

可以尝试安装项目中的[`DownloadBotConfig.user.js`](https://raw.githubusercontent.com/CrazyCreativeDream/Real-Coze-API/main/DownloadBotConfig.user.js)油猴脚本，或者直接复制脚本到F12控制台中。

打开机器人的配置页面，url应该类似`https://www.coze.com/space/xxx/bot/xxx`。

脚本会在右上角新增一个`Download`的按钮（没显示就刷新一下），点击后会下载一个`config.json`文件，将其复制到项目根目录下即可。

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/7c0a47b2-59ba-423d-95cf-b9a777f23ae5)


#### 安装依赖

```bash
npm install
```


### NodeJSDemo运行

> **严重警告**：Demo是一个极其简陋的程序，极其不推荐部署在生产环境中。请自行使用RealCozeAPI NodeJS API来构建自己的程序。
>
> 其中NodeJS API Demo存在[`demo/index.js`](https://github.com/CrazyCreativeDream/Real-Coze-API/blob/main/demo/index.js)，另同目录下还有三个html文件简单对应了`server:ws`、`server:http`和`server:stream`三种模式的前端写法。

> 非`Command`模式运行均不会保留聊天历史数据，你需要将ChatHistory整个传递到后端。也建议在前端通过编写一个实例来自动维护聊天历史记录。

#### Command模式

通过原始的命令行模式运行。

```bash
npm run command
```

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/8442f278-f8f1-4dde-8aa3-2fe6ec4ac75b)


#### HttpServer - 原始HTTP模式

> 此方法并非流式

通过Server模式运行，可以通过HTTP请求获取数据。

你可以修改`.env`文件中的`server_port`变量来修改端口。

```bash
npm run server:http
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

#### HttpServer - Stream模式

默认情况下，CozeRealAPI程序会等到Coze发送完一整句话的时候才会返回结果。如果你想要实时获取Coze的回复，可以使用Stream模式。

以下命令将会启动一个Stream模式的HTTP服务器。

```
npm run server:stream
```

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

#### WebSocket模式

以下命令将会启动一个基于WebSocket的服务器。

```
npm run server:ws
```

发送信息格式

```json
{
    "uuid": "0936c0b8-d3c8-42b1-b63e-548cfbe25077",
    "data": [
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
    ]
}
```

其中`uuid`为随机生成的一串字符，用于程序返回时指定对应的回复消息。

返回信息格式：

```json
{
    "uuid": "0936c0b8-d3c8-42b1-b63e-548cfbe25077",
    "data": {
        "content": "不好意思，夏生先生，我刚才可能没注意听。您能再说一遍吗？",
        "continue": false
    }
}
```

`uuid`为先前提交的任务uuid，`data`包含了`content`返回数据和`continue`是否还在更新。

> [`demo/websocket.html`](https://github.com/CrazyCreativeDream/Real-Coze-API/blob/main/demo/websocket.html)提供了一个简单的 RealCozeAPIClient，可以参考其使用方法完善你的程序。

## 代理

通过修改`.env`文件中的`proxy`变量，可以设置代理。

> 仅支持socks代理，不支持http代理。
> 
> 实测http代理和node-fetch不兼容，强制使用会出现多次跳转的问题。
> 
> 代理只会处理CozeAPI的请求，不会代理CozeWebsocket的请求。

# 常见问题

## 限制

```
Regarding message limits, currently the message limits on Coze are:
GPT-4 (8K)：100 interactions/user/day
GPT-4 (128K)：50 interactions/user/day
GPT-3.5 (16K) : 500 interactions/user/day
```

> 但这是Coze对**机器人**的限制。按照目前的测试结果，通过伪造DeviceID和AccessKey，已远远超出GPT-4 128K单用户限制50次/天的限制，**但尚未测试具体限制，切勿滥用！**
>
> 由于本项目是基于Playground API，通过RealCozeAPI发送的消息不会被计入Coze请求统计。

## 报错：regional restrictions

`Coze.com`默认屏蔽来自中国大陆的访问，你需要在`.env`文件中设置`proxy`变量来使用代理。

> 但是Coze机器人WebSocket暂时没有限制地区，所以程序默认只为API请求设置代理。

## 关于聊天记录和订阅中`role`

- `1`为机器人Assistant
- `2`为用户User
- `3`为插件生成的问题摘要
- `4`为插件返回的回答摘要
- `6`为知识库Knowledge

> 可能0为系统system身份，但是你可以直接在网页中预设里设置，不需要在ChatHistory中设置。
>
> `ChatHistory`最后一项的`role`最好是`2`用户，否则会出现奇怪的问题。
