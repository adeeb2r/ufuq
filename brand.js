/* صفحات العلامات (mdee, hint, kib, bahi, mlt). منطق مشترك، والشكل لكل علامة في ملف CSS خاص بها.
   تقرأ body[data-brand] وتعرض ريسيبي ومقاطع هذه العلامة فقط. */
(() => {
  const KEY = document.body.dataset.brand;
  const NAMES = { mdee: 'M DEE', hint: 'Hint', kib: 'KIB', bahi: 'BAHI بهي', mlt: 'MLT' };
  const canEdit = ['localhost', '127.0.0.1'].includes(location.hostname);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return null; } };
  const mediaUrl = (f) => '/media/' + f.split('/').map(encodeURIComponent).join('/');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const HOOK = window.BrandHooks || {};  /* تخصيص اختياري لصفحة علامة (مثل منتجات M DEE) */
  let recipes = [], videos = [];

  /* ---------- التحميل ---------- */
  const load = async () => {
    try {
      const [r, v] = await Promise.all([
        fetch('/api/recipes', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/videos', { cache: 'no-store' }).then((x) => x.json()),
        window.Cats ? Cats.load() : null,
      ]);
      recipes = r.filter((x) => x.brand === KEY);
      videos = v.filter((x) => x.brand === KEY);
      window.__allVideos = v;
    } catch {
      $('recs').append(el('p', 'empty', 'تعذر تحميل المحتوى. شغّل الموقع من ملف "تشغيل الموقع".'));
      return;
    }
    render();
  };

  const render = () => {
    $('nRec').textContent = recipes.length; $('nVid').textContent = videos.length;
    const recs = $('recs'); recs.replaceChildren();
    const vids = $('vids'); vids.replaceChildren();
    $('recBlock').hidden = !recipes.length && !canEdit && !!videos.length;
    $('vidBlock').hidden = !videos.length && !canEdit && !!recipes.length;
    if (!recipes.length) recs.append(empty('ريسيبي', 'recipes.html', 'أضف ريسيبي من صفحة الريسيبي واختر هذه العلامة.'));
    if (HOOK.recsClass) recs.classList.add(HOOK.recsClass);
    recipes.forEach((r, i) => recs.append(HOOK.recipeEl ? HOOK.recipeEl(r, i, api) : recipeEl(r, i)));
    if (!videos.length) vids.append(empty('مقاطع', null, `ضع مقاطع العلامة في inbox\\videos\\${KEY} وتظهر هنا.`));
    videos.forEach((v, i) => vids.append(videoEl(v, i)));
    thumbs();
    reveal();
  };

  const empty = (what, href, ownerHint) => {
    const d = el('div', 'empty');
    d.append(el('p', 'empty__t', 'المحتوى قيد الإعداد'));
    d.append(el('p', 'empty__s', 'ستظهر ' + what + ' ' + NAMES[KEY] + ' هنا قريباً.'));
    if (canEdit) { const p = el('p', 'empty__o', ownerHint); d.append(p); if (href) { const a = el('a', 'empty__a', 'افتح الصفحة'); a.href = href; d.append(a); } }
    return d;
  };

  /* ---------- الريسيبي ---------- */
  const recipeEl = (r, i) => {
    const b = el('button', 'rec'); b.type = 'button'; b.style.setProperty('--i', Math.min(i, 14)); b.dataset.n = i % 5;
    b.append(el('span', 'rec__no', String(i + 1).padStart(2, '0')));
    const body = el('span', 'rec__body');
    body.append(el('span', 'rec__cat', window.Cats ? Cats.name(Cats.resolve(r.category)) : ''), el('span', 'rec__title', r.title));
    if (r.summary) body.append(el('span', 'rec__sum', r.summary));
    b.append(body);
    const pills = el('span', 'rec__pills');
    r.ingredients.slice(0, 3).forEach((g) => { const p = el('span', 'pill'); p.append(el('b', '', (g.qty + ' ' + g.unit).trim()), document.createTextNode(' ' + g.name)); pills.append(p); });
    if (r.ingredients.length) b.append(pills);
    b.append(el('span', 'rec__meta', r.steps.length + ' خطوات'));
    b.addEventListener('click', () => openSheet(r));
    return b;
  };

  const sheet = $('sheet');
  const openSheet = (r) => {
    $('sTag').textContent = (window.Cats ? Cats.name(Cats.resolve(r.category)) : '') + '  |  ' + NAMES[KEY];
    $('sTitle').textContent = r.title;
    $('sSum').textContent = r.summary; $('sSum').hidden = !r.summary;
    $('sIngs').replaceChildren(...(r.ingredients.length ? r.ingredients : [{ name: 'لم تُضف مقادير بعد.' }]).map((g) => {
      const li = el('li'); li.append(el('span', 'q', g.qty || ''), el('span', 'u', g.unit || ''), el('span', 'n', g.name)); return li;
    }));
    $('sSteps').replaceChildren(...r.steps.map((t) => { const li = el('li'); li.append(el('span', '', t)); return li; }));
    $('sNote').textContent = r.notes; $('sNote').hidden = !r.notes;
    const v = (window.__allVideos || []).find((x) => x.id === r.video);
    $('sVideo').hidden = !v; $('vbox').hidden = true; stopVid();
    $('sVideo').onclick = () => { $('vbox').hidden = false; $('sVid').src = mediaUrl(v.file); $('sVid').play().catch(() => {}); $('vbox').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); };
    sheet.hidden = false; document.body.style.overflow = 'hidden'; $('sClose').focus();
  };
  const stopVid = () => { const v = $('sVid'); v.pause(); v.removeAttribute('src'); };
  const closeSheet = () => { stopVid(); sheet.hidden = true; document.body.style.overflow = ''; };
  $('sClose').addEventListener('click', closeSheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

  /* ---------- المقاطع ---------- */
  const videoEl = (v, i) => {
    const b = el('button', 'vcard'); b.type = 'button'; b.dataset.id = v.id; b.style.setProperty('--i', Math.min(i, 14));
    const img = el('img', 'vcard__img'); img.alt = ''; img.decoding = 'async';
    const dur = el('span', 'vcard__dur'); dur.hidden = true;
    const play = el('span', 'vcard__play'); play.innerHTML = '<i class="ph ph-play"></i>';
    const t = el('span', 'vcard__title', v.title || v.original);
    b.append(img, dur, play, t);
    b.addEventListener('click', () => openPlayer(v));
    return b;
  };
  const player = $('player'), pv = $('pVideo');
  const openPlayer = (v) => { $('pTitle').textContent = v.title || v.original; pv.src = mediaUrl(v.file); pv.play().catch(() => {}); player.hidden = false; document.body.style.overflow = 'hidden'; $('pClose').focus(); };
  const closePlayer = () => { pv.pause(); pv.removeAttribute('src'); pv.load(); player.hidden = true; document.body.style.overflow = ''; };
  $('pClose').addEventListener('click', closePlayer);
  player.addEventListener('click', (e) => { if (e.target === player) closePlayer(); });
  addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (!player.hidden) closePlayer(); else if (!sheet.hidden) closeSheet(); });

  /* صور مصغرة: نفس مفاتيح التخزين المؤقت لصفحة المقاطع، فتظهر فوراً إن سبق التقاطها */
  let q = [], busy = 0;
  const thumbs = () => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); q.push(e.target); pump(); } }), { rootMargin: '300px 500px' });
    document.querySelectorAll('.vcard').forEach((c) => {
      const v = videos.find((x) => x.id === c.dataset.id), hit = safe(() => localStorage.getItem(`th6:${v.id}:${v.added}:${v.cover ?? 'a'}`));
      if (hit) setThumb(c, hit, +safe(() => localStorage.getItem('du:' + v.id)) || 0); else io.observe(c);
    });
  };
  const setThumb = (c, url, d) => {
    const im = c.querySelector('.vcard__img'); im.src = url; im.onload = () => c.classList.add('ready');
    if (d) { const du = c.querySelector('.vcard__dur'); du.textContent = fmt(d); du.hidden = false; }
  };
  const pump = () => { while (busy < 3 && q.length) { const c = q.shift(); busy++; snap(c).finally(() => { busy--; pump(); }); } };
  const snap = (c) => new Promise((done) => {
    const v = videos.find((x) => x.id === c.dataset.id), vid = document.createElement('video');
    vid.muted = true; vid.preload = 'auto'; vid.playsInline = true; vid.src = mediaUrl(v.file);
    vid.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:7px;opacity:.01;pointer-events:none'; document.body.append(vid);
    const spots = v.cover != null ? [v.cover] : [.7, 1.5, 3, 6]; let n = 0, tries = 0, armed = 0, fin = false;
    const end = () => { if (fin) return; fin = true; clearTimeout(to); vid.removeAttribute('src'); vid.load(); vid.remove(); done(); };
    const to = setTimeout(end, 20000);
    const bright = (cv) => { const t = document.createElement('canvas'); t.width = 12; t.height = 20; const g = t.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0, 12, 20); const d = g.getImageData(0, 0, 12, 20).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4 * 3); };
    const cap = (id) => {
      if (fin || id !== armed) return; armed = 0;
      try {
        const k = 480 / (vid.videoWidth || 478), cv = document.createElement('canvas'); cv.width = 480; cv.height = Math.round((vid.videoHeight || 850) * k);
        cv.getContext('2d').drawImage(vid, 0, 0, cv.width, cv.height);
        const ok = bright(cv) >= 22;
        if (!ok && v.cover == null && ++n < spots.length) { seek(); return; }
        if (ok || v.cover != null) {
          const url = cv.toDataURL('image/jpeg', .86);
          safe(() => { localStorage.setItem(`th6:${v.id}:${v.added}:${v.cover ?? 'a'}`, url); localStorage.setItem('du:' + v.id, vid.duration); });
          setThumb(c, url, vid.duration);
        }
      } catch { /* لا تخزين: تظهر هذه الجلسة فقط */ }
      end();
    };
    const seek = () => { const id = ++tries; armed = id; if (vid.requestVideoFrameCallback) vid.requestVideoFrameCallback(() => cap(id)); setTimeout(() => cap(id), 2500); vid.currentTime = Math.min(spots[n], Math.max(0, (vid.duration || 20) - .2)); };
    vid.addEventListener('loadedmetadata', seek, { once: true }); vid.addEventListener('error', end, { once: true });
  });

  /* ---------- شعار بخلفية سوداء (بهي): إزالة الخلفية وقت التشغيل ---------- */
  const logo = $('logo');
  if (logo && logo.dataset.keyout === 'black') {
    const img = new Image(); img.src = logo.src;
    img.decode().then(() => {
      const k = Math.min(1, 900 / img.naturalWidth), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
      const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const m = Math.max(d[i], d[i + 1], d[i + 2]); d[i + 3] = Math.max(0, Math.min(255, (m - 10) / 24 * 255)); }
      x.putImageData(im, 0, 0); logo.src = c.toDataURL('image/png'); logo.classList.add('keyed');
    }).catch(() => {});
  }

  /* ---------- ظهور تدريجي ---------- */
  const reveal = () => {
    if (reduce) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    document.querySelectorAll('.rec, .vcard, .block__h').forEach((n) => { n.classList.add('rv'); io.observe(n); });
  };

  const api = { el, mediaUrl, openSheet, closeSheet, reduce, canEdit, videoOf: (r) => (window.__allVideos || []).find((x) => x.id === r.video) };
  load();
})();
