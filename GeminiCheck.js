/*
 * Gemini & Google Region Detection (YouTube Standard)
 * 逻辑：完全复刻 YouTube Premium 检测脚本的逻辑，通过 YouTube 接口获取 GL 标志位。
 */

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

let result = {
    status: "检测中...",
    region: "未知"
};

async function check() {
    try {
        // 使用两个最稳定的 Google 接口并行检测
        await Promise.all([checkGemini(), checkGoogleLocation()]);
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

// 核心：复刻 YouTube 检测逻辑
function checkGoogleLocation() {
    return new Promise((resolve) => {
        // 访问 YouTube Premium 页面，这是 Google 地理位置识别最严苛的地方
        const options = {
            url: 'https://www.youtube.com/premium',
            headers: { 'User-Agent': USER_AGENT }
        };

        $httpClient.get(options, (error, response, data) => {
            if (error) {
                result.region = "网络连接失败";
                return resolve();
            }

            // 1. 尝试从响应头提取（YouTube 专用）
            let countryCode = response.headers['X-Goog-VisitorId'] || 
                              response.headers['x-goog-visitorid'] || 
                              "";
            
            // 2. 尝试从 body 提取 "GL" 标志位（这是 YouTube 脚本最准的一招）
            // Google 会在页面中注入 "COUNTRY_CODE": "JP"
            const glMatch = data.match(/"COUNTRY_CODE"\s*:\s*"([^"]+)"/) || 
                            data.match(/"gl"\s*:\s*"([^"]+)"/);
            
            if (glMatch && glMatch[1]) {
                result.region = formatRegion(glMatch[1].toUpperCase());
            } else {
                // 3. 兜底：地毯式扫描所有 ad-country Header
                let adCountry = "";
                for (let key in response.headers) {
                    if (key.toLowerCase().includes('ad-country')) {
                        adCountry = response.headers[key];
                        break;
                    }
                }
                result.region = adCountry ? formatRegion(adCountry.toUpperCase()) : "US (Fallback)";
            }
            resolve();
        });
    });
}

// 检测 Gemini 可用性
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

function formatRegion(code) {
    const map = {
        'JP': 'JP (日本)',
        'US': 'US (美国)',
        'HK': 'HK (香港)',
        'SG': 'SG (新加坡)',
        'TW': 'TW (台湾)',
        'GB': 'UK (英国)',
        'DE': 'DE (德国)'
    };
    return map[code] || code;
}

check();
