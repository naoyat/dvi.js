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

function dvidump(arr) {
    var pass1_code = pass1(arr);
    var dumped = dump_pass1_code(pass1_code);
    console.log(dumped);

    var pass2_code = pass2(pass1_code);
    var dumped = dump_pass2_code(pass2_code);
    return dumped;
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

function puts(h, v, dir, font_info, str) {
    // var writing_mode = (dir == 0) ? 'lr-tb' : 'tb-rl'; // IE
    var writing_mode = (dir == 0) ? '' : 'vertical-rl'; // IE
    var x = 72.27 + h / 65536, y = 72.27 + v / 65536;
    var pt = font_info.s * 0.9 / 65536;
    var family = font_info.file.replace(/[1-9][0-9]*$/, "");
    if (dir == 0) {
        //y += pt * 0.7;
        // y += 9;
    } else {
        //y += pt * 1;
        x -= pt * 0.6;
        // x -= 5;
    }

    $('<div />', {
//        id: 'abc',
        text: str
    }).css({
        position: "absolute",
        top: y + "pt",
        left: x + "pt",
        'writing-mode': writing_mode,
        '-webkit-writing-mode': writing_mode,
        'font-family': family,
        'font-size': pt + "pt"
    }).appendTo('#out');
}

function strWidth(font_info, str) {
    var e = $("#ruler");
    var pt = font_info.s * 0.9 / 65536;
    var family = font_info.file.replace(/[1-9][0-9]*$/, "");
    e.css({
        'font-family': family,
        'font-size': pt + "pt"
    });
    var width = e.text(str).get(0).offsetWidth;
    e.empty();
    // console.log("strWidth("+ str + ") = "+ width);
    return width;
}

function show_page(insts, font_info) {
    var page_no = insts[0].c[0];
    // var vofs = 1000 * 65536 * page_no;
    var h = 0, v = 0, w = 0, x = 0, y = 0, z = 0, f = undefined;
    var st = [];
    // var font_info = {};
    var dir = 0;
    var font_size = 10 * 65536;

    for (var j = 1; ; j++) {
        var inst = insts[j];
        if (inst.op == 'eop') break;
        switch (inst.op) {
        case 'set':
            if (inst.c < 128) {
                var s = String.fromCharCode(inst.c);
                var width = strWidth(font_info[f], s) * 0.83; // * 0.9;
                puts(h, v, dir, font_info[f], s);
                if (dir == 0) {
                    h += width * 65536; // font_size * 0.6;
                } else {
                    v += width * 65536; // font_size * 0.6;
                }
            } else if (inst.c < 256) {
                /*
                puts( h, v, "\\x"+ p0x(2, inst.c) );
                h += 4.8 * 65536;
                 */
            } else if (inst.c < 65536) {
                var s = jis2uc(inst.c);
                var width = font_info[f].s * 0.93 / 65536; //strWidth(font_info[f], s) - 2;
                puts(h, v, dir, font_info[f], s);
                if (dir == 0) {
                    h += width * 65536;
                } else {
                    v += width * 65536;
                }
            } else {
            }
            break;
        case 'set_rule':
            if (dir == 0) {
                h += inst.b;
            } else {
                v += inst.b;
            }
            // var height = inst.a / 65536;
            // var width = inst.b / 65536;
            // dumped += sprintf("{■:%.1f x %.1f}", width, height);
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

function dump_pass2_code(pass2_code) {
    // A4: 約 8.27 × 約 11.69 インチ = 597.67pt x 844.84pt
    var pre = undefined, post = undefined, pages = [];
    for (var i in pass2_code) {
        var insts = pass2_code[i];
        switch (insts[0].op) {
        case 'pre': pre = insts; break;
        case 'bop': pages.push(insts); break;
        case 'post': post = insts; break;
        }
    }

    var font_info = {};
    for (var j in post) {
        if (post[j].op == 'fnt_def') {
            font_info[post[j].k] = post[j];
        }
    }
    for (var j in pages) {
        show_page(pages[j], font_info);
        break;
    }
}

function dump_pass1_code(pass1_code) {
    var dumped = pass1_code.length + " instructions\n";
    for (var i in pass1_code) {
        var inst = pass1_code[i];
        // dumped += ":"+ i +":"+ JSON.stringify(inst) + "\n";
        dumped += JSON.stringify(inst).replace(/,/g,", ").replace(/"/g,"") + "\n";
    }
    return dumped;
}

function pass2(pass1_code) {
    var code2 = [];
    var stack = [];
    for (var i in pass1_code) {
        var inst = pass1_code[i];
        // dumped += ":"+ inst +":"+ JSON.stringify(pass1_code[inst]) + "<br>\n";
        switch (inst.op) {
        case 'pre':
            stack.push(inst);
            code2.push(stack);
            stack = [];
            break;
        case 'bop':
            stack.push(inst);
            break;
        case 'eop':
            stack.push(inst);
            code2.push(stack);
            stack = [];
            break;
        case 'post':
            stack.push(inst);
            break;
        case 'post_post':
            stack.push(inst);
            code2.push(stack);
            stack = [];
            break;
        default:
            stack.push(inst);
            break;
        }
    }
    return code2;
}

function pass1(arr) {
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
                code.push({op:'xxx', x:x});
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