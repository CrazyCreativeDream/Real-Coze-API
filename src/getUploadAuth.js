import fetch from 'node-fetch';
const getUploadAuth = async (cookies, agent) => {
    const endpoint = 'https://www.coze.com/api/playground/upload/auth_token'
    return fetch(endpoint, {
        agent,
        "method": "POST",
        "headers": {
            "content-type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
            "cookie": cookies
        },
        "body": JSON.stringify({ "scene": "bot_task" }),
    }).then(res => res.json())
        .then(data => {

            return {
                success: data.code === 0,
                data: data.data
            }
        })
}
export default getUploadAuth;