# dvi.js

A dvi previewer in JavaScript (with jQuery)
(see http://naoyat.hatenablog.jp/entry/2012/12/10/000000)

## demo

http://naoyat.github.com/dvi.js/

## usage

An example displaying `sample.dvi` in the same directory as this html:

```
<html>
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8" />
  <title>dvi.js demo</title>
  <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
  <script type="text/javascript" src="http://naoyat.github.com/dvi.js/dvi.min.js"></script>
  <link rel="stylesheet" type="text/css" href="http://naoyat.github.com/dvi.js/texfonts.min.css"></style>
</head>
<body onload="dvi_load('#out','sample.dvi','#navi');">

<div id="navi"></div>
<div id="out"></div>

</body>
</html>
```



## Author

@naoya_t
http://github.com/naoyat | http://twitter.com/naoya_t | http://naoyat.hatenablog.jp/

## License

(c)2012 @naoya_t, with MIT License

## Special Thanks

* [TeX & LaTeX Advent Calendar](http://atnd.org/events/34318) ... dvi.js was born as a joke for this Advent Calendar
* sample dvi files (and their authors) used in [demo page](http://naoyat.github.com/dvi.js/)
* [minify-js](https://github.com/garaemon/minify-js) (by @garaemon), used for minifying dvi.js

