(() => {
  const BRANDS = { mdee: 'M DEE', hint: 'Hint', kib: 'KIB', bahi: 'BAHI بهي', mlt: 'MLT', general: 'عام' };
  let CATS = {}; /* من الأقسام المشتركة (Cats) */
  let ORDER = [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canEdit = ['localhost', '127.0.0.1'].includes(location.hostname); /* التسمية محلية فقط حالياً */
  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return null; } };
  const mediaUrl = (f) => '/media/' + f.split('/').map(encodeURIComponent).join('/');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const catOf = (v) => Cats.resolve(v.category);

  let videos = [], editing = false, view = [], idx = -1;
  const filter = { cat: 'all', brand: 'all' };
  const qb = new URLSearchParams(location.search).get('brand');
  if (qb && BRANDS[qb]) filter.brand = qb; /* القادم من عجلة الرئيسية */
  const syncUrl = () => safe(() => history.replaceState(null, '', filter.brand === 'all' ? location.pathname : `${location.pathname}?brand=${filter.brand}`));
  const durations = {};

  /* ---------- التحميل ---------- */
  const load = async () => {
    try {
      const r = await fetch('/api/videos', { cache: 'no-store' });
      videos = await r.json();
    } catch {
      $('loading').textContent = 'تعذر تحميل المقاطع. شغّل الموقع من ملف "تشغيل الموقع".';
      return;
    }
    await Cats.load(); applyCats();
    render();
  };

  /* ---------- الأرقام والمرشحات ---------- */
  const countUp = (el, to) => {
    if (reduce || to === 0) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 900);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const chip = (label, pressed, on) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = label;
    b.setAttribute('aria-pressed', pressed); b.addEventListener('click', on);
    return b;
  };
  const openCats = (focusId) => { const counts = {}; videos.forEach((v) => { counts[catOf(v)] = (counts[catOf(v)] || 0) + 1; }); Cats.open(counts, () => { applyCats(); if (filter.cat !== 'all' && !CATS[filter.cat]) filter.cat = 'all'; render(); }, focusId); };
  const buildFilters = () => {
    const cats = ORDER.filter((c) => canEdit || videos.some((v) => catOf(v) === c));
    const nodes = [
      chip('كل الأقسام', filter.cat === 'all', () => { filter.cat = 'all'; render(); }),
      ...cats.map((c) => { const b = chip(CATS[c], filter.cat === c, () => { filter.cat = c; render(); }); if (canEdit) { b.title = 'اضغط مرتين لتعديل الاسم'; b.addEventListener('dblclick', () => openCats(c)); } return b; })];
    if (canEdit) { const e = chip('✎ تعديل الأسماء', false, () => openCats()); e.classList.add('chip--edit'); nodes.push(e); }
    $('catChips').replaceChildren(...nodes);
    const brands = Object.keys(BRANDS).filter((b) => b === filter.brand || videos.some((v) => v.brand === b));
    const bc = $('brandChips'); bc.replaceChildren(
      chip('كل العلامات', filter.brand === 'all', () => { filter.brand = 'all'; render(); }),
      ...brands.map((b) => chip(BRANDS[b], filter.brand === b, () => { filter.brand = b; render(); })));
  };

  /* ---------- الرسم ---------- */
  const render = () => {
    const unnamed = videos.filter((v) => !v.named).length;
    countUp($('statTotal'), videos.length);
    countUp($('statCats'), new Set(videos.map(catOf)).size);
    $('statNamedBox').hidden = !(editing && unnamed);
    $('statUnnamed').textContent = unnamed;
    document.body.classList.toggle('editing', editing);
    buildFilters(); syncUrl();

    view = videos.filter((v) => (filter.cat === 'all' || catOf(v) === filter.cat) && (filter.brand === 'all' || v.brand === filter.brand));
    const host = $('rails'); host.replaceChildren();
    const wrap = document.createElement('div'); wrap.className = 'wrap'; host.append(wrap);
    if (!view.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = filter.brand !== 'all' && filter.cat === 'all' ? `لا توجد مقاطع لـ ${BRANDS[filter.brand]} بعد.` : 'لا توجد مقاطع بهذا الاختيار.'; wrap.append(p); return; }

    let i = 0;
    ORDER.forEach((c) => {
      const list = view.filter((v) => catOf(v) === c);
      if (!list.length) return;
      const sec = document.createElement('section'); sec.className = 'rail'; sec.dataset.cat = c; sec.style.setProperty('--c', Cats.color(c));
      const head = document.createElement('div'); head.className = 'rail__head';
      const h = document.createElement('h2');
      const dot = document.createElement('i'); const t = document.createElement('span'); t.textContent = CATS[c];
      const n = document.createElement('small'); n.textContent = list.length + ' مقطع';
      h.append(dot, t, n);
      const ar = document.createElement('div'); ar.className = 'arrows';
      const track = document.createElement('div'); track.className = 'track';
      const mk = (icon, dir, label) => {
        const b = document.createElement('button'); b.className = 'arrow'; b.type = 'button'; b.setAttribute('aria-label', label);
        b.innerHTML = `<i class="ph ph-caret-${icon}"></i>`;
        b.addEventListener('click', () => track.scrollBy({ left: dir * track.clientWidth * .8, behavior: reduce ? 'auto' : 'smooth' }));
        return b;
      };
      ar.append(mk('right', 1, 'السابق'), mk('left', -1, 'التالي'));
      head.append(h, ar);
      list.forEach((v) => track.append(card(v, i++)));
      sec.append(head, track); wrap.append(sec);
    });
    queueThumbs();
  };

  const card = (v, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card' + (v.named ? '' : ' unnamed'); b.dataset.id = v.id; b.style.setProperty('--i', Math.min(i, 12));
    const img = document.createElement('img'); img.className = 'card__img'; img.alt = ''; img.decoding = 'async';
    const info = document.createElement('div'); info.className = 'card__info';
    const br = document.createElement('span'); br.className = 'card__brand'; br.textContent = BRANDS[v.brand] || '';
    const ti = document.createElement('span'); ti.className = 'card__title'; ti.textContent = v.named ? v.title : 'مقطع بدون اسم';
    info.append(br, ti);
    const dur = document.createElement('span'); dur.className = 'card__dur'; dur.hidden = true;
    const pl = document.createElement('span'); pl.className = 'card__play'; pl.innerHTML = '<i class="ph ph-play"></i>';
    b.append(img, dur, pl, info);
    b.addEventListener('click', () => open(v.id));
    if (matchMedia('(hover:hover)').matches && !reduce) {
      b.addEventListener('pointerenter', () => preview(b, v));
      b.addEventListener('pointerleave', () => unpreview(b));
    }
    return b;
  };

  /* ---------- الصور المصغرة: لقطة من كل مقطع، بدون تشغيل 25 مقطعاً معاً ---------- */
  let thumbQ = [], thumbBusy = 0;
  const queueThumbs = () => {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target); thumbQ.push(e.target); pump();
    }), { rootMargin: '300px 600px' });
    document.querySelectorAll('.card').forEach((c) => {
      const v = videos.find((x) => x.id === c.dataset.id), key = `th6:${v.id}:${v.added}:${v.cover ?? 'a'}`;
      const hit = safe(() => localStorage.getItem(key));
      if (hit) { setThumb(c, hit, durations[v.id]); } else io.observe(c);
    });
  };
  const setThumb = (c, url, d) => {
    const im = c.querySelector('.card__img'); im.src = url; im.onload = () => c.classList.add('ready');
    const dur = c.querySelector('.card__dur');
    const v = videos.find((x) => x.id === c.dataset.id);
    const dd = d || (v && durations[v.id]) || safe(() => +localStorage.getItem('du:' + v.id));
    if (dd) { dur.textContent = fmt(dd); dur.hidden = false; }
  };
  const pump = () => {
    while (thumbBusy < 3 && thumbQ.length) {
      const c = thumbQ.shift(); thumbBusy++;
      snap(c).finally(() => { thumbBusy--; pump(); });
    }
  };
  const snap = (c) => new Promise((done) => {
    const v = videos.find((x) => x.id === c.dataset.id);
    const el = document.createElement('video');
    el.muted = true; el.preload = 'auto'; el.playsInline = true; el.src = mediaUrl(v.file);
    el.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:7px;opacity:.01;pointer-events:none'; /* داخل الصفحة ليعرض المتصفح الإطارات فعلاً */
    document.body.append(el);
    const spots = v.cover != null ? [v.cover] : [.7, 1.5, 3, 6]; let n = 0, tries = 0; /* ثوانٍ من البداية */
    let finished = false;
    const fin = () => { if (finished) return; finished = true; clearTimeout(to); el.removeAttribute('src'); el.load(); el.remove(); done(); };
    const to = setTimeout(fin, 20000);
    const bright = (cv) => { /* يتجنب اللقطات السوداء */
      const t = document.createElement('canvas'); t.width = 12; t.height = 20; const g = t.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0, 12, 20);
      const d = g.getImageData(0, 0, 12, 20).data; let s2 = 0; for (let i = 0; i < d.length; i += 4) s2 += d[i] + d[i + 1] + d[i + 2];
      return s2 / (d.length / 4 * 3);
    };
    let armed = 0;
    const cap = (id) => { /* التقاط اللقطة بعد أن يعرضها المتصفح فعلاً */
      if (finished || id !== armed) return; armed = 0;
      try {
        const k = 480 / (el.videoWidth || 478), cv = document.createElement('canvas');
        cv.width = 480; cv.height = Math.round((el.videoHeight || 850) * k);
        cv.getContext('2d').drawImage(el, 0, 0, cv.width, cv.height);
        if (bright(cv) < 22 && v.cover == null && ++n < spots.length) { seek(); return; }
        if (bright(cv) >= 22 || v.cover != null) {
          const url = cv.toDataURL('image/jpeg', .86);
          durations[v.id] = el.duration;
          safe(() => { localStorage.setItem(`th6:${v.id}:${v.added}:${v.cover ?? 'a'}`, url); localStorage.setItem('du:' + v.id, el.duration); });
          setThumb(c, url, el.duration);
        } else if (el.duration) { durations[v.id] = el.duration; }
      } catch { /* التخزين محجوب: الصورة تظهر هذه الجلسة فقط */ }
      fin();
    };
    const seek = () => {
      const id = ++tries; armed = id;
      if (el.requestVideoFrameCallback) el.requestVideoFrameCallback(() => cap(id));
      setTimeout(() => cap(id), 2500); /* احتياط إن لم يصل إشعار الإطار */
      el.currentTime = Math.min(spots[n], Math.max(0, (el.duration || 20) - .2));
    };
    el.addEventListener('loadedmetadata', seek, { once: true });
    el.addEventListener('error', fin, { once: true });
  });

  /* معاينة صامتة عند المرور */
  let live = null;
  const preview = (c, v) => {
    unpreview(live);
    const el = document.createElement('video');
    el.className = 'card__live'; el.disablePictureInPicture = true; el.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback'); el.muted = true; el.loop = true; el.playsInline = true; el.src = mediaUrl(v.file);
    c.querySelector('.card__img').after(el); live = c;
    el.play().catch(() => {});
  };
  const unpreview = (c) => { if (!c) return; c.querySelector('.card__live')?.remove(); if (live === c) live = null; };

  /* ---------- المشغل ---------- */
  const player = $('player'), pv = $('pVideo');
  const fill = (sel, opts) => { const s = $(sel); s.replaceChildren(...opts.map(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; return o; })); };
  fill('fBrand', [['', 'بدون علامة (للجميع)'], ...Object.entries(BRANDS)]); const applyCats = () => { CATS = Cats.map(); ORDER = Cats.ids(); fill('fCat', Object.entries(CATS)); };

  const open = (id) => {
    idx = view.findIndex((v) => v.id === id); if (idx < 0) return;
    unpreview(live); show(); player.hidden = false; document.body.style.overflow = 'hidden';
    $('pClose').focus();
  };
  const show = () => {
    const v = view[idx];
    pv.src = mediaUrl(v.file); pv.play().catch(() => {});
    $('pTag').textContent = BRANDS[v.brand] ? `${CATS[catOf(v)]}  |  ${BRANDS[v.brand]}` : CATS[catOf(v)];
    $('pTitle').textContent = v.named ? v.title : 'مقطع بدون اسم';
    $('pDesc').textContent = v.desc || '';
    $('pDesc').hidden = !v.desc;
    const f = $('pForm'); f.hidden = !editing;
    if (editing) {
      coverTouched = false;
      $('fTitle').value = v.title; $('fDesc').value = v.desc; $('fBrand').value = v.brand; $('fCat').value = catOf(v); $('fMsg').textContent = ''; $('fMsg').className = 'msg';
      if (!v.named) $('fTitle').focus();
    }
  };
  const coverEl = $('fCover'); let coverTouched = false;
  pv.addEventListener('loadedmetadata', () => { coverEl.max = Math.max(1, Math.floor(pv.duration * 10) / 10); const v = view[idx]; if (v) { coverEl.value = v.cover ?? 0.7; $('fCoverT').textContent = (+coverEl.value).toFixed(1) + ' ث'; } });
  coverEl.addEventListener('input', () => { coverTouched = true; pv.pause(); pv.currentTime = +coverEl.value; $('fCoverT').textContent = (+coverEl.value).toFixed(1) + ' ث'; });
  const close = () => { pv.pause(); pv.removeAttribute('src'); pv.load(); player.hidden = true; document.body.style.overflow = ''; };
  const go = (d) => { if (idx < 0) return; idx = (idx + d + view.length) % view.length; show(); };
  $('pClose').addEventListener('click', close);
  $('pPrev').addEventListener('click', () => go(-1));
  $('pNext').addEventListener('click', () => go(1));
  player.addEventListener('click', (e) => { if (e.target === player) close(); });
  addEventListener('keydown', (e) => {
    if (player.hidden) return;
    if (e.key === 'Escape') close();
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (!typing && e.key === 'ArrowLeft') go(1);
    if (!typing && e.key === 'ArrowRight') go(-1);
  });

  /* ---------- الحفظ ---------- */
  const save = async (andNext) => {
    const v = view[idx], msg = $('fMsg');
    const body = { id: v.id, title: $('fTitle').value.trim(), desc: $('fDesc').value.trim(), brand: $('fBrand').value, category: $('fCat').value, cover: coverTouched ? +coverEl.value : (v.cover ?? null) };
    if (!body.title) { msg.className = 'msg no'; msg.textContent = 'اكتب اسماً للمقطع أولاً.'; $('fTitle').focus(); return; }
    try {
      const r = await fetch('/api/meta', { method: 'POST', body: JSON.stringify(body) });
      if (!r.ok) throw 0;
    } catch { msg.className = 'msg no'; msg.textContent = 'تعذر الحفظ. تأكد أن الموقع يعمل من ملف التشغيل.'; return; }
    Object.assign(v, { title: body.title, desc: body.desc, brand: body.brand, category: body.category, cover: body.cover, named: true });
    msg.className = 'msg ok'; msg.textContent = 'تم الحفظ';
    const nextId = andNext ? (view.slice(idx + 1).concat(view.slice(0, idx)).find((x) => !x.named) || {}).id : null;
    const keepId = v.id; render();
    if (andNext && nextId) { idx = view.findIndex((x) => x.id === nextId); if (idx >= 0) { show(); return; } }
    if (andNext) { msg.textContent = 'كل المقاطع لها أسماء.'; }
    idx = view.findIndex((x) => x.id === keepId);
    if (idx >= 0 && !andNext) { $('pTitle').textContent = v.title; $('pDesc').textContent = v.desc; $('pDesc').hidden = !v.desc; $('pTag').textContent = BRANDS[v.brand] ? `${CATS[catOf(v)]}  |  ${BRANDS[v.brand]}` : CATS[catOf(v)]; }
  };
  $('pForm').addEventListener('submit', (e) => { e.preventDefault(); save(false); });
  $('fNext').addEventListener('click', () => save(true));

  /* ---------- وضع التسمية ---------- */
  const eb = $('editBtn');
  if (canEdit) {
    $('catBtn').hidden = false;
    $('catBtn').addEventListener('click', () => openCats());
    eb.hidden = false;
    eb.addEventListener('click', () => {
      editing = !editing; eb.setAttribute('aria-pressed', editing);
      eb.querySelector('span').textContent = editing ? 'إنهاء التسمية' : 'وضع التسمية';
      render();
      if (editing) { const first = videos.find((v) => !v.named); if (first) { filter.cat = 'all'; filter.brand = 'all'; render(); open(first.id); } }
    });
  }
  load();
})();
