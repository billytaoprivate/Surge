/*
 * Gemini 综合检测脚本 (V7 修正版)
 * 修正了 API 403 状态码的误报问题，通过解析响应体来判断真实可用性。
 */

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

let result = {
    web: "检测中...",
    api: "检测中...",
    region: "检测中..."
};

async function check() {
    try {
        await Promise.all([
            checkGeminiWeb(),
            checkGeminiAPI(),
            checkGoogleRegion()
        ]);
    } catch (e) {
        console.log("检测脚本异常: " + e);
    } finally {
        $done({
            title: "Google Gemini 状态",
            content: `地区: ${result.region}\n浏览器: ${result.web}\nApp/API: ${result.api}`,
            icon: "sparkles.system",
            "icon-color": (result.web.includes("✅") && result.api.includes("✅")) ? "#4285F4" : "#FF5252"
        });
    }
}

// 1. 网页版检测
function checkGeminiWeb() {
    return new Promise((resolve) => {
        const options = {
            url: 'https://gemini.google.com/app',
            headers: { 'User-Agent': USER_AGENT }
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) {
                result.web = "❌ 连接失败";
            } else if (response.status === 200 && !data.includes("unsupported_country") && !data.includes("not available")) {
                result.web = "✅ 可用";
            } else {
                result.web = "❌ 区域限制";
            }
            resolve();
        });
    });
}

// 2. App API 检测 (修复 403 误报逻辑)
function checkGeminiAPI() {
    return new Promise((resolve) => {
        const options = {
            url: 'https://generativelanguage.googleapis.com/v1beta/models',
            headers: { 
                'User-Agent': USER_AGENT,
                'Content-Type': 'application/json'
            }
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) {
                result.api = "❌ 连接失败";
            } else {
                // 如果返回 403，我们需要检查具体报错内容
                if (response.status === 403) {
                    if (data && data.includes("location is not supported")) {
                        result.api = "❌ 区域不支持 (API)";
                    } else {
                        // 如果只是因为没 Key，说明 IP 已经通过了地理位置审计
                        result.api = "✅ 可用";
                    }
                } else if (response.status === 400 || response.status === 401 || response.status === 200) {
                    result.api = "✅ 可用";
                } else {
                    result.api = `⚠️ 状态未知 (${response.status})`;
                }
            }
            resolve();
        });
    });
}

// 3. 地区检测 (继续复刻 YouTube 逻辑)
function checkGoogleRegion() {
    return new Promise((resolve) => {
        const options = {
            url: 'https://www.youtube.com/premium',
            headers: { 'User-Agent': USER_AGENT }
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) {
                result.region = "获取失败";
            } else {
                const glMatch = data.match(/"COUNTRY_CODE"\s*:\s*"([^"]+)"/) || 
                                data.match(/"gl"\s*:\s*"([^"]+)"/);
                if (glMatch && glMatch[1]) {
                    result.region = formatRegion(glMatch[1].toUpperCase());
                } else {
                    result.region = "未知";
                }
            }
            resolve();
        });
    });
}

function formatRegion(code) {
    const map = {
        'JP': '日本 (JP)',
        'US': '美国 (US)',
        'HK': '香港 (HK)',
        'SG': '新加坡 (SG)',
        'TW': '台湾 (TW)',
        'GB': '英国 (UK)',
    };
    return map[code] || code;
}

check();
