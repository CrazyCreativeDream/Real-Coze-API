import fetch from "node-fetch";

export default async function PostNewChat(cookies, agent, config, chat) {
    const endpoint = "https://www.coze.com/api/draftbot/execute"
    return fetch(endpoint, {
        agent,
        "method": "POST",
        "headers": {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
            "cookie": cookies
        },
        "body": JSON.stringify({
            "space_id": config.space_id,
            "bot_id": config.bot_id,
            "device_id": config.device_id.toString(),
            "push_uuid": config.push_uuid,
            "work_info": {
                "system_info_all": JSON.stringify([
                    { "prompt_type": 1, "data": config.prompt, "record_id": "" },
                    { "prompt_type": 2, "data": "" },
                    { "prompt_type": 3, "data": "" }]
                ),
                "message_info": JSON.stringify(chat),
                "other_info": JSON.stringify({
                    "model": "133",
                    "temperature": 1,
                    "max_tokens": 4096,
                    "top_p": 1,
                    "frequency_penalty": 0,
                    "presence_penalty": 0.6,
                    "ShortMemPolicy": { "ContextContentType": 2, "HistoryRound": 3 },
                    "PromptId": 0,
                    "card_ids": null
                }),
                "tools": JSON.stringify([]),
                "dataset": JSON.stringify({
                    "dataset": [],
                    "top_k": 3,
                    "min_score": 0.5,
                    "auto": true
                }),
                "onboarding": JSON.stringify({
                    "prologue": "",
                    "suggested_questions": []
                }),
                "profile_memory": JSON.stringify([]),
                "task": JSON.stringify({
                    "user_task_allowed": false,
                    "enable_preset_task": 0,
                    "loading": false,
                    "data": []
                }),
                "workflow": JSON.stringify([]),
                "suggest_reply": JSON.stringify({
                    "suggest_reply_mode": 0
                }),
                "history_info": ""
            }
        }),
    }).then(res => res.json())
        .then(data => {
            return {
                success: data.code === 0
            }
        })
}