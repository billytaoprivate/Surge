const $ = new Tool('一汽奥迪');

try {
    const { headers, url } = $request;
    const token = headers['x-access-token'];
    if (!token) {
        $.log(`未获取到 token：${JSON.stringify(headers)}`);
        $.notify(`Token 获取失败！`);
    } else {
        $.setStore('AUDI_URL', url);
        $.setStore('AUDI_HEADERS', headers);
        $.notify('Token 获取成功！');
        $.log(`Header:\n${JSON.stringify(headers, null, 2)}\nURL:\n${url}`);
    }
} catch (e) {
    $.log(`异常：${e}`);
}
$.done();

function Tool(name) {
    const isQX = typeof $task !== 'undefined';
    const isSurge = typeof $httpClient !== 'undefined' && typeof $loon === 'undefined';

    this.title = name;
    this.log = (msg) => console.log(`\n${name}\n${typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg}`);
    this.notify = (sub = '', msg = '') => {
        if (isQX) $notify(this.title, sub, msg);
        if (isSurge) $notification.post(this.title, sub, msg);
    };
    this.setStore = (key, val) => {
        const value = typeof val === 'object' ? JSON.stringify(val) : val;
        if (isQX) $prefs.setValueForKey(value, key);
        if (isSurge) $persistentStore.write(value, key);
    };
    this.done = (value = {}) => {
        if (isQX || isSurge) $done(value);
    };
}
