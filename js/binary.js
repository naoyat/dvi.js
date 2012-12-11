/**
 * load binary-file from url, then callback
 * from http://en.dogeno.us/2011/04/post-to-appengine-blobstore-using-ajax-firefox-and-chrome/
 *
 * @param {String} url
 * @param {function} callback
*/
function getBinary(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
//    if (xhr.hasOwnProperty('responseType')) { // ArrayBuffer - fx & chrome
    if ('responseType' in xhr) {
        xhr.responseType = 'arraybuffer';
    } else { // if not ArrayBuffer, must for binary
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
    }
    xhr.onreadystatechange = function(){
        if (xhr.readyState == 4 && xhr.status == 200) {
            // fx & chrome handle ArrayBuffer very different
            // var responseArrayBuffer = xhr.hasOwnProperty('responseType') && xhr.responseType === 'arraybuffer',
            var responseArrayBuffer = ('responseType' in xhr) && xhr.responseType === 'arraybuffer',
                mozResponseArrayBuffer = 'mozResponseArrayBuffer' in xhr,
                bin_data = mozResponseArrayBuffer ? xhr.mozResponseArrayBuffer : responseArrayBuffer ? xhr.response : xhr.responseText;
            callback(bin_data);
        }
    };
    xhr.send(null);
}

/**
 * hex-dump a Uint8Array
 *
 * @param {Uint8Array} arr
 * @return {String}
*/
function hexdump(arr, offset, size) {
    var len = arr.length;
    if (offset + size < len) len = offset + size;
    var dumped = "";
    for (var j = offset; j < len; j += 16) {
        dumped += p_0x(8, j) + ":";
        var tmp = "";
        for (var i = 0; i < 16; i++) {
            if (j+i < len) {
                dumped += " " + p_0x(2, arr[j+i]);
                var c = arr[j+i];
                if (0x20 <= c && c < 0x7f)
                    tmp += String.fromCharCode(c);
                else
                    tmp += '.';
            } else {
                dumped += "   ";
            }
        }
        dumped += "  " + tmp + "\n";
    }
    return dumped;
}

function readu(arr, ofs, bytes) {
    var x = 0;
    for (var i = 0; i < bytes; i++) {
        x = x * 256 + arr[ofs+i];
    }
    return x;
}

function readi(arr, ofs, bytes) {
    var x = arr[ofs];
    if (x >= 128) x -= 256;
    for (var i = 1; i < bytes; i++) {
        x = x * 256 + arr[ofs+i];
    }
    return x;
}

function reads(arr, ofs, bytes) {
    var s = "";
    for (var i = 0; i < bytes; i++) {
        s += String.fromCharCode(arr[ofs+i]);
    }
    return s;
}

/**
 * generates zero-padded hexadecimal string
 * like sprintf("%0*x", pad, n)
 *
 * @param {number} pad
 * @param {number} n
 * @return {String}
 */
function p_0x(pad, n) {
    var s = Number(n).toString(16);
    if (s.length >= pad) return s;
    s = "0000000000" + s;
    return s.substr(-pad);
}

/**
 * generates zero-padded decimal string
 * like sprintf("%0*d", pad, n)
 *
 * @param {number} pad
 * @param {number} n
 * @return {String}
 */
function p0d(pad, n) {
    var s = Number(n).toString(10);
    if (s.length >= pad) return s;
    s = "0000000000" + s;
    return s.substr(-pad);
}

/**
 * generates float string
 * like sprintf("%.*f", digits, n)
 *
 * @param {number} digits
 * @param {number} n
 * @return {String}
 */
function p_df(digits, n) {
    var sign = ""; if (n < 0) { sign = "-"; n = -n; }
    var d = parseInt(n); if (d == n) return sign + n;
    n -= d;
    for (var i=0; i<digits; ++i) n *= 10;
    return sign + d + "." + p0d(digits, parseInt(n + 0.5));
}
function p_2f(n) {
    var sign = ""; if (n < 0) { sign = "-"; n = -n; }
    var d = parseInt(n); if (d == n) return sign + n;
    n = parseInt((n - d) * 100 + 0.5);
    return sign + d + "." + p0d(2, n);
}

/**
 * generates float string
 * like sprintf("%.*g", digits, n)
 *
 * @param {number} digits
 * @param {number} n
 * @return {String}
 */
function p_dg(digits, n) {
    var sign = ""; if (n < 0) { sign = "-"; n = -n; }
    var d = parseInt(n); if (d == n) return sign + d;
    n -= d;
    for (var i=0; i<digits; ++i) n *= 10;
    n = parseInt(n + 0.5);
    if (n == 0) return sign + d;
    return sign + d + "." + p0d(digits, n).replace(/0*$/, "");
}
/*
function p_dg(digits, n) {
    var s = p_df(digits, n);
    return s == "0" ? s : s.replace(/\.?0*$/, "");
}
*/
function p_2g(n) { return p_dg(2, n); }
function p_g(n) { return p_dg(6, n); }
