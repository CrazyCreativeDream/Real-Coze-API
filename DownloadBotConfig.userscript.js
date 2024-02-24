// ==UserScript==
// @name         Download Coze Bot Config
// @namespace    https://github.com/CrazyCreativeDream/Real-Coze-API
// @version      2024-02-24
// @description  可以通过网页UI直接下载Coze机器人的配置文件
// @author       CyanFalse
// @match        https://www.coze.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=coze.com
// @grant        none
// ==/UserScript==
(async function () {
    'use strict';
    if(!location.pathname.match(/\/space\/\d+\/bot\/\d+/g)) return;
    await new Promise((resolve) => {
        const interval = setInterval(() => {
            if (Object.values(document.querySelectorAll('span')).filter((span) => span.innerText === 'Publish')[0]) {
                clearInterval(interval)
                resolve()
            }
        }, 1000)
    })
    const PublishButtonSpan = Object.values(document.querySelectorAll('span')).filter((span) => span.innerText === 'Publish')[0]
    const PublishButton = PublishButtonSpan.parentElement
    const SaveButtonSpan = PublishButtonSpan.cloneNode(true)
    const SaveButton = PublishButton.cloneNode(true)
    SaveButtonSpan.innerText = 'Download'
    SaveButton.innerHTML = ''
    SaveButton.appendChild(SaveButtonSpan)
    PublishButton.parentElement.appendChild(SaveButton)
    const download = (content) => {
        const a = document.createElement('a')
        const blob = new Blob([content], { type: 'text/plain' })
        a.href = URL.createObjectURL(blob)
        a.download = 'config.json'
        a.click()
    }
    SaveButton.addEventListener('click', () => {
        const originSend = XMLHttpRequest.prototype.send
        XMLHttpRequest.prototype.send = function (body) {
            if (this._url === '/api/draftbot/update') {
                const data = JSON.parse(body)
                download(JSON.stringify(data, null, 4))
                XMLHttpRequest.prototype.send = originSend
            } else {
                return originSend.apply(this, arguments)
            }
        }

        setTimeout(() => {
            PublishButton.click()
        }, 1000);
    })

})();