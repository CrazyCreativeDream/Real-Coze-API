import { SocksProxyAgent } from 'socks-proxy-agent';
import Crypto from 'crypto';
import setUpDev from './src/setUpDev.js';
import CozeWebsocketGuard from './src/CozeWebsocketGuard.js';
import PostNewChat from './src/PostNewChat.js';
import TempDataGuard from './src/TempDataGuard.js';
import getUploadAuth from './src/getUploadAuth.js';
import UploadFile from './src/UploadFile.js';
const md5 = Crypto.createHash('md5');
const asleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const GnerateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == "x" ? r : (r & 3 | 8);
        return v.toString(16);
    });
}


function RealCozeAPI(config) {
    const handleError = (err) => {
        return {
            success: false,
            data: {},
            errmsg: err
        }
    }
    if (!config.session) return handleError("缺失session，请查看项目文档以获取更多信息")
    if (!config.bot) return handleError("缺失bot配置信息，请查看项目文档以获取更多信息")
    config.tmppath = config.tmppath || "./temp"
    if (!!config.proxy) {
        if (!config.proxy.match(/^socks/)) return handleError("代理必须为SOCKS型，使用HTTP代理会出现重复重定向问题")
        config.proxy = new SocksProxyAgent(config.proxy)
    } else {
        config.proxy = null
    }

    this.BotConfig = config.bot
    this.ChatHistory = JSON.parse(this.BotConfig.work_info.message_info)
    delete this.BotConfig.work_info.message_info
    const cookies = `sessionid=${config.session}`;
    this.device_id = Math.abs(Date.now() ^ 268435456 * Math.random())
    this.BotConfig.device_id = this.device_id.toString()
    const temp = new TempDataGuard(config.tmppath)


    this.connect = async () => {
        return new Promise(async (resolve, reject) => {
            this.CozePlayGroundData = temp.get('PlayGroundData');

            if (!this.CozePlayGroundData) {
                this.CozePlayGroundData = await setUpDev(cookies, config.proxy)
                if (!this.CozePlayGroundData.success) return handleError(this.CozePlayGroundData.data.message)
                temp.set('PlayGroundData', this.CozePlayGroundData);
            }


            this.access_key = md5.update("".concat(this.CozePlayGroundData.data.product_id).concat(this.CozePlayGroundData.data.app_key).concat(this.device_id, "f8a69f1719916z")).digest('hex');
            //这是Coze混淆前端的一个签名算法
            this.CozeResponse = new CozeWebsocketGuard(`${this.CozePlayGroundData.data.domain}/ws/v2?device_platform=web&version_code=10000&access_key=${this.access_key}&fpid=${this.CozePlayGroundData.data.product_id}&aid=${this.CozePlayGroundData.data.app_id}&device_id=${this.device_id}&xsack=0&xaack=0&xsqos=0&qos_sdk_version=2&language=zh-CN`)

            while (!this.CozeResponse.ready) await asleep(300)
            resolve({
                success: true
            })
        })
    }
    this.disconnect = () => {
        this.CozeResponse.close()
        delete this.CozeResponse
    }



    this.generateChatHistory = (InputChatHistory, HistoryType, role) => {
        role = role || 2
        switch (HistoryType) {
            case 'image':
                return [{
                    role,
                    content: JSON.stringify({
                        image_list: [
                            {
                                key: InputChatHistory
                            }
                        ]
                    }),
                    contentType: 6
                }]
            case 'file':
                return [{
                    role,
                    content: JSON.stringify({
                        file_list: [
                            {
                                key: InputChatHistory
                            }
                        ]
                    }),
                    contentType: 9
                }]
            default:
                return [{
                    role,
                    content: InputChatHistory,
                    contentType: 1
                }]
        }
    }


    this.send = async (InputChatHistory, callback, subscribeRole) => {
        subscribeRole = subscribeRole || [1]
        return new Promise(async (resolve, reject) => {
            const ChatUUID = GnerateUUID()
            this.CozeResponse.addMessageListener(ChatUUID, (data) => {
                if (subscribeRole.includes(data.reply_type)) callback({
                    success: true,
                    data
                });
                if (!data.continue && data.reply_type === 1) resolve(data)
            })
            const PostResult = await PostNewChat(
                cookies,
                config.proxy,
                Object.assign({}, this.BotConfig, { "push_uuid": ChatUUID }),
                this.ChatHistory.concat(InputChatHistory)
            )
            if (!PostResult.success) {
                callback({
                    success: false,
                    data: {},
                    errmsg: PostResult
                })
                this.CozeResponse.removeMessageListener(ChatUUID)
                reject(PostResult)
            }
        })

    }

    this.uploadFile = async (file, fileExtension) => {

        let UploadAuth = temp.get('UploadAuthToken');
        if (!UploadAuth || new Date(UploadAuth.data.auth.expired_time) < Date.now()) {
            UploadAuth = await getUploadAuth(cookies, config.proxy)
            if (!UploadAuth.success) return handleError(UploadAuth.data.message)
            temp.set('UploadAuthToken', UploadAuth);
        }
        return UploadFile(cookies, config.proxy, file, fileExtension, UploadAuth.data)

    }

}
export default RealCozeAPI
