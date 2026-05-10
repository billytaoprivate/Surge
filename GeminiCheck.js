/*
 * Gemini 综合可用性检测 (Surge 面板)
 * 1. Web 检测: 验证浏览器访问 gemini.google.com 的权限。
 * 2. App API 检测: 模拟 App 调用接口，识别 IP 是否被 Google App 封杀。
 * 3. 地区检测: 复刻 YouTube Premium 逻辑，抓取 Google 认定的真实地域。
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
        console.log("检测脚本报错: " + e);
    } finally {
        $done({
            title: "Google Gemini 状态",
            content: `地区: ${result.region}\n浏览器: ${result.web}\nApp/API: ${result.api}`,
            icon: "sparkles.system",
            "icon-color": (result.web.includes("✅") && result.api.includes("✅")) ? "#4285F4" : "#FF5252"
        });
    }
}

// 1. 检测浏览器网页版状态
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

// 2. 检测 App 核心 API 状态 (判断 IP 纯净度)
function checkGeminiAPI() {
    return new Promise((resolve) => {
        // 请求 Gemini App 使用的底层模型列表接口 (即便不带 API Key，也能通过返回码判断 IP 权限)
        const options = {
            url: 'https://generativelanguage.googleapis.com/v1beta/models',
            headers: { 'User-Agent': 'Gemini/1.0' }
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) {
                result.api = "❌ 连接失败";
            } else if (response.status === 400 || response.status === 401) {
                // 返回 400/401 说明 IP 已通过区域审计，只是没权限访问具体资源，App 正常可用
                result.api = "✅ 可用";
            } else if (response.status === 403) {
                // 返回 403 通常意味着 IP 被列入代理黑名单或区域限制，App 会提示不支持
                result.api = "❌ IP 受限/机房灰名单";
            } else {
                result.api = `⚠️ 异常 (${response.status})`;
            }
            resolve();
        });
    });
}

// 3. 检测 Google 认定的地域 (复刻 YouTube 逻辑)
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
