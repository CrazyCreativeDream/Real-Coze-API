import fetch from 'node-fetch';
const setUpDev = async (cookies, proxy) => {
    const endpoint = "https://www.coze.com/api/playground/user/launch"
    return fetch(endpoint, {
        agent: proxy,
        headers: {
            "cookie": cookies,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
            "content-type": "application/json"
        },
        method: 'POST',
        body: "{}"
    })
        .then(res => res.json())
        .then(data => {
            if (!!data.code) {
                return {
                    success: false,
                    data: data
                }
            } else {
                return {
                    success: true,
                    data: {
                        access_key: data.data.config.frontier_access_key,
                        app_id: data.data.config.frontier_app_id,
                        app_key: data.data.config.frontier_app_key,
                        product_id: data.data.config.frontier_product_id,
                        domain: data.data.config.frontier_domain,
                    }
                }
            }
        })
}
export default setUpDev;