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
/*
  var s = "readu(";
  for (var i = 0; i < bytes; i++) {
      s += " " + p0x(2, arr[ofs+i]);
  }
  s += ") -> " + x;
  console.log(s);
*/
  return x;
}
function readi(arr, ofs, bytes) {
  var x = arr[ofs];
  if (x >= 128) x -= 256;
  for (var i = 1; i < bytes; i++) {
    x = x * 256 + arr[ofs+i];
  }
/*
  var s = "readi(";
  for (var i = 0; i < bytes; i++) {
      s += " " + p0x(2, arr[ofs+i]);
  }
  s += ") -> " + x;
  console.log(s);
*/
  return x;
}
function reads(arr, ofs, bytes) {
  var s = "";
  for (var i = 0; i < bytes; i++) {
    s += String.fromCharCode(arr[ofs+i]);
  }
  return s;
}

var dvi_engine = {
    dvi: undefined,
    len: 0,

    load_dvi: function(arr) {
        dvi = arr;
        len = arr.length;
    },
    set_char: function(c) {
        console.log("set_char "+ c);
        // name = "set_char_"+ c;
        // dumped += " '"+ String.fromCharCode(op) +"'";
        // rem = "文字 ch(f,"+ op +") を (h,v) に描画，h ← h + w(f,"+ op +")";
    },
    set_rule: function(a,b) {
        // name = "setrule";
        // args = "a="+ a + " b="+ b;
        // rem = "高さ a，幅 b で箱を (h,v) に描画，h ← h+b";
    },
    put: function(c) {
        // name = "put"+ j;
        // args = "c="+ c;
        // rem = "文字 ch(f,"+ c +") を (h,v) に描画";
    },
    put_rule: function(a,b) {
        // args = "a="+ a + " b="+ b;
        // rem = "高さ a，幅 b で箱を (h,v) に描画";
    },
    nop: function() {
        // rem = "何もしない";
    },
    bop: function(c,p) {
        // h = v = w = x = y = 0;
        // st = [];
        // args = "...";
        // rem = "ページの始まり，(h,v,w,x,y) ← 0，スタックを空に";
    },
    eop: function() {
        // rem = "ページの終わり";
    },
    push: function() {
        console.log("push");
        // st.push([h,v,w,x,y,z]);
        // rem = " (h,v,w,x,y,z) をスタックに待避";
    },
    pop: function() {
        console.log("pop");
        // var u = st.pop();
        // h = u[0]; v = u[1]; w = u[2]; x = u[3]; y = u[4]; z = u[5];
        // rem = " (h,v,w,x,y,z) をスタックから戻す";
    },
    right: function(b) {
        // h += b;
        // args = "b="+ b;
        // rem = "h ← h+"+ b;
    },
    w0: function() {
        // h += w;
        // rem = "h ← h+w";
    },
    set_w: function(b) {
        // h += b; w = b;
        // args = "b="+ b;
        // rem = "h ← h+b，w ← b";
    },
    x0: function() {
        // h += x;
        // rem = "h ← h+x";
    },
    set_x: function(b) {
        // h += b; x = b;
        // args = "b="+ b;
        // rem = "h ← h+b, x ← b";
    },
    down: function(a) {
        // v += a;
        // args = "a="+ a;
        // rem = "v ← v+a";
    },
    y0: function() {
        // h += y;
        // rem = "h ← h+y";
    },
    set_y: function(a) {
        // h += a; y = a;
        // args = "a="+ a;
        // rem = "h ← h+a，y ← a";
    },
    z0: function() {
        // h += z;
        // rem = "h ← h+z";
    },
    set_z: function(a) { // z1 .. z4
        // h += a; z = a;
        // args = "a="+ a;
        // rem = "h ← h+a，z ← a";
    },
    fnt: function(f) { // fnt_num_0 .. fnt_num_63, fnt1, fnt2, fnt3, fnt4a
        // name = "fntnum"+ f;
        // rem = "f ← "+ f;
    },
    xxx: function(x) { // xxx1 .. xxx4 (special)
        // name = "xxx"+ j;
        // args = "k="+ k + " x=\""+ x_ + "\"";
        // rem = "special の文字列 x，意味は任意";
    },
    fntdef: function(c,s,d,dir,file) {
        // args = "k="+ k +" c="+ c +" s="+ s +" d="+ d +" a="+ a_ +" l="+ l_ +" n=\""+ n + "\"";
        // rem = "フォント k の定義";
    },
    pre: function(i,num,den,mag,x) {
        // var unit = num/den*1e-7;
        // args = "ver="+ dvi_version +" num="+ num +" den="+ den +" unit="+ unit +" mag="+ mag +" comment=\""+ comment +"\"";
        // rem = "プリアンブル始まり";
    },
    post: function(p,num,den,mag,l,u,s,t) {
        // args = "p="+ p +" num="+ num +" den="+ den +" unit="+ unit +" mag="+ mag +" l="+ l_ +" u="+ u_ +" s="+ s_ +" t="+ t_;
        // rem = "ポストアンブル始まり";
    },
    post_post: function(q,i) {
        // rem = "ポストアンブル終わり";
    },
    dir: function(d) {
        // args = "o="+ o;
        // rem = "横書き／縦書き切替（pTeX），元来は未定義";
    }
};

function dvidump(arr) {
/*
    var len = arr.length;
    var c = [0,0,0,0,0,0,0,0,0,0];
    var h = 0; // カレントポイントの水平位置
    var v = 0; // カレントポイントの垂直位置
    var w = 0, x = 0; // 水平移動量の変数
    var y = 0, z = 0; // 垂直移動量の変数
    var f = undefined; // カレントフォント
    var st = []; // stack
    var e = dvi_engine;
*/
    var pass1_code = pass1(arr);
    var dumped = dump_pass1_code(pass1_code);

    var pass2_code = pass2(pass1_code);
    var dumped = dump_pass2_code(pass2_code);
//     dumped = JSON.stringify(pass2_code);
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
function dump_pass2_code(pass2_code) {
    // A4: 約 8.27 × 約 11.69 インチ = 597.67pt x 844.84pt
    var dumped = (pass2_code.length - 2) + " pages<br>\n";
    var font_info = {};

    for (var i in pass2_code) {
        var insts = pass2_code[i];
        switch (insts[0].op) {
        case 'pre':
            dumped += "<h3>preamble</h3>\n";
            if (insts[0].num != 25400000 || insts[0].den != 473628672) {
                dumped += "<p>ILLEGAL num/den</p>\n";
            }
            var mag = insts[0].mag/1000;
            if (mag != 1)
                dumped += "<p>mag = "+ mag + "</p>\n";
            dumped += "<p><i>"+ insts[0].x + "</i></p>\n";
            break;
        case 'bop':
            var page = insts[0].c[0];
            var h = 0, v = 0, w = 0, x = 0, y = 0, z = 0, f = undefined;
            var st = [];
            dumped += "<h3>p."+ page + "</h3>\n";
            dumped += "<p>";
            for (var j = 1; ; j++) {
                var inst = insts[j];
                if (inst.op == 'eop') break;
                switch (inst.op) {
                case 'set':
                    if (inst.c < 128)
                        dumped += String.fromCharCode(inst.c);
                    else if (inst.c < 256)
                        dumped += " \\x"+ p0x(2, inst.c) +" ";
                    else if (inst.c < 65536)
                        dumped += jis2uc(inst.c); //p0x(4, inst.c) +" ";
                    break;
                case 'set_rule':
                    var height = inst.a / 65536;
                    var width = inst.b / 65536;
                    dumped += sprintf("{■:%.1f x %.1f}", width, height);
                    break;
                case 'push':
                    st.push([h,v,w,x,y,z]);
                    break;
                case 'pop':
                    var last_h = h, last_v = v;
                    var tmp = st.pop();
                    h = tmp[0]; v = tmp[1]; w = tmp[2]; x = tmp[3]; y = tmp[4]; z = tmp[5];
                    var dh = h - last_h, dv = v - last_v;
                    dumped += "\n" + delta(dh, dv);
                    break;
                case 'right':
                    h += inst.b;
                    var dh = inst.b / 65536;
                    dumped += delta(dh, 0);
                    break;
                case 'w':
                    if (inst.b) w = inst.b;
                    h += w;
                    var dh = w / 65536;
                    dumped += delta(dh, 0);
                    break;
                case 'x':
                    if (inst.b) x = inst.b;
                    h += x;
                    var dh = w / 65536;
                    dumped += delta(dh, 0);
                    break;
                case 'down':
                    v += inst.a;
                    var dv = inst.a / 65536;
                    dumped += delta(0, dv);
                    break;
                case 'y':
                    if (inst.a) y = inst.a;
                    v += y;
                    var dv = y / 65536;
                    dumped += delta(0, dv);
                    break;
                case 'z':
                    if (inst.a) z = inst.a;
                    v += z;
                    var dv = z / 65536;
                    dumped += delta(0, dv);
                    break;
                case 'fnt':
                    var info = font_info[inst.k];
                    // dumped += "<font color=#6666cc>{font"+ inst.k + ":"+ info.file +"}</font>";
                    dumped += "<font size=2 color=\"#9999cc\">{"+ info.file +"}</font>";
                    break;
                case 'fnt_def':
                    font_info[inst.k] = inst;
                    // dumped += "<font color=#6666cc>{font "+ inst.k + ":=" + inst.file +"}</font>";
                    break;
                case 'xxx':
                    dumped += "<font size=2 color=\"#cccc99\">{special "+ inst.x + "}</font>";
                    break;
                case 'dir':
                    var dirs = ["横", "縦"];
                    dumped += "<font size=2 color=\"#99cc99\">&lt;"+ dirs[inst.d] + "&gt;</font>";
                    break;
                default:
                    break;
                }
            }
            dumped += "</p>\n";
            break;
        case 'post':
            dumped += "<h3>postamble</h3><p>\n";
            dumped += "max height+depth = " + insts[0].l/65536 + "<br>\n";
            dumped += "max width = " + insts[0].u/65536 + "<br>\n";
            dumped += "stack depth = " + insts[0].s + "<br>\n";
            dumped += "total pages = " + insts[0].t + "</p>\n";
            break;
        }
        // dumped += ":"+ i +":"+ JSON.stringify(inst) + " ... <br>\n";
    }
    return dumped;
}
function dump_pass1_code(pass1_code) {
    var dumped = pass1_code.length + " instructions<br>\n";
    for (var i in pass1_code) {
        var inst = pass1_code[i];
        dumped += ":"+ i +":"+ JSON.stringify(inst) + "<br>\n";
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
            code.push({op:'set', c:c});
        } else if (op <= 170) { // 128..170
            switch (op) {
            case 128: case 129: case 130: case 131: // set1 .. set4
                // オリジナルの TeX 2.xxではset命令は使わない
                // 日本語TeXでは set2 命令で漢字（JISコード）を指定する
                var bytes = op - 127;
                var c = readu(arr, ptr, bytes); ptr += bytes;
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