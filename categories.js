/* الأقسام المشتركة بين صفحة المقاطع وصفحة الريسيبي.
   Cats.load() يجلبها، Cats.open(counts, onChange) يفتح نافذة إدارتها (إعادة تسمية، إضافة، حذف، ترتيب، لون). */
window.Cats = (() => {
  const FALLBACK = 'other';
  let list = [];
  const api = {
    get list() { return list; },
    ids: () => list.map((c) => c.id),
    map: () => Object.fromEntries(list.map((c) => [c.id, c.name])),
    name: (id) => (list.find((c) => c.id === id) || list.find((c) => c.id === FALLBACK) || { name: '' }).name,
    color: (id) => (list.find((c) => c.id === id) || list.find((c) => c.id === FALLBACK) || { color: '#5d6b62' }).color,
    /* القسم الفعلي: أي معرّف محذوف يرجع لقسم "أخرى" */
    resolve: (id) => (list.some((c) => c.id === id) ? id : FALLBACK),
    async load() {
      try { list = await fetch('/api/categories', { cache: 'no-store' }).then((r) => r.json()); } catch { list = []; }
      if (!list.some((c) => c.id === FALLBACK)) list.push({ id: FALLBACK, name: 'أقسام أخرى', color: '#5d6b62' });
      return list;
    },
  };

  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); }
    e.append(...kids);
    return e;
  };

  api.open = (counts = {}, onChange = () => {}, focusId = '') => {
    let draft = list.map((c) => ({ ...c }));
    const overlay = h('div', { class: 'cm', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'إدارة الأقسام' });
    const panel = h('div', { class: 'cm__panel' });
    const rowsBox = h('div', { class: 'cm__rows' });
    const msg = h('p', { class: 'cm__msg', role: 'status', 'aria-live': 'polite' });

    const draw = () => {
      rowsBox.replaceChildren(...draft.map((c, i) => {
        const color = h('input', { type: 'color', value: c.color, 'aria-label': 'لون القسم', oninput: (e) => { c.color = e.target.value; } });
        const name = h('input', { type: 'text', value: c.name, maxlength: '40', 'aria-label': 'اسم القسم', oninput: (e) => { c.name = e.target.value; } });
        const n = counts[c.id] || 0;
        const info = h('span', { class: 'cm__n' }, n ? n + ' عنصر' : 'فارغ');
        const up = h('button', { type: 'button', class: 'cm__ico', 'aria-label': 'أعلى', onclick: () => { if (i > 0) { [draft[i - 1], draft[i]] = [draft[i], draft[i - 1]]; draw(); } } }, '↑');
        const down = h('button', { type: 'button', class: 'cm__ico', 'aria-label': 'أسفل', onclick: () => { if (i < draft.length - 1) { [draft[i + 1], draft[i]] = [draft[i], draft[i + 1]]; draw(); } } }, '↓');
        const del = h('button', { type: 'button', class: 'cm__ico cm__del', 'aria-label': 'حذف القسم', title: c.id === FALLBACK ? 'هذا القسم ثابت (يستقبل العناصر المحذوف قسمها)' : 'حذف', onclick: () => {
          if (c.id === FALLBACK) return;
          const label = n ? `حذف قسم "${c.name}"؟ العناصر داخله (${n}) تنتقل إلى "${api.name(FALLBACK)}".` : `حذف قسم "${c.name}"؟`;
          if (confirm(label)) { draft = draft.filter((x) => x !== c); draw(); }
        } }, '✕');
        if (c.id === FALLBACK) del.disabled = true;
        return h('div', { class: 'cm__row' }, color, name, info, up, down, del);
      }));
    };

    const close = () => { overlay.remove(); document.body.style.overflow = ''; removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', onKey);

    const add = h('button', { type: 'button', class: 'cm__btn cm__btn--line', onclick: () => {
      const palette = ['#1f8a5b', '#7a5bd0', '#c9a227', '#d4572a', '#2f7fb8', '#c2487b'];
      draft.splice(Math.max(0, draft.length - 1), 0, { id: '', name: 'قسم جديد', color: palette[draft.length % palette.length] });
      draw(); const inputs = rowsBox.querySelectorAll('input[type=text]'); const el = inputs[inputs.length - 2] || inputs[inputs.length - 1]; if (el) { el.focus(); el.select(); }
    } }, '+ قسم جديد');
    const save = h('button', { type: 'button', class: 'cm__btn', onclick: async () => {
      if (draft.some((c) => !c.name.trim())) { msg.textContent = 'اكتب اسماً لكل قسم.'; msg.className = 'cm__msg no'; return; }
      try {
        const r = await fetch('/api/categories', { method: 'POST', body: JSON.stringify({ categories: draft.map((c) => ({ id: c.id, name: c.name.trim(), color: c.color })) }) });
        if (!r.ok) throw 0;
        list = await r.json();
      } catch { msg.textContent = 'تعذر الحفظ. تأكد أن الموقع يعمل من ملف التشغيل.'; msg.className = 'cm__msg no'; return; }
      close(); onChange();
    } }, 'حفظ');
    const cancel = h('button', { type: 'button', class: 'cm__btn cm__btn--line', onclick: close }, 'إلغاء');

    panel.append(
      h('button', { type: 'button', class: 'cm__x', 'aria-label': 'إغلاق', onclick: close }, '✕'),
      h('h2', {}, 'إدارة الأقسام'),
      h('p', { class: 'cm__hint' }, 'غيّر الأسماء، أضف أقساماً، رتّبها، أو احذف ما لا تحتاجه. قسم "أخرى" ثابت.'),
      rowsBox, add, msg, h('div', { class: 'cm__acts' }, save, cancel));
    overlay.append(panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.append(overlay); document.body.style.overflow = 'hidden';
    draw();
    const fi = draft.findIndex((c) => c.id === focusId);
    const target = rowsBox.querySelectorAll('input[type=text]')[fi >= 0 ? fi : 0];
    if (target) { target.focus(); target.select(); }
  };
  return api;
})();
