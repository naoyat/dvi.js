
var tfms = {};
var tfm_loading_count = 0;

function tfm_load(font_file) {
    var url = "tfm/" + font_file + ".tfm";
    console.log(font_file + ": loading...");
    tfm_loading_count++;

    getBinary(url, function(arraybuf) {
        var arr = new Uint8Array(arraybuf);
        var tfm = parse_tfm(arr, font_file);
        if (tfm != undefined) {
            tfm.font_file = font_file;
            tfms[font_file] = tfm;
        } else {
            console.log(font_file + ": not found");
        }
        tfm_loading_count--;
    });
}

function parse_tfm(arr, font_file) {
    if (arr.length < 24) {
        console.log(font_file + ": arr.length < 24");
        return undefined;
    }

    var lf = readu(arr, 0, 2);
    // console.log(font_file + ": lf = "+ lf);
    if (lf == 11 || lf == 9) {
        return parse_jfm(arr, font_file);
        // return undefined;
    }
    if (arr.length != lf*4) {
        console.log(font_file +": arr.length != lf*4");
        return undefined;
    }

    var lh = readu(arr, 2, 2),
        bc = readu(arr, 4, 2),
        ec = readu(arr, 6, 2),
        nw = readu(arr, 8, 2),
        nh = readu(arr, 10, 2),
        nd = readu(arr, 12, 2),
        ni = readu(arr, 14, 2),
        nl = readu(arr, 16, 2),
        nk = readu(arr, 18, 2),
        ne = readu(arr, 20, 2),
        np = readu(arr, 22, 2);
    if (6 + lh + (ec - bc + 1) + nw + nh + nd + ni + nl + nk + ne + np != lf) {
        console.log(font_file + ": 6 + lh + (ec - bc + 1) + nw + nh + nd + ni + nl + nk + ne + np != lf");
        return undefined;
    }

    var tfm = {
        lf:lf, lh:lh, bc:bc, ec:ec,
        nw:nw, nh:nh, nd:nd, ni:ni, nl:nl, nk:nk, ne:ne, np:np,
        header:[], char_info:[], width:[],
        height:[], depth:[], italic:[],
        lig_kern:[], kern:[], exten:[], param:[]
    };

    // header
    var ofs = 24;
    for (var j = 0; j < lh; j++) {
        tfm.header.push( readu(arr, ofs, 4) );
        ofs += 4;
    }

    tfm.checksum = tfm.header[0];
    tfm.design_size = tfm.header[1];

    // char_info
    for (var c = bc; c <= ec; c++) {
        tfm.char_info.push({ w: arr[ofs], // width_index
                             h: arr[ofs+1] >> 4, // height_index
                             d: arr[ofs+1] & 15, // depth_index
                             i: arr[ofs+2] >> 2, // italic_index,
                             t: arr[ofs+2] & 3, // tag,
                             r: arr[ofs+3] });
        ofs += 4;
    }
    // width
    for (var j = 0; j < nw; j++) {
        tfm.width.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // height
    for (var j = 0; j < nh; j++) {
        tfm.height.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // depth
    for (var j = 0; j < nd; j++) {
        tfm.depth.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // italic
    for (var j = 0; j < ni; j++) {
        tfm.italic.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // lig_kern
    for (var j = 0; j < nl; j++) {
        tfm.lig_kern.push({ s: arr[ofs],
                            c: arr[ofs+1],
                            o: arr[ofs+2],
                            r: arr[ofs+3] });
        ofs += 4;
    }
    // kern
    for (var j = 0; j < nk; j++) {
        tfm.kern.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // exten
    for (var j = 0; j < ne; j++) {
        tfm.exten.push({ h: arr[ofs],
                         b: arr[ofs+1],
                         f: arr[ofs+2],
                         c: arr[ofs+3] });
        ofs += 4;
    }
    // param
    for (var j = 0; j < np; j++) {
        tfm.param.push(readu(arr, ofs, 4));
        ofs += 4;
    }

    // rearrange
    var tfm2 = {};
    var ds = tfm.design_size / 1048576;
    for (var c = tfm.bc; c <= tfm.ec; c++) {
        var ci = tfm.char_info[c - tfm.bc];
        if (ci.w == 0) continue;

        var info = {
            w: tfm.width[ci.w]  * ds / 1048576,
            h: tfm.height[ci.h] * ds / 1048576,
            d: tfm.depth[ci.d]  * ds / 1048576,
            i: tfm.italic[ci.i] * ds / 1048576
        };

        switch (ci.t) { // tag
        case 0:
            break;
        case 1: // lig/kern へのインデックス
            info.lig_kern = tfm.lig_kern[ci.r];
            break;
        case 2: // リンク情報
            break;
        case 3: // exten へのインデックス
            info.exten = tfm.exten[ci.r];
            break;
        }
        tfm2[c] = info;
    }
    return tfm2;
}


function parse_jfm(arr, font_file) {
    if (arr.length < 28) {
        console.log(font_file + ": arr.length < 28");
        return undefined;
    }

    var id = readu(arr, 0, 2); // JFM_ID番号 = 11
    if (id != 11 && id != 9) {
        console.log(font_file + ": id = "+ id);
        return undefined;
    }

    var nt = readu(arr, 2, 2), // char_typeテーブルのワード数
        lf = readu(arr, 4, 2);
    // console.log("parse_jfm. nt="+ nt + ", lf="+ lf +", a/l = "+ arr.length);

    if (arr.length != lf*4) {
        console.log(font_file + ": nt="+ nt +", lf="+ lf +"; arr.length="+ arr.length);
        return undefined;
    }

    var lh = readu(arr, 6, 2),
        bc = readu(arr, 8, 2), // = 0
        ec = readu(arr, 10, 2), // = max(char_type)
        nw = readu(arr, 12, 2),
        nh = readu(arr, 14, 2),
        nd = readu(arr, 16, 2),
        ni = readu(arr, 18, 2),
        nl = readu(arr, 20, 2),
        nk = readu(arr, 22, 2),
        ne = readu(arr, 24, 2),
        np = readu(arr, 26, 2);
    if (7 + lh + nt + (ec - bc + 1) + nw + nh + nd + ni + nl + nk + ne + np != lf) {
        console.log("lfs = "+ (7 + lh + nt + (ec - bc + 1) + nw + nh + nd + ni + nl + nk + ne + np) +", rhs = "+ lf);
        return undefined;
    }

    var jfm = {
        id:id, nt:nt,
        lf:lf, lh:lh, bc:bc, ec:ec,
        nw:nw, nh:nh, nd:nd, ni:ni, nl:nl, nk:nk, ne:ne, np:np,
        header:[], char_type:[], char_info:[], width:[],
        height:[], depth:[], italic:[],
        lig_kern:[], kern:[], exten:[], param:[]
    };

    // header
    var ofs = 28;
    for (var j = 0; j < lh; j++) {
        jfm.header.push( readu(arr, ofs, 4) );
        ofs += 4;
    }

    jfm.checksum = jfm.header[0];
    jfm.design_size = jfm.header[1];

    // char_type
    for (var j = 0; j < nt; j++) {
        jfm.char_type.push({ code: readu(arr, ofs, 2),
                             type: readu(arr, ofs+2, 2) });
        ofs += 4;
    }
    // char_info
    for (var c = bc; c <= ec; c++) {
        jfm.char_info.push({ w: arr[ofs], // width_index
                             h: arr[ofs+1] >> 4, // height_index
                             d: arr[ofs+1] & 15, // depth_index
                             i: arr[ofs+2] >> 2, // italic_index,
                             t: arr[ofs+2] & 3, // tag,
                             r: arr[ofs+3] });
        ofs += 4;
    }
    // width
    for (var j = 0; j < nw; j++) {
        jfm.width.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // height
    for (var j = 0; j < nh; j++) {
        jfm.height.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // depth
    for (var j = 0; j < nd; j++) {
        jfm.depth.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // italic
    for (var j = 0; j < ni; j++) {
        jfm.italic.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // lig_kern
    for (var j = 0; j < nl; j++) {
        jfm.lig_kern.push({ s: arr[ofs],
                            c: arr[ofs+1],
                            o: arr[ofs+2],
                            r: arr[ofs+3] });
        ofs += 4;
    }
    // kern
    for (var j = 0; j < nk; j++) {
        jfm.kern.push(readu(arr, ofs, 4));
        ofs += 4;
    }
    // exten
    for (var j = 0; j < ne; j++) {
        jfm.exten.push({ h: arr[ofs],
                         b: arr[ofs+1],
                         f: arr[ofs+2],
                         c: arr[ofs+3] });
        ofs += 4;
    }
    // param
    for (var j = 0; j < np; j++) {
        jfm.param.push(readu(arr, ofs, 4));
        ofs += 4;
    }

    // rearrange
    var jfm2 = {};
    var ds = jfm.design_size / 1048576;
    for (var j = 0; j < nt; j++) {
        var char_type = jfm.char_type[j],
            code = char_type.code,
            type = char_type.type;

        var ci = jfm.char_info[type];
        if (ci.w == 0) continue;

        var info = {
            w: jfm.width[ci.w]  * ds / 1048576,
            h: jfm.height[ci.h] * ds / 1048576,
            d: jfm.depth[ci.d]  * ds / 1048576,
            i: jfm.italic[ci.i] * ds / 1048576
        };

        switch (ci.t) { // tag
        case 1: // lig/kern へのインデックス
            info.lig_kern = jfm.lig_kern[ci.r];
            break;
        case 0: case 2: case 3:
            break;
        }
        jfm2[code] = info;
    }
    // console.log("JFM2 "+ JSON.stringify(jfm2));
    return jfm2;
}
