import dotenv from 'dotenv';
import process from 'process';
import readline from 'readline';
import fs from 'fs';
import { SocksProxyAgent } from 'socks-proxy-agent';
import Crypto from 'crypto';
import { stdout } from 'single-line-log';
import setUpDev from './src/setUpDev.js';
import CozeWebsocketGuard from './src/CozeWebsocketGuard.js';
import tempEnvVar from './src/TempEnv.js';
import PostNewChat from './src/PostNewChat.js';
import http from 'http';
import { URL } from 'url';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const rlasync = async (q) => {
    return new Promise((resolve, reject) => {
        rl.question(q, (answer) => {
            resolve(answer)
        });
    })
}

const asleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))


const md5 = Crypto.createHash('md5');

const temp = new tempEnvVar();

dotenv.config()
if (!process.env.session_id) {
    console.error('[CozeRealAPI MAIN]未能在.env或环境变量中找到session_id,请检查.env文件或环境变量');
    process.exit(1);
}
let apiProxy = null;
if (!!process.env.proxy) {
    if (!process.env.proxy.startsWith('socks')) {
        console.error('[CozeRealAPI MAIN]代理必须为SOCKS型，使用HTTP代理会出现重复重定向问题');
        process.exit(1);
    }
    apiProxy = new SocksProxyAgent(process.env.proxy);
} else {
    console.log('[CozeRealAPI MAIN]未找到代理，将以直连方式访问Coze API，请确保服务器IP不在Coze的区域黑名单中');
}

//检查是否存在config.json
if (!fs.existsSync('./config.json')) {
    console.error('[CozeRealAPI MAIN]未能找到config.json，前往https://github.com/CrazyCreativeDream/Real-Coze-API 查看如何配置config.json');
    process.exit(1);
}

const BotConfig = JSON.parse(fs.readFileSync('./config.json'));
const ChatHistory = JSON.parse(BotConfig.work_info.message_info)
delete BotConfig.work_info.message_info

const cookies = `sessionid=${process.env.session_id}`;

let setEnvData = temp.get('devEnv');
if (!setEnvData) {
    console.log('[CozeRealAPI MAIN]未找到开发环境Token，正在尝试获取...');
    setEnvData = await setUpDev(cookies, apiProxy);
    if (!setEnvData.success) {
        console.error('[CozeRealAPI MAIN]获取开发环境Token失败，错误信息：' + setEnvData.data.message);
        process.exit(1);
    }
    temp.set('devEnv', setEnvData);
}



const randomDeviceID = Math.abs(Date.now() ^ 268435456 * Math.random())
const GenerateAccessKey = md5.update("".concat(setEnvData.data.product_id).concat(setEnvData.data.app_key).concat(randomDeviceID, "f8a69f1719916z")).digest('hex'); //Coze前端就是这么写的，只有这样你才能意识到你看到的是Coze的前端代码
const GnerateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == "x" ? r : (r & 3 | 8);
        return v.toString(16);
    });
}

BotConfig.device_id = randomDeviceID.toString()

const CozeResponseUrl = new URL(`${setEnvData.data.domain}/ws/v2?device_platform=web&version_code=10000&access_key=${GenerateAccessKey}&fpid=${setEnvData.data.product_id}&aid=${setEnvData.data.app_id}&device_id=${randomDeviceID}&xsack=0&xaack=0&xsqos=0&qos_sdk_version=2&language=zh-CN`)


const CozeResponse = new CozeWebsocketGuard(CozeResponseUrl.toString());

setTimeout(async () => {
    const action = process.argv[2]
    if (action === "command") {
        while (true) {
            if(!CozeResponse.ready){
                console.log("[CozeRealAPI MAIN]正在等待Coze WebSocket连接...")
                await asleep(1000)
                continue
            }
            const ChatContent = await rlasync('Me> ')
            const ChatUUID = GnerateUUID()
            ChatHistory.push({
                "role": 2,
                "content": ChatContent
            })
            await PostNewChat(
                cookies,
                apiProxy,
                Object.assign({}, BotConfig, { "push_uuid": ChatUUID }),
                ChatHistory
            )
            await new Promise((resolve, reject) => {
                let content = "..."
                stdout(`ATRI> ${content}`)
                CozeResponse.addMessageListener(ChatUUID, (data) => {
                    content = data.content
                    stdout(`ATRI> ${content}`)
                    if (!data.continue) {
                        console.log(" ")
                        stdout.clear()
                        ChatHistory.push({
                            "role": 1,
                            "content": content
                        })
                        resolve()
                    }
                })
            })
        }
    } else {
        const sport = process.env.server_port || 8080
        console.log("http server started at port " + sport)
        http.createServer(async (req, res) => {
            let ReqBody = null
            if (req.method === 'POST') {
                ReqBody = await new Promise((resolve, reject) => {
                    let body = ''
                    req.on('data', (data) => {
                        body += data
                    })
                    req.on('end', () => {
                        resolve(body)
                    })
                })
            }
            if (!ReqBody) { res.writeHead(200); res.end(""); return }
            const ReqJson = JSON.parse(ReqBody)
            const ChatUUID = GnerateUUID()
            const searchParams = new URL(req.url, "http://localhost").searchParams
            const StreamBody = searchParams.get("stream") === "true"
            await PostNewChat(
                cookies,
                apiProxy,
                Object.assign({}, BotConfig, { "push_uuid": ChatUUID }),
                ChatHistory.concat(ReqJson)
            )
            res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
            await new Promise((resolve, reject) => {
                let content = "..."
                CozeResponse.addMessageListener(ChatUUID, (data) => {
                    content = data.content
                    if (StreamBody) res.write(JSON.stringify({ content: content, continue: true }))
                    if (!data.continue) {
                        res.end(JSON.stringify({
                            content: content,
                            continue: false
                        }))
                        resolve()
                    }
                })
            })
        }).listen(sport)
    }
}, 1000);

process.on('unhandledRejection', (err) => {
    console.error(err)
    console.log("异常退出，已清除旧开发环境Token，尝试重新执行...")
    temp.clear()
    process.exit(0)
})
process.on('uncaughtException', (err) => {
    console.error(err)
    console.log("异常退出，已清除旧开发环境Token，尝试重新执行...")
    temp.clear()
    process.exit(0)
})