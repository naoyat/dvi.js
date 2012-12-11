
JS_SRC = js/jis2uc.js js/binary.js js/tfms.js js/dvi-parser.js # js/tfm-loader.js
all: dvi.min.js

js/jis2uc.js: data/iso-2022-jp-2004-std.txt isotable.awk
	awk -f isotable.awk data/iso-2022-jp-2004-std.txt > js/jis2uc.js

dvi.min.js: build.json $(JS_SRC) texfonts.css
	./minify.js build.json
	rm -f undefined
