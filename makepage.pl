#!/usr/bin/perl -w
#
#  Quick & dirty script to make an index.html page for this font demonstration.
#  Todd S. Lehman, 2011/12/31
#
use strict;

use utf8;
binmode(STDIN,  ':utf8');
binmode(STDOUT, ':utf8');
binmode(STDERR, ':utf8');

my $fontlist = qq{
	# Normal fonts
	cmr5 cmr6 cmr7 cmr8 cmr9 cmr10 cmr12 cmr17
	cmbx5 cmbx6 cmbx7 cmbx8 cmbx9 cmbx10 cmbx12
	cmb10
	cmbxsl10
	cmbxti10
	cmti7 cmti8 cmti9 cmti10 cmti12
	cmmi5 cmmi6 cmmi7 cmmi8 cmmi9 cmmi10 cmmi12
	cmmib6 cmmib7 cmmib8 cmmib9 cmmib10
	cmsl8 cmsl9 cmsl10 cmsl12
	cmcsc8 cmcsc9 cmcsc10
	cmtcsc10
	cmtt8 cmtt9 cmtt10 cmtt12
	cmtex8 cmtex9 cmtex10
	cmitt10
	cmsltt10
	cmss8 cmss9 cmss10 cmss12 cmss17
	cmssdc10
	cmssbx10
	cmssi8 cmssi9 cmssi10 cmssi12 cmssi17
	cmssq8
	cmssqi8

	# Ugly fonts
	cmu10
	cmvtt10
	cmdunh10
	cmff10
	cmfi10
	cmfib8

	# Special math letters
	eufm5 eufm6 eufm7 eufm8 eufm9 eufm10
	eufb5 eufb6 eufb7 eufb8 eufb9 eufb10
	eurm5 eurm6 eurm7 eurm8 eurm9 eurm10
	eurb5 eurb6 eurb7 eurb8 eurb9 eurb10
	eusm5 eusm6 eusm7 eusm8 eusm9 eusm10
	eusb5 eusb6 eusb7 eusb8 eusb9 eusb10

	# Special math symbols
	cmsy5 cmsy6 cmsy7 cmsy8 cmsy9 cmsy10
	cmbsy6 cmbsy7 cmbsy8 cmbsy9 cmbsy10
	msam5 msam6 msam7 msam8 msam9 msam10
	msbm5 msbm6 msbm7 msbm8 msbm9 msbm10
	cmex7 cmex8 cmex9 cmex10

	euex7 euex8 euex9 euex10

	cminch
};

my $text1 = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 .,:;!?&‘“’”";
my $text2 = "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 0 1 2 3 4 5 6 7 8 9";

print <<EOT;
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<HTML>
<HEAD>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Using TeX fonts in HTML</TITLE>
<LINK REL="stylesheet" HREF="texfonts.css" TYPE="text/css" CHARSET="utf-8" />
<STYLE TYPE="text/css">
body {
  margin-left: 5em;
  margin-right: 5em;
  margin-top: 3em;
  margin-bottom: 3em;
}
.demo_ragged_right {
  text-align: left;
  margin-top: .5em;
  margin-bottom: 1em;
  border-left: .1em solid #CCC;
  border-right: .1em solid #CCC;
  background: #EEE;
}
.demo_right_justified {
  text-align: justify;
  margin-top: .5em;
  margin-bottom: 1em;
  border-left: .1em solid #CCC;
  border-right: .1em solid #CCC;
  background: #EEE;
}
</STYLE>
</HEAD>
<BODY BGCOLOR="#FFFFFF">

<TABLE BORDER=0 CELLPADDING=0 CELLSPACING=16>

<TR ALIGN=LEFT VALIGN=TOP>
<TD></TD>
<TD>
<P><BIG><B><DIV STYLE="font-family:'cmbx12';line-height:120%">Using T<SPAN STYLE="vertical-align:-24%; margin-left:-.25em; margin-right:-.20em;">E</SPAN>X fonts in HTML &mdash; A demonstration</DIV></B></BIG></P>
<DIV STYLE="font-family:'cmr10';line-height:120%">
<P>The 140 optical
<!--T<SPAN STYLE="vertical-align:-24%; margin-left:-.20em; margin-right:-.15em;">E</SPAN>X-->
fonts shown here were converted from the
<A HREF="http://www.ctan.org/tex-archive/fonts/cm/ps-type1/bakoma/">bakoma-fonts</A> package
using FontSquirrel&apos;s <A HREF="http://www.fontsquirrel.com/fontface/generator">\@font-face Generator</A> web application.</P>
<P>This page has not been extensively tested, but it appears to work correctly with recent versions of Safari, Firefox, and Chrome on Mac&nbsp;OS&nbsp;X&nbsp;10.7, and Safari on iOS&nbsp;5.
If you would like to experiment with these fonts, you can download a <A HREF="using-tex-fonts-in-html.tar.gz">tarball</A> of this page and its resources.</P>
</DIV>
<DIV ALIGN=RIGHT>&mdash;Todd Lehman</DIV>
<HR NOSHADE SIZE=1>
<BR><BR>
</TD>
</TR>
EOT

foreach my $fontlistline (split /\n/, $fontlist) {
	$fontlistline =~ s/^\s+//;
	$fontlistline =~ s/\s+$//;
	next if $fontlistline =~ m/^$/;
	next if $fontlistline =~ m/^#/;

	my @fonts = split(/\s+/, $fontlistline);
	my ($fontbase) = ($fonts[0] =~ m/^([a-z]+)/);

	print qq{<TR>\n};
	print qq{<TD ALIGN=RIGHT VALIGN=MIDDLE><FONT FACE="Verdana" SIZE="-2">$fontbase</FONT></TD>\n};
	print qq{<TD ALIGN=LEFT VALIGN=TOP>\n};

	foreach my $font (@fonts) {
		my ($pointsize);
		if ($font =~ m/(\d+)$/) {
			$pointsize = $1;
		} elsif ($font =~ m/inch$/) {
			$pointsize = 72;  # approximate
		} else {
			die "$font: invalid name";
		}

		my $text = ($font eq "cminch")? $text2 : $text1;
		print qq{<DIV STYLE="font-family:'$font'; font-size:${pointsize}0%; line-height:120%">${pointsize} $text</DIV>\n};
	}

	print qq{</TD>\n};
	print qq{</TR>\n};
}
print qq{</TABLE>\n};

print <<EOT;
</BODY>
</HTML>
EOT

exit 0;
