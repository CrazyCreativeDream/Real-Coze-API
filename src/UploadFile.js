import fetch, { Request } from 'node-fetch';
import { URL } from 'url';
import CozeHash from './lib/V4Hash.js';
import SimpleS3V4Sign from './SimpleS3V4Sign.js';
import CRC32 from 'crc-32';
const uploadFile = async (cookies, agent, file, fileExtension, UploadAuth) => {
    let crc = CRC32.buf(file)
    if (crc < 0) crc = 4294967296 + crc
    const endpoint = new URL('https://' + UploadAuth.upload_host)
    endpoint.searchParams.append('ServiceId', UploadAuth.service_id)
    endpoint.searchParams.append('Version', "2018-08-01")
    const CommitEnpoint = new URL(endpoint.toString())
    CommitEnpoint.searchParams.set('Action', 'CommitImageUpload')
    const ApplyEnpoint = new URL(endpoint.toString())
    ApplyEnpoint.searchParams.set('Action', 'ApplyImageUpload')
    ApplyEnpoint.searchParams.append('FileSize', file.length)
    ApplyEnpoint.searchParams.append('FileExtension', fileExtension)
    ApplyEnpoint.searchParams.append('s', Math.random().toString(36).substr(2))
    const AWSTime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')
    const Credential = `${AWSTime.slice(0, 8)}/ap-singapore-1/imagex/aws4_request`
    const ApplyRequest = new Request(ApplyEnpoint, {
        agent,
        "method": "GET",
        "headers": {
            "content-type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
            "cookie": cookies,
            "X-Amz-Date": AWSTime,
            "X-Amz-Security-Token": UploadAuth.auth.session_token,
        }
    })
    const ApplyRequestSignature = await SimpleS3V4Sign(ApplyRequest.clone(), Credential, ['x-amz-date', 'x-amz-security-token'], UploadAuth.auth.secret_access_key)
    ApplyRequest.headers.set('Authorization', `AWS4-HMAC-SHA256 Credential=${UploadAuth.auth.access_key_id}/${Credential}, SignedHeaders=x-amz-date;x-amz-security-token, Signature=${ApplyRequestSignature}`)
    const ApplyData = await fetch(ApplyRequest).then(res => res.json())
    const CommitRequest = new Request(CommitEnpoint, {
        agent,
        "method": "POST",
        "headers": {
            "content-type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
            "cookie": cookies,
            "X-Amz-Date": AWSTime,
            "X-Amz-Security-Token": UploadAuth.auth.session_token,
        },
        body: JSON.stringify({
            SessionKey: ApplyData.Result.UploadAddress.SessionKey
        })
    })
    CommitRequest.headers.set('x-amz-content-sha256', CozeHash.sha256(JSON.stringify(await CommitRequest.clone().json())))
    const CommitRequestSignature = await SimpleS3V4Sign(CommitRequest.clone(), Credential, ['x-amz-content-sha256', 'x-amz-date', 'x-amz-security-token'], UploadAuth.auth.secret_access_key)
    CommitRequest.headers.set('Authorization', `AWS4-HMAC-SHA256 Credential=${UploadAuth.auth.access_key_id}/${Credential}, SignedHeaders=x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=${CommitRequestSignature}`)
    const CommitData = await fetch(CommitRequest).then(res => res.json())
    //Commitdata的数据和ApplyData的数据一样，该请求用于确认上传
    const UploadFileUrl = `https://${ApplyData.Result.UploadAddress.UploadHosts[0]}/upload/v1/${ApplyData.Result.UploadAddress.StoreInfos[0].StoreUri}`

    const UploadFileRequset = new Request(UploadFileUrl, {
        agent,
        "method": "POST",
        "headers": {
            "Authorization": ApplyData.Result.UploadAddress.StoreInfos[0].Auth,
            "content-type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="undefined"`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
            "cookie": cookies,
            "Content-Crc32": crc.toString(16)
        },
        "body": file
    })



    return fetch(UploadFileRequset).then(res => res.json())
        .then(async data => {
            return {
                success: data.code === 2000,
                data: ApplyData.Result.UploadAddress.StoreInfos[0].StoreUri
            }
        })
}

export default uploadFile