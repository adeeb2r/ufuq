(() => {
  let CATS = {}; /* تأتي من الأقسام المشتركة (Cats) وتتغير حسب ما يضبطه المالك */
  const BRANDS = { '': 'بدون علامة (للجميع)', mdee: 'M DEE', hint: 'Hint', kib: 'KIB', bahi: 'BAHI بهي', mlt: 'MLT', general: 'عام' };
  let ORDER = [];
  const canEdit = ['localhost', '127.0.0.1'].includes(location.hostname); /* الإضافة محلية فقط حالياً */
  const $ = (id) => document.getElementById(id);
  const mediaUrl = (f) => '/media/' + f.split('/').map(encodeURIComponent).join('/');
  const catOf = (r) => Cats.resolve(r.category);

  let recipes = [], videos = [], editing = null, current = null;
  const filter = { cat: 'all', q: '' };

  const load = async () => {
    try {
      [recipes, videos] = await Promise.all([
        fetch('/api/recipes', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/videos', { cache: 'no-store' }).then((r) => r.json()),
      ]);
    } catch {
      $('grid').innerHTML = '<p class="empty">تعذر تحميل الريسيبي. شغّل الموقع من ملف "تشغيل الموقع".</p>';
      return;
    }
    await Cats.load(); applyCats();
    render();
  };

  const vtitle = (v) => v.title || v.original;

  /* ---------- الأرقام والمرشحات ---------- */
  const chip = (label, pressed, on) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', pressed); b.addEventListener('click', on);
    return b;
  };
  const openCats = (focusId) => { const counts = {}; recipes.forEach((r) => { counts[catOf(r)] = (counts[catOf(r)] || 0) + 1; }); Cats.open(counts, () => { applyCats(); if (filter.cat !== 'all' && !CATS[filter.cat]) filter.cat = 'all'; render(); }, focusId); };
  const buildChips = () => {
    const cats = ORDER.filter((c) => canEdit || recipes.some((r) => catOf(r) === c)); /* على جهاز المالك تظهر كل الأقسام حتى الفارغة */
    const nodes = [
      chip('كل الأقسام', filter.cat === 'all', () => { filter.cat = 'all'; render(); }),
      ...cats.map((c) => { const b = chip(CATS[c], filter.cat === c, () => { filter.cat = c; render(); }); if (canEdit) { b.title = 'اضغط مرتين لتعديل الاسم'; b.addEventListener('dblclick', () => openCats(c)); } return b; })];
    if (canEdit) { const e = chip('✎ تعديل الأسماء', false, () => openCats()); e.classList.add('chip--edit'); nodes.push(e); }
    $('catChips').replaceChildren(...nodes);
  };

  /* ---------- الشبكة ---------- */
  const render = () => {
    $('statRecipes').textContent = recipes.length;
    $('statCats').textContent = new Set(recipes.map(catOf)).size;
    buildChips();
    const q = filter.q.trim().toLowerCase();
    const list = recipes.filter((r) => (filter.cat === 'all' || catOf(r) === filter.cat) &&
      (!q || (r.title + ' ' + r.ingredients.map((i) => i.name).join(' ')).toLowerCase().includes(q)));
    const grid = $('grid'); grid.replaceChildren();
    if (canEdit) {
      const a = document.createElement('button');
      a.className = 'rcard addcard'; a.type = 'button'; a.innerHTML = '<i class="ph ph-plus-circle"></i><span>أضف ريسيبي</span>';
      a.addEventListener('click', () => openForm(null));
      grid.append(a);
    }
    if (!list.length) {
      const p = document.createElement('p'); p.className = 'empty';
      p.textContent = recipes.length ? 'لا توجد ريسيبي بهذا الاختيار.' : (canEdit ? 'ما فيه ريسيبي بعد. اضغط "أضف ريسيبي" وابدأ بأول مشروب.' : 'ستظهر الريسيبي هنا قريباً.');
      grid.append(p); return;
    }
    list.forEach((r, i) => grid.append(card(r, i)));
  };

  const card = (r, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rcard'; b.dataset.cat = catOf(r); b.style.setProperty('--c', Cats.color(catOf(r))); b.style.setProperty('--i', Math.min(i, 12));
    const cat = document.createElement('span'); cat.className = 'rcard__cat'; cat.textContent = CATS[catOf(r)];
    const h = document.createElement('h3'); h.textContent = r.title;
    b.append(cat, h);
    if (r.summary) { const s = document.createElement('p'); s.className = 'rcard__sum'; s.textContent = r.summary; b.append(s); }
    const pills = document.createElement('div'); pills.className = 'pills';
    r.ingredients.slice(0, 3).forEach((g) => { const p = document.createElement('span'); p.className = 'pill'; const q = document.createElement('b'); q.textContent = (g.qty + ' ' + g.unit).trim(); p.append(q, g.name); pills.append(p); });
    if (r.ingredients.length > 3) { const p = document.createElement('span'); p.className = 'pill'; p.textContent = '+' + (r.ingredients.length - 3); pills.append(p); }
    if (r.ingredients.length) b.append(pills);
    const meta = document.createElement('div'); meta.className = 'rcard__meta';
    meta.innerHTML = `<span><i class="ph ph-list-numbers"></i>${r.steps.length} خطوات</span>`;
    if (r.video && videos.some((v) => v.id === r.video)) meta.innerHTML += '<span><i class="ph ph-play-circle"></i>مقطع</span>';
    b.append(meta);
    b.addEventListener('click', () => openSheet(r.id));
    return b;
  };

  /* ---------- الورقة ---------- */
  const sheet = $('sheet');
  const openSheet = (id) => {
    const r = recipes.find((x) => x.id === id); if (!r) return; current = r;
    $('sTag').textContent = CATS[catOf(r)] + (BRANDS[r.brand] && r.brand ? '  |  ' + BRANDS[r.brand] : '');
    $('sTitle').textContent = r.title;
    $('sSum').textContent = r.summary; $('sSum').hidden = !r.summary;
    $('sIngs').replaceChildren(...r.ingredients.map((g) => {
      const li = document.createElement('li');
      const q = document.createElement('span'); q.className = 'q'; q.textContent = g.qty || '';
      const u = document.createElement('span'); u.className = 'u'; u.textContent = g.unit || '';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = g.name;
      li.append(q, u, n); return li;
    }));
    if (!r.ingredients.length) { const li = document.createElement('li'); li.textContent = 'لم تُضف مقادير بعد.'; $('sIngs').replaceChildren(li); }
    $('sSteps').replaceChildren(...r.steps.map((t) => { const li = document.createElement('li'); const s = document.createElement('span'); s.textContent = t; li.append(s); return li; }));
    $('sNote').textContent = r.notes; $('sNote').hidden = !r.notes;
    const v = videos.find((x) => x.id === r.video);
    $('sVideo').hidden = !v; $('vbox').hidden = true; $('sVid').pause(); $('sVid').removeAttribute('src');
    $('sEdit').hidden = !canEdit;
    sheet.hidden = false; document.body.style.overflow = 'hidden'; $('sClose').focus();
  };
  const closeSheet = () => { $('sVid').pause(); $('sVid').removeAttribute('src'); sheet.hidden = true; document.body.style.overflow = ''; };
  $('sClose').addEventListener('click', closeSheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
  $('sVideo').addEventListener('click', () => {
    const v = videos.find((x) => x.id === current.video); if (!v) return;
    $('vbox').hidden = false; $('sVid').src = mediaUrl(v.file); $('sVid').play().catch(() => {}); $('vbox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $('sEdit').addEventListener('click', () => { const r = current; closeSheet(); openForm(r); });

  /* ---------- النموذج ---------- */
  const form = $('form'), msg = $('rMsg');
  const fillSel = (id, opts) => { $(id).replaceChildren(...opts.map(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; return o; })); };
  fillSel('rBrand', Object.entries(BRANDS));
  const applyCats = () => { CATS = Cats.map(); ORDER = Cats.ids(); fillSel('rCat', Object.entries(CATS)); };
  const row = (g = {}) => {
    const d = document.createElement('div'); d.className = 'ing-row';
    const mk = (k, ph, v, extra = {}) => { const i = document.createElement('input'); i.dataset.k = k; i.placeholder = ph; i.value = v || ''; i.autocomplete = 'off'; Object.assign(i, extra); return i; };
    const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.setAttribute('aria-label', 'حذف المكوّن'); x.innerHTML = '<i class="ph ph-x"></i>';
    x.addEventListener('click', () => d.remove());
    d.append(mk('name', 'اسم المكوّن', g.name, { maxLength: 80 }), mk('qty', 'الكمية', g.qty, { maxLength: 20, inputMode: 'decimal' }), mk('unit', 'الوحدة', g.unit, { maxLength: 20 }), x);
    d.querySelector('[data-k="unit"]').setAttribute('list', 'units');
    return d;
  };
  $('addIng').addEventListener('click', () => { const r = row(); $('rIngs').append(r); r.querySelector('input').focus(); });

  const openForm = (r) => {
    editing = r ? r.id : '';
    $('fHead').textContent = r ? 'تعديل الريسيبي' : 'ريسيبي جديد';
    $('rTitle').value = r ? r.title : ''; $('rCat').value = r ? catOf(r) : (ORDER[0] || 'other'); $('rBrand').value = r ? (r.brand || '') : '';
    fillSel('rVideo', [['', 'بدون مقطع'], ...videos.map((v) => [v.id, vtitle(v) + (v.category ? '  (' + (CATS[v.category] || '') + ')' : '')])]);
    $('rVideo').value = r ? (r.video || '') : '';
    $('rSum').value = r ? r.summary : ''; $('rSteps').value = r ? r.steps.join('\n') : ''; $('rNotes').value = r ? r.notes : '';
    $('rIngs').replaceChildren(...((r && r.ingredients.length ? r.ingredients : [{}, {}, {}]).map(row)));
    $('rDel').hidden = !r; msg.textContent = ''; msg.className = 'msg';
    form.hidden = false; document.body.style.overflow = 'hidden'; $('rTitle').focus();
  };
  const closeForm = () => { form.hidden = true; document.body.style.overflow = ''; };
  $('fClose').addEventListener('click', closeForm);
  form.addEventListener('click', (e) => { if (e.target === form) closeForm(); });
  /* اختيار مقطع يملأ الاسم والقسم إن كانا فارغين */
  $('rVideo').addEventListener('change', () => {
    const v = videos.find((x) => x.id === $('rVideo').value); if (!v) return;
    if (!$('rTitle').value.trim() && v.title) $('rTitle').value = v.title;
    if (v.category && CATS[v.category]) $('rCat').value = v.category;
  });

  $('rf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      id: editing || undefined, title: $('rTitle').value.trim(), category: $('rCat').value, brand: $('rBrand').value, video: $('rVideo').value,
      summary: $('rSum').value.trim(), notes: $('rNotes').value.trim(),
      steps: $('rSteps').value.split('\n').map((x) => x.trim()).filter(Boolean),
      ingredients: [...$('rIngs').querySelectorAll('.ing-row')].map((d) => ({ name: d.querySelector('[data-k="name"]').value.trim(), qty: d.querySelector('[data-k="qty"]').value.trim(), unit: d.querySelector('[data-k="unit"]').value.trim() })).filter((g) => g.name),
    };
    if (!body.title) { msg.className = 'msg no'; msg.textContent = 'اكتب اسم المشروب أولاً.'; $('rTitle').focus(); return; }
    try {
      const r = await fetch('/api/recipes', { method: 'POST', body: JSON.stringify(body) });
      if (!r.ok) throw 0;
      const saved = await r.json();
      const i = recipes.findIndex((x) => x.id === saved.id);
      if (i >= 0) recipes[i] = saved; else recipes.push(saved);
    } catch { msg.className = 'msg no'; msg.textContent = 'تعذر الحفظ. تأكد أن الموقع يعمل من ملف التشغيل.'; return; }
    closeForm(); render();
  });
  $('rDel').addEventListener('click', async () => {
    if (!editing || !confirm('حذف هذا الريسيبي نهائياً؟')) return;
    try { await fetch('/api/recipes/delete', { method: 'POST', body: JSON.stringify({ id: editing }) }); } catch { return; }
    recipes = recipes.filter((x) => x.id !== editing); closeForm(); render();
  });

  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!form.hidden) closeForm(); else if (!sheet.hidden) closeSheet(); } });
  $('q').addEventListener('input', (e) => { filter.q = e.target.value; render(); });
  if (canEdit) {
    $('catBtn').hidden = false;
    $('catBtn').addEventListener('click', () => openCats());
    $('addBtn').hidden = false; $('addBtn').addEventListener('click', () => openForm(null)); }
  load();
})();
