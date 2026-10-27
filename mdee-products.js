/* منتجات M DEE: بطاقة لكل منتج (صورة واسم)، وعند الضغط تفتح نافذة فيها ثلاثة أقسام:
   الطبقات (تجربة تفاعلية)، الريسيبي، المقطع التدريبي.
   لإضافة صورة منتج جديد: ضع الصورة في site/assets/products/mdee/ وأضف سطراً في PRODUCTS (المفتاح هو اسم الريسيبي بحروف صغيرة). */
(() => {
  /* إحداثيات كل شيء بنفس أبعاد الصورة الأصلية (1082 × 1453) ليتطابق الرسم مع الصورة */
  const PRODUCTS = {
    'chocolate cake': {
      image: 'assets/products/mdee/chocolate-cake.jpg', w: 1082, h: 1453,
      xp: 'exploded',
      dir: 'assets/products/mdee/layers/',
      /* من الأعلى إلى الأسفل. eff = نسبة الارتفاع الفعلي لتقليل الفراغ بين الطبقات الرقيقة */
      stack: [
        { id: 'l8-disc', g: 4 }, { id: 'l7-lace-c', g: 3, sy: 0.55, eff: 0.85 }, { id: 'l6-lace-b', g: 3, sy: 0.55, eff: 0.85 }, { id: 'l5-lace-a', g: 3, sy: 0.55, eff: 0.85 },
        { id: 'l4-sauce', g: 2, eff: 0.78 }, { id: 'l1-cake', g: 1 },
      ],
      groups: [
        { n: 1, t: 'الكيك والكريمة البيضاء', d: 'قطعة واحدة من كيك الشوكولاتة وبداخلها كريمة بيضاء، تسيح فور قطع الكيكة مثل صوص الشوكولاتة. يُحفظ في الثلاجة وصلاحيته يومان.' },
        { n: 2, t: 'صوص الشوكولاتة', d: '120 جم فوق الكيك، وتسيل على جوانبه.' },
        { n: 3, t: 'بسكويت كريب', d: '3 قطع فوق الشوكولاتة.' },
        { n: 4, t: 'قرص شوكولاتة M DEE', d: 'اللمسة الأخيرة: قطعة واحدة.' },
      ],
    },
  };

  const slug = (t) => t.trim().toLowerCase();
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let A = null; /* مساعدات من brand.js */

  /* ---------- بطاقة المنتج ---------- */
  const recipeEl = (r, i, api) => {
    A = api;
    const p = PRODUCTS[slug(r.title)];
    const b = mk('button', 'prod'); b.type = 'button'; b.style.setProperty('--i', Math.min(i, 14));
    const fig = mk('span', 'prod__fig');
    if (p) { const im = mk('img'); im.src = p.image; im.alt = r.title; im.loading = 'lazy'; im.width = p.w; im.height = p.h; fig.append(im); }
    else { fig.classList.add('prod__fig--empty'); fig.append(mk('span', 'prod__ph', r.title.trim().charAt(0).toUpperCase())); fig.append(mk('span', 'prod__soon', 'الصورة قريباً')); }
    const cap = mk('span', 'prod__cap');
    cap.append(mk('span', 'prod__no', String(i + 1).padStart(2, '0')), mk('span', 'prod__name', r.title), mk('span', 'prod__ar', r.summary || ''));
    b.append(fig, cap);
    b.addEventListener('click', () => openProduct(r));
    return b;
  };

  /* ---------- نافذة المنتج ---------- */
  let modal = null, cleanup = null;
  const ensureModal = () => {
    if (modal) return modal;
    modal = mk('div', 'sheet pm'); modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `<div class="sheet__panel pm__panel">
      <button class="sheet__close" type="button" aria-label="إغلاق"><i class="ph ph-x"></i></button>
      <div class="pm__head"><p class="tag"></p><h2></h2></div>
      <div class="pm__tabs" role="tablist"></div>
      <div class="pm__body"></div></div>`;
    document.body.append(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeProduct(); });
    modal.querySelector('.sheet__close').addEventListener('click', closeProduct);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeProduct(); });
    return modal;
  };
  const closeProduct = () => { if (cleanup) { cleanup(); cleanup = null; } modal.querySelector('video')?.pause(); modal.hidden = true; document.body.style.overflow = ''; };

  const openProduct = (r) => {
    const m = ensureModal(), p = PRODUCTS[slug(r.title)], panel = m.querySelector('.pm__panel');
    m.querySelector('.tag').textContent = (window.Cats ? Cats.name(Cats.resolve(r.category)) : '') + '  |  M DEE';
    m.querySelector('h2').textContent = r.title + (r.summary ? '  ' + r.summary : '');
    const tabs = m.querySelector('.pm__tabs'), body = m.querySelector('.pm__body'); tabs.replaceChildren(); body.replaceChildren();
    const v = A.videoOf(r);
    const panes = [];
    if (p) panes.push(['layers', 'الطبقات', p.xp === 'exploded' ? buildExploded(r, p) : buildExperience(r, p)]);
    panes.push(['recipe', 'الريسيبي', buildRecipe(r)]);
    if (v) panes.push(['video', 'المقطع التدريبي', buildVideo(v)]);
    const show = (id) => {
      panes.forEach(([k, , node], i) => { node.hidden = k !== id; tabs.children[i].setAttribute('aria-selected', k === id); });
      if (id !== 'video') body.querySelector('video')?.pause();
      body.dispatchEvent(new CustomEvent('pane', { detail: id }));
    };
    panes.forEach(([k, label, node]) => {
      const t = mk('button', 'pm__tab', label); t.type = 'button'; t.setAttribute('role', 'tab'); t.addEventListener('click', () => show(k)); tabs.append(t); body.append(node);
    });
    show(panes[0][0]);
    m.hidden = false; document.body.style.overflow = 'hidden'; panel.scrollTop = 0; m.querySelector('.sheet__close').focus();
  };

  const buildRecipe = (r) => {
    const s = mk('section', 'pm__pane');
    const grid = mk('div', 'pm__recipe');
    const a = mk('div'); a.append(mk('h3', '', 'المقادير'));
    const ul = mk('ul', 'ings');
    (r.ingredients.length ? r.ingredients : [{ name: 'لم تُضف مقادير بعد.' }]).forEach((g) => { const li = mk('li'); li.append(mk('span', 'q', g.qty || ''), mk('span', 'u', g.unit || ''), mk('span', 'n', g.name)); ul.append(li); });
    a.append(ul);
    const b = mk('div'); b.append(mk('h3', '', 'الخطوات'));
    const ol = mk('ol', 'steps'); r.steps.forEach((t) => { const li = mk('li'); li.append(mk('span', '', t)); ol.append(li); }); b.append(ol);
    if (r.notes) b.append(mk('div', 'note', r.notes));
    grid.append(a, b); s.append(grid); return s;
  };

  const buildVideo = (v) => {
    const s = mk('section', 'pm__pane pm__video');
    const box = mk('div', 'vbox'); const vid = mk('video'); vid.controls = true; vid.playsInline = true; vid.preload = 'none'; vid.src = A.mediaUrl(v.file);
    box.append(vid); s.append(box); return s;
  };

  /* ---------- تجربة الطبقات: قطع الكيكة نصفين وسيلان الآيس كريم ---------- */
  const buildExperience = (r, p) => {
    const s = mk('section', 'pm__pane');
    const wrap = mk('div', 'xp'); wrap.style.setProperty('--ar', p.w / p.h);
    const stage = mk('div', 'xp__stage'); stage.tabIndex = 0; stage.setAttribute('role', 'button'); stage.setAttribute('aria-label', 'اضغط لقطع الكيكة وإظهار الطبقات');
    const fig = mk('div', 'xp__fig');
    const left = mk('div', 'xp__half xp__half--l'), right = mk('div', 'xp__half xp__half--r');
    [left, right, fig].forEach((h) => { h.style.backgroundImage = `url(${p.image})`; });
    /* الكريمة: عمود في الشق + لسان على الوجه الأمامي + بركة على السطح. الإحداثيات بوحدات الصورة. */
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${p.w} ${p.h}`); svg.setAttribute('class', 'xp__cream'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs>
        <linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="#e2d3b4"/><stop offset=".3" stop-color="#fffbf0"/><stop offset=".7" stop-color="#fffdf7"/><stop offset="1" stop-color="#dfcfae"/></linearGradient>
        <radialGradient id="cp" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#fffefb"/><stop offset=".65" stop-color="#f7edd9"/><stop offset="1" stop-color="#e3d0aa"/></radialGradient>
      </defs>
      <path class="xp__shadow" d="M252,1072 C272,1034 362,1030 432,1044 C482,1024 622,1024 672,1044 C762,1026 852,1040 864,1076 C874,1112 784,1128 702,1120 C642,1138 472,1138 402,1120 C322,1130 238,1112 252,1072 Z" fill="#3a1d0c" opacity=".38"/>
      <path class="xp__col" d="M534,742 C540,800 529,900 535,1000 C537,1040 536,1060 536,1076 L564,1076 C564,1060 563,1040 565,1000 C571,900 560,800 566,742 Z" fill="url(#cg)"/>
      <path class="xp__tongue" d="M528,850 C504,930 482,1000 488,1042 C493,1080 520,1096 550,1094 C580,1096 607,1080 612,1042 C618,1000 596,930 572,850 Z" fill="url(#cg)"/>
      <path class="xp__tongue xp__drip" d="M498,985 C484,1012 487,1046 502,1048 C517,1050 515,1012 507,985 Z M598,972 C611,1000 613,1034 598,1036 C585,1036 587,1004 591,972 Z" fill="url(#cg)"/>
      <path class="xp__pool" d="M250,1060 C270,1020 360,1014 430,1030 C480,1008 620,1008 670,1030 C760,1010 850,1024 862,1062 C872,1100 782,1116 700,1108 C640,1126 470,1126 400,1108 C320,1118 236,1100 250,1060 Z" fill="url(#cp)" stroke="#b08a54" stroke-opacity=".3" stroke-width="3"/>
      <path class="xp__gloss" d="M546,800 C541,880 536,960 534,1050" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path class="xp__gloss" d="M420,1050 C470,1038 560,1034 640,1046" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path class="xp__gloss" d="M700,1062 C740,1056 790,1056 820,1066" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/>`;
    fig.append(left, right, svg);
    p.spots.forEach((sp) => { const d = mk('span', 'xp__dot' + (sp.inner ? ' xp__dot--in' : ''), String(sp.n)); d.style.left = sp.x + '%'; d.style.top = sp.y + '%'; d.style.setProperty('--d', sp.n * 90 + 'ms'); fig.append(d); });
    stage.append(fig);
    const legend = mk('ol', 'xp__legend');
    p.spots.forEach((sp) => { const li = mk('li'); li.style.setProperty('--d', sp.n * 90 + 'ms'); li.append(mk('b', '', String(sp.n))); const t = mk('span'); t.append(mk('strong', '', sp.t), mk('small', '', sp.d)); li.append(t); legend.append(li); });
    const hint = mk('p', 'xp__hint', 'المس الكيكة أو اضغط عليها لتقطعها، وتتوقف عندها لتنفتح تلقائياً.');
    const btn = mk('button', 'xp__btn', 'اقطع الكيكة'); btn.type = 'button';
    wrap.append(stage, mk('div', 'xp__side')); wrap.querySelector('.xp__side').append(hint, legend, btn);
    s.append(wrap);

    /* الحالة: مفتوح/مغلق. اللمس والضغط يبدّلان. الوقوف عند الصورة (توقف التمرير) يفتحها، والابتعاد يغلقها. */
    let open = false, idle = null;
    const set = (v) => { open = v; wrap.classList.toggle('is-open', v); btn.textContent = v ? 'أعد الكيكة' : 'اقطع الكيكة'; stage.setAttribute('aria-pressed', v); };
    stage.addEventListener('click', () => { clearTimeout(idle); set(!open); });
    stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(!open); } });
    btn.addEventListener('click', () => { clearTimeout(idle); set(!open); });
    if (matchMedia('(hover:hover)').matches) {
      stage.addEventListener('pointerenter', () => { clearTimeout(idle); set(true); });
      stage.addEventListener('pointerleave', () => { clearTimeout(idle); idle = setTimeout(() => set(false), 900); });
    }
    const panel = () => modal.querySelector('.pm__panel');
    let visible = false, paneOn = true;
    const schedule = () => { clearTimeout(idle); if (visible && paneOn && !open) idle = setTimeout(() => { if (visible && paneOn) set(true); }, 700); };
    const io = new IntersectionObserver(([e]) => { visible = e.intersectionRatio >= .6; if (!visible) { clearTimeout(idle); set(false); } else schedule(); }, { root: null, threshold: [0, .6, 1] });
    const onScroll = () => { if (open) { /* أثناء التمرير تبقى كما هي */ } clearTimeout(idle); };
    panel().addEventListener('scroll', onScroll, { passive: true });
    panel().addEventListener('scrollend', schedule);
    modal.querySelector('.pm__body').addEventListener('pane', (e) => { paneOn = e.detail === 'layers'; if (!paneOn) { set(false); clearTimeout(idle); } else { setTimeout(schedule, 350); } });
    io.observe(stage);
    const prev = cleanup;
    cleanup = () => { io.disconnect(); clearTimeout(idle); panel().removeEventListener('scroll', onScroll); panel().removeEventListener('scrollend', schedule); if (prev) prev(); };
    return s;
  };

  /* ---------- الطبقات الحقيقية: صور مقصوصة من صور المالك، ترتفع وتتوزع فوق بعضها ---------- */
  const buildExploded = (r, p) => {
    const s = mk('section', 'pm__pane');
    const wrap = mk('div', 'xp xe');
    const stage = mk('div', 'xp__stage xe__stage'); stage.tabIndex = 0; stage.setAttribute('role', 'button'); stage.setAttribute('aria-label', 'اضغط لتفكيك الكيكة إلى طبقاتها');
    stage.append(mk('div', 'xe__glow'));
    const closed = mk('img', 'xe__closed'); closed.src = p.image; closed.alt = r.title; closed.draggable = false; stage.append(closed);
    const imgs = p.stack.map((l) => { const im = mk('img', 'xe__layer'); im.src = p.dir + l.id + '.png'; im.alt = ''; im.draggable = false; stage.append(im); return im; });
    const dots = p.groups.map((g) => { const d = mk('span', 'xp__dot xe__dot', String(g.n)); stage.append(d); return d; });
    const legend = mk('ol', 'xp__legend');
    p.groups.slice().reverse().forEach((g) => {
      const li = mk('li'); li.style.setProperty('--d', (4 - g.n) * 80 + 'ms'); li.append(mk('b', '', String(g.n)));
      const t = mk('span'); t.append(mk('strong', '', g.t), mk('small', '', g.d)); li.append(t); legend.append(li);
    });
    const hint = mk('p', 'xp__hint', 'المس الكيكة أو اضغط عليها لتتفكك إلى طبقاتها، وتتوقف عندها لتنفتح تلقائياً. إذا ابتعدت ترجع كما كانت.');
    const btn = mk('button', 'xp__btn', 'فكّك الكيكة'); btn.type = 'button';
    const side = mk('div', 'xp__side'); side.append(hint, legend, btn);
    wrap.append(stage, side); s.append(wrap);

    /* التخطيط: يُحسب من أبعاد الصور وأبعاد المنصة */
    const layout = () => {
      const W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return;
      const nat = imgs.map((im, i) => ({ w: im.naturalWidth, h: im.naturalHeight * (p.stack[i].sy || 1), eff: p.stack[i].eff || 1 }));
      if (nat.some((n) => !n.w)) return;
      const GAP = 26;
      const total = nat.reduce((a, n) => a + n.h * n.eff, 0) + GAP * (nat.length - 1);
      const sc = Math.min((H * 0.9) / total, (W * 0.78) / Math.max(...nat.map((n) => n.w)));
      let y = (H - total * sc) / 2; const openY = [], closedY = [];
      nat.forEach((n) => { const hh = n.h * n.eff * sc; openY.push(y + hh / 2); y += hh + GAP * sc; });
      const tight = nat.map((n) => n.h * n.eff * sc * 0.62); const tt = tight.reduce((a, b) => a + b, 0); let yy = (H - tt) / 2 + 8;
      tight.forEach((hh) => { closedY.push(yy + hh / 2); yy += hh; });
      imgs.forEach((im, i) => {
        im.style.width = nat[i].w * sc + 'px'; im.style.height = nat[i].h * sc + 'px';
        im.style.setProperty('--c', (closedY[i] - nat[i].h * sc / 2) + 'px'); im.style.setProperty('--o', (openY[i] - nat[i].h * sc / 2) + 'px');
        im.style.setProperty('--n', String(p.stack.length - 1 - i));
        im.style.zIndex = String(10 + (p.stack.length - i));
      });
      p.groups.forEach((g, gi) => {
        const idx = p.stack.map((l, i) => (l.g === g.n ? i : -1)).filter((i) => i >= 0);
        const c = idx.reduce((a, i) => a + openY[i], 0) / idx.length;
        const wmax = Math.max(...idx.map((i) => nat[i].w * sc));
        dots[gi].style.top = c + 'px'; dots[gi].style.left = (W / 2 + wmax / 2 + 22) + 'px'; dots[gi].style.setProperty('--n', String(g.n - 1));
      });
      closed.style.height = H * 0.78 + 'px';
    };
    Promise.all(imgs.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()))).then(layout);
    const ro = new ResizeObserver(layout); ro.observe(stage);

    /* الحالة والتشغيل */
    let open = false, idle = null;
    const set = (v) => { open = v; wrap.classList.toggle('is-open', v); btn.textContent = v ? 'أعد التجميع' : 'فكّك الكيكة'; stage.setAttribute('aria-pressed', v); };
    stage.addEventListener('click', () => { clearTimeout(idle); set(!open); });
    stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(!open); } });
    btn.addEventListener('click', () => { clearTimeout(idle); set(!open); });
    if (matchMedia('(hover:hover)').matches) {
      stage.addEventListener('pointerenter', () => { clearTimeout(idle); set(true); });
      stage.addEventListener('pointerleave', () => { clearTimeout(idle); idle = setTimeout(() => set(false), 1000); });
    }
    const panel = () => modal.querySelector('.pm__panel');
    let visible = false, paneOn = true;
    const schedule = () => { clearTimeout(idle); if (visible && paneOn && !open) idle = setTimeout(() => { if (visible && paneOn) set(true); }, 700); };
    const io = new IntersectionObserver(([e]) => { visible = e.intersectionRatio >= 0.6; if (!visible) { clearTimeout(idle); set(false); } else schedule(); }, { threshold: [0, 0.6, 1] });
    const onScroll = () => clearTimeout(idle);
    panel().addEventListener('scroll', onScroll, { passive: true });
    panel().addEventListener('scrollend', schedule);
    modal.querySelector('.pm__body').addEventListener('pane', (e) => { paneOn = e.detail === 'layers'; if (!paneOn) { set(false); clearTimeout(idle); } else setTimeout(() => { layout(); schedule(); }, 350); });
    io.observe(stage);
    const prev = cleanup;
    cleanup = () => { io.disconnect(); ro.disconnect(); clearTimeout(idle); panel().removeEventListener('scroll', onScroll); panel().removeEventListener('scrollend', schedule); if (prev) prev(); };
    return s;
  };

  window.BrandHooks = { recsClass: 'recs--products', recipeEl };
})();
