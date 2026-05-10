/*
 * Gemini Availability Check
 * Adapted from community patterns (KOP-XIAO / Tartarus style)
 */

const options = {
    url: 'https://gemini.google.com/app',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
};

$httpClient.get(options, function(error, response, data) {
    let status = "";
    let region = "未知";

    if (error) {
        status = "检测失败 (网络错误)";
    } else {
        // 核心逻辑：Gemini 在不支持的地区会跳转至 /unsupported_country
        // 或者在页面源码中包含 "not available in your country"
        if (response.status === 200 && !data.includes("unsupported_country") && !data.includes("not available")) {
            status = "✅ 可用";
            // 尝试从 Google 的响应头获取识别的地区代码
            region = response.headers['x-goog-ext-277772664-ad-country'] || 
                     response.headers['X-Goog-VisitorId'] || 
                     "已授权区域";
        } else if (response.status === 403 || data.includes("unsupported_country")) {
            status = "❌ 不支持该区域";
        } else {
            status = "⚠️ 状态异常";
        }
    }

    // 获取 Google 识别的 IP 归属地（可选增强逻辑）
    $httpClient.get('https://www.google.com/generate_204', function(e, r, d) {
        let googleRegion = r ? (r.headers['x-fb-ad-country'] || r.headers['cf-ipcountry'] || "未知") : "未知";
        
        $done({
            title: "Google Gemini 状态",
            content: `可用性: ${status}\n识别地区: ${googleRegion.toUpperCase()}`,
            icon: "sparkles.system",
            "icon-color": status.includes("✅") ? "#4285F4" : "#FF5252"
        });
    });
});