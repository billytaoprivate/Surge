/**
 * 机场全信息提取脚本 - 深度兼容版 (适配两种不同机场格式)
 */
var arg = $argument;
var urlMatch = arg.match(/url=([^&]*)/);
var nameMatch = arg.match(/name=([^&]*)/);
var displayName = nameMatch ? decodeURIComponent(nameMatch[1]) : "机场订阅详情";

if (!urlMatch) {
    $done({ title: "配置错误", content: "参数缺少 url" });
} else {
    var url = decodeURIComponent(urlMatch[1]);

    $httpClient.get({
        url: url,
        headers: { "User-Agent": "ClashforWindows/0.19.0" }
    }, function(error, response, data) {
        if (error) {
            $done({ title: displayName, content: "网络连接失败" });
            return;
        }

        var decodedData = data; 
        
        // --- 增强型正则匹配 ---
        // 1. 流量匹配：兼容 "13.25 G | 200.0 G" 和 "Traffic: 42.06 GB | 400 GB"
        // 逻辑：寻找两个带单位的数字，中间有竖线
        var trafficReg = /(\d+\.?\d*)\s*[G|M]B?\s*\|\s*(\d+\.?\d*)\s*[G|M]B?/i;
        
        // 2. 复位日匹配：兼容 "Traffic Reset"
        var resetReg = /Reset[:：]\s*(\d+)\s*Days/i;
        
        // 3. 到期日匹配：兼容 "Expire Date" 和 "tag=Expire:"，兼容 / 和 - 分隔符
        var expireReg = /Expire(?: Date)?[:：]\s*([\d\/-]+)/i;

        var tMatch = decodedData.match(trafficReg);
        var rMatch = decodedData.match(resetReg);
        var eMatch = decodedData.match(expireReg);

        if (tMatch) {
            var used = parseFloat(tMatch[1]);
            var total = parseFloat(tMatch[2]);
            var remain = (total - used).toFixed(2);
            var percent = ((used / total) * 100).toFixed(1);
            
            var resetDay = rMatch ? rMatch[1] : "N/A";
            var expireDate = eMatch ? eMatch[1] : "N/A";

            $done({
                title: displayName,
                content: "流量: " + used + "G / " + total + "G (余 " + remain + "G)\n进度: [" + percent + "%]  重置: " + resetDay + "天\n到期: " + expireDate,
                icon: "airplane.circle.fill",
                "icon-color": "#5AC8FA"
            });
        } else {
            // 调试用：如果还是不匹配，输出前60个字符看看
            $done({ title: displayName, content: "格式不匹配: " + decodedData.substring(0, 60) });
        }
    });
}
