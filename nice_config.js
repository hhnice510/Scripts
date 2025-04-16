/*
********
QuantumultX:

[rewrite_local]
^https?:\/\/www\.example\.com url script-response-body https://raw.githubusercontent.com/hhnice510/Scripts/refs/heads/main/nice_config.js

[mitm]
hostname = www.example.com


*/

var body_regex = /<\/head>/gi;
var body_replace_str = '<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.7.2/css/all.min.css" rel="stylesheet">\
<script src="https://cdn.jsdelivr.net/gh/hhnice510/Scripts/nice.js"></script></head>\
';


if ($response.body !== null || $response.body !== undefined) {  // 判断响应体是否存在
    var body = $response.body.replaceAll(body_regex, body_replace_str);
}

$done({body: body});
