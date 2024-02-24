import fs from 'fs';

export default function tempEnvVar() {
    if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');
    if (!fs.existsSync('./temp/env.json')) fs.writeFileSync('./temp/env.json', '{}');
    this.data = JSON.parse(fs.readFileSync('./temp/env.json'));
    this.set = function (key, value) {
        this.data[key] = value;
        fs.writeFileSync('./temp/env.json', JSON.stringify(this.data));
    }
    this.get = function (key) {
        return this.data[key];
    }
    this.clear = function () {
        fs.writeFileSync('./temp/env.json', '{}');
    }
    return this;
}
