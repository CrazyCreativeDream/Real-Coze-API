addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})


const CozeAPI = {
    launch: "https://www.coze.com/api/playground/user/launch",
    excute: "https://www.coze.com/api/draftbot/execute",
}


const handleRequest = async (request) => {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        //return new Response('Expected Upgrade: websocket', { status: 426 });
        return new Response(await fetch('https://raw.githubusercontent.com/CrazyCreativeDream/Real-Coze-API/main/cfworker/index.html').then(res => res.text()), {
            headers: {
                "content-type": "text/html; charset=utf-8"
            }
        })
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();

    const handleError = (errmsg) => {
        server.send(JSON.stringify({
            success: false,
            uuid: "main-thread",
            errmsg
        }))
        server.close()
        return new Response(null, {
            status: 101,
            webSocket: client,
        });

    }
    if (typeof SESSION_ID === 'undefined') return handleError('程序未能从环境变量中获取SESSION_ID！')
    if (typeof KV === 'undefined') return handleError('程序尚未绑定KV，请先绑定Key-Value数据库！')
    let BotConfig = await KV.get('BOT_CONFIG')
    if (!BotConfig) return handleError('KV中未能找到BOT_CONFIG！')
    try { JSON.parse(BotConfig) } catch (e) { return handleError('BOT_CONFIG解析失败，请确认该文件是合法的JSON！') }
    BotConfig = JSON.parse(BotConfig)
    const ChatHistory = JSON.parse(BotConfig.work_info.message_info)
    delete BotConfig.work_info.message_info

    const cache = caches.default
    let RequestPlaygroundConfig = await cache.match(CozeAPI.launch)
    if (!RequestPlaygroundConfig) {
        RequestPlaygroundConfig = await fetch(CozeAPI.launch, {
            method: 'POST',
            body: "{}",
            headers: {
                'cookie': `sessionid=${SESSION_ID}`,
                "content-type": "application/json"
            }
        }).then(res => res.text())
    } else {
        RequestPlaygroundConfig = await RequestPlaygroundConfig.text()
    }

    try {
        const data = JSON.parse(RequestPlaygroundConfig)
        if (data.code !== 0) throw new Error(data.msg)
    } catch (e) {
        await cache.delete(CozeAPI.launch)
        return handleError('解析Playground配置失败，错误信息：' + e)
    }
    await cache.put(CozeAPI.launch, new Response(RequestPlaygroundConfig))
    RequestPlaygroundConfig = JSON.parse(RequestPlaygroundConfig)

    const randomDeviceID = Math.abs(Date.now() ^ 268435456 * Math.random())
    const GenerateAccessKey = await md5("".concat(RequestPlaygroundConfig.data.config.frontier_product_id).concat(RequestPlaygroundConfig.data.config.frontier_app_key).concat(randomDeviceID, "f8a69f1719916z"))
    const GnerateUUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == "x" ? r : (r & 3 | 8);
            return v.toString(16);
        });
    }
    BotConfig.device_id = randomDeviceID.toString()
    const wsUrl = `${RequestPlaygroundConfig.data.config.frontier_domain}/ws/v2?device_platform=web&version_code=10000&access_key=${GenerateAccessKey}&fpid=${RequestPlaygroundConfig.data.config.frontier_product_id}&aid=${RequestPlaygroundConfig.data.config.frontier_app_id}&device_id=${randomDeviceID}&xsack=0&xaack=0&xsqos=0&qos_sdk_version=2&language=zh-CN`
    const CozeResponse = new CozeWebsocketGuard(wsUrl)
    server.addEventListener('message', async event => {
        const data = JSON.parse(event.data.toString())
        const WebSocketDataID = data.uuid
        const ChatUUID = GnerateUUID()
        Object.assign(ChatHistory, data.data)
        await PostNewChat(
            `sessionid=${SESSION_ID}`,
            Object.assign({}, BotConfig, { "push_uuid": ChatUUID }),
            ChatHistory
        )
            .then((res) => {
                if (res.success) {
                    CozeResponse.addMessageListener(ChatUUID, (data) => {
                        server.send(JSON.stringify({
                            uuid: WebSocketDataID,
                            data: data
                        }))
                    })
                    server.send(JSON.stringify({
                        uuid: WebSocketDataID,
                        data: {
                            content: "...",
                            continue: true
                        }
                    }))
                } else {
                    return handleError("发送消息失败：" + res.data)
                }
            })
    });



    return new Response(null, {
        status: 101,
        webSocket: client,
    });

}


async function PostNewChat(cookies, config, chat) {

    config.work_info.message_info = JSON.stringify(chat)
    return fetch(CozeAPI.excute, {
        "method": "POST",
        "headers": {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
            "cookie": cookies
        },
        "body": JSON.stringify(config),
    }).then(res => res.json())
        .then(data => {
            return {
                success: data.code === 0,
                data: data.msg
            }
        })
}


function CozeWebsocketGuard(url) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
        const StringData = arrayBuffer2String(event.data)
        const JsonData = JSON.parse(StringData.substring(StringData.indexOf('{'), StringData.lastIndexOf('}') + 1))
        if (JsonData.event_type === 1 && JsonData.message.reply_type === 1) {
            if (!!JsonData.message.ext && !!JsonData.message.ext.PushUuid && typeof this.ResponseData[JsonData.message.ext.PushUuid] === 'function') {
                this.ResponseData[JsonData.message.ext.PushUuid]({
                    content: JsonData.message.content,
                    continue: JsonData.message.ext.is_finish === "0"
                })
                if (JsonData.message.ext.is_finish === "1") {
                    delete this.ResponseData[JsonData.message.ext.PushUuid]
                }
            }
        }
    }
    this.ResponseData = {}
    this.addMessageListener = function (PushUuid, callback) {
        this.ResponseData[PushUuid] = callback
    }
}

const md5 = async (data) => {
    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('md5', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const arrayBuffer2String = (arrayBuffer) => {
    return new TextDecoder().decode(arrayBuffer);
}