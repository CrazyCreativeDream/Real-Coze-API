import fetch from "node-fetch";

export default async function PostNewChat(cookies, agent, config, chat) {
    const endpoint = "https://www.coze.com/api/draftbot/execute"
    config.work_info.message_info = JSON.stringify(chat)
    return fetch(endpoint, {
        agent,
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