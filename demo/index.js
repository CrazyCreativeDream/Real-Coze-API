import RealCozeAPI from "../index.js";
import fs from "fs";
import dotenv from "dotenv";

import { stdout } from 'single-line-log';
import readline from 'readline';
import { WebSocketServer } from 'ws';
import http from 'http';

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



dotenv.config()
if (!process.env.session_id) {
    console.error('[CozeAPI Demo]未能在.env或环境变量中找到session_id,请检查.env文件或环境变量');
    process.exit(1);
}
if (!!process.env.proxy) {
    if (!process.env.proxy.startsWith('socks')) {
        console.error('[CozeAPI Demo]代理必须为SOCKS型，使用HTTP代理会出现重复重定向问题');
        process.exit(1);
    }
} else {
    console.log('[CozeAPI Demo]未找到代理，将以直连方式访问Coze API，请确保服务器IP不在Coze的区域黑名单中');
}

const server_port = process.env.server_port || 8080

const Bot = new RealCozeAPI({
    session: process.env.session_id,
    bot: JSON.parse(fs.readFileSync(process.env.bot_config_path || "./config.json"), "utf-8"),
    tmppath: process.env.tmp_path || "./temp",
    proxy: process.env.proxy || null
})

const BotConnect = await Bot.connect()
if (!BotConnect.success) {
    console.error('[CozeAPI Demo]连接Coze API失败，请检查配置文件或网络连接，错误信息：' + BotConnect.errmsg)
    process.exit(1)
} else {
    console.log('[CozeAPI Demo]连接Coze API成功')
}

const action = process.argv[2]
if (action === "command") {
    let ChatContent = ""
    const ChatHistory = []
    while (1) {
        ChatContent = await rlasync('Me> ')
        if (ChatContent === ":q") break
        ChatHistory.push({
            "role": 2,
            "content": ChatContent
        })
        stdout(`ATRI> ...`)
        await Bot.send(ChatHistory, (data) => {
            stdout(`ATRI> ${data.data.content}`)
        })
        console.log("") //避免stdout被readline卡住
    }
    console.log("退出...")
    process.exit(0)
}
else if (action === "websocket") {
    const wss = new WebSocketServer({
        port: server_port
    })
    console.log("WebSocket服务器已启动，端口" + server_port)
    wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
            const data = JSON.parse(message)
            const uuid = data.uuid
            Bot.send(data.data, (data) => {
                ws.send(JSON.stringify({
                    uuid: uuid,
                    data: data.data
                }))
            })
        });
    });
}
else {
    const StreamBody = action === "http-stream"
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
        if (!ReqBody) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(
                StreamBody ? "./demo/http-stream.html" : "./demo/http.html",
                "utf-8"));
            return
        }
        const ReqJson = JSON.parse(ReqBody)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const ResJson = await Bot.send(ReqJson, (data) => {
            if (StreamBody) res.write(JSON.stringify(data.data))
        })
        res.end(JSON.stringify(ResJson))
    }).listen(server_port)
    console.log("HTTP服务器已启动，端口" + server_port)
    console.log("模式为" + (StreamBody ? "流式" : "普通"))
    console.log("URL: http://127.0.0.1:" + server_port)
}