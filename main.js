(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safe = (fn) => { try { return fn(); } catch { return null; } };

  /* الوضع: داكن افتراضياً، ويتذكر اختيار المستخدم */
  const icon = document.getElementById('themeIcon');
  const setTheme = (t) => {
    root.dataset.theme = t;
    icon.className = 'ph ' + (t === 'dark' ? 'ph-moon' : 'ph-sun');
    safe(() => localStorage.setItem('theme', t));
  };
  const saved = safe(() => localStorage.getItem('theme'));
  if (saved) setTheme(saved);
  document.getElementById('themeBtn').addEventListener('click', () =>
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  /* الشريط العلوي يتغير بعد النزول (IntersectionObserver بدل مستمع التمرير) */
  const nav = document.getElementById('nav');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:40px;width:1px;pointer-events:none';
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle('is-stuck', !e.isIntersecting)).observe(sentinel);

  /* ظهور العناصر عند الدخول */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* إضاءة تتبع المؤشر على البطاقات (متغيرات CSS فقط) */
  document.querySelectorAll('.spot').forEach((el) => {
    el.addEventListener('pointermove', (ev) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ev.clientX - r.left + 'px');
      el.style.setProperty('--my', ev.clientY - r.top + 'px');
    });
  });

  /* أزرار مغناطيسية خفيفة */
  if (!reduce && matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (ev) => {
        const r = el.getBoundingClientRect();
        const x = (ev.clientX - r.left - r.width / 2) * .18;
        const y = (ev.clientY - r.top - r.height / 2) * .28;
        el.style.transform = `translate(${x}px,${y}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* عجلة أفق: خمس علامات حول الشعار، تُبنى بالكود لتحافظ على هوية الشعار الأصلي */
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('wheelSvg');
  const group = document.getElementById('brands');
  const BRANDS = [ /* الترتيب مع عقارب الساعة بدءاً من الأعلى */
    { key: 'hint', label: 'Hint',      fill: '#eb815f', src: 'hint.webp', bg: 'auto', w: 158, cy: .50 },
    { key: 'kib',  label: 'KIB',       fill: '#f1eee8', src: 'kib.webp',  bg: 'none', w: 142, cy: .50 },
    { key: 'bahi', label: 'BAHI بهي',  fill: '#74101a', src: 'bahi.jpg',  bg: 'black', w: 192, cy: .58 },
    { key: 'mlt',  label: 'MLT',       fill: '#5b644f', src: 'mlt.jpg',   bg: 'auto', w: 156, cy: .48 },
    { key: 'mdee', label: 'M DEE',     fill: '#555555', src: 'mdee.jpg',  bg: 'auto', w: 148, cy: .48 },
  ];
  const el = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const pt = (r, deg) => { const t = (deg - 90) * Math.PI / 180; return [300 + r * Math.cos(t), 300 + r * Math.sin(t)]; };
  const RO = 283, RI = 129, GAP = 11; /* نصف الفجوة + تعويض الحواف المدورة */
  const seg = (a0, a1) => {
    const o0 = pt(RO, a0 + GAP / RO * 57.3), o1 = pt(RO, a1 - GAP / RO * 57.3);
    const i1 = pt(RI, a1 - GAP / RI * 57.3), i0 = pt(RI, a0 + GAP / RI * 57.3);
    return `M${o0}A${RO} ${RO} 0 0 1 ${o1}L${i1}A${RI} ${RI} 0 0 0 ${i0}Z`;
  };

  /* إزالة خلفية ملف الشعار (أسود أو لون ثابت) لنحصل على شعار شفاف */
  const keyOut = async (b) => {
    const img = new Image(); img.src = 'assets/logos/' + b.src; await img.decode();
    if (b.bg === 'none') return { url: img.src, w: img.naturalWidth, h: img.naturalHeight };
    const k = Math.min(1, 560 / img.naturalWidth); /* تصغير: صور أخف على الشاشة */
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
    const [br, bg, bb] = b.bg === 'black' ? [0, 0, 0] : [d[0], d[1], d[2]];
    for (let i = 0; i < d.length; i += 4) {
      const dist = Math.max(Math.abs(d[i] - br), Math.abs(d[i + 1] - bg), Math.abs(d[i + 2] - bb));
      const lo = b.bg === 'black' ? 10 : 16, hi = b.bg === 'black' ? 34 : 56;
      d[i + 3] = Math.max(0, Math.min(255, (dist - lo) / (hi - lo) * 255));
    }
    x.putImageData(im, 0, 0);
    return { url: c.toDataURL('image/png'), w: c.width, h: c.height };
  };

  const tiles = [];
  let pinned = null;
  const apply = (b) => {
    if (b) root.dataset.brand = b; else delete root.dataset.brand;
    tiles.forEach((t) => {
      t.classList.toggle('is-hot', !!b && t.dataset.brand === b);
      t.classList.toggle('is-dim', !!b && t.dataset.brand !== b);
    });
  };

  BRANDS.forEach((b, i) => {
    const a0 = i * 72, a1 = a0 + 72, mid = a0 + 36;
    const [mx, my] = pt(216, mid);
    const rad = (mid - 90) * Math.PI / 180;
    const a = el('a', { class: 'seg', href: b.key + '.html', 'data-brand': b.key, 'aria-label': b.label, tabindex: 0 });
    a.style.setProperty('--dx', Math.cos(rad).toFixed(3));
    a.style.setProperty('--dy', Math.sin(rad).toFixed(3));
    a.style.setProperty('--i', i);
    const mover = el('g', { class: 'mover' });
    const inner = el('g', { class: 'segin' });
    inner.append(el('path', { class: 'shape', d: seg(a0, a1), fill: b.fill, stroke: b.fill, 'stroke-width': 14, 'stroke-linejoin': 'round' }));
    const logo = el('image', { class: 'logo', 'aria-hidden': 'true' });
    inner.append(logo); mover.append(inner);
    a.append(el('path', { class: 'hit', d: seg(a0, a1), fill: 'transparent' }), mover); svg.append(a);
    keyOut(b).then((r) => {
      const w = b.w, h = w * r.h / r.w;
      logo.setAttribute('href', r.url);
      logo.setAttribute('width', w); logo.setAttribute('height', h);
      logo.setAttribute('x', mx - w / 2); logo.setAttribute('y', my - h * b.cy);
    }).catch(() => {});
    a.addEventListener('pointerenter', () => apply(b.key));
    a.addEventListener('focus', () => { if (a.matches(':focus-visible')) apply(b.key); });
    a.addEventListener('click', () => {
      apply(b.key); /* ينتقل لصفحة مقاطع العلامة، ولا نحفظ الاختيار */
    });
    tiles.push(a);
  });

  /* المحور: شعار أفق في المنتصف من الصورة الأصلية */
  const clip = el('clipPath', { id: 'hubClip' }); clip.append(el('circle', { cx: 300, cy: 300, r: 112 }));
  const defs = el('defs'); defs.append(clip); svg.prepend(defs);
  const hub = el('g', { class: 'hub' });
  hub.append(el('circle', { cx: 300, cy: 300, r: 116, fill: '#fff' }));
  const hubImg = el('image', { href: 'assets/ufuq-brands-wheel.webp', x: 0, y: 0, width: 600, height: 600, 'clip-path': 'url(#hubClip)', 'aria-hidden': 'true' });
  hub.append(hubImg); svg.append(hub);

  group.addEventListener('pointerleave', () => apply(pinned));
  group.addEventListener('focusout', () => { if (!group.matches(':hover')) apply(pinned); });
  /* عند الرجوع للصفحة (زر الرجوع) تعود العجلة محايدة: لا علامة مختارة */
  addEventListener('pageshow', () => apply(null));
  safe(() => sessionStorage.removeItem('brand'));
  apply(null);

  /* التبويبات */
  const tabs = [...document.querySelectorAll('.tab')];
  const show = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute('aria-controls'));
      p.hidden = !on;
      p.classList.toggle('is-on', on);
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', (e) => {
      const step = { ArrowLeft: 1, ArrowRight: -1 }[e.key]; /* RTL: اليسار هو التالي */
      if (!step) return;
      const n = tabs[(i + step + tabs.length) % tabs.length];
      n.focus(); show(n);
    });
  });

  /* السؤال التفاعلي */
  const form = document.getElementById('quizForm');
  const msg = document.getElementById('quizMsg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pick = form.querySelector('input[name="q"]:checked');
    form.querySelectorAll('.opt').forEach((o) => o.classList.remove('ok', 'no'));
    msg.className = 'qmsg';
    if (!pick) { msg.textContent = 'اختر إجابة أولاً.'; return; }
    const right = pick.value === 'b';
    pick.closest('.opt').classList.add(right ? 'ok' : 'no');
    if (!right) form.querySelector('input[value="b"]').closest('.opt').classList.add('ok');
    msg.classList.add(right ? 'ok' : 'no');
    msg.textContent = right
      ? 'إجابة صحيحة. الاستماع أولاً يهدئ الموقف.'
      : 'ليست دقيقة. الأفضل أن تستمع له حتى ينهي كلامه ثم تعتذر.';
  });
})();
