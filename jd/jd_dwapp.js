/*
积分换话费
入口：首页-生活·缴费-积分换话费
update：20230610 //nice
cron 3 0 * * * jd_dwapp.js
*/

const $ = new Env('积分换话费');
const notify = $.isNode() ? require('./sendNotify') : '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
//CryptoJS = $.isNode() ? require('crypto-js') : CryptoJS;
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => { cookiesArr.push(jdCookieNode[item]) })
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
  cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      message = '';
      await TotalBean();
      console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      $.UUID = getUUID('xxxxxxxxxxxxxxxx');
      await main()
    }
  }
})().catch((e) => { $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '') }).finally(() => { $.done(); })

async function main() {
  $.log("去签到")
  await usersign()
  await tasklist();
  if ($.tasklist) {
    for (let i = 0; i < $.tasklist.length; i++) {
      console.log(`去领取${$.tasklist[i].taskDesc}任务`)
      await taskrecord($.tasklist[i].id)
      await $.wait(3000);
      console.log(`去领取积分`)
      await taskreceive($.tasklist[i].id)
    }
  } else {
      console.log("没有获得活动列表")
  }
}
async function taskrecord(id) {
  enc = await sign(id + "1")
  let body = { "id": id, "agentNum": "m", "taskType": 1, "followChannelStatus": "", ...enc }
  return new Promise(resolve => {
    $.post(taskPostUrl("task/dwRecord", body), (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          data = JSON.parse(data)
          if (data) {
            if (data.code === 200) {
              if (data.data.dwUserTask) {
                $.log(" 领取任务成功")
              } else {
                $.log(" 此任务已经领取过了")
              }
            } else {
              console.log(JSON.stringify(data))
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })

}

async function taskreceive(id) {
  enc = await sign(id)
  let body = { "id": id, ...enc }
  return new Promise(resolve => {
    $.post(taskPostUrl("task/dwReceive", body), (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          data = JSON.parse(data)
          if (data) {
            if (data.code === 200 && data.data.success) {
              console.log(` 领取任务积分：获得${data.data.giveScoreNum}`)
            } else if (data.code === 200 && !data.data.success) {
              console.log(" 积分已经领取完了")
            } else {
              console.log(JSON.stringify(data))
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}

async function usersign() {
  body = await sign()
  return new Promise(resolve => {
    $.post(taskPostUrl("dwSignInfo", body), (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          data = JSON.parse(data)
          if (data) {
            if (data.code === 200) {
              console.log(`签到成功：获得积分${data.data.signInfo.signNum}\n`)
            } else {
              console.log("似乎签到完成了\n")
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}

async function tasklist() {
  body = await sign();
  return new Promise(resolve => {
    $.post(taskUrl("dwapp_task_dwList", body), (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          //console.log(data)
          data = JSON.parse(data)
          if (data) {
            $.tasklist = data.data
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}



function taskUrl(function_id, body) {
    return {
      url: `https://api.m.jd.com/client.action?functionId=${function_id}`,
      body: `appid=h5-sep&functionId=dwapp_task_dwList&body=${encodeURIComponent(JSON.stringify(body))}&client=m&clientVersion=6.0.0`,
      headers: {
        "Host": "api.m.jd.com",
        "Origin": "https://prodev.m.jd.com",
        "Connection": "keep-alive",
        "Accept": "*/*",
        "User-Agent": `jdapp;iPhone;10.1.0;13.5;${$.UUID};network/wifi;model/iPhone11,6;addressid/4596882376;appBuild/167774;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1`,
        "Referer": "https://prodev.m.jd.com/mall/active/eEcYM32eezJB7YX4SBihziJCiGV/index.html",
        "Accept-Encoding": "gzip, deflate, br",
        "Cookie": cookie,
        'Accept-Language' : `zh-CN,zh-Hans;q=0.9`,
        'request-from' : `native`
      }
    }
  }

function taskPostUrl(function_id, body) {
  return {
    url: `https://dwapp.jd.com/user/${function_id}`,
    body: JSON.stringify(body),
    headers: {
      "Host": "dwapp.jd.com",
      "Origin": "https://prodev.m.jd.com",
      "Connection": "keep-alive",
      "Accept": "*/*",
      "User-Agent": `jdapp;iPhone;10.1.0;13.5;${$.UUID};network/wifi;model/iPhone11,6;addressid/4596882376;appBuild/167774;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1`,
      "Accept-Language": "zh-cn",
      "Referer": "https://prodev.m.jd.com/mall/active/eEcYM32eezJB7YX4SBihziJCiGV/index.html",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json",
      "Cookie": cookie,
    }
  }
}

function TotalBean() {
  return new Promise(async resolve => {
    const options = {
      "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
      "headers": {
        "Accept": "application/json,text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Cookie": cookie,
        "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
      }
    }
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === 13) {
              $.isLogin = false; //cookie过期
              return
            }
            if (data['retcode'] === 0) {
              $.nickName = (data['base'] && data['base'].nickname) || $.UserName;
            } else {
              $.nickName = $.UserName
            }
          } else {
            console.log(`京东服务器返回空数据`)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}

function getUUID(format = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', UpperCase = 0) {
  return format.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    if (UpperCase) {
      uuid = v.toString(36).toUpperCase();
    } else {
      uuid = v.toString(36)
    }
    return uuid;
  });
}

async function sign(en) {
  time = new Date().getTime();
  let encStr = en || '';
  const encTail = `${time}e9c398ffcb2d4824b4d0a703e38yffdd`;
  encStr = md5(encStr + encTail).toString()
  return { "t": time, "encStr": encStr }
}

function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}

function md5(md5str) {
    var createMD5String = function(string) {
        var x = Array()
        var k, AA, BB, CC, DD, a, b, c, d
        var S11 = 7,
            S12 = 12,
            S13 = 17,
            S14 = 22
        var S21 = 5,
            S22 = 9,
            S23 = 14,
            S24 = 20
        var S31 = 4,
            S32 = 11,
            S33 = 16,
            S34 = 23
        var S41 = 6,
            S42 = 10,
            S43 = 15,
            S44 = 21
        string = uTF8Encode(string)
        x = convertToWordArray(string)
        a = 0x67452301
        b = 0xEFCDAB89
        c = 0x98BADCFE
        d = 0x10325476
        for (k = 0; k < x.length; k += 16) {
            AA = a
            BB = b
            CC = c
            DD = d
            a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478)
            d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756)
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB)
            b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE)
            a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF)
            d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A)
            c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613)
            b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501)
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8)
            d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF)
            c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1)
            b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE)
            a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122)
            d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193)
            c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E)
            b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821)
            a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562)
            d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340)
            c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51)
            b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA)
            a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D)
            d = GG(d, a, b, c, x[k + 10], S22, 0x2441453)
            c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681)
            b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8)
            a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6)
            d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6)
            c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87)
            b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED)
            a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905)
            d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8)
            c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9)
            b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A)
            a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942)
            d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681)
            c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122)
            b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C)
            a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44)
            d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9)
            c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60)
            b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70)
            a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6)
            d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA)
            c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085)
            b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05)
            a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039)
            d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5)
            c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8)
            b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665)
            a = II(a, b, c, d, x[k + 0], S41, 0xF4292244)
            d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97)
            c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7)
            b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039)
            a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3)
            d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92)
            c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D)
            b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1)
            a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F)
            d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0)
            c = II(c, d, a, b, x[k + 6], S43, 0xA3014314)
            b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1)
            a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82)
            d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235)
            c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB)
            b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391)
            a = addUnsigned(a, AA)
            b = addUnsigned(b, BB)
            c = addUnsigned(c, CC)
            d = addUnsigned(d, DD)
        }
        var tempValue = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)
        return tempValue.toLowerCase()
    }
    var rotateLeft = function(lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
    }
    var addUnsigned = function(lX, lY) {
        var lX4, lY4, lX8, lY8, lResult
        lX8 = (lX & 0x80000000)
        lY8 = (lY & 0x80000000)
        lX4 = (lX & 0x40000000)
        lY4 = (lY & 0x40000000)
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF)
        if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8)
        if (lX4 | lY4) {
            if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8)
            else return (lResult ^ 0x40000000 ^ lX8 ^ lY8)
        } else {
            return (lResult ^ lX8 ^ lY8)
        }
    }
    var F = function(x, y, z) {
        return (x & y) | ((~x) & z)
    }
    var G = function(x, y, z) {
        return (x & z) | (y & (~z))
    }
    var H = function(x, y, z) {
        return (x ^ y ^ z)
    }
    var I = function(x, y, z) {
        return (y ^ (x | (~z)))
    }
    var FF = function(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac))
        return addUnsigned(rotateLeft(a, s), b)
    }
    var GG = function(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac))
        return addUnsigned(rotateLeft(a, s), b)
    }
    var HH = function(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac))
        return addUnsigned(rotateLeft(a, s), b)
    }
    var II = function(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac))
        return addUnsigned(rotateLeft(a, s), b)
    }
    var convertToWordArray = function(string) {
        var lWordCount
        var lMessageLength = string.length
        var lNumberOfWordsTempOne = lMessageLength + 8
        var lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64
        var lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16
        var lWordArray = Array(lNumberOfWords - 1)
        var lBytePosition = 0
        var lByteCount = 0
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4
            lBytePosition = (lByteCount % 4) * 8
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition))
            lByteCount++
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4
        lBytePosition = (lByteCount % 4) * 8
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
        return lWordArray
    }
    var wordToHex = function(lValue) {
        var WordToHexValue = '',
            WordToHexValueTemp = '',
            lByte, lCount
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255
            WordToHexValueTemp = '0' + lByte.toString(16)
            WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2)
        }
        return WordToHexValue
    }
    var uTF8Encode = function(string) {
        string = string.toString().replace(/\x0d\x0a/g, '\x0a')
        var output = ''
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n)
            if (c < 128) {
                output += String.fromCharCode(c)
            } else if ((c > 127) && (c < 2048)) {
                output += String.fromCharCode((c >> 6) | 192)
                output += String.fromCharCode((c & 63) | 128)
            } else {
                output += String.fromCharCode((c >> 12) | 224)
                output += String.fromCharCode(((c >> 6) & 63) | 128)
                output += String.fromCharCode((c & 63) | 128)
            }
        }
        return output
    }
    return createMD5String(md5str)
}
//exports.md5 = md5;




// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
