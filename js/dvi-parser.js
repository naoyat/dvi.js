var CLUSTER_MODE = false;
var BOX_MODE = false;
var VERBOSE_MODE = false;

var PX_PER_BP = 1.3325; // 1bp = 1.33px
var BP_PER_PT = 72 / 72.27; // 72.27pt = 72bp
var PX_PER_PT = PX_PER_BP * BP_PER_PT;

var JFM_SHRINK = 0.962216;
var JFM_HSHRINK = 0.9164428;
var TFM_LOAD_ON_DEMAND = false;

var V_THRESHOLD = 10.0; // 10pt
var SEPARATE_BY_FONT = true;
var USE_THINSP = false;
var THIN_SPACE_THRESHOLD = 0.3;

var dvi = undefined;

var AGENT_UNKNOWN = 0;
var AGENT_CHROME  = 1;
var AGENT_FIREFOX = 2;
var AGENT_SAFARI  = 3;
var user_agent;
if (navigator.userAgent.search(/Chrome/) != -1) {
    user_agent = AGENT_CHROME;
} else if (navigator.userAgent.search(/Firefox/) != -1) {
    user_agent = AGENT_FIREFOX;
} else if (navigator.userAgent.search(/Safari/) != -1) {
    user_agent = AGENT_SAFARI;
} else { // default
    user_agent = AGENT_UNKNOWN;
}

var args = (function (querystring) {
    var args = {};
    var pair = querystring.split('&');
    for (var i = 0; i < pair.length; ++i) {
        var kv = pair[i].split('=');
        if (kv.length == 1 && args.dvi == undefined)
            args.dvi = querystring;
        else
            args[kv[0]] = kv[1];
  }
  return args;
})(location.search.substring(1));

if (args.cluster != undefined) CLUSTER_MODE = (args.cluster == 1);
if (args.box != undefined) BOX_MODE = (args.box == 1);
if (args.verbose != undefined) VERBOSE_MODE = (args.verbose == 1);
if (args.sbf != undefined) SEPARATE_BY_FONT = (args.sbf == 1);

document.onkeydown = dvi_keyevent;
var page_mode = 0;

function show_page_0() {
    if (!TFM_LOAD_ON_DEMAND) {
        dvi.page(0);
        return;
    }

    if (tfm_loading_count > 0) {
        if (page_mode == 0) {
            $(dvi.target).children().remove();
            $('<span />').text("now rendering...").css({ "text-decoration": "blink" }).appendTo(dvi.target);
        }
        ++page_mode;
        setTimeout(show_page_0, 0.1);
    } else {
        // $(dvi.target)[0].innerHTML = "<pre>" + dump_tfms() + "</pre>";
        dvi.page(0);
        page_mode = -1;
    }
}

function dvi_load(out, file, navi) {
    if (!file.match(/.*\.dvi/)) {
        file += ".dvi";
    }
    getBinary(file, function(arraybuf) {
        var arr = new Uint8Array(arraybuf);
        var insts = parse_dvi(arr);
        // dvi = rejoin_chars(grouping(insts));
        dvi = grouping(insts);
        dvi.target = out;
        dvi.navi = navi;
        dvi.curr_page = 0;

        dvi.next_page = function () {
            if (this.curr_page < this.pages.length - 1) {
                this.page(++this.curr_page);
            }
        };
        dvi.prev_page = function () {
            if (this.curr_page > 0) {
                this.page(--this.curr_page);
            }
        };
        dvi.page = function (page_no) {
            if (0 <= page_no && page_no < this.pages.length)
                show_page(this, this.curr_page = page_no);
            else if (-this.pages.length+1 <= page_no && page_no < 0)
                show_page(this, this.curr_page = (this.pages.length + page_no));
        };

        if (navi != undefined) {
            $(navi).css({ position:"absolute", top:"5px", left:"5px", border:"1px solid #cccccc", "background-color":"#eeeeee" });
            $('<button>⇤</button>')
                .css('font-size','120%')
                .click(function(){dvi.page(0);})
                .appendTo(navi);
            $('<button>←</button>')
                .css('font-size','120%')
                .click(function(){dvi.prev_page();})
                .appendTo(navi);
            $('<span id="page_no">1</span>')
                .css('font-size','120%')
                .appendTo(navi);
            $('<button>→</button>')
                .css('font-size','120%')
                .click(function(){dvi.next_page();})
                .appendTo(navi);
            $('<button>⇥</button>')
                .css('font-size','120%')
                .click(function(){dvi.page(-1);})
                .appendTo(navi);
        };
        show_page_0();
    });
}


function dvi_keyevent(evt) {
    switch (evt.keyCode) {
        case 32: // space
            break;
        case 37: case 38: case 72: case 75: case 80: // left up h k p
            if (dvi != undefined) dvi.prev_page();
            break;
        case 32: case 39: case 40: case 74: case 76: case 78: // spc right down j l n
            if (dvi != undefined) dvi.next_page();
            break;
        default: break;
    }
}

function rule(h, v, width, height, dir, color) {
    var left   = 72 + h / 65536 * BP_PER_PT,
        bottom = 72 + v / 65536 * BP_PER_PT,
        top,
        wd = width / 65536 * BP_PER_PT,
        ht = height / 65536 * BP_PER_PT;

    if (dir == 0) {
        top = bottom - ht;
    } else {
        top = bottom;
        var tmp = ht; ht = wd; wd = tmp;
    }

    $('<span />').css({
        position: "absolute",
        /* border: "0.1px solid", */
        'background-color': color,
        top: p_2f(top)+"pt",
        left: p_2f(left)+"pt",
        width: p_2f(wd)+"pt",
        height: p_2f(ht)+"pt",
        'min-width': "1px",
        'min-height': "1px"
    }).appendTo(dvi.target);
}


function putc(h, v, font_info, str, w, dir, color) {
    var writing_mode = (dir == 0) ? '' : 'vertical-rl';
    var x = 72 + h/65536 * BP_PER_PT,
        y = 72 + v/65536 * BP_PER_PT,
        wd = w/65536 * BP_PER_PT;
    var pt = font_info.s/65536 * BP_PER_PT;
    // var pt = font_info.d / 65536;
    var css = { color: color };

    if (BOX_MODE) {
        css.border = "solid 1px #9999cc";
        css.color = "#333366";
    }

    var family_ = font_info.file.replace(/[1-9][0-9]*$/, "");
    if (dir == 0) {
        if (family_ == 'min' || family_ == 'goth'
            || family_ == 'jis' || family_ == 'jisg') {
        }
        /// y -= ht;

        css.top = p_2f(y)+"pt";
        css.left = p_2f(x)+"pt";
        css.width = "3px"; // p_2f(w)+"pt";
        css.height = "0px"; // p_2f(pt)+"pt";
    } else {
        if (family_ == 'tmin' || family_ == 'tgoth') {
            x -= pt * 0.2;
        } else {
            x -= pt * 0.3;
            css['-moz-transform'] =  "rotate(90deg)";
        }

        css.top = p_2f(y)+"pt";
        css.left = p_2f(x)+"pt";
        css.width = "0px"; // p_2f(pt)+"pt";
        css.height = "3px"; // p_2f(w*2)+"pt";
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

    if (SEPARATE_BY_FONT)
        $("<span class='k"+ font_info.k +"'/>").html(str).css(css).appendTo(dvi.target);
    else
        $("<span class='k"+ font_info.k +"'/>").text(str).css(css).appendTo(dvi.target);
}

function puts(h, v, font_info, str, w, color) {
    var width_on_canvas = strWidth(font_info, str); // px
    if (VERBOSE_MODE)
        console.log(":sw: "+ p_2f(width_on_canvas/PX_PER_PT) +" | "+ p_2f(w/65536));
    var sp = w/65536 * PX_PER_PT - width_on_canvas; // px

    if (VERBOSE_MODE)
        console.log("[SETS] '" + str + " ("+ str.length +")', at ("+ p_2f(h/65536) +", "+ p_2f(v/65536) +"), width="+ p_2f(w/65536) +" ; sp="+ p_2f(sp));

    var x = 72 + h/65536 * BP_PER_PT,
        y = 72 + v/65536 * BP_PER_PT,
        wd = w/65536 * BP_PER_PT;
    var spc = sp / (str.length - 1);

    var css = {
        color: color,
        'letter-spacing': p_2f(Math.floor(spc+0.5)) +'px',
        top: p_2f(y) +'pt',
        left: p_2f(x) +'pt',
        width: p_2f(wd) +'pt',
        height: '0px'
    };
    if (SEPARATE_BY_FONT)
        $("<span class='k"+ font_info.k +"'/>").html(str).css(css).appendTo(dvi.target);
    else
        $("<span class='k"+ font_info.k +"'/>").text(str).css(css).appendTo(dvi.target);
}


function font_desc(font_info) {
    var font_size = font_info.s/65536 * PX_PER_PT; // px
    var family = font_info.file;
    if (family.match(/[^c]?min/) || family.match(/jis[^g]?/)) {
        font_size *= JFM_HSHRINK;
        family = "'ヒラギノ明朝 Pro W3','ＭＳ 明朝'";
    } else if (family.match(/goth/) || family.match(/jisg/)) {
        font_size *= JFM_HSHRINK;
        family = "'ヒラギノ角ゴ Pro W3','ＭＳ ゴシック'";
    } else {
        family = "'" + family + "'";
    }
    return p_2f(font_size)+"px "+ family;
};

function css_for_font(font_info) {
    return {
        position: 'absolute',
        // color: color,
        'line-break': "none",
        // 'text-align': "justify",
        // 'text-justify': "inter-ideograph",
        'font': font_desc(font_info),
        'white-space': "nowrap"
    };
}

function add_font_class(font_infos) {
    var style = '';
    for (var k in font_infos) {
        var font_info = font_infos[k];
        style += 'span.k'+ k +' {\n';
        var css = css_for_font(font_info);
        for (var name in css) {
            style += '  '+ name +': '+ css[name] + ';\n';
        }
        style += '}\n';
    }
    // console.log('<style>'+ style + '</style>');
    $('<style>' + style + '</style>').appendTo('head');
}

var ruler_span;

function strWidth(font_info, str) { // px
    var css = css_for_font(font_info), width;
    css['letter-spacing'] = '0px';
    if (SEPARATE_BY_FONT)
        width = ruler_span.html(str).css(css).get(0).offsetWidth;
    else
        width = ruler_span.text(str).css(css).get(0).offsetWidth;
    ruler_span.empty();
    return width; //  / PX_PER_PT;
}

function vert_adjust(font_info) {
    var tfm = tfms[font_info.file];

    var scaled_size = font_info.s / 65536; // ポイント数
    // var design_size = font_info.d / 65536; // デザイン・サイズ
    // var r = scaled_size / 10;
    var pt = scaled_size;
    var h_ = 0;
    if (tfm.type == 'jfm') {
        // 日本語のフォントは上に1/6余白がある
        switch (user_agent) {
        case AGENT_SAFARI:
            h_ = tfm.max_height * font_info.scale + pt*0.3;
            break;
        default:
            h_ = tfm.max_height * font_info.scale + pt*0.18;
            break;
        }
    } else {
        h_ = tfm.max_height * font_info.scale;
    }
    return h_ * 65536;
}

function horiz_adjust(font_info) {
    var tfm = tfms[font_info.file];

    var scaled_size = font_info.s / 65536; // ポイント数
    // var design_size = font_info.d / 65536; // デザイン・サイズ
    // var r = scaled_size / 10;
    var pt = scaled_size;
    var v_ = 0;
    if (tfm.type == 'jfm') {
        switch (user_agent) {
        case AGENT_CHROME:
        default:
            v_ = pt*(1/2 + 0.18 + 0.2);
            break;
        case AGENT_FIREFOX:
            v_ = pt*(-1/2 + 0.18);
            break;
        case AGENT_SAFARI:
            v_ = pt*(1/2 + 0.18 + 0.3);
            break;
        }
    } else {
        switch (user_agent) {
        case AGENT_CHROME:
            v_ = pt*(0.125 + 0.1) + tfm.max_height * font_info.scale;
            break;
        case AGENT_SAFARI:
            v_ = pt*(0.125 + 0.08) + tfm.max_height * font_info.scale;
            break;
        case AGENT_FIREFOX:
        default:
            v_ = pt*0.125 + tfm.max_height * font_info.scale;
            break;
        }
    }
    return v_ * 65536;
}

function show_page(dvi, page_no) {
    var rendering_starts_at = new Date();

    var page = dvi.pages[page_no];
    var font_infos = dvi.font_infos;

    if (dvi.navi != undefined) {
        $('#page_no')[0].innerHTML = (1 + page_no);
    }
    $(dvi.target).children().remove();
    ruler_span = $('<span />').text('').appendTo(dvi.target);

    var h = 0, v = 0, w = 0, x = 0, y = 0, z = 0, f = undefined;
    var st = [];
    var color = "Black", colorst = [];
    var dir = 0;
    var tfm = undefined;

    var lya = { 0x2421:1, 0x2423:1, 0x2425:1, 0x2427:1, 0x2429:1, // ぁぃぅぇぉ
                0x2443:1, 0x2463:1, 0x2465:1, 0x2467:1, 0x246E:1, // っゃゅょゎ
                0x2521:1, 0x2523:1, 0x2525:1, 0x2527:1, 0x2529:1, // ァィゥェォ
                0x2543:1, 0x2563:1, 0x2565:1, 0x2567:1, 0x256E:1, // ッャュョヮ
                0x2575:1, 0x2576:1 }; // ヵヶ

    var cluster_start_h = undefined, cluster_start_v = undefined, num_cluster_chars = 0, cluster_string = "";
    var last_set_h = undefined, last_set_v = undefined, last_c = undefined, last__ = undefined;
    var cluster_width = 0; // , h_total_space = 0;

    function puts_so_far() {
        if (num_cluster_chars > 0) {
            v_adjust = -vert_adjust(font_infos[f]);
            puts(cluster_start_h, cluster_start_v+v_adjust, font_infos[f], cluster_string, cluster_width, color);
        }
        cluster_start_h = cluster_start_v = undefined;
        num_cluster_chars = 0;
        cluster_string = "";
        cluster_width = 0;
        last_set_h = last_set_v = undefined;
        last__ = last_c = undefined;
    }

    for (var j in page.insts) {
        var inst = page.insts[j];
        switch (inst.op) {
        case 'set': // orig
            if (tfm == undefined) break;

            var width = 0, height = 0;
            var info = (tfm[inst.c] == undefined) ? tfm[0] : tfm[inst.c];
            width += info.w * font_infos[f].scale * 65536;

            if (cluster_start_h == undefined) {
                cluster_start_h = h;
                cluster_start_v = v;
            }
            if (last_set_h == undefined) {
                last_set_h = h;
                last_set_v = v;
            }

            if (CLUSTER_MODE) {
                var lift = (cluster_start_v - v) / 65536;
                if (Math.abs(lift) < V_THRESHOLD) {
                    var h_space = h - last_set_h;
                    if (h_space > 1.0 * 65536) { // 1pt以上のスペースに関して
                        // ignore negative spaces (= kerning)
                        if (h_space < font_infos[f].s * THIN_SPACE_THRESHOLD) {
                            if (VERBOSE_MODE)
                                console.log("[SET] thin space detected "+ p_2f(h_space/65536) + " < " + p_2f(font_infos[f].s * THIN_SPACE_THRESHOLD / 65536));
                            if (USE_THINSP) {
                                cluster_string += String.fromCharCode(0x2009); //"&thinsp;";
                                ++num_cluster_chars;
                                // var thin_space = font_infos[f].s * 0.25;
                                // h_total_space += (h_space - thin_space);
                            }
                        } else {
                            var space_threshold = THIN_SPACE_THRESHOLD;
                            if (last__ == '、' || last__ == '。') {
                                // 単なる補正なので
                                space_threshold = 0.5;
                            }
                            if (h_space > font_infos[f].s * space_threshold) {
                                if (VERBOSE_MODE)
                                    console.log("[SET] space detected "+ p_2f(h_space/65536));
                                cluster_string += " ";
                                ++num_cluster_chars;
                                // var single_space = font_infos[f].s * 0.325;
                                // h_total_space += (h_space - single_space);
                            }
                        }
                    } else {
                        // h_total_space += h_space;
                    }
                    cluster_width += h_space;
                    if (VERBOSE_MODE)
                        console.log("[SET]+ '"+ inst._ +"' at ("+ p_2f(h/65536) +", "+ p_2f(v/65536) +"), width="+ p_2f(width/65536));
                    /*
                    if (lift > 2.0) {
                        cluster_string += "<sup>"+ inst._ +"</sup>";
                    } else if (lift < -2.0) {
                        cluster_string += "<sub>"+ inst._ +"</sub>";
                    } else {
                        cluster_string += inst._;
                    }
                     */
                    cluster_string += inst._;
                    ++num_cluster_chars;
                    cluster_width += width;

                } else {
                    // lift > THRESHOLD
                    if (CLUSTER_MODE) { 
                        puts_so_far();
                        cluster_start_h = h;
                        cluster_start_v = v;
                        ++num_cluster_chars;
                        cluster_string = inst._;
                        cluster_width = width;
                    }
                    if (VERBOSE_MODE)
                        console.log("\n[SET]! '"+ inst._ +"' at ("+ p_2f(h/65536) +", "+ p_2f(v/65536) +"), width="+ p_2f(width/65536));
                }

                last_set_h = h + width;
                last_set_v = v;
                last__ = inst._;
                last_c = inst.c;

                if (dir == 0) {
                    h += width;
                } else {
                    v += width;
                }
                // CLUSTER_MODE
            } else {
                // NON CLUSTER_MODE
                var h_adjust = 0, v_adjust = 0;
                if (inst.c > 256 && info.w < tfm[0].w) {
                    if (inst.c == 0x2126) { // ・
                        h_adjust = (info.w - tfm[0].w)/2 * font_infos[f].scale * 65536;
                    } else if (lya[inst.c] != undefined) { // ぁぃぅぇぉゃゅょっ
                        if (dir == 0) { // 横
                            h_adjust = (info.w - tfm[0].w)/2 * font_infos[f].scale * 65536;
                        } else { // 縦
                            h_adjust = (info.w - tfm[0].w)/2.5 * font_infos[f].scale * 65536;
                        }
                    } else if ((0x2146 <= inst.c && inst.c <= 0x215B) & !(inst.c & 1)) { // open-paren
                        h_adjust = (info.w - tfm[0].w) * font_infos[f].scale * 65536;
                    }
                }
                if (dir == 0) {
                    v_adjust = -vert_adjust(font_infos[f]);
                    putc(h+h_adjust, v+v_adjust, font_infos[f], inst._, width, dir, color);
                    h += width;
                } else {
                    v_adjust = horiz_adjust(font_infos[f]);
                    putc(h+v_adjust, v+h_adjust, font_infos[f], inst._, width, dir, color);
                    v += width;
                }
            } // NON CLUSTER MODE
            break;

        case 'sets':
            var str = inst.s;
            var width = 0, height = 0;
            if (tfm == undefined) {
                console.log("tfm = undefined");
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

            putc(h, v, font_infos[f], str, width, dir, color);
            if (dir == 0) {
                h += width;
            } else {
                v += width;
            }
            break;

        case 'set_rule':
            if (VERBOSE_MODE)
                console.log("[RULE] at ("+ p_2f(h/65536) +", "+ p_2f(v/65536) +"), width="+ p_2f(inst.b/65536) + ", height="+ p_2f(inst.a/65536));
            rule(h, v, inst.b, inst.a, dir, color);
            if (dir == 0) {
                h += inst.b;
            } else {
                // rule(h, v, -inst.a, inst.b, dir);
                v += inst.b;
            }
            // var height = inst.a / 65536;
            // var width = inst.b / 65536;
            break;

        case 'put_rule':
            rule(h, v, inst.b, inst.a, dir, color);
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
            if (h != last_h || v != last_v) {
                if (VERBOSE_MODE)
                    console.log("[POP] (x,y) += ("+ p_2f((h-last_h)/65536) +", "+ p_2f((v-last_v)/65536) +")");
            }
            break;

        case 'right':
            if (VERBOSE_MODE)
                console.log("[RIGHT] x += "+ p_2f(inst.b/65536));
            if (dir == 0) {
                h += inst.b;
            } else {
                v += inst.b;
            }
            break;

        case 'w':
            if (inst.b) w = inst.b;
            if (VERBOSE_MODE)
                console.log("[W] x += "+ p_2f(w/65536));
            if (dir == 0) {
                h += w;
            } else {
                v += w;
            }
            break;

        case 'x':
            if (inst.b) x = inst.b;
            if (VERBOSE_MODE)
                console.log("[X] x += "+ p_2f(x/65536));
            if (dir == 0) {
                h += x;
            } else {
                v += x;
            }
            break;

        case 'down':
            if (VERBOSE_MODE)
                console.log("[DOWN] y += "+ p_2f(inst.a/65536));
            if (dir == 0) {
                v += inst.a;
            } else {
                h -= inst.a;
            }
            break;

        case 'y':
            if (inst.a) y = inst.a;
            if (VERBOSE_MODE)
                console.log("[Y] y += "+ p_2f(y/65536));
            if (dir == 0) {
                v += y;
            } else {
                h -= y;
            }
            break;

        case 'z':
            if (inst.a) z = inst.a;
            if (VERBOSE_MODE)
                console.log("[Z] y += "+ p_2f(z/65536));
            if (dir == 0) {
                v += z;
            } else {
                h -= z;
            }
            break;

        case 'fnt':
            if (CLUSTER_MODE && SEPARATE_BY_FONT) puts_so_far();

            f = inst.k;
            tfm = tfms[font_infos[f].file];
            if (VERBOSE_MODE)
                console.log("[FNT] "+ font_infos[f].file + " " + p_2f(font_infos[f].s/65536) + "pt");
            break;

        case 'fnt_def':
            // font_info[inst.k] = inst;
            break;

        case 'xxx':
            if (inst.x.match(/color (.*)/)) {
                var cmd = RegExp.$1;
                if (cmd.match(/push +(.*)/)) {
                    colorst.push(color);
                    var arg = RegExp.$1;
                    if (arg.match(/rgb ([^ ]+) ([^ ]+) ([^ ]+)/)) {
                        var r = Math.floor(255 * RegExp.$1),
                            g = Math.floor(255 * RegExp.$2),
                            b = Math.floor(255 * RegExp.$3);
                        color = '#' + p_0x(2,r) + p_0x(2,g) + p_0x(2,b);
                    } else if (arg.match(/cmyk ([^ ]+) ([^ ]+) ([^ ]+) ([^ ]+)/)) {
                        var c = RegExp.$1,
                            m = RegExp.$2,
                            y = RegExp.$3,
                            k = RegExp.$4;
                        var r = Math.floor(255 * (1 - Math.min(1, c+k))),
                            g = Math.floor(255 * (1 - Math.min(1, m+k))),
                            b = Math.floor(255 * (1 - Math.min(1, y+k)));
                        color = '#' + p_0x(2,r) + p_0x(2,g) + p_0x(2,b);
                    } else {
                        color = arg;
                    }
                } else if (cmd.match(/pop/)) {
                    color = colorst.pop();
                }
            }
            break;

        case 'dir':
            dir = inst.d;
            break;

        default:
            break;
        }
    }

    if (CLUSTER_MODE) puts_so_far();

    var rendering_ends_at = new Date();
    console.log("PAGE "+ (1 + page_no) + ": RENDERING TIME = "+ p_2f((rendering_ends_at - rendering_starts_at)/1000) + "sec");
}

function dump_code(insts) {
    var dumped = insts.length + " instructions\n";
    for (var i in insts) {
        var inst = insts[i];
        dumped += JSON.stringify(inst).replace(/,/g,", ").replace(/"/g,"") + "\n";
    }
    return dumped;
}

function grouping(insts) {
    var dvi = {
        preamble: undefined,
        pages: [],
        postamble: undefined,
        font_infos: {}
    };

    var stack = [];
    var count = undefined;

    for (var i in insts) {
        var inst = insts[i];

        switch (inst.op) {
        case 'pre':
            dvi.preamble = inst;
            break;

        case 'bop':
            count = inst.c;
            break;
        case 'eop':
            dvi.pages.push({count:count, insts:stack});
            stack = [];
            break;

        case 'post':
            dvi.postamble = inst;
            break;
        case 'post_post':
            break;

        case 'fnt_def':
            if (dvi.font_infos[inst.k] == undefined) {
                inst.scale = inst.s / inst.d;
                dvi.font_infos[inst.k] = inst;
                if (TFM_LOAD_ON_DEMAND) tfm_load(inst.file);
                else {
                    if (tfms[inst.file] == undefined) {
                        console.log("NOT LOADED: " + inst.file);
                    }
                }
            }
            break;

        default:
            stack.push(inst);
            break;
        }
    }

    add_font_class(dvi.font_infos);
    return dvi;
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
            case 250: case 251: case 252: case 253: case 254: // reserved
                break;
            case 255: // dir (pTeX)
                var d = arr[ptr++]; // 0:yoko 1:tate
                code.push({op:'dir', d:d});
                break;
            default:
                break;
            } // endswitch
        } // endif
    } // endfor
    return code;
}
