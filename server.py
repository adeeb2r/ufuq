"""خادم محلي لموقع الأكاديمية.
- يقدّم مجلد site/ كموقع ثابت.
- /api/videos : يقرأ مقاطع inbox/videos ويدمجها مع الأسماء المحفوظة.
- /api/meta   : يحفظ اسم المقطع ووصفه وعلامته وقسمه في site/data/videos.json.
- /media/...  : يبث المقاطع من inbox/videos (مع دعم التقديم والتأخير Range).
يعمل على 127.0.0.1 فقط. للاستخدام المحلي قبل النشر.
"""
import hashlib, json, mimetypes, os, re, sys, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, 'site')
VIDEOS = os.path.join(ROOT, 'inbox', 'videos')
META = os.path.join(SITE, 'data', 'videos.json')
RECIPES = os.path.join(SITE, 'data', 'recipes.json')
CATEGORIES = os.path.join(SITE, 'data', 'categories.json')
EXT = {'.mp4', '.webm', '.mov', '.m4v'}
PORT = int(os.environ.get('PORT', '5173'))
LOCK = threading.Lock()

# مجلد العلامة أو القسم، كما يضعه المالك في inbox/videos
BRAND_FOLDERS = {'mdee', 'hint', 'kib', 'bahi', 'mlt', 'general'}
CATEGORY_FOLDERS = {'مشروبات باردة': 'cold', 'مشروبات ساخنة': 'hot', 'مشروبات الدريب': 'drip'}


def load_meta():
    try:
        with open(META, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_meta(data):
    os.makedirs(os.path.dirname(META), exist_ok=True)
    tmp = META + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, META)


DEFAULT_CATS = [
    {'id': 'hot', 'name': 'مشروبات ساخنة', 'color': '#d4572a'},
    {'id': 'cold', 'name': 'مشروبات باردة', 'color': '#2f7fb8'},
    {'id': 'drip', 'name': 'مشروبات الدريب', 'color': '#a1721e'},
    {'id': 'dessert', 'name': 'حلويات', 'color': '#c2487b'},
    {'id': 'other', 'name': 'أقسام أخرى', 'color': '#5d6b62'},
]


def load_cats():
    try:
        with open(CATEGORIES, encoding='utf-8') as f:
            d = json.load(f)
            if isinstance(d, list) and d:
                return d
    except (OSError, ValueError):
        pass
    return [dict(c) for c in DEFAULT_CATS]


def cat_ids():
    return {c['id'] for c in load_cats()}


def clean_cats(items):
    out, seen = [], set()
    for c in (items or [])[:30]:
        if not isinstance(c, dict):
            continue
        name = str(c.get('name', '')).strip()[:40]
        if not name:
            continue
        cid = str(c.get('id', '')).strip()
        if not re.fullmatch(r'[a-z0-9-]{1,16}', cid) or cid in seen:
            import uuid
            cid = 'c' + uuid.uuid4().hex[:7]
        color = str(c.get('color', ''))
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', color):
            color = '#5d6b62'
        seen.add(cid)
        out.append({'id': cid, 'name': name, 'color': color})
    if 'other' not in seen:  # قسم "أخرى" ثابت: يستقبل أي عنصر قسمه محذوف
        out.append({'id': 'other', 'name': 'أقسام أخرى', 'color': '#5d6b62'})
    return out


BRANDS = {'', 'mdee', 'hint', 'kib', 'bahi', 'mlt', 'general'}


def load_recipes():
    try:
        with open(RECIPES, encoding='utf-8') as f:
            d = json.load(f)
            return d if isinstance(d, list) else []
    except (OSError, ValueError):
        return []


def save_recipes(items):
    os.makedirs(os.path.dirname(RECIPES), exist_ok=True)
    tmp = RECIPES + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    os.replace(tmp, RECIPES)


def clean_recipe(d):
    """تنظيف وتحديد أطوال ما يرسله المتصفح قبل حفظه."""
    t = lambda v, n: str(v if v is not None else '').strip()[:n]
    rid = t(d.get('id'), 12)
    if not re.fullmatch(r'[0-9a-f]{8}', rid):
        rid = ''
    cat = t(d.get('category'), 16)
    brand = t(d.get('brand'), 12)
    video = t(d.get('video'), 12)
    ings = []
    for it in (d.get('ingredients') or [])[:40]:
        if isinstance(it, dict) and t(it.get('name'), 80):
            ings.append({'name': t(it.get('name'), 80), 'qty': t(it.get('qty'), 20), 'unit': t(it.get('unit'), 20)})
    steps = [t(x, 400) for x in (d.get('steps') or [])[:40] if t(x, 400)]
    return {
        'id': rid,
        'title': t(d.get('title'), 120),
        'category': cat if cat in cat_ids() else 'other',
        'brand': brand if brand in BRANDS else '',
        'summary': t(d.get('summary'), 300),
        'ingredients': ings,
        'steps': steps,
        'notes': t(d.get('notes'), 1000),
        'video': video if re.fullmatch(r'[0-9a-f]{10}', video) else '',
    }


def guess_brand(folder, name):
    if folder in BRAND_FOLDERS:
        return folder
    if folder in CATEGORY_FOLDERS:
        return ''  # المشروبات مشتركة بين كل العلامات، لا تُنسب لعلامة
    n = name.lower().replace(' ', '')
    if 'mdee' in n:
        return 'mdee'
    if 'mlt' in n:
        return 'mlt'
    return 'general'


def scan():
    meta = load_meta()
    out = []
    for dp, _, files in os.walk(VIDEOS):
        for fn in files:
            if os.path.splitext(fn)[1].lower() not in EXT:
                continue
            full = os.path.join(dp, fn)
            rel = os.path.relpath(full, VIDEOS).replace(os.sep, '/')
            folder = rel.split('/')[0] if '/' in rel else ''
            vid = hashlib.sha1(rel.encode('utf-8')).hexdigest()[:10]
            m = meta.get(vid, {})
            st = os.stat(full)
            out.append({
                'id': vid,
                'file': rel,
                'original': os.path.splitext(fn)[0],
                'folder': folder,
                'size': st.st_size,
                'added': int(st.st_mtime),
                'title': m.get('title', ''),
                'desc': m.get('desc', ''),
                'brand': m['brand'] if 'brand' in m else guess_brand(folder, fn),
                'category': m.get('category') or CATEGORY_FOLDERS.get(folder, ''),
                'named': bool(m.get('title')),
                'cover': m.get('cover'),
            })
    out.sort(key=lambda v: (v['category'], v['original'].lower()))
    return out


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=SITE, **k)

    def log_message(self, fmt, *args):
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # لا تخزّن ملفات الموقع أثناء التطوير
        if not self.path.startswith('/media/'):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/videos':
            return self._json(scan())
        if path == '/api/recipes':
            return self._json(load_recipes())
        if path == '/api/categories':
            return self._json(load_cats())
        if path.startswith('/media/'):
            return self._media(unquote(path[len('/media/'):]))
        return super().do_GET()

    def do_POST(self):
        rpath = urlparse(self.path).path
        if rpath == '/api/categories':
            try:
                d = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('utf-8'))
            except ValueError:
                return self._json({'error': 'bad request'}, 400)
            with LOCK:
                cats = clean_cats(d.get('categories'))
                os.makedirs(os.path.dirname(CATEGORIES), exist_ok=True)
                tmp = CATEGORIES + '.tmp'
                with open(tmp, 'w', encoding='utf-8') as f:
                    json.dump(cats, f, ensure_ascii=False, indent=2)
                os.replace(tmp, CATEGORIES)
            return self._json(cats)
        if rpath in ('/api/recipes', '/api/recipes/delete'):
            try:
                d = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('utf-8'))
            except ValueError:
                return self._json({'error': 'bad request'}, 400)
            with LOCK:
                items = load_recipes()
                if rpath.endswith('/delete'):
                    rid = str(d.get('id', ''))
                    items = [x for x in items if x.get('id') != rid]
                    save_recipes(items)
                    return self._json({'ok': True})
                r = clean_recipe(d)
                if not r['title']:
                    return self._json({'error': 'title required'}, 400)
                if not r['id']:
                    import uuid
                    r['id'] = uuid.uuid4().hex[:8]
                    items.append(r)
                else:
                    items = [r if x.get('id') == r['id'] else x for x in items]
                    if not any(x.get('id') == r['id'] for x in items):
                        items.append(r)
                save_recipes(items)
            return self._json(r)
        if urlparse(self.path).path != '/api/meta':
            return self._json({'error': 'not found'}, 404)
        try:
            n = int(self.headers.get('Content-Length', 0))
            d = json.loads(self.rfile.read(n).decode('utf-8'))
            vid = str(d['id'])
            if not re.fullmatch(r'[0-9a-f]{10}', vid):
                raise ValueError('bad id')
        except (ValueError, KeyError):
            return self._json({'error': 'bad request'}, 400)
        with LOCK:
            meta = load_meta()
            meta[vid] = {
                'title': str(d.get('title', ''))[:160].strip(),
                'desc': str(d.get('desc', ''))[:600].strip(),
                'brand': str(d.get('brand', ''))[:20],
                'category': str(d.get('category', ''))[:20],
            }
            cv = d.get('cover')
            if isinstance(cv, (int, float)) and 0 <= cv < 36000:
                meta[vid]['cover'] = round(float(cv), 1)
            save_meta(meta)
        return self._json({'ok': True})

    def _media(self, rel):
        full = os.path.normpath(os.path.join(VIDEOS, rel))
        if not full.startswith(VIDEOS + os.sep) or not os.path.isfile(full):
            return self._json({'error': 'not found'}, 404)
        size = os.path.getsize(full)
        ctype = mimetypes.guess_type(full)[0] or 'video/mp4'
        start, end, code = 0, size - 1, 200
        rng = self.headers.get('Range')
        if rng:
            m = re.match(r'bytes=(\d*)-(\d*)', rng)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                    if m.group(2):
                        end = min(int(m.group(2)), size - 1)
                elif m.group(2):
                    start = max(0, size - int(m.group(2)))
                if start > end or start >= size:
                    self.send_response(416)
                    self.send_header('Content-Range', f'bytes */{size}')
                    self.end_headers()
                    return
                code = 206
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        if code == 206:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        try:
            with open(full, 'rb') as f:
                f.seek(start)
                left = end - start + 1
                while left > 0:
                    chunk = f.read(min(1 << 16, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass


if __name__ == '__main__':
    os.makedirs(VIDEOS, exist_ok=True)
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'الموقع يعمل على http://localhost:{PORT}  (للإيقاف: Ctrl+C)')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
