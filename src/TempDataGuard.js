import fs from 'fs';

export default function TempDataGuard(tmppath) {
    if (!fs.existsSync(tmppath)) fs.mkdirSync(tmppath);
    const tmpjsonpath = tmppath + '/env.json';
    if (!fs.existsSync(tmpjsonpath)) fs.writeFileSync(tmpjsonpath, '{}');
    this.data = JSON.parse(fs.readFileSync(tmpjsonpath));
    this.set = function (key, value) {
        this.data[key] = value;
        fs.writeFileSync(tmpjsonpath, JSON.stringify(this.data));
    }
    this.get = function (key) {
        return this.data[key];
    }
    this.clear = function () {
        fs.writeFileSync(tmpjsonpath, '{}');
    }
    return this;
}
