/*
********
QuantumultX:

[rewrite_local]
^https?:\/\/www\.example\.com url script-response-body https://raw.githubusercontent.com/hhnice510/Scripts/refs/heads/main/nice_config.js

[mitm]
hostname = www.example.com


*/

var body_regex = /<\/head>/gi;
var body_replace_str = '<link href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.7.2/css/all.css" rel="stylesheet">\
<script src="https://raw.githubusercontent.com/hhnice510/Scripts/refs/heads/main/nice.js"></script></head>\
';


if ($response.body !== null || $response.body !== undefined) {  // 判断响应体是否存在
    var body = $response.body.replaceAll(body_regex, body_replace_str);
}

$done({body: body});
