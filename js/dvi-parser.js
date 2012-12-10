var DO_REJOIN = false;
//var DO_REJOIN = true;
var REJOIN_W = true;
var BOX_MODE = false;

var PX_PER_PT = 1.3325;
var PT72_PER_PT = 72 / 72.27;
var JFM_SHRINK = 0.962216;
var JFM_HSHRINK = 0.9164428;

var dvi = undefined;
var dvi_curr_page = 0;

document.onkeydown = dvi_keyevent;
$(window).flickable();
var page_mode = 0;

/*
function render_dvi(arr) {
    var insts = parse_dvi(arr);
    var document = grouping(insts);
    document = rejoin_chars(document);

    for (var j in document.pages) {
        show_page(document.pages[j], document.font_info);
    }
}
*/

function show_page_0() {
    if (tfm_loading_count > 0) {
        // console.log("setTimeout..");
        if (page_mode == 0) {
            $('#out').children().remove();
            $('<span />', { text: "now rendering..." }).css({ "text-decoration": "blink" }).appendTo('#out');
        }
        ++page_mode;
        setTimeout(show_page_0, 0.1);
    } else {
        show_page(dvi.pages[0], dvi.font_info);
        page_mode = -1;
    }
}
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
        show_page_0();
    });
}

function dvi_keyevent(evt) {
    // console.log("keyCode = "+ evt.keyCode);
    switch (evt.keyCode) {
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

function rule(h, v, width, height, dir, color) {
    var left   = 72 + h / 65536 * PT72_PER_PT,
        bottom = 72 + v / 65536 * PT72_PER_PT,
        top,
        wd = width / 65536 * PT72_PER_PT,
        ht = height / 65536 * PT72_PER_PT;

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
        height: sprintf("%.2fpt", ht),
        'min-width': "1px",
        'min-height': "1px"
    }).appendTo('#out');
}

function puts(h, v, width, height, dir, font_info, str, color) {
    var writing_mode = (dir == 0) ? '' : 'vertical-rl';
    var x = 72 + h / 65536 * PT72_PER_PT,
        y = 72 + v / 65536 * PT72_PER_PT,
        w = width / 65536 * PT72_PER_PT,
        ht = height / 65536 * PT72_PER_PT;
    // var pt = font_info.s / 0.9164428 / 65536 * PT72_PER_PT;
    var pt = font_info.s / 65536 * PT72_PER_PT;
    var family = font_info.file;
    if (family.match(/[^c]?min/) || family.match(/jis[^g]?/)) {
        pt *= JFM_HSHRINK;
        family = "'ヒラギノ明朝 Pro W3','ＭＳ 明朝'";
    } else if (family.match(/goth/) || family.match(/jisg/)) {
        pt *= JFM_HSHRINK;
        family = "'ヒラギノ角ゴ Pro W3','ＭＳ ゴシック'";
    } else {
        family = "'" + family + "'";
    }
    // var pt = font_info.d / 65536;
/*
    if (font_info.d != font_info.s)
        console.log(sprintf("%s: d=%.2f, s=%.2f", font_info.file, font_info.d/65536, font_info.s/65536));
*/
    var css = {
        position: "absolute",
        color: color,
        'text-align': "justify",
        'text-justify': "inter-ideograph",
        'line-break': "none",
//        'letter-spacing': "-1px",
        'text-autospace': "none",
        font: sprintf("%.1fpt %s", pt, family),
        'white-space': "nowrap"
        // 'display': 'inline-block',
        // 'line-height': "normal",
        // 'vertical-align': 'baseline'
    };

    if (BOX_MODE) {
        css.border = "solid 1px #9999cc";
        css.color = "#333366";
    }

    var family_ = font_info.file.replace(/[1-9][0-9]*$/, "");
    if (dir == 0) {
        if (family_ == 'min' || family_ == 'goth'
            || family_ == 'jis' || family_ == 'jisg') {
            // height 0.916443, width 0.962216
//            y -= pt * 0.9; // * 0.8; //0.916443;
            // css['-webkit-transform'] = "scale(0.962216, 0.916443)";
            // css['-moz-transform'] = "scale(0.962216, 0.916443)";
        } else { 
//            y -= pt * 0.63; // * 0.5; // 666;
        }
        y -= ht;
        
        css.top = sprintf("%.2fpt", y);
        css.left = sprintf("%.2fpt", x);
        css.width = "3px"; //sprintf("%.2fpt", w);
        css.height = "0px"; //sprintf("%.2fpt", pt);
    } else {
        if (family_ == 'tmin' || family_ == 'tgoth') {
            x -= pt * 0.2;
            // y -= pt * 0.5;
            //x -= pt * 0.5;
        } else {
            x -= pt * 0.3;
            //x -= pt * 0.;
        }
        
        css.top = sprintf("%.2fpt", y);
        css.left = sprintf("%.2fpt", x);
        css.width = sprintf("%.2fpt", pt);
        css.height = sprintf("%.2fpt", w*2);
        // IE
        css['writing-mode'] = 'vertical-rl';
        // Firefox
        css['-moz-writing-mode'] = 'vertical-rl'; // 効かない
        css['-moz-font-feature-settings'] = '"vert","vrt2"';
        // css['-moz-transform'] =  "translate(0em, -0.3em) rotate(0deg)";
        // Chrome
        css['-webkit-writing-mode'] = 'vertical-rl';
        // Opera
        css['-o-writing-mode'] = 'vertical-rl';
    }

//    $('<div />', {
    $('<span />', {
        text: str
    }).css(css).appendTo('#out');
}

function strWidth(font_info, str) {
    var family = font_info.file;
    var pt = font_info.s / 65536 * PT72_PER_PT;
    if (family.match(/[^c]?min/) || family.match(/jis[^g]?/)) {
        pt *= JFM_SHRINK;
        family = "'ヒラギノ明朝 Pro W3','ＭＳ 明朝'";
    } else if (family.match(/goth/) || family.match(/jisg/)) {
        pt *= JFM_SHRINK;
        family = "'ヒラギノ角ゴ Pro W3','ＭＳ ゴシック'";
    } else {
        family = "'" + family + "'";
    }
    var font_desc = sprintf("%.1fpt %s", pt*10, family);
    // console.log("font_desc = "+ font_desc);
    var canvas = document.getElementById('metrics');
    if (canvas.getContext) {
        var context = canvas.getContext('2d');
        context.font = font_desc;
        // context['writing-mode'] = 'vertical-rl';
        // context['-webkit-writing-mode'] = 'vertical-rl';
        var metrics = context.measureText(str);
        var width = metrics.width / PX_PER_PT / PT72_PER_PT / 10;
        // console.log(sprintf("strWidth(%s) = %.2f", str, width));
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
    var tfm = undefined;

    var lya = { 0x2421:1, 0x2423:1, 0x2425:1, 0x2427:1, 0x2429:1, // ぁぃぅぇぉ
                0x2443:1, 0x2463:1, 0x2465:1, 0x2467:1, 0x246E:1, // っゃゅょゎ
                0x2521:1, 0x2523:1, 0x2525:1, 0x2527:1, 0x2529:1, // ァィゥェォ
                0x2543:1, 0x2563:1, 0x2565:1, 0x2567:1, 0x256E:1, // ッャュョヮ
                0x2575:1, 0x2576:1 }; // ヵヶ

    for (var j in page.insts) {
        var inst = page.insts[j];
        switch (inst.op) {
        case 'set': // orig
            var width = 0, height = 0;
            if (tfm == undefined) {
                width = strWidth(font_info[f], inst._) * 65536;
                height = font_info[f].s;
            } else {
                var info = (tfm[inst.c] == undefined) ? tfm[0] : tfm[inst.c];
                // console.log("info.width of "+ inst._ +" = "+ info.w);
                width += info.w * font_info[f].scale * 65536;
                var adjust = 0;
                if (inst.c > 256 && info.w < tfm[0].w) {
                    if (inst.c == 0x2126) { // ・
                        adjust = (info.w - tfm[0].w)/2 * font_info[f].scale * 65536;
                    } else if (lya[inst.c] != undefined) { // ぁぃぅぇぉゃゅょっ
                        if (dir == 0) { // 横
                            adjust = (info.w - tfm[0].w)/2 * font_info[f].scale * 65536;
                        } else { // 縦
                            adjust = (info.w - tfm[0].w)/2.5 * font_info[f].scale * 65536;
                        }
                    } else if ((0x2146 <= inst.c && inst.c <= 0x215B) & !(inst.c & 1)) { // open-paren
                        adjust = (info.w - tfm[0].w) * font_info[f].scale * 65536;
                    }
/*
                    if (adjust != 0) {
                        console.log(sprintf("width of %s: %.2f/%.2f * %.2f = %.2f; adjust = %.2f",
                                            inst._,
                                            info.w, tfm[0].w,
                                            font_info[f].scale,
                                            info.w * font_info[f].scale,
                                            adjust));
                    }
*/
                }

                var scaled_size = font_info[f].s / 65536; // ポイント数
                var design_size = font_info[f].d / 65536; // デザイン・サイズ
                var r = scaled_size / 10;
                // font_info[f].scale : TFMからの拡大率

                //var xh = 9.1644287109375/10 * scaled_ptsize;
                var h_;
                if (tfm.type == 'jfm') {
                    // h_ = 7.77587890625/9.1644287109375 * scaled_size; // .848484
                    h_ = 0.9 * scaled_size;
                    //xh = tfm.x_height * 1.44 * font_info[f].scale;
                } else {
                    /// xh = 6.1/10 * scaled_size;
                    var xh = tfm.x_height / (design_size / 10);
                    // h_ = (7.77587890625 + xh*.9)/9.1644287109375/2 * scaled_size;
                    h_ = (8.484848484 + xh*1.25)/10/2 * scaled_size;
                    // 1.25は適当
                }
                height = h_ * 65536;
            }
            if (dir == 0) {
                puts(h+adjust, vofs+v, width, height, dir, font_info[f], inst._, color);
                h += width;
            } else {
                puts(h, vofs+v+adjust, width, height, dir, font_info[f], inst._, color);
                v += width;
            }
            break;
        case 'sets':
            var str = inst.s;
            var width = 0, height = 0;
            if (tfm == undefined) {
                width = strWidth(font_info[f], str) * 65536;
                width -= strWidth(font_info[f], " ") * 65536 * inst.sp;
                height = font_info[f].s;
            } else {
                for (var i in inst.c) {
                    var c = inst.c[i];
                    var info = (tfm[c] == undefined) ? tfm[0] : tfm[c];
                    width += info.w * 65536;
                    height = info.h * 65536;
                }
                var sp = (tfm[0x20] == undefined) ? tfm[0] : tfm[0x20];
                width -= info.w * 65536 * inst.sp;
            }
            width += inst.w;

            puts(h, vofs+v, width, height, dir, font_info[f], str, color);
            if (dir == 0) {
                h += width;
            } else {
                v += width;
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
            break;
        case 'right':
            if (dir == 0) {
                h += inst.b;
            } else {
                v += inst.b;
            }
            break;
        case 'w':
            if (inst.b) w = inst.b;
            if (dir == 0) {
                h += w;
            } else {
                v += w;
            }
            break;
        case 'x':
            if (inst.b) x = inst.b;
            if (dir == 0) {
                h += x;
            } else {
                v += x;
            }
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
            tfm = tfms[font_info[f].file];
            // var info = font_info[inst.k];
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
        var sets_c = [], sets_s = "", sets_w = 0, sets_sp = 0;
        for (var j in page.insts) {
            var inst = page.insts[j];
            // console.log("> "+ JSON.stringify(inst));
            var skip = false;
            switch (inst.op) {
            case 'set':
                if (DO_REJOIN) {
                    sets_c.push(inst.c);
                    sets_s += inst._;
                    skip = true;
                }
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
                if (sets_c.length > 0) {
                    rejoined_insts.push({op:'sets', c:sets_c, s:sets_s, w:sets_w, sp:sets_sp});
                    sets_c = []; sets_s = ""; sets_w = 0; sets_sp = 0;
                    // console.log("pop occurred when sets_c# = "+ sets_c.length);
                }
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
                if (REJOIN_W && f != undefined && sets_c.length > 0) {
                    // console.log(f);
                    // console.log(JSON.stringify(document.font_info[f]));
                    var em = Math.floor(4 * inst.b / document.font_info[f].s);
                    if (em >= -1) {
                        if (em >= 1) { // for (var k = 0; k < em; k++) {
                            sets_c.push(0x20);
                            sets_s += ' ';
                            sets_sp++;
                        }
                        sets_w += inst.b;
                        skip = true;
                    }
                }
                break;
            case 'w':
                if (inst.b) w = inst.b;
                if (dir == 0) {
                    h += w;
                } else {
                    v += w;
                }
                // skipping
                if (REJOIN_W && f != undefined && sets_c.length > 0) {
                    var em = Math.floor(4 * w / document.font_info[f].s);
                    if (em >= -1) {
                        if (em >= 1) { // for (var k = 0; k < em; k++) {
                            sets_c.push(0x20);
                            sets_s += ' ';
                            sets_sp++;
                        }
                        sets_w += w;
                        skip = true;
                    }
                }
                break;
            case 'x':
                if (inst.b) x = inst.b;
                if (dir == 0) {
                    h += x;
                } else {
                    v += x;
                }
                // skipping
                if (REJOIN_W && f != undefined && sets_c.length > 0) {
                    var em = Math.floor(4 * x / document.font_info[f].s);
                    if (em >= -1) {
                        if (em >= 1) { // for (var k = 0; k < em; k++) {
                            sets_c.push(0x20);
                            sets_s += ' ';
                            sets_sp++;
                        }
                        sets_w += x;
                        skip = true;
                    }
                }
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
                rejoined_insts.push({op:'sets', c:sets_c, s:sets_s, w:sets_w, sp:sets_sp});
                sets_c = []; sets_s = ""; sets_w = 0; sets_sp = 0;
            }
            rejoined_insts.push(inst);
        } // endfor

        if (sets_c.length > 0) {
            rejoined_insts.push({op:'sets', c:sets_c, s:sets_s, w:sets_w, sp:sets_sp});
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
            if (document.font_info[inst.k] == undefined) {
                inst.scale = inst.s / inst.d;
                document.font_info[inst.k] = inst;
                tfm_load(inst.file);
            }
            break;

        default:
            stack.push(inst);
            break;
        }
    }

    // console.log(JSON.stringify(document));

    return document;
}

function bakoma(c) {
    if (c <= 0x09) return 0xa1 + c;
    if (c <= 0x20) return 0xad + (c - 0x0a);
    if (c <= 0x7e) return c;
    return 0xc4;
}

function parse_dvi(arr) {
    var len = arr.length;
    var code = [];

    for (var ptr = 0; ptr < len; ) {
        var op = arr[ptr++];
        if (op < 128) { //   0..127
            var c = op;
            code.push({op:'set', c:c, _:String.fromCharCode(bakoma(c))});
        } else if (op <= 170) { // 128..170
            switch (op) {
            case 128: case 129: case 130: case 131: // set1 .. set4
                // オリジナルの TeX 2.xxではset命令は使わない
                // 日本語TeXでは set2 命令で漢字（JISコード）を指定する
                var bytes = op - 127;
                var c = readu(arr, ptr, bytes); ptr += bytes;
                if (c < 256) {
                    code.push({op:'set', c:c, _:String.fromCharCode(c)});
                } else if (c < 65536) {
                    code.push({op:'set', c:c, _:jis2uc(c)});
                }
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
