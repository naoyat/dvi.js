
all: dvi.min.js

js/jis2uc.js: data/iso-2022-jp-2004-std.txt isotable.awk
	awk -f isotable.awk data/iso-2022-jp-2004-std.txt > js/jis2uc.js

dvi.min.js: build.json
	./minify.js build.json
	rm -f undefined
