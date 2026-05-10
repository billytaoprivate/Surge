/*
 * Gemini 可用性及 Google 原生地区检测
 * 逻辑：
 * 1. 模拟浏览器访问 google.com，观察其重定向域名 (如 .co.jp, .com.hk)。
 * 2. 结合 Google 搜索页面的地域标记提取地区代码。
 * 3. 访问 Gemini 主页验证服务可用性。
 */

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

let result = {
    status: "检测中...",
    region: "未知"
};

async function check() {
    try {
        // 并行执行：检测 Gemini 可用性 & 检测 Google 归属地
        await Promise.all([checkGemini(), checkGoogleRegion()]);
    } catch (e) {
        console.log("检测脚本报错: " + e);
    } finally {
        $done({
            title: "Google Gemini 状态",
            content: `可用性: ${result.status}\nGoogle 识别地区: ${result.region}`,
            icon: "sparkles.system",
            "icon-color": result.status === "✅ 可用" ? "#4285F4" : "#FF5252"
        });
    }
}

// 逻辑 1: 通过 Google 域名重定向和 Header 获取地区
function checkGoogleRegion() {
    return new Promise((resolve) => {
        // 注意：这里故意不使用 google.com/ncr，让它产生重定向
        const options = {
            url: 'https://www.google.com/search?q=ip',
            headers: { 'User-Agent': USER_AGENT }
        };

        $httpClient.get(options, (error, response, data) => {
            if (error) {
                result.region = "网络连接失败";
                return resolve();
            }

            // A 方案：从 Google 搜索结果页面的底部提取地区（最准）
            // Google 页面通常包含 "Location: Japan" 或类似的文本
            const regionMatch = data.match(/<span class=".*?[^>]*">(.*?)<\/span> - 从您的 IP 地址/);
            if (regionMatch && regionMatch[1]) {
                result.region = regionMatch[1];
            } else {
                // B 方案：从特定的 ad-country Header 中模糊匹配
                let adCountry = null;
                for (let key in response.headers) {
                    if (key.toLowerCase().includes('ad-country')) {
                        adCountry = response.headers[key];
                        break;
                    }
                }
                
                if (adCountry) {
                    result.region = adCountry.toUpperCase();
                } else {
                    // C 方案：根据重定向的域名后缀判断
                    // 如果重定向到了 google.co.jp，那肯定就是日本
                    const setCookie = response.headers['Set-Cookie'] || "";
                    if (setCookie.includes(".google.co.jp")) result.region = "JP (日本)";
                    else if (setCookie.includes(".google.com.hk")) result.region = "HK (香港)";
                    else if (setCookie.includes(".google.com.tw")) result.region = "TW (台湾)";
                    else if (setCookie.includes(".google.com.sg")) result.region = "SG (新加坡)";
                    else result.region = "US (或通用区域)";
                }
            }
            resolve();
        });
    });
}

// 逻辑 2: 检测 Gemini 可用性
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

check();
