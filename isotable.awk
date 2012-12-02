BEGIN {
  OFS = "\t";

  split("0 1 2 3 4 5 6 7 8 9 A B C D E F", zz, " ");
  for (i=0; i<16; i++) {
    h2d[zz[1+i]] = i;
  }
}

/^#/ { next }
/Unicode3\.1/ { next }

function ofs(s,   a) {
  a = h2d[substr(s,1,1)]
  a = a*16 + h2d[substr(s,2,1)]
  return a - 33;
}
function h4d(s, a) {
  a = h2d[substr(s,1,1)]
  a = a*16 + h2d[substr(s,2,1)]
  a = a*16 + h2d[substr(s,3,1)]
  a = a*16 + h2d[substr(s,4,1)]
  return a;
}

($1 ~ /^[34]-[2-7][0-9A-F][2-7][0-9A-F]$/ && $2 ~ /^U\+[0-9A-F][0-9A-F][0-9A-F][0-9A-F]$/) {
  split($1, ar, "-")
  t = ar[1]
  jis = ar[2]

  uc = $2;
  gsub(/^U\+/, "", uc)

  h = ofs(substr(jis, 1, 2))
  l = ofs(substr(jis, 3, 2))
#  print t, h,sprintf("%x",ofs(h)), l,sprintf("%x",ofs(l)), uc
  if (dic[h,l]) next;
  else dic[h,l] = h4d(uc)
#  print t, h, l, uc
}

function print_utf8(d) {
  # printf("U+%04X:", d)
  if (d < 0) {
    ;
  } else if (d < 128) {
    printf("%c", d)
  } else if (d < 2048) {
    printf("%c", 192 + int(d/64))
    printf("%c", 128 + (d % 64))
  } else if (d < 65536) {
    printf("%c", 224 + int(d/4096))
    printf("%c", 128 + (int(d/64) % 64))
    printf("%c", 128 + (d % 64))
  } else {
    ;
  }
}

END {
  printf("var jis2uc_ = [\n")
  for (h=0; h<94; h++) {
    printf("  [")
    for (l=0; l<94; l++) {
      d = dic[h,l]
      if (d) {
        printf("\"")
        print_utf8(d)
        printf("\"")
      } else {
        printf("undefined")
      }
      if (l < 93) printf(",");
    }
    printf("]")
    if (h < 93) printf(",\n");
  }
  printf("\n];\n")

  printf("\nfunction jis2uc(jis) {\n")
  printf("  var hi = (jis >> 8) - 0x21, lo = (jis & 255) - 0x21;\n")
  printf("  return jis2uc_[hi][lo];\n")
  printf("}\n")
}