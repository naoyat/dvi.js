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
  return s.substring(s.length - pad);
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

function u(arr, ofs, bytes) {
  var x = 0;
  for (var i = 0; i < bytes; i++) {
    x = x * 256 + arr[ofs+i];
  }
  return x;
}
function st(arr, ofs, bytes) {
  // return hexdump(arr, ofs, bytes);
  var s = "";
  for (var i = 0; i < bytes; i++) {
    s += String.fromCharCode(arr[ofs+i]);
  }
  return s;
}

function dvidump(arr) {
  var len = arr.length;

  var c = [0,0,0,0,0,0,0,0,0,0];
  var h = 0; // カレントポイントの水平位置
  var v = 0; // カレントポイントの垂直位置
  var w = 0, x = 0; // 水平移動量の変数
  var y = 0, z = 0; // 垂直移動量の変数
  var f = undefined; // カレントフォント

  var dumped = "";
  for (var ptr = 0; ptr < len; ) {
    var op = arr[ptr++];
    var name = "???", args = "", rem = "";
    if (op < 128) {
      name = "setchar"+ op;
      // dumped += " '"+ String.fromCharCode(op) +"'";
      rem = "文字 ch(f,"+ op +") を (h,v) に描画，h ← h + w(f,"+ op +")";
    } else if (171 <= op && op <= 234) {
      f = op - 171;
      name = "fntnum"+ f;
      rem = "f ← "+ f;
    } else {
      switch (op) {
      case 128: case 129: case 130: case 131: // set_j
        var j = op - 127;
        name = "set" + j;
        var c = u(arr, ptr, j); ptr += j;
        args = "c="+ c;
        rem = "文字 ch(f,"+ c +") を (h,v) に描画，h ← h + w(f,"+ c +")";
        break;
      case 132: // setrule
        name = "setrule";
        var a = u(arr, ptr, 4); ptr += 4;
        var b = u(arr, ptr, 4); ptr += 4;
        args = "a="+ a + " b="+ b;
        rem = "高さ a，幅 b で箱を (h,v) に描画，h ← h+b";
        break;
      case 133: case 134: case 135: case 136: // put_j
        var j = op - 132;
        name = "put"+ j;
        var c = u(arr, ptr, j); ptr += j;
        args = "c="+ c;
        rem = "文字 ch(f,"+ c +") を (h,v) に描画";
        break;
      case 137: // putrule - 高さ a，幅 b で箱を (h,v) に描画
        name = "putrule";
        var a = u(arr, ptr, 4); ptr += 4;
        var b = u(arr, ptr, 4); ptr += 4;
        args = "a="+ a + " b="+ b;
        rem = "高さ a，幅 b で箱を (h,v) に描画";
        break;
      case 138: // nop
        name = "nop";
        rem = "何もしない";
        break;
      case 139: // bop
        name = "bop";
        for (var i = 0; i < 10; i++) {
          c[i] = u(arr, ptr, 4); ptr += 4;
        }
        var p = u(arr, ptr, 4); ptr += 4;
        h = v = w = x = y = 0;
        // empty stack
        args = "...";
        rem = "ページの始まり，(h,v,w,x,y) ← 0，スタックを空に";
        break;
      case 140: // eop
        name = "eop";
        rem = "ページの終わり";
        break;
      case 141: // push
        name = "push";
        rem = " (h,v,w,x,y,z) をスタックに待避";
        break;
      case 142: // pop
        name = "pop";
        rem = " (h,v,w,x,y,z) をスタックから戻す";
        break;
      case 143: case 144: case 145: case 146: // right_j
        var j = op - 142;
        name = "right"+ j;
        var b = u(arr, ptr, j); ptr += j;
        h += b;
        args = "b="+ b;
        rem = "h ← h+b";
        break;
      case 147: // w0
        name = "w0";
        h += w;
        rem = "h ← h+w";
        break;
      case 148: case 149: case 150: case 151: // w_j
        var j = op - 147;
        name = "w"+ j;
        var b = u(arr, ptr, j); ptr += j;
        h += b; w = b;
        args = "b="+ b;
        rem = "h ← h+b，w ← b";
        break;
      case 152: // x0
        name = "x0";
        h += x;
        rem = "h ← h+x";
        break;
      case 153: case 154: case 155: case 156: // x_j
        var j = op - 152;
        name = "x"+ j;
        var b = u(arr, ptr, j); ptr += j;
        h += b; x = b;
        args = "b="+ b;
        rem = "h ← h+b, x ← b";
        break;
      case 157: case 158: case 159: case 160: // down_j
        var j = op - 156;
        name = "down"+ j;
        var a = u(arr, ptr, j); ptr += j;
        v += a;
        args = "a="+ a;
        rem = "v ← v+a";
        break;
      case 161: // y0
        name = "y0";
        h += y;
        rem = "h ← h+y";
        break;
      case 162: case 163: case 164: case 165: // y_j
        var j = op - 161;
        name = "y"+ j;
        var a = u(arr, ptr, j); ptr += j;
        h += a; y = a;
        args = "a="+ a;
        rem = "h ← h+a，y ← a";
        break;
      case 166: // z0
        name = "z0";
        h += z;
        rem = "h ← h+z";
        break;
      case 167: case 168: case 169: case 170: // z_j
        var j = op - 166;
        name = "z"+ j;
        var a = u(arr, ptr, j); ptr += j;
        h += a; z = a;
        args = "a="+ a;
        rem = "h ← h+a，z ← a";
        break;
      // 171..234: fntnum_j
      case 235: case 236: case 237: case 238: // fnt_j
        var j = op - 234;
        name = "fnt"+ j;
        var k = u(arr, ptr, j); ptr += j;
        args = "k="+ k;
        rem = "f ← k";
        break;
      case 239: case 240: case 241: case 242: // xxx_j (special)
        var j = op - 238;
        name = "xxx"+ j;
        var k = u(arr, ptr, j); ptr += j;
        var x_ = st(arr, ptr, k); ptr += k;
        args = "k="+ k + " x=\""+ x_ + "\"";
        rem = "special の文字列 x，意味は任意";
        break;
      case 243: case 244: case 245: case 246: // fntdef
        var j = op - 242;
        name = "fntdef"+ j;
        var k = u(arr, ptr, j); ptr += j;
        var c = u(arr, ptr, 4); ptr += 4;
        var s = u(arr, ptr, 4); ptr += 4;
        var d = u(arr, ptr, 4); ptr += 4;
        var a_ = arr[ptr++];
        var l_ = arr[ptr++];
        var n = st(arr, ptr, a_+l_); ptr += a_+l_;
        args = "k="+ k +" c="+ c +" s="+ s +" d="+ d +" a="+ a_ +" l="+ l_ +" n=\""+ n + "\"";
        rem = "フォント k の定義";
        break;
      case 247: // pre
        name = "pre";
        var dvi_version = arr[ptr++];
        var num = u(arr, ptr, 4); ptr += 4;
        var den = u(arr, ptr, 4); ptr += 4;
        var unit = num/den*1e-7;
        var mag = u(arr, ptr, 4)/1000; ptr += 4;
        var k = arr[ptr++];
        var comment = st(arr, ptr, k); ptr += k;
        args = "ver="+ dvi_version +" num="+ num +" den="+ den +" unit="+ unit +" mag="+ mag +" comment=\""+ comment +"\"";
        rem = "プリアンブル始まり";
        break;
      case 248: // post
        name = "post";
        var p = u(arr, ptr, 4); ptr += 4;
        var num = u(arr, ptr, 4); ptr += 4;
        var den = u(arr, ptr, 4); ptr += 4;
        var mag = u(arr, ptr, 4); ptr += 4;
        var l_ = u(arr, ptr, 4); ptr += 4;
        var u_ = u(arr, ptr, 4); ptr += 4;
        var s_ = u(arr, ptr, 2); ptr += 2;
        var t_ = u(arr, ptr, 2); ptr += 2;
        args = "p="+ p +" num="+ num +" den="+ den +" unit="+ unit +" mag="+ mag +" l="+ l_ +" u="+ u_ +" s="+ s_ +" t="+ t_;
        rem = "ポストアンブル始まり";
        break;
      case 249: // post_post
        name = "post_post";
        var q = u(arr, ptr, 4); ptr += 4;
        var i = arr[ptr++]; 
        rem = "ポストアンブル終わり";
        break;
      case 250: case 251: case 252: case 253: case 254:
        name = "reserved";
        rem = "未定義";
        break;
      case 255: // dir (pTeX)
        name = "dir";
        var o = arr[ptr++]; // 0:yoko 1:tate
        args = "o="+ o;
        rem = "横書き／縦書き切替（pTeX），元来は未定義";
        break;
      default:
        name = "**";
        break;
      }
    }
    dumped += "["+ op + "]<b>"+ name + "</b> " + args +" <i>// "+ rem +" </i><br>\n";
  }
  return dumped;
}