/*
 * Gemini 可用性及区域检测脚本
 * 逻辑：
 * 1. 访问 Gemini 主页判断是否被重定向或返回不支持提示。
 * 2. 访问 Cloudflare Trace 接口获取出口 IP 真实所在的国家/地区代码。
 */

const GEMINI_URL = 'https://gemini.google.com/app';
const REGION_URL = 'https://www.cloudflare.com/cdn-cgi/trace';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let result = {
    status: "检测中...",
    region: "未知"
};

// 发起并行请求
async function check() {
    try {
        await Promise.all([checkAvailability(), getRegion()]);
    } catch (e) {
        console.log("检测出错: " + e);
    } finally {
        $done({
            title: "Google Gemini 状态",
            content: `可用性: ${result.status}\n识别地区: ${result.region}`,
            icon: "sparkles.system",
            "icon-color": result.status === "✅ 可用" ? "#4285F4" : "#FF5252"
        });
    }
}

// 检测 Gemini 可用性
function checkAvailability() {
    return new Promise((resolve) => {
        const options = {
            url: GEMINI_URL,
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

// 获取出口 IP 地区（使用 Cloudflare 接口，结果最准确）
function getRegion() {
    return new Promise((resolve) => {
        $httpClient.get(REGION_URL, (error, response, data) => {
            if (!error && data) {
                // 从数据中提取 loc=XX 字段
                const loc = data.match(/loc=(.+)/);
                if (loc && loc[1]) {
                    result.region = loc[1].toUpperCase();
                }
            }
            resolve();
        });
    });
}

check();
