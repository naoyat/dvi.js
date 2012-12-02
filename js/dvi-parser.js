/**
 * load binary-file from url, then callback
 * from http://en.dogeno.us/2011/04/post-to-appengine-blobstore-using-ajax-firefox-and-chrome/
 *
 * @param {String} url
 * @param {function} callback
*/
var PX_PER_PT = 1.3325;

function getBinary(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    if (xhr.hasOwnProperty('responseType')) { // ArrayBuffer - fx & chrome
        xhr.responseType = 'arraybuffer';
    } else { // if not ArrayBuffer, must for binary
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
    }
    xhr.onreadystatechange = function(){
        if (xhr.readyState == 4 && xhr.status == 200) {
            // fx & chrome handle ArrayBuffer very different
            var responseArrayBuffer = xhr.hasOwnProperty('responseType') && xhr.responseType === 'arraybuffer',
                mozResponseArrayBuffer = 'mozResponseArrayBuffer' in xhr,
                bin_data = mozResponseArrayBuffer ? xhr.mozResponseArrayBuffer : responseArrayBuffer ? xhr.response : xhr.responseText;
            callback(bin_data);
        }
    };
    xhr.send(null);
}

/**
 * generates zero-padded hexadecimal string
 * like sprintf("%0*x", pad, n)
 *
 * @param {number} pad
 * @param {number} n
 * @return {String}
 */
function p0x(pad, n) {
    var s = Number(n).toString(16);
    if (s.length >= pad) return s;
    s = "0000000000" + s;
    return s.substr(-pad);
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
        dumped += p0x(8, j) + ":";
        var tmp = "";
        for (var i = 0; i < 16; i++) {
            if (j+i < len) {
                dumped += " " + p0x(2, arr[j+i]);
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

function render_dvi(arr) {
    var insts = parse_dvi(arr);
    var document = grouping(insts);
    document = rejoin_chars(document);

    for (var j in document.pages) {
        show_page(document.pages[j], document.font_info);
    }
}

var dvi = undefined;
var dvi_curr_page = 0;

function dvi_load(file) {
    if (!file.match(/.*\.dvi/)) {
        file += ".dvi";
    }
    getBinary(file, function(arraybuf) {
        var arr = new Uint8Array(arraybuf);
        // console.log(hexdump(arr, 0, arr.length));
        var insts = parse_dvi(arr);
        dvi = rejoin_chars(grouping(insts));
        dvi_curr_page = 0;
        show_page(dvi.pages[0], dvi.font_info);
    });
}

function dvi_keyevent() {
    console.log("keyCode = "+ event.keyCode);
    switch (event.keyCode) {
        case 32: // space
            break;
        case 37: case 38: case 72: case 75: case 80: // left up h k p
            if (dvi != undefined && dvi_curr_page > 0) {
                show_page(dvi.pages[--dvi_curr_page], dvi.font_info);
            }
            break;
        case 32: case 39: case 40: case 74: case 76: case 78: // spc right down j l n
            if (dvi != undefined && dvi_curr_page < dvi.pages.length-1) {
                show_page(dvi.pages[++dvi_curr_page], dvi.font_info);
            }
            break;
        default: break;
    }
}

function delta(dh, dv) {
    var s = "";
    if (dh > 5) s += sprintf("→%.1f", dh);
    else if (dh < -5) s += sprintf("←%.1f", -dh);
    if (dv > 5) s += sprintf("↓%.1f", dv);
    else if (dv < -5) s += sprintf("↑%.1f", -dv);
    if (s != "") s = "<font size=2 color=\"#cccccc\">{"+ s + "}</font>";
    return s;
}

function rule(h, v, width, height, dir, color) {
    var left = 72.27 + h / 65536,
        bottom = 72.27 + v / 65536, top,
        wd = width / 65536,
        ht = height / 65536;
    // console.log(sprintf("rule %.1f %.1f %.1f %.1f %d", left, bottom, wd,ht, dir));
    if (dir == 0) {
        top = bottom - ht;
    } else {
        top = bottom;
        var tmp = ht; ht = wd; wd = tmp;
    }
    $('<span />').css({
        position: "absolute",
        border: "0.1px solid",
        'background-color': color,
        top: sprintf("%.2fpt", top),
        left: sprintf("%.2fpt", left),
        width: sprintf("%.2fpt", wd),
        height: sprintf("%.2fpt", ht)
    }).appendTo('#out');
}

function puts(h, v, width, dir, font_info, str, color) {
    // var writing_mode = (dir == 0) ? 'lr-tb' : 'tb-rl'; // IE
    var writing_mode = (dir == 0) ? '' : 'vertical-rl'; // IE
    var x = 72.27 + h / 65536, y = 72.27 + v / 65536, w = width / 65536;
    var pt = font_info.s / 65536;
    var css = {
        position: "absolute",
        border: "solid 0.5px",
        color: color,
        // 'text-align': "justify",
        font: sprintf("%.1fpt '%s'", pt, font_info.file)
    };
    var family = font_info.file.replace(/[1-9][0-9]*$/, "");
    if (dir == 0) {
        if (family == 'min' || family == 'goth') {
            y -= pt * 0.95;
        } else { 
            y -= pt * 0.75;
        }

        css.top = sprintf("%.2fpt", y);
        css.left = sprintf("%.2fpt", x);
        //css.width = sprintf("%.2fpt", w);
    } else {
        if (family == 'tmin' || family == 'tgoth') {
            x -= pt * 0.2;
            //x -= pt * 0.5;
        } else {
            x -= pt * 0.3;
            //x -= pt * 0.;
        }
        
        css.top = sprintf("%.2fpt", y);
        css.left = sprintf("%.2fpt", x);
        css.width = sprintf("%.2fpt", pt);
        css.height = sprintf("%.2fpt", w*2);
        css['writing-mode'] = 'vertical-rl';
        css['-webkit-writing-mode'] = 'vertical-rl';
    }

    $('<span />', {
        text: str
    }).css(css).appendTo('#out');
}

function strWidth(font_info, str) {
    var pt = font_info.s / 65536;
    var font_desc = sprintf("%.1fpt '%s'", pt, font_info.file);
    var canvas = document.getElementById('metrics');
    if (canvas.getContext) {
        var context = canvas.getContext('2d');
        context.font = font_desc;
        // context['writing-mode'] = 'vertical-rl';
        // context['-webkit-writing-mode'] = 'vertical-rl';
        var metrics = context.measureText(str);
        var width = metrics.width / PX_PER_PT;
        return width;
    }
    return undefined;
}

function show_page(page, font_info) {
    // console.log(dump_code(page.insts));
    $('#out').children().remove();

    var page_no = page.count[0];
    var vofs = 0; //888 * 65536 * (page_no - 1);
    var h = 0, v = 0, w = 0, x = 0, y = 0, z = 0, f = undefined;
    var st = [];
    var color = "Black", colorst = [];
    // var font_info = {};
    var dir = 0;
    var font_size = 10 * 65536;

    for (var j in page.insts) {
        var inst = page.insts[j];
        switch (inst.op) {
        case 'sets':
            var str = inst.s;
            // console.log("\""+ str +"\"");
            var width = strWidth(font_info[f], str) * 65536;
            puts(h, vofs+v, width, dir, font_info[f], str, color);
            if (dir == 0) {
                h += width; // font_size * 0.6;
            } else {
                v += width; // font_size * 0.6;
            }
            break;
        case 'set_rule':
            rule(h, vofs+v, inst.b, inst.a, dir, color);
            if (dir == 0) {
                h += inst.b;
            } else {
                // rule(h, v, -inst.a, inst.b, dir);
                v += inst.b;
            }
            // var height = inst.a / 65536;
            // var width = inst.b / 65536;
            // dumped += sprintf("{■:%.1f x %.1f}", width, height);
            break;
        case 'put_rule':
            rule(h, vofs+v, inst.b, inst.a, dir, color);
            if (dir == 0) {
                // h += inst.b;
            } else {
                // v += inst.b;
            }
            break;
        case 'push':
            st.push([h,v,w,x,y,z,dir]);
            break;
        case 'pop':
            var last_h = h, last_v = v;
            var tmp = st.pop();
            h = tmp[0]; v = tmp[1]; w = tmp[2]; x = tmp[3]; y = tmp[4]; z = tmp[5]; dir = tmp[6];
            var dh = h - last_h, dv = v - last_v;
            // dumped += "\n" + delta(dh, dv);
            break;
        case 'right':
            if (dir == 0) {
                h += inst.b;
                var dh = inst.b / 65536;
                // dumped += delta(dh, 0);
            } else {
                v += inst.b;
                var dv = inst.b / 65536;
            }
            break;
        case 'w':
            if (inst.b) w = inst.b;
            if (dir == 0) {
                h += w;
                var dh = w / 65536;
                // dumped += delta(dh, 0);
            } else {
                v += w;
                var dv = w / 65536;
            }
            break;
        case 'x':
            if (inst.b) x = inst.b;
            if (dir == 0) {
                h += x;
                var dh = w / 65536;
                // dumped += delta(dh, 0);
            } else {
                v += x;
                var dv = w / 65536;
            }
            break;
        case 'down':
            if (dir == 0) {
                v += inst.a;
                // var dv = inst.a / 65536;
                // dumped += delta(0, dv);
            } else {
                h -= inst.a;
                // var dh = -inst.a / 65536;
            }
            break;
        case 'y':
            if (inst.a) y = inst.a;
            if (dir == 0) {
                v += y;
                // var dv = y / 65536;
                // dumped += delta(0, dv);
            } else {
                h -= y;
                // var dh = -y / 65536;
            }
            break;
        case 'z':
            if (inst.a) z = inst.a;
            if (dir == 0) {
                v += z;
                // var dv = z / 65536;
                // dumped += delta(0, dv);
            } else {
                h -= z;
                // var dh = -z / 65536;
            }
            break;
        case 'fnt':
            f = inst.k;
            // var info = font_info[inst.k];
            // font_size = info.d;
            // dumped += "<font size=2 color=\"#9999cc\">{"+ info.file +"}</font>";
            break;
        case 'fnt_def':
            // font_info[inst.k] = inst;
            // dumped += "<font color=#6666cc>{font "+ inst.k + ":=" + inst.file +"}</font>";
            break;
        case 'xxx':
            // console.log("special: " + inst.x);
            if (inst.x.match(/color (.*)/)) {
                var cmd = RegExp.$1;
                if (cmd.match(/push +(.*)/)) {
                    var arg = RegExp.$1;
                    if (arg.match(/rgb ([^ ]+) ([^ ]+) ([^ ]+)/)) {
                        var r = Math.floor(255 * RegExp.$1),
                            g = Math.floor(255 * RegExp.$2),
                            b = Math.floor(255 * RegExp.$3);
                        color = '#' + p0x(2,r) + p0x(2,g) + p0x(2,b);
                    } else {
                        color = arg;
                    }
                    // console.log("color[] << " + color);
                    colorst.push(color);
                } else if (cmd.match(/pop/)) {
                    color = colorst.pop();
                    // console.log("color[] >> " + color);
                }
            }
            // dumped += "<font size=2 color=\"#cccc99\">{special "+ inst.x + "}</font>";
            break;
        case 'dir':
            dir = inst.d;
            // var dirs = ["横", "縦"];
            // dumped += "<font size=2 color=\"#99cc99\">&lt;"+ dirs[inst.d] + "&gt;</font>";
            break;
        default:
            break;
        }
    }
}

function dump_code(insts) {
    var dumped = insts.length + " instructions\n";
    for (var i in insts) {
        var inst = insts[i];
        // dumped += ":"+ i +":"+ JSON.stringify(inst) + "\n";
        dumped += JSON.stringify(inst).replace(/,/g,", ").replace(/"/g,"") + "\n";
    }
    return dumped;
}

function rejoin_chars(document) {
    var h, v, w, x, y, z, dir;
    var f, st;

    for (var i in document.pages) {
        var page = document.pages[i];

        // bop
        h = v = w = x = y = z = dir = 0;
        st = [];

        var rejoined_insts = [];
        var sets_c = [], sets_s = "", sets_w = 0;
        for (var j in page.insts) {
            var inst = page.insts[j];
            // console.log("> "+ JSON.stringify(inst));
            var skip = false;
            switch (inst.op) {
            case 'set':
                sets_c.push(inst.c);
                sets_s += inst._;
                // sets_w += 0;
                skip = true;
                break;
            case 'set_rule':
                if (dir == 0) {
                    h += inst.b;
                } else {
                    v += inst.b;
                }
                break;
            case 'push':
                st.push([h,v,w,x,y,z,dir]);
                break;
            case 'pop':
                var last_h = h, last_v = v;
                var tmp = st.pop();
                h = tmp[0]; v = tmp[1]; w = tmp[2]; x = tmp[3]; y = tmp[4]; z = tmp[5]; dir = tmp[6];
                break;

            case 'right':
                if (dir == 0) {
                    h += inst.b;
                } else {
                    v += inst.b;
                }
                // skipping
/**/
                if (f != undefined && sets_c.length > 0) {
                    // console.log(f);
                    // console.log(JSON.stringify(document.font_info[f]));
                    var em = Math.floor(4 * inst.b / document.font_info[f].s);
                    if (em >= -1) {
                        if (em >= 1) { // for (var k = 0; k < em; k++) {
                            sets_c.push(0x20);
                            sets_s += ' ';
                            sets_w -= document.font_info[f].s / 2;
                        }
                        sets_w += inst.b;
                        skip = true;
                    }
                }
/**/
                break;
            case 'w':
                if (inst.b) w = inst.b;
                if (dir == 0) {
                    h += w;
                } else {
                    v += w;
                }
                // skipping
/**/
                if (f != undefined && sets_c.length > 0) {
                    var em = Math.floor(4 * w / document.font_info[f].s);
                    if (em >= -1) {
                        if (em >= 1) { // for (var k = 0; k < em; k++) {
                            sets_c.push(0x20);
                            sets_s += ' ';
                            sets_w -= document.font_info[f].s / 2;
                        }
                        sets_w += w;
                        skip = true;
                    }
                }
/**/
                break;
            case 'x':
                if (inst.b) x = inst.b;
                if (dir == 0) {
                    h += x;
                } else {
                    v += x;
                }
                // skipping
/**/
                if (f != undefined && sets_c.length > 0) {
                    var em = Math.floor(4 * x / document.font_info[f].s);
                    if (em >= -1) {
                        if (em >= 1) { // for (var k = 0; k < em; k++) {
                            sets_c.push(0x20);
                            sets_s += ' ';
                            sets_w -= document.font_info[f].s / 2;
                        }
                        sets_w += x;
                        skip = true;
                    }
                }
/**/
                break;
            case 'down':
                if (dir == 0) {
                    v += inst.a;
                } else {
                    h -= inst.a;
                }
                break;
            case 'y':
                if (inst.a) y = inst.a;
                if (dir == 0) {
                    v += y;
                } else {
                    h -= y;
                }
                break;
            case 'z':
                if (inst.a) z = inst.a;
                if (dir == 0) {
                    v += z;
                } else {
                    h -= z;
                }
                break;
            case 'fnt':
                f = inst.k;
                break;
            case 'fnt_def':
                break;
            case 'xxx':
                break;
            case 'dir':
                dir = inst.d;
                break;
            default:
                break;
            }// endswitch

            if (skip) continue;

            if (sets_c.length > 0) {
                rejoined_insts.push({op:'sets', c:sets_c, s:sets_s, w:sets_w});
                sets_c = []; sets_s = ""; sets_w = 0;
            }
            rejoined_insts.push(inst);
        } // endfor

        if (sets_c.length > 0) {
            rejoined_insts.push({op:'sets', c:sets_c, s:sets_s, w:sets_w});
        }
        page.insts = rejoined_insts;
        document.pages[i] = page;
    }

    return document;
}

function grouping(insts) {
    var document = {
        preamble: undefined,
        pages: [],
        postamble: undefined,
        font_info: {}
    };

    var stack = [];
    var count = undefined;

    for (var i in insts) {
        var inst = insts[i];

        switch (inst.op) {
        case 'pre':
            document.preamble = inst;
            break;

        case 'bop':
            count = inst.c;
            break;
        case 'eop':
            document.pages.push({count:count, insts:stack});
            stack = [];
            break;

        case 'post':
            document.postamble = inst;
            break;
        case 'post_post':
            break;

        case 'fnt_def':
            document.font_info[inst.k] = inst;
            break;

        default:
            stack.push(inst);
            break;
        }
    }

    // console.log(JSON.stringify(document));

    return document;
}

function parse_dvi(arr) {
    var len = arr.length;
    var code = [];

    for (var ptr = 0; ptr < len; ) {
        var op = arr[ptr++];
        if (op < 128) { //   0..127
            var c = op;
            code.push({op:'set', c:c, _:String.fromCharCode(c)});
        } else if (op <= 170) { // 128..170
            switch (op) {
            case 128: case 129: case 130: case 131: // set1 .. set4
                // オリジナルの TeX 2.xxではset命令は使わない
                // 日本語TeXでは set2 命令で漢字（JISコード）を指定する
                var bytes = op - 127;
                var c = readu(arr, ptr, bytes); ptr += bytes;
                if (256 <= c && c < 65536)
                    code.push({op:'set', c:c, _:jis2uc(c)});
                else
                    code.push({op:'set', c:c});
                break;
            case 132: // setrule
                var a = readi(arr, ptr, 4); ptr += 4;
                var b = readi(arr, ptr, 4); ptr += 4;
                code.push({op:'set_rule', a:a, b:b});
                break;
            case 133: case 134: case 135: case 136: // put1 .. put4
                // ※TeX では生成されない
                var bytes = op - 132;
                var c = readu(arr, ptr, bytes); ptr += bytes;
                code.push({op:'put', c:c});
                break;
            case 137: // putrule - 高さ a，幅 b で箱を (h,v) に描画
                // ※TeX では生成されない
                var a = readi(arr, ptr, 4); ptr += 4;
                var b = readi(arr, ptr, 4); ptr += 4;
                code.push({op:'put_rule', a:a, b:b});
                break;
            case 138: // nop
                code.push({op:'nop'});
                break;
            case 139: // bop
                var c = [0,0,0,0,0,0,0,0,0,0]; // integer
                for (var i = 0; i < 10; i++) {
                    c[i] = readi(arr, ptr, 4); ptr += 4;
                }
                var p = readi(arr, ptr, 4); ptr += 4; // pointer
                code.push({op:'bop', c:c, p:p});
                break;
            case 140: // eop
                code.push({op:'eop'});
                break;
            case 141: // push
                code.push({op:'push'});
                break;
            case 142: // pop
                code.push({op:'pop'});
                break;
            case 143: case 144: case 145: case 146: // right1 .. right4
                var bytes = op - 142;
                var b = readi(arr, ptr, bytes); ptr += bytes;
                code.push({op:'right', b:b});
                break;
            case 147: // w0
                code.push({op:'w'});
                break;
            case 148: case 149: case 150: case 151: // w1 .. w4
                var bytes = op - 147;
                var b = readi(arr, ptr, bytes); ptr += bytes;
                code.push({op:'w', b:b});
                break;
            case 152: // x0
                code.push({op:'x'});
                break;
            case 153: case 154: case 155: case 156: // x1 .. x4
                var bytes = op - 152;
                var b = readi(arr, ptr, bytes); ptr += bytes;
                code.push({op:'x', b:b});
                break;
            case 157: case 158: case 159: case 160: // down1 .. down4
                var bytes = op - 156;
                var a = readi(arr, ptr, bytes); ptr += bytes;
                code.push({op:'down', a:a});
                break;
            case 161: // y0
                code.push({op:'y'});
                break;
            case 162: case 163: case 164: case 165: // y_j
                var bytes = op - 161;
                var a = readi(arr, ptr, bytes); ptr += bytes;
                code.push({op:'y', a:a});
                break;
            case 166: // z0
                code.push({op:'z'});
                break;
            case 167: case 168: case 169: case 170: // z_j
                var bytes = op - 166;
                var a = readi(arr, ptr, bytes); ptr += bytes;
                code.push({op:'z', a:a});
                break;
            } // endswitch
        } else if (op <= 234) { // 171..234
            var k = op - 171;
            code.push({op:'fnt', k:k});
        } else { // 235..255
            switch (op) {
            case 235: case 236: case 237: case 238: // fnt_j
                var bytes = op - 234;
                var k = readu(arr, ptr, bytes); ptr += bytes;
                code.push({op:'fnt', k:k});
                break;
            case 239: case 240: case 241: case 242: // xxx_j (special)
                var bytes = op - 238;
                var k = readu(arr, ptr, bytes); ptr += bytes;
                var x_ = reads(arr, ptr, k); ptr += k;
                code.push({op:'xxx', x:x_});
                break;
            case 243: case 244: case 245: case 246: // fnt_def
                // ※通常 fnt_def1 しか使われない
                var bytes = op - 242;
                var k = readu(arr, ptr, bytes); ptr += bytes; // unsigned
                var c = readu(arr, ptr, 4); ptr += 4; // unsigned
                var s = readi(arr, ptr, 4); ptr += 4; // dimension
                var d = readi(arr, ptr, 4); ptr += 4; // dimension
                var a_ = arr[ptr++];
                var l_ = arr[ptr++];
                var dir = reads(arr, ptr, a_); ptr += a_; // string
                var file = reads(arr, ptr, l_); ptr += l_; // string
                code.push({op:'fnt_def', k:k, c:c, s:s, d:d, dir:dir, file:file}); 
                break;
            case 247: // pre
                var i = arr[ptr++]; // unsigned
                var num = readu(arr, ptr, 4); ptr += 4; // unsigned
                var den = readu(arr, ptr, 4); ptr += 4; // unsigned
                var mag = readu(arr, ptr, 4); ptr += 4; // unsigned
                var k = arr[ptr++];
                var x = reads(arr, ptr, k); ptr += k; // string
                code.push({op:'pre', i:i, num:num, den:den, mag:mag, x:x});
                break;
            case 248: // post
                var p = readi(arr, ptr, 4); ptr += 4; // pointer
                var num = readu(arr, ptr, 4); ptr += 4; // unsigned
                var den = readu(arr, ptr, 4); ptr += 4; // unsigned
                var mag = readu(arr, ptr, 4); ptr += 4; // unsigned
                var l = readi(arr, ptr, 4); ptr += 4; // dimension
                var u = readi(arr, ptr, 4); ptr += 4; // dimension
                var s = readu(arr, ptr, 2); ptr += 2; // unsigned
                var t = readu(arr, ptr, 2); ptr += 2; // unsigned
                code.push({op:'post', p:p, num:num, den:den, mag:mag, l:l, u:u, s:s, t:t});
                break;
            case 249: // post_post
                var q = readi(arr, ptr, 4); ptr += 4; // pointer
                var i = arr[ptr++]; // unsigned
                for (; ptr < len; ptr++) {
                    if (arr[ptr++] != 223) {
                        ;; // postamble error
                    }
                }
                code.push({op:'post_post', q:q, i:i});
                break;
            case 250: case 251: case 252: case 253: case 254:
                // name = "reserved";
                // rem = "未定義";
                break;
            case 255: // dir (pTeX)
                var d = arr[ptr++]; // 0:yoko 1:tate
                code.push({op:'dir', d:d});
                break;
            default:
                break;
            } // endswitch
        } // endif
        // dumped += "["+ op + "]<b>"+ name + "</b> " + args +" <i>// "+ rem +" </i><br>\n";
    } // endfor
    return code;
}
