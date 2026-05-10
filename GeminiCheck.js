/*
 * Gemini 可用性及 Google 地区检测
 * 逻辑：
 * 1. 访问 Gemini 主页判断可用性。
 * 2. 从 Google 响应头中提取内部识别的国家/地区代码。
 * 3. 结果完全取决于你的 Google 分流规则。
 */

const GEMINI_URL = 'https://gemini.google.com/app';
const GOOGLE_204 = 'https://www.google.com/generate_204';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let result = {
    status: "未知",
    region: "检测中..."
};

async function check() {
    try {
        // 请求 Gemini 主页
        let geminiResp = await httpGet(GEMINI_URL);
        
        // 1. 验证可用性
        if (geminiResp.status === 200 && !geminiResp.body.includes("unsupported_country") && !geminiResp.body.includes("not available")) {
            result.status = "✅ 可用";
        } else if (geminiResp.status === 403 || geminiResp.body.includes("unsupported_country")) {
            result.status = "❌ 不支持该区域";
        } else {
            result.status = "⚠️ 状态异常";
        }

        // 2. 提取地区代码 (从所有可能的 Google 地区 Header 中匹配)
        // 优先从 Gemini 响应头获取，如果没有则请求 generate_204
        let regionCode = getRegionFromHeaders(geminiResp.headers);
        
        if (!regionCode) {
            let googleResp = await httpGet(GOOGLE_204);
            regionCode = getRegionFromHeaders(googleResp.headers);
        }

        result.region = regionCode ? regionCode.toUpperCase() : "无法识别";

    } catch (e) {
        result.status = "❌ 检测失败";
        result.region = "网络错误";
    } finally {
        $done({
            title: "Google Gemini 状态",
            content: `可用性: ${result.status}\n识别地区: ${result.region} (Google 识别)`,
            icon: "sparkles.system",
            "icon-color": result.status === "✅ 可用" ? "#4285F4" : "#FF5252"
        });
    }
}

// 提取 Google 专有地区 Header
function getRegionFromHeaders(headers) {
    // 遍历所有 Header 键名，寻找包含 ad-country 的字段
    for (let key in headers) {
        if (key.toLowerCase().includes('ad-country')) {
            return headers[key];
        }
    }
    // 备选 Header
    return headers['x-fb-ad-country'] || headers['x-goog-visitorid'] || null;
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const options = {
            url: url,
            headers: { 'User-Agent': USER_AGENT }
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) reject(error);
            else resolve({ status: response.status, headers: response.headers, body: data || "" });
        });
    });
}

check();
