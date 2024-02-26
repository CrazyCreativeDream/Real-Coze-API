import crypto from 'crypto'
import { URL } from 'url'
import { Request } from 'node-fetch'

import CozeHash from './lib/V4Hash.js'

const UriEncode = (str) => {
    return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
        return '%' + c.charCodeAt(0).toString(16);
    });
}
const SimpleS3V4Sign = async (req, Credential, SignedHeadersList, SecretAccessKey) => {
    const HTTPMethod = req.method
    const url = new URL(req.url)
    const CanonicalURI = url.pathname
    const CanonicalQueryString = [...url.searchParams.keys()].sort().map(key => `${UriEncode(key)}=${UriEncode(url.searchParams.get(key))}`).join('&')
    // const QBody = req.body
    // const QBodyJSON = !QBody ? "" : JSON.stringify(await req.json())
    const HashedPayload = req.headers.get('x-amz-content-sha256')?req.headers.get('x-amz-content-sha256'):req.body?CozeHash.sha256(await req.clone().text()):CozeHash.sha256('')
    // req.headers.set('x-amz-content-sha256', HashedPayload)
    const SignedHeaders = SignedHeadersList.sort().join(';')
    const CanonicalHeaders = [...req.headers.keys()].sort().map(key => {
        if (SignedHeadersList.includes(key.toLowerCase())) {
            return `${key.toLowerCase()}:${req.headers.get(key).trim()}`
        }
    }).filter(Boolean).join('\n') + '\n'



    const CanonicalRequest = `${HTTPMethod}\n${CanonicalURI}\n${CanonicalQueryString}\n${CanonicalHeaders}\n${SignedHeaders}\n${HashedPayload}`
    // console.log('---------------------cononical request---------------------')
    // console.log(CanonicalRequest)
    const CanonicalRequestHash = CozeHash.sha256(CanonicalRequest)
    // console.log('--------------------------cononical request hash---------------------')
    // console.log([CanonicalRequestHash].join(''))
    const Algorithm = "AWS4-HMAC-SHA256"
    const RequestDateTime = req.headers.get('x-amz-date')
    const CredentialScope = Credential
    const StringToSign = `${Algorithm}\n${RequestDateTime}\n${CredentialScope}\n${CanonicalRequestHash}`
    // console.log('-------------------------------string to sign---------------------')
    // console.log(StringToSign)
    // console.log('-------------------------------string to sign end---------------------')
    // const StringToSignHash = CozeHash.sha256(StringToSign)
    const kDate = CozeHash.hmac(`AWS4${SecretAccessKey}`, RequestDateTime.slice(0, 8))
    // console.log('kDate', [kDate].join(''))
    const kRegion = CozeHash.hmac(kDate, 'ap-singapore-1')
    // console.log('kRegion', [kRegion].join(''))
    const kService = CozeHash.hmac(kRegion, 'imagex')
    // console.log('kService', [kService].join(''))
    const kSigning = CozeHash.hmac(kService, 'aws4_request')
    // console.log('kSigning', [kSigning].join(''))
    const Signature = CozeHash.hmac(kSigning, StringToSign, "hex")
    // console.log('--------------------------Signature---------------------')
    return [Signature].join('')

}

export default SimpleS3V4Sign