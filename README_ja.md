# dvi.js

JavaScriptでdviプレビューアを書いてみるというネタ
(see http://naoyat.hatenablog.jp/entry/2012/12/10/000000)

## 動機

ブログでTeX数式を使いたい、のだけれどそこだけ画像で埋め込むと何か不自然な感じになってちょっと嫌。地の文章もTeXで書きたい。TeXでブログを書けないかな？

かといって、dviファイルをPDFに変換して公開、だと最早ブログじゃないし…

というか今のJavaScriptとCSSならdvi出力をごにょごにょリアルタイムに変換してそのまま表示できるんじゃないか？

と思ってdviをブラウザ上でJavaScriptで展開してjQueryで動的に画面を組み立ててみるテストがこれ

## デモ

http://naoyat.github.com/dvi.js/

## 道のり

* dviファイル（バイナリ！）の読み込み
* 組版命令のデコード
* TeXの中身の日本語がJISコードなのでUnicodeに変換
* spanブロックを絶対位置に配置していく
* とか普通に実装すると1文字1文字がspanになる。嫌
* なので、文字列としてくっつけられる所はできるだけくっつける的モードもある（が、文字の位置はずれる。ちょっと高度な計算をして何とかならないか）
* [NEW!] TFM/JFMの情報を使ってきっちり揃える！
* [NEW!] Webフォント（というかその元になってるbakomaフォント）では0x00-0x20のグリフが0xA0以降に移動しているのでそれに対応したらπもff/ffl/ffiも数式記号もちゃんと出るようになった！

## 使い方

このhtmlファイルと同じ階層にある sample.dvi を読み込んで表示する例

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

## 現状

だいぶ綺麗に出るようになった。
iPhoneでも綺麗に出るけど１ページ目しか見えないので、フリックでページ遷移とかしたい。

## TODO

* コピペfriendlyなモードを作る → clustering modeを作った。`http://path/to/index.html?dvi=hogehoge&cluster=1`
* TFMの置き場を考える（現状１ディレクトリにひとまとめ）→ webフォントが用意できているTFMをJS化した
* システムフォントのメトリクスとの誤差を考慮 →Macでは見れているがWindows、Linuxでどうなのか
* dvi.min.js 的な物を作る →作った
* 英語の紹介ページを作る →とりあえずgithubは英語化

## 謝辞

* 日本語TeXテクニカルブックI (アスキー出版局, 1990)
* [Using TeX fonts in HTML](http://jadzia.bu.edu/~tsl/using-tex-fonts-in-html/)
* こんなネタをやる気になったきっかけをくれた [TeX & LaTeX Advent Calendar 2012](http://atnd.org/events/34318)

## ライセンス

MIT License

## 作者

(c)2012 @naoya_t


