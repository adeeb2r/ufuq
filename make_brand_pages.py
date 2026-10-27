"""يولّد صفحات العلامات الخمس (mdee.html, hint.html, kib.html, bahi.html, mlt.html) في site/.
البنية واحدة، والفروق في الخطوط وملف CSS والشعار. شغّله بعد أي تعديل على القالب: python tools/make_brand_pages.py"""
import os

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'site')

BRANDS = {
    'mdee': dict(name='M DEE', h1='M DEE', logo='mdee.jpg', keyout='', layout='rows', extra_css='<link rel="stylesheet" href="css/brand-mdee-products.css">', extra_js='<script src="js/mdee-products.js"></script>',
                 fonts='family=Archivo+Black&family=Readex+Pro:wght@300;400;500;600;700'),
    'hint': dict(name='Hint', h1='Hint', logo='hint.webp', keyout='', layout='blobs',
                 fonts='family=Lalezar&family=Readex+Pro:wght@300;400;500;600;700'),
    'kib': dict(name='KIB', h1='KIB', logo='kib.webp', keyout='', layout='table',
                fonts='family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Readex+Pro:wght@300;400;500;600'),
    'bahi': dict(name='BAHI بهي', h1='بهي', logo='bahi.jpg', keyout='black', layout='menu',
                 fonts='family=Amiri:wght@400;700&family=Readex+Pro:wght@300;400;500;600'),
    'mlt': dict(name='MLT', h1='MLT', logo='mlt.jpg', keyout='', layout='arches',
                fonts='family=Tajawal:wght@400;500;700;800&family=Readex+Pro:wght@300;400;500;600'),
}

TPL = '''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{name} | أكاديمية أفق</title>
<meta name="description" content="ريسيبي ومقاطع وأدلة تدريب {name} لموظفي أفق.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?{fonts}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
<link rel="stylesheet" href="css/brand-base.css">
<link rel="stylesheet" href="css/brand-{key}.css">
{extra_css}
</head>
<body data-brand="{key}" data-layout="{layout}">

<header class="top">
  <div class="wrap top__in">
    <a class="top__back" href="index.html"><i class="ph ph-arrow-right"></i> أكاديمية أفق</a>
    <nav class="top__links" aria-label="روابط">
      <a href="videos.html">كل المقاطع</a>
      <a href="recipes.html">كل الريسيبي</a>
    </nav>
  </div>
</header>

<main>
  <section class="hero">
    <div class="wrap hero__in">
      <div class="hero__logo"><img id="logo" src="assets/logos/{logo}" alt="شعار {name}" data-keyout="{keyout}" width="900" height="600"></div>
      <div class="hero__txt">
        <h1>{h1}</h1>
        <p class="hero__sub">ريسيبي ومقاطع وأدلة تدريب {name}.</p>
        <div class="counts" aria-live="polite">
          <div><b id="nRec">0</b><span>ريسيبي</span></div>
          <div><b id="nVid">0</b><span>مقطع</span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="block" id="recBlock">
    <div class="wrap">
      <h2 class="block__h">الريسيبي</h2>
      <div class="recs" id="recs"></div>
    </div>
  </section>

  <section class="block" id="vidBlock">
    <div class="wrap">
      <h2 class="block__h">المقاطع</h2>
      <div class="vids" id="vids"></div>
    </div>
  </section>

  <section class="block shared">
    <div class="wrap shared__in">
      <a href="videos.html">مقاطع المشروبات المشتركة</a>
      <a href="recipes.html">ريسيبي المشروبات المشتركة</a>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap foot__in">
    <a href="index.html">العودة إلى عجلة أفق</a>
    <nav class="foot__brands" aria-label="العلامات">
{links}
    </nav>
  </div>
</footer>

<!-- نافذة الريسيبي -->
<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="تفاصيل الريسيبي" hidden>
  <div class="sheet__panel">
    <button class="sheet__close" id="sClose" type="button" aria-label="إغلاق"><i class="ph ph-x"></i></button>
    <div class="sheet__head">
      <p class="tag" id="sTag"></p>
      <h2 id="sTitle"></h2>
      <p class="sum" id="sSum"></p>
    </div>
    <div class="sheet__body">
      <section><h3>المقادير</h3><ul class="ings" id="sIngs"></ul></section>
      <section><h3>الخطوات</h3><ol class="steps" id="sSteps"></ol><div class="note" id="sNote" hidden></div></section>
    </div>
    <div class="sheet__foot"><button class="btn" id="sVideo" type="button" hidden><i class="ph ph-play"></i> شاهد المقطع</button></div>
    <div class="vbox" id="vbox" hidden><video id="sVid" controls playsinline preload="none"></video></div>
  </div>
</div>

<!-- مشغل المقطع -->
<div class="player" id="player" role="dialog" aria-modal="true" aria-label="مشغل المقطع" hidden>
  <div class="player__box">
    <p class="player__t" id="pTitle"></p>
    <button class="player__close" id="pClose" type="button" aria-label="إغلاق"><i class="ph ph-x"></i></button>
    <video id="pVideo" controls playsinline preload="metadata"></video>
  </div>
</div>

<script src="js/categories.js"></script>
{extra_js}
<script src="js/brand.js"></script>
</body>
</html>
'''

for key, b in BRANDS.items():
    links = '\n'.join(
        f'      <a href="{k}.html"{" aria-current=\"page\"" if k == key else ""}>{v["name"]}</a>' for k, v in BRANDS.items())
    b = {'extra_css': '', 'extra_js': '', **b}
    html = TPL.format(key=key, links=links, **b)
    with open(os.path.join(SITE, key + '.html'), 'w', encoding='utf-8') as f:
        f.write(html)
print('تم توليد', len(BRANDS), 'صفحات')
