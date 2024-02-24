# RealCozeAPI CloudFlareWorker无服务器版本部署

将RealCozeAPI部署到CFWorker，实现免费、高可靠的API调用。

> 需要注意的是，worker版本RealCozeAPI仍存在**诡异的问题**，在部署后第一次请求有概率触发Coze的Region地域限制，无法正常请求开发环境的Key。但在之后的请求则永远不会触发。
>
> 该问题疑似Worker在边缘节点运行时第一次请求可能从一个默认节点作为出口，而Coze正好将其屏蔽所导致的。
>
> Worker会捕获错误。只要在触发问题后稍等重连即可。


## 变量与配置获取

请阅读[`项目首页README`](https://github.com/CrazyCreativeDream/Real-Coze-API) 获取`SESSION_ID`和机器人配置文件。

## 部署

新建一个KV桶（你也可以用已有的）

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/37a56bca-98ce-4280-bf71-9c3109aea539)

新建一个名为`BOT_CONFIG`的**空键值**，保存。

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/34504220-d918-48b7-85c2-46d802cb116b)

**查看-编辑-上传值**，将获取到的`config.json`上传上去，并点击**保存**

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/d8efe666-ccc2-4f07-ad82-889c0b291fce)


创建一个空白Worker，并将[`cfworker/index.js`](https://raw.githubusercontent.com/CrazyCreativeDream/Real-Coze-API/main/cfworker/index.js)内容复制到其中

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/796cd5a8-39a8-43f6-8e46-af46dee897dc)

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/e660cff3-dc8a-48be-8526-e9e72a852be3)

返回应用程序，选择`设置`-`变量`-`环境变量`将`SESSION_ID`复制到其中，保存并部署。

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/f6490406-a5ed-400e-b00b-6ab4f7733a20)

下滑，绑定KV。其中KV变量名称必须为`KV`，KV命名空间为**先前存储了`BOT_CONFIG`的存储桶**，**保存并部署**

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/f9ece28e-544e-4d0b-88df-8dfada1fa823)

## 使用

Worker版本的RealCozeAPI只接受WebSocket形式

> 为什么不支持其他形式？因为如果用传统的HTTP或者Body Stream都会直接超时，Worker免费版本对运算时间只限制500ms，Worker无法等待CozeAPI传输信息。
>
> 而Coze本身回调为WebSocket，通过Worker中继使得Coze能够主动触发Worker计算绕过时间限制。

发送信息格式、

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

以下是一个简易的Demo，可以调用同步调用API并输出信息：

```javascript
function RealCozeAPIClient(url) {
    this.ws = new WebSocket(url)
    this.ready = false
    this.callbacks = {}
    this.ChatHistory = [
        {
            "role": 2,
            "content": "Atri，你认得我吗"
        },
        {
            "role": 1,
            "content": "夏生先生！当然认得了！有什么事吗？夜深了，这么晚还不休息？"
        }
    ]
    this.GnerateUUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == "x" ? r : (r & 3 | 8);
            return v.toString(16);
        });
    }
    this.addChatListener = (uuid, callback) => {
        this.callbacks[uuid] = callback
    }
    this.mainListener = (data) => {
        if (!data.success && data.errmsg.match(/regional restrictions/)) {
            try { this.ws.close() } catch (e) { }
            //触发了Worker诡异的出口问题，等待一秒后重连
            setTimeout(() => {
                const that = {}
                that.onopen = this.ws.onopen
                that.onmessage = this.ws.onmessage
                this.ws = new WebSocket(url)
                this.ws.onopen = that.onopen
                this.ws.onmessage = that.onmessage
            }, 2000)
        }
    }
    this.ws.onopen = () => { this.ready = true }
    this.ws.onmessage = (e) => {
        const data = JSON.parse(e.data)
        if (data.uuid === "main-thread") return this.mainListener(data)
        if (typeof this.callbacks[data.uuid] === "function") this.callbacks[data.uuid](data.data)
        if (!data.data.continue) {
            delete this.callbacks[data.uuid]
            this.ChatHistory.push({ role: 2, content: data.data.content })
        }
    }
    this.send = (content, callback) => {
        this.ChatHistory.push({ role: 1, content })
        const uuid = this.GnerateUUID()
        this.addChatListener(uuid, callback)
        this.ws.send(JSON.stringify({
            uuid,
            data: this.ChatHistory
        }))
    }
}
```

你可以通过以下方式简易调用：

```javascript
const DemoChat = new RealCozeAPIClient('wss://xxx.xxx.workers.dev/')
DemoChat.send("你好！Atri！",console.log)
```

输出应该如下所示：

![image](https://github.com/CrazyCreativeDream/Real-Coze-API/assets/53730587/1907dc71-7453-4ba7-839f-96b5041c637b)
