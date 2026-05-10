/*
 * Gemini & Google Region Detection (Pro Version)
 * 逻辑：
 * 1. 访问 google.com/generate_204 (Google 连通性测试接口)。
 * 2. 暴力扫描所有响应头，提取 Google 内部定义的 x-goog-ext-XXXX-ad-country。
 * 3. 访问 Gemini 主页验证可用性。
 */

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

let result = {
    status: "检测中...",
    region: "未知"
};

async function check() {
    try {
        // 并行请求：可用性检测 & 地区定位
        await Promise.all([checkGemini(), checkGoogleRegion()]);
    } catch (e) {
        console.log("脚本执行异常: " + e);
    } finally {
        $done({
            title: "Google Gemini 状态",
            content: `可用性: ${result.status}\nGoogle 识别地区: ${result.region}`,
            icon: "sparkles.system",
            "icon-color": result.status === "✅ 可用" ? "#4285F4" : "#FF5252"
        });
    }
}

// 核心逻辑：精准提取 Google 内部地区代码
function checkGoogleRegion() {
    return new Promise((resolve) => {
        const options = {
            url: 'https://www.google.com/generate_204',
            headers: { 'User-Agent': USER_AGENT }
        };

        $httpClient.get(options, (error, response, data) => {
            if (error) {
                result.region = "网络请求失败";
                return resolve();
            }

            let code = "";
            // 遍历所有 Header，寻找 Google 隐藏的 ad-country 字段
            for (let key in response.headers) {
                const lowerKey = key.toLowerCase();
                // 常见的 Google 地区 Header 模式
                if (lowerKey.includes('ad-country') || lowerKey === 'x-fb-ad-country') {
                    code = response.headers[key];
                    break;
                }
            }

            if (code) {
                result.region = formatRegion(code.toUpperCase());
            } else {
                // 如果 Header 没抓到，尝试看是否有跳转到后缀域名 (如 google.co.jp)
                const location = response.headers['Location'] || response.headers['location'];
                if (location) {
                    const match = location.match(/\.google\.([a-z\.]+)/);
                    if (match && match[1] !== 'com') {
                        result.region = match[1].toUpperCase();
                    } else {
                        result.region = "US / Global";
                    }
                } else {
                    result.region = "无法解析 (可能是 NCR 模式)";
                }
            }
            resolve();
        });
    });
}

// 可用性检测
function checkGemini() {
    return new Promise((resolve) => {
        const options = {
            url: 'https://gemini.google.com/app',
            headers: { 'User-Agent': USER_AGENT }
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) {
                result.status = "❌ 连接失败";
            } else if (response.status === 200 && !data.includes("unsupported_country") && !data.includes("not available")) {
                result.status = "✅ 可用";
            } else {
                result.status = "❌ 不支持该区域";
            }
            resolve();
        });
    });
}

// 地区代码格式化
function formatRegion(code) {
    const map = {
        'JP': 'JP (日本)',
        'US': 'US (美国)',
        'HK': 'HK (香港)',
        'SG': 'SG (新加坡)',
        'TW': 'TW (台湾)',
        'UK': 'UK (英国)',
        'KR': 'KR (韩国)'
    };
    return map[code] || code;
}

check();
