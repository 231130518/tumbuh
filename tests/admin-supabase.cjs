/* Browser integration tests: SDK Supabase asli, endpoint Auth/PostgREST disimulasikan.
   Tidak mengakses/mengubah akun, tabel, artikel, atau policy Supabase produksi. */
const { chromium } = require(process.env.TUMBUH_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ADMIN = '11111111-1111-4111-8111-111111111111';
const MEMBER = '22222222-2222-4222-8222-222222222222';
const API = 'https://fbvsuugeiagceijnioqw.supabase.co';
const outputs = path.join(root, 'test-results');
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let route = decodeURIComponent(url.pathname).replace(/^\/tumbuh(?=\/)/, '');
  let file = path.resolve(root, '.' + route);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }).end(); return; }
    file = path.join(file, 'index.html');
  }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'text/plain' }); res.end(data);
  });
});

function token(id) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })}.test-only-signature`;
}
function identity(id) { return { id, aud: 'authenticated', role: 'authenticated', email: id === ADMIN ? 'admin@example.test' : 'member@example.test', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {} }; }
function session(id) { return { access_token: token(id), refresh_token: 'test-only-refresh-' + id, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: identity(id) }; }
function fixtures() {
  return Array.from({ length: 25 }, (_, index) => ({
    id: index === 0 ? '9223372036854775806' : String(index + 1),
    created_at: '2026-11-01T12:00:00Z', author_name: 'Penulis Uji', author_email: 'private@example.test',
    title: index === 0 ? 'Artikel dari Supabase <img src=x onerror=alert(1)>' : 'Artikel ' + (index + 1),
    subtitle: 'Subjudul artikel untuk pengujian.', status: 'pending', cover_image_path: 'covers/test.png',
    content: '<h2>Isi yang aman</h2><p class="evil article-disclaimer">Teks <strong>tebal</strong></p><script>window.__xss=1</script><img src=x onerror="window.__xss=1"><svg onload="window.__xss=1"></svg><a href="javascript:alert(1)">Jahat</a><a href="https://example.com">Aman</a><input id="admin-content"><iframe src="https://evil.invalid"></iframe>',
  }));
}

async function mock(context, options = {}) {
  const state = { rows: fixtures(), admin: true, expired: false, membershipFailure: false, articlesFailure: false, conflict: false, membershipDelay: 0, readCalls: 0, patchCalls: 0, patches: [], requests: [], publicSubmissions: false, uploadDenied: false, insertDenied: false, insertFailOnce: false, lostInsertResponse: false, uploads: new Map(), submissions: [], uploadCalls: 0, insertCalls: 0, ...options };
  await context.route('https://**/*', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin !== API) { await route.abort(); return; }
    const method = req.method();
    state.requests.push({ path: url.pathname, method });
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range,x-supabase-api-version', 'x-supabase-api-version': '2024-01-01', 'content-type': 'application/json' };
    const reply = (data, status = 200, extra = {}) => route.fulfill({ status, headers: { ...headers, ...extra }, body: status === 204 ? undefined : JSON.stringify(data) });
    if (method === 'OPTIONS') { await reply(null, 204); return; }
    const auth = req.headers().authorization || '';
    let id;
    try { id = JSON.parse(Buffer.from(auth.split(' ')[1].split('.')[1], 'base64url')).sub; } catch { /* anon */ }
    if (url.pathname === '/auth/v1/token') {
      const body = req.postDataJSON();
      if (body.password !== 'test-only-password') { await reply({ code: 'invalid_credentials', message: 'Invalid login credentials' }, 400); return; }
      await reply(session(body.email === 'admin@example.test' ? ADMIN : MEMBER)); return;
    }
    if (url.pathname === '/auth/v1/user') {
      await reply(id && !state.expired ? identity(id) : { code: 'bad_jwt', message: 'Invalid JWT' }, id && !state.expired ? 200 : 401); return;
    }
    if (url.pathname === '/auth/v1/logout') { await reply(null, 204); return; }
    if (url.pathname === '/rest/v1/admin_users') {
      if (state.membershipDelay) await new Promise((resolve) => setTimeout(resolve, state.membershipDelay));
      if (state.membershipFailure) { await reply({ code: '42501', message: 'permission denied' }, 403); return; }
      await reply(id === ADMIN && state.admin ? [{ user_id: ADMIN }] : []); return;
    }
    if (url.pathname === '/rest/v1/articles') {
      if (['GET', 'HEAD'].includes(method) && state.readGate) await state.readGate;
      if (method === 'POST' && state.publicSubmissions) {
        assert.equal(id, undefined, 'Pengiriman publik tidak boleh memakai token admin');
        state.insertCalls += 1;
        if (state.insertDenied) { await reply({ code: '42501', message: 'permission denied for table articles' }, 401); return; }
        if (state.insertFailOnce) { state.insertFailOnce = false; await reply({ code: 'test_unavailable', message: 'try again' }, 503); return; }
        const body = req.postDataJSON();
        assert.equal(body.status, 'pending');
        assert.equal(body.id, undefined);
        assert.equal(body.created_at, undefined);
        assert.equal(url.searchParams.has('select'), false);
        assert(!req.headers().prefer?.includes('return=representation'));
        assert(state.uploads.has(body.cover_image_path));
        if (state.submissions.some((item) => item.cover_image_path === body.cover_image_path)) {
          await reply({ code: '23505', message: 'duplicate key value violates unique constraint "tumbuh_submission_cover_unique"' }, 409); return;
        }
        state.submissions.push(body);
        state.rows.unshift({ ...body, id: '10001', created_at: '2026-11-09T00:00:00Z' });
        if (state.lostInsertResponse) { state.lostInsertResponse = false; await route.abort('connectionreset'); return; }
        await reply(null, 201); return;
      }
      const isPublicRead = !id && ['GET', 'HEAD'].includes(method);
      if (!isPublicRead && (id !== ADMIN || !state.admin || state.expired)) { await reply({ code: '42501', message: 'RLS denied' }, 403); return; }
      const selected = url.searchParams.get('select') || '';
      if (isPublicRead && (selected.includes('author_email') || selected.includes('*'))) {
        await reply({ code: '42501', message: 'permission denied for column author_email' }, 401); return;
      }
      if (state.articlesFailure) { await reply({ message: 'Unavailable' }, 503); return; }
      const idFilter = url.searchParams.get('id');
      const requestedId = idFilter?.replace(/^(eq|neq)\./, '');
      const requestedStatus = url.searchParams.get('status')?.replace(/^eq\./, '');
      let rows = state.rows.filter((row) => (!isPublicRead || row.status === 'published') &&
        (!requestedId || (idFilter.startsWith('neq.') ? row.id !== requestedId : row.id === requestedId)) &&
        (!requestedStatus || row.status === requestedStatus));
      const search = url.searchParams.get('or')?.match(/title\.ilike\."%((?:\\.|[^"\\])*)%"/);
      if (search) {
        const term = search[1].replace(/\\(.)/g, '$1').toLowerCase();
        rows = rows.filter((row) => `${row.title} ${row.subtitle}`.toLowerCase().includes(term));
      }
      if (method === 'PATCH') {
        state.patchCalls += 1;
        const body = req.postDataJSON();
        state.patches.push(body);
        assert.deepEqual(Object.keys(body), ['status']);
        if (state.conflict) rows = [];
        rows.forEach((row) => { row.status = body.status; });
        await reply(rows); return;
      }
      if (method === 'DELETE') {
        assert(requestedId, 'DELETE harus dibatasi ID');
        assert(requestedStatus, 'DELETE harus memeriksa status sebelumnya');
        if (state.deleteDenied) { await reply({ code: '42501', message: 'permission denied' }, 403); return; }
        if (state.conflict) rows = [];
        state.rows = state.rows.filter((row) => !rows.includes(row));
        await reply(rows.map((row) => ({ id: row.id }))); return;
      }
      state.readCalls += 1;
      const total = rows.length;
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || rows.length || 1);
      rows = rows.slice(offset, offset + limit).map((row) => {
        const selected = url.searchParams.get('select') || '';
        const copy = { ...row };
        if (!selected.includes('content')) delete copy.content;
        if (!selected.includes('author_email')) delete copy.author_email;
        return copy;
      });
      const range = rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}`;
      await reply(method === 'HEAD' ? null : rows, 200, { 'content-range': range }); return;
    }
    if (url.pathname.startsWith('/storage/v1/object/articles-images/') && method === 'POST' && state.publicSubmissions) {
      assert.equal(id, undefined, 'Upload publik tidak boleh memakai token admin');
      assert.equal(req.headers()['x-upsert'], 'false');
      state.uploadCalls += 1;
      if (state.uploadDenied) { await reply({ statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' }, 403); return; }
      const objectPath = decodeURIComponent(url.pathname.slice('/storage/v1/object/articles-images/'.length));
      assert(/^submissions\/[0-9a-f-]{36}\/cover\.png$/.test(objectPath));
      if (state.uploads.has(objectPath)) { await reply({ statusCode: '409', error: 'Duplicate', message: 'The resource already exists' }, 409); return; }
      state.uploads.set(objectPath, fs.readFileSync(path.join(root, 'favicon.png')));
      await reply({ Key: 'articles-images/' + objectPath, Id: 'test-object-id' }); return;
    }
    if (url.pathname.startsWith('/storage/v1/object/public/articles-images/')) {
      await route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(root, 'favicon.png')) }); return;
    }
    throw new Error('Unexpected mock endpoint: ' + req.url());
  });
  return state;
}

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.TUMBUH_BROWSER_EXECUTABLE ? { executablePath: process.env.TUMBUH_BROWSER_EXECUTABLE } : {}) });
  const results = [];
  fs.mkdirSync(outputs, { recursive: true });
  async function test(name, run, options) {
    if (process.env.TUMBUH_TEST_FILTER && !name.includes(process.env.TUMBUH_TEST_FILTER)) return;
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => sessionStorage.setItem('tumbuh-opened', '1'));
    const state = await mock(context, options);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('dialog', (dialog) => dialog.accept());
    const goto = (route) => page.goto(origin + route);
    const login = async (email = 'admin@example.test', password = 'test-only-password', prefix = '/') => {
      await goto(prefix + 'admin/');
      await page.waitForFunction(() => !document.querySelector('#admin-login-submit').disabled);
      await page.locator('#admin-email').fill(email);
      await page.locator('#admin-password').fill(password);
      await page.locator('#admin-login-submit').click();
    };
    const fillSubmission = async (prefix = '/') => {
      await goto(prefix + 'kirim-artikel/');
      await page.waitForFunction(() => !document.querySelector('#submit-article-button').disabled);
      await page.locator('#author').fill('Penulis Pengunjung');
      await page.locator('#title').fill('Menu sehat untuk keluarga');
      await page.locator('#subtitle').fill('Panduan praktis untuk keluarga yang ingin makan beragam.');
      await page.locator('#content-editor').fill('Isi artikel yang cukup panjang untuk pengujian pengiriman publik ke database.');
      await page.locator('#cover-file').setInputFiles(path.join(root, 'favicon.png'));
    };
    try {
      await run({ context, page, state, goto, login, fillSubmission, origin });
      assert.deepEqual(errors, []);
      results.push({ name, status: 'passed', kind: 'simulated Supabase + real SDK' });
      console.log('PASS ' + name);
    } catch (error) {
      results.push({ name, status: 'failed', error: error.message });
      await page.screenshot({ path: path.join(outputs, 'failure.png'), fullPage: true });
      throw error;
    } finally { await context.close(); }
  }
  try {
    await test('Skeleton publik: shimmer, mobile, sukses, detail, gagal dan retry', async ({ page, state, goto }) => {
      state.rows[0].status = 'published';
      let release;
      state.readGate = new Promise((resolve) => { release = resolve; });
      await goto('/artikel/');
      await page.locator('#article-list .article-skeleton').first().waitFor();
      assert.equal(await page.locator('#article-list').getAttribute('aria-busy'), 'true');
      assert.equal(await page.locator('#article-list .article-card').count(), 0);
      assert.equal(await page.locator('.skeleton-block').first().evaluate((el) => getComputedStyle(el, '::after').animationName), 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      assert.equal(await page.locator('.skeleton-block').first().evaluate((el) => getComputedStyle(el, '::after').animationName), 'article-shimmer');
      await page.screenshot({ path: path.join(outputs, 'skeleton-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.locator('#article-list .article-skeleton').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(outputs, 'skeleton-mobile.png'), fullPage: false });
      release(); state.readGate = null;
      await page.locator('#article-list .article-card').waitFor();
      assert.equal(await page.locator('.article-skeleton').count(), 0);
      assert.equal(await page.locator('#article-list').getAttribute('aria-busy'), null);
      assert.equal(await page.locator('#article-list').evaluate((el) => getComputedStyle(el).animationName), 'article-content-in');
      state.readGate = new Promise((resolve) => { release = resolve; });
      await goto('/artikel/baca/?id=' + state.rows[0].id);
      await page.locator('#article-detail .skeleton-detail').waitFor();
      assert.equal(await page.locator('#article-detail').getAttribute('aria-busy'), 'true');
      release(); state.readGate = null;
      await page.getByText('Isi yang aman', { exact: true }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.article-skeleton'));
      assert.equal(await page.locator('#article-detail').getAttribute('aria-busy'), null);
      state.articlesFailure = true;
      await goto('/artikel/');
      await page.getByRole('button', { name: 'Coba lagi', exact: true }).waitFor();
      assert.equal(await page.locator('.article-skeleton').count(), 0);
      state.articlesFailure = false;
      state.readGate = new Promise((resolve) => { release = resolve; });
      await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
      await page.locator('#article-list .article-skeleton').first().waitFor();
      release(); state.readGate = null;
      await page.locator('#article-list .article-card').waitFor();
    });
    await test('Skeleton admin: data menunggu setelah verifikasi, preview, dan error dibersihkan', async ({ page, state, login }) => {
      let release;
      state.readGate = new Promise((resolve) => { release = resolve; });
      await login();
      await page.locator('#review-list .skeleton-review').first().waitFor();
      assert.equal(await page.locator('#review-list .review-item').count(), 0);
      release(); state.readGate = null;
      await page.locator('.review-action').first().waitFor();
      assert.equal(await page.locator('.article-skeleton').count(), 0);
      state.readGate = new Promise((resolve) => { release = resolve; });
      await page.locator('.review-action').first().click();
      await page.locator('#preview-skeleton .skeleton-detail').waitFor();
      assert.equal(await page.locator('#admin-preview-article').isVisible(), false);
      release(); state.readGate = null;
      await page.waitForSelector('#admin-preview-article:not([hidden])');
      assert.equal(await page.locator('.article-skeleton').count(), 0);
      state.articlesFailure = true;
      await page.locator('#preview-reload').click();
      await page.getByText('Artikel belum dapat dimuat. Periksa koneksi atau izin akses, lalu coba lagi.', { exact: true }).waitFor();
      assert.equal(await page.locator('.article-skeleton').count(), 0);
      assert.equal(await page.locator('#preview-skeleton').getAttribute('aria-busy'), null);
    });
    await test('Dashboard/preview tanpa sesi menolak data; flag localStorage tidak memberi akses', async ({ page, state, goto }) => {
      await page.addInitScript(() => { localStorage.setItem('isAdmin', 'true'); localStorage.setItem('tumbuh-frontend-articles-v1', JSON.stringify([{ id: 'local-1', title: 'BOCOR', status: 'pending' }])); });
      for (const route of ['/admin/peninjauan/', '/admin/pratinjau/?id=1', '/admin/dashboard.html', '/admin/preview.html?id=1']) {
        await goto(route);
        await page.waitForURL(/\/admin\/\?reason=session/);
        assert.equal(await page.locator('#admin-login-form').count(), 1);
      }
      assert.equal(state.readCalls, 0);
    });
    await test('Password salah menampilkan error dan mengembalikan loading state', async ({ page, state, login }) => {
      await login('admin@example.test', 'wrong');
      await page.getByText('Email atau password salah.', { exact: true }).waitFor();
      assert.equal(await page.locator('#admin-login-submit').isDisabled(), false);
      assert.equal(await page.locator('#admin-password').inputValue(), '');
      assert.equal(state.readCalls, 0);
    });
    await test('Akun biasa ditolak dan sesi di-sign-out', async ({ page, state, login }) => {
      await login('member@example.test');
      await page.getByText('Akun ini tidak mempunyai akses admin.', { exact: true }).waitFor();
      assert.equal(state.readCalls, 0);
      assert.equal(await page.evaluate(async () => (await TumbuhSupabase.getClient().auth.getSession()).data.session), null);
      assert(state.requests.some((r) => r.path.endsWith('/logout')));
    });
    await test('Kegagalan policy membership menolak akses tanpa fallback demo', async ({ page, state, login }) => {
      await login();
      await page.getByText('Keanggotaan admin belum dapat diverifikasi. Hubungi pengelola atau coba lagi.', { exact: true }).waitFor();
      assert.equal(state.readCalls, 0);
    }, { membershipFailure: true });
    await test('Admin valid: pending, pagination, refresh, dan responsif', async ({ page, state, login }) => {
      await login();
      await page.waitForURL(/\/admin\/peninjauan\/$/);
      await page.waitForFunction(() => document.querySelectorAll('.review-item').length === 20);
      assert.equal(await page.locator('#pending-count').textContent(), '25');
      assert(!(await page.locator('body').innerText()).includes('private@example.test'));
      await page.locator('#review-next').click();
      await page.waitForFunction(() => document.querySelectorAll('.review-item').length === 5);
      await page.reload();
      await page.waitForFunction(() => document.querySelectorAll('.review-item').length === 20);
      await page.screenshot({ path: path.join(outputs, 'dashboard-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const layout = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, footer: document.querySelector('#site-footer').getBoundingClientRect().bottom + scrollY }));
      assert(layout.height - layout.footer < 3, JSON.stringify(layout));
      await page.screenshot({ path: path.join(outputs, 'dashboard-mobile.png'), fullPage: true });
      assert(state.readCalls > 0);
    });
    await test('Data tetap tersembunyi saat verifikasi belum selesai', async ({ context, page, state, login, origin }) => {
      await login();
      await page.waitForSelector('.review-item');
      state.membershipDelay = 600;
      state.readCalls = 0;
      const second = await context.newPage();
      await second.goto(origin + '/admin/peninjauan/');
      assert.equal(await second.locator('#admin-content').isVisible(), false);
      assert.equal(state.readCalls, 0);
      await second.waitForSelector('.review-item');
    });
    await test('Pratinjau: sanitasi XSS, ID int8, publish/reject tersimpan, status tampil', async ({ page, state, login }) => {
      await login(); await page.waitForSelector('.review-action');
      await page.locator('.review-action').first().click();
      await page.waitForSelector('#admin-preview-article:not([hidden])');
      assert(page.url().endsWith('id=9223372036854775806'));
      assert.equal(await page.locator('#preview-body script, #preview-body img, #preview-body svg, #preview-body iframe, #preview-body input').count(), 0);
      assert.equal(await page.evaluate(() => window.__xss), undefined);
      assert.equal(await page.locator('#preview-body a').first().getAttribute('href'), null);
      assert.equal(await page.locator('#preview-body .evil').count(), 0);
      assert.equal(await page.locator('#preview-body strong').textContent(), 'tebal');
      assert.equal(await page.locator('#preview-email').textContent(), 'Email penulis: private@example.test');
      await page.locator('#approve-article').click();
      await page.getByText('Status berhasil disimpan: Terbit.', { exact: true }).waitFor();
      assert.equal(state.rows[0].status, 'published');
      await page.locator('#reject-article').click();
      await page.getByText('Status berhasil disimpan: Ditolak.', { exact: true }).waitFor();
      assert.equal(state.rows[0].status, 'rejected');
      assert.deepEqual(state.patches, [{ status: 'published' }, { status: 'rejected' }]);
      await page.reload(); await page.waitForSelector('#admin-preview-article:not([hidden])');
      assert.equal(await page.locator('#preview-status').textContent(), '● Ditolak');
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(outputs, 'preview-mobile.png'), fullPage: true });
    });
    await test('Hapus: batal tanpa request, konfirmasi menghapus satu ID int8 dan hilang dari publik', async ({ page, state, login, goto }) => {
      await login(); await page.waitForSelector('.review-action'); await page.locator('.review-action').first().click();
      await page.waitForSelector('#admin-preview-article:not([hidden])');
      const id = state.rows[0].id;
      page.removeAllListeners('dialog'); page.once('dialog', (dialog) => dialog.dismiss());
      await page.locator('#delete-article').click();
      assert.equal(state.requests.filter((r) => r.method === 'DELETE').length, 0);
      assert.equal(state.rows.length, 25);
      // Artikel published juga dapat dihapus; baca ulang agar status sesuai.
      state.rows[0].status = 'published';
      await page.reload(); await page.waitForSelector('#admin-preview-article:not([hidden])');
      page.once('dialog', (dialog) => { assert(dialog.message().includes('tidak dapat dibatalkan')); return dialog.accept(); });
      await page.locator('#delete-article').click();
      await page.waitForURL(/\/admin\/peninjauan\/$/); await page.waitForSelector('.review-item');
      assert.equal(state.rows.length, 24); assert(!state.rows.some((row) => row.id === id));
      assert.equal(state.requests.filter((r) => r.method === 'DELETE').length, 1);
      await goto('/artikel/baca/?id=' + id);
      await page.getByText('Artikel tidak tersedia.', { exact: true }).waitFor();
    });
    await test('Hapus: izin ditolak dan nol baris tidak mengaku berhasil', async ({ page, state, login }) => {
      await login(); await page.waitForSelector('.review-action'); await page.locator('.review-action').first().click();
      await page.waitForSelector('#admin-preview-article:not([hidden])');
      state.deleteDenied = true;
      await page.locator('#delete-article').click();
      await page.getByText(/Artikel belum dapat dihapus\./).waitFor();
      assert.equal(state.rows.length, 25); assert.equal(await page.locator('#delete-article').isEnabled(), true);
      state.deleteDenied = false; state.conflict = true;
      await page.locator('#delete-article').click();
      await page.getByText(/Penghapusan belum terkonfirmasi\./).waitFor();
      assert.equal(state.rows.length, 25); assert(page.url().includes('/admin/pratinjau/'));
    });
    await test('Hapus: keanggotaan dicabut mencegah request DELETE', async ({ page, state, login }) => {
      await login(); await page.waitForSelector('.review-action'); await page.locator('.review-action').first().click();
      await page.waitForSelector('#admin-preview-article:not([hidden])');
      state.admin = false;
      await page.locator('#delete-article').click(); await page.waitForURL(/reason=forbidden/);
      assert.equal(state.requests.filter((r) => r.method === 'DELETE').length, 0);
      assert.equal(state.rows.length, 25);
    });
    await test('Konflik status tidak dilaporkan berhasil', async ({ page, state, login }) => {
      await login(); await page.waitForSelector('.review-action'); await page.locator('.review-action').first().click();
      await page.waitForSelector('#admin-preview-article:not([hidden])');
      state.conflict = true;
      await page.locator('#approve-article').click();
      await page.getByText('Artikel berubah atau akses telah dicabut. Muat ulang artikel sebelum mencoba lagi.', { exact: true }).waitFor();
      assert.equal(state.rows[0].status, 'pending');
      assert.equal(await page.locator('#preview-status').textContent(), '● Menunggu tinjauan');
    });
    await test('Keanggotaan dicabut sebelum keputusan: tidak ada PATCH', async ({ page, state, login }) => {
      await login(); await page.waitForSelector('.review-action'); await page.locator('.review-action').first().click();
      await page.waitForSelector('#admin-preview-article:not([hidden])');
      state.admin = false;
      await page.locator('#approve-article').click();
      await page.waitForURL(/reason=forbidden/);
      assert.equal(state.patchCalls, 0);
    });
    await test('Logout mengunci tab lain dan URL langsung kembali meminta login', async ({ context, page, state, login, origin, goto }) => {
      await login(); await page.waitForSelector('.review-item');
      const second = await context.newPage(); await second.goto(origin + '/admin/peninjauan/'); await second.waitForSelector('.review-item');
      await page.locator('[data-admin-logout]').click();
      await page.waitForURL(/reason=logout/);
      await second.waitForURL(/reason=session/);
      const reads = state.readCalls;
      await goto('/admin/peninjauan/'); await page.waitForURL(/reason=session/);
      assert.equal(state.readCalls, reads);
    });
    await test('Sesi kedaluwarsa ditolak sebelum membaca ulang artikel', async ({ page, state, login }) => {
      await login(); await page.waitForSelector('.review-item');
      state.expired = true;
      const reads = state.readCalls;
      await page.locator('#review-reload').click(); await page.waitForURL(/reason=session/);
      assert.equal(state.readCalls, reads);
    });
    await test('Kegagalan data tidak diganti seed lokal; retry bekerja', async ({ page, state, login }) => {
      await login();
      await page.getByText('Artikel belum dapat dimuat. Periksa koneksi atau izin akses, lalu coba lagi.', { exact: true }).waitFor();
      assert.equal(await page.locator('.review-item').count(), 0);
      state.articlesFailure = false;
      await page.locator('#review-reload').click(); await page.waitForSelector('.review-item');
    }, { articlesFailure: true });
    await test('Base path /tumbuh/ dan penolakan open redirect', async ({ page, login, goto }) => {
      await login('admin@example.test', 'test-only-password', '/tumbuh/');
      await page.waitForURL(/\/tumbuh\/admin\/peninjauan\/$/); await page.waitForSelector('.review-item');
      await goto('/tumbuh/admin/?next=https://evil.invalid/');
      await page.waitForURL(/\/tumbuh\/admin\/peninjauan\/$/);
    });
    await test('Konfigurasi kosong dan secret key ditolak sebelum request', async ({ context, page, state, goto }) => {
      await context.route('**/js/supabase-config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: 'window.TumbuhSupabaseConfig={url:"",publishableKey:"",adminUserIdColumn:"user_id"};' }));
      await goto('/admin/');
      await page.getByText('Konfigurasi URL Supabase belum valid. Hubungi pengelola situs.', { exact: true }).waitFor();
      assert.equal(await page.locator('#admin-login-submit').isDisabled(), true);
      await context.unroute('**/js/supabase-config.js');
      await context.route('**/js/supabase-config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: `window.TumbuhSupabaseConfig={url:"${API}",publishableKey:"sb_secret_TEST_ONLY_NOT_A_KEY",adminUserIdColumn:"user_id"};` }));
      await goto('/admin/peninjauan/');
      await page.getByText('Konfigurasi publishable/anon key belum valid. Secret key tidak boleh digunakan di browser.', { exact: true }).waitFor();
      assert.equal(await page.locator('#admin-content').isVisible(), false);
      assert.equal(state.requests.length, 0);
    });
    await test('Publik hanya published: tanpa data demo, email, atau artikel pending', async ({ page, state, goto }) => {
      state.rows[1].status = 'published';
      await page.addInitScript(() => localStorage.setItem('tumbuh-frontend-articles-v1', JSON.stringify([{ id: 'local-1', title: 'BOCOR DEMO', status: 'published' }])));
      await goto('/'); await page.waitForSelector('#home-articles .article-card');
      assert.equal(await page.locator('#home-articles .article-card').count(), 1);
      assert(!(await page.locator('body').innerText()).includes('BOCOR DEMO'));
      assert(!(await page.locator('body').innerText()).includes('private@example.test'));
      await goto('/artikel/baca/?id=9223372036854775806');
      await page.getByText('Artikel tidak tersedia.', { exact: true }).waitFor();
      await goto('/artikel/baca/?id=2');
      await page.waitForFunction(() => document.getElementById('article-hero-title').textContent === 'Artikel 2');
      assert.equal(await page.locator('#article-detail script, #article-detail img, #article-detail svg, #article-detail iframe').count(), 0);
      assert(!(await page.locator('body').innerText()).includes('private@example.test'));
      assert.equal(await page.evaluate(() => typeof window.TumbuhArticles), 'undefined');
      const denied = await page.evaluate(async () => {
        const db = TumbuhSupabase.getPublicClient();
        const email = await db.from('articles').select('author_email').eq('status', 'published');
        const pending = await db.from('articles').select('id,status').eq('status', 'pending');
        return { emailCode: email.error?.code, pending: pending.data };
      });
      assert.equal(denied.emailCode, '42501'); assert.deepEqual(denied.pending, []);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(outputs, 'public-detail-mobile.png'), fullPage: true });
    });
    await test('Draf form hanya lokal, dapat dipulihkan, tanpa upload/INSERT', async ({ page, state, fillSubmission }) => {
      await fillSubmission();
      await page.locator('#save-article-draft').click();
      await page.getByText('Draf teks disimpan di browser ini, belum dikirim ke admin. Pilih gambar kembali saat melanjutkan draf.', { exact: true }).waitFor();
      assert.equal(state.requests.length, 0);
      await page.reload();
      await page.locator('#restore-article-draft').click();
      assert.equal(await page.locator('#title').inputValue(), 'Menu sehat untuk keluarga');
      assert.equal(await page.locator('#cover-file').evaluate((el) => el.files.length), 0);
      assert.equal(state.requests.length, 0);
    }, { publicSubmissions: true });
    await test('Kirim tanpa login: file terunggah, HTML bersih, INSERT pending, pesan sukses', async ({ page, state, fillSubmission }) => {
      await fillSubmission();
      await page.locator('#content-editor').evaluate((el) => { el.innerHTML = '<p>Artikel publik dengan isi yang cukup untuk dikirim kepada admin.</p><script>window.__submit_xss=1</script><a href="javascript:alert(1)" onclick="alert(1)">tautan</a>'; });
      await page.locator('#submit-article-button').click();
      await page.getByText('Artikel berhasil dikirim dan menunggu peninjauan admin. Artikel belum diterbitkan.', { exact: true }).waitFor();
      assert.equal(state.uploads.size, 1);
      assert.equal(state.submissions.length, 1);
      assert.equal(state.submissions[0].author_email, null);
      assert.equal(state.submissions[0].status, 'pending');
      assert(!/script|onclick|javascript:/i.test(state.submissions[0].content));
      assert.equal(await page.evaluate(() => window.__submit_xss), undefined);
      assert.equal(await page.locator('#title').inputValue(), '');
      assert.equal(await page.locator('#cover-file').evaluate((el) => el.files.length), 0);
      assert.equal(await page.evaluate(() => localStorage.getItem('tumbuh-frontend-articles-v1')), null);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(outputs, 'submission-mobile.png'), fullPage: true });
    }, { publicSubmissions: true });
    await test('Pengiriman tidak memakai/menghapus sesi admin; kiriman masuk dashboard dan bisa ditinjau', async ({ page, state, login, fillSubmission, goto }) => {
      await login(); await page.waitForSelector('.review-item');
      await fillSubmission();
      await page.locator('#submit-article-button').click();
      await page.getByText('Artikel berhasil dikirim dan menunggu peninjauan admin. Artikel belum diterbitkan.', { exact: true }).waitFor();
      await goto('/admin/peninjauan/'); await page.waitForSelector('.review-item');
      assert((await page.locator('.review-item').first().innerText()).includes('Menu sehat untuk keluarga'));
      await page.locator('.review-action').first().click();
      await page.waitForSelector('#admin-preview-article:not([hidden])');
      assert.equal(await page.locator('#preview-title').textContent(), 'Menu sehat untuk keluarga');
      await page.locator('#approve-article').click();
      await page.getByText('Status berhasil disimpan: Terbit.', { exact: true }).waitFor();
      assert.equal(state.rows.find((row) => row.id === '10001').status, 'published');
      await goto('/'); await page.waitForSelector('#home-articles .article-card');
      assert((await page.locator('#home-articles').innerText()).includes('Menu sehat untuk keluarga'));
      await page.locator('#home-articles .article-card h3 a').first().click();
      await page.waitForFunction(() => document.getElementById('article-hero-title').textContent === 'Menu sehat untuk keluarga');
      await goto('/admin/pratinjau/?id=10001'); await page.waitForSelector('#admin-preview-article:not([hidden])');
      await page.locator('#reject-article').click();
      await page.getByText('Status berhasil disimpan: Ditolak.', { exact: true }).waitFor();
      await goto('/artikel/baca/?id=10001'); await page.getByText('Artikel tidak tersedia.', { exact: true }).waitFor();
    }, { publicSubmissions: true });
    await test('Upload ditolak: tidak INSERT dan tidak mengaku sukses; isian dipertahankan', async ({ page, state, fillSubmission }) => {
      await fillSubmission();
      await page.locator('#submit-article-button').click();
      await page.getByText('Gambar belum dapat diunggah karena layanan belum mengizinkan pengiriman publik. Hubungi pengelola; artikel belum terkirim.', { exact: true }).waitFor();
      assert.equal(state.insertCalls, 0);
      assert.equal(await page.locator('#title').inputValue(), 'Menu sehat untuk keluarga');
      assert.equal(await page.locator('#submit-article-button').isDisabled(), false);
    }, { publicSubmissions: true, uploadDenied: true });
    await test('INSERT ditolak setelah upload: retry memakai gambar sama tanpa izin DELETE', async ({ page, state, fillSubmission }) => {
      await fillSubmission();
      await page.locator('#submit-article-button').click();
      await page.getByText('Gambar sudah diunggah, tetapi artikel belum diterima karena izin pengiriman belum aktif. Isian dipertahankan; coba lagi setelah pengelola memperbaiki akses.', { exact: true }).waitFor();
      assert.equal(state.submissions.length, 0);
      state.insertDenied = false;
      await page.locator('#submit-article-button').click();
      await page.getByText('Artikel berhasil dikirim dan menunggu peninjauan admin. Artikel belum diterbitkan.', { exact: true }).waitFor();
      assert.equal(state.uploadCalls, 1);
      assert.equal(state.submissions.length, 1);
      assert(!state.requests.some((request) => request.method === 'DELETE'));
    }, { publicSubmissions: true, insertDenied: true });
    await test('Respons INSERT hilang: retry tidak membuat kiriman ganda', async ({ page, state, fillSubmission }) => {
      await fillSubmission();
      await page.locator('#submit-article-button').click();
      await page.getByText('Server belum mengonfirmasi pengiriman artikel. Isian dipertahankan. Tekan Kirim lagi untuk mencoba ulang tanpa menggandakan kiriman yang sama.', { exact: true }).waitFor();
      assert.equal(state.submissions.length, 1);
      await page.locator('#submit-article-button').click();
      await page.getByText('Artikel berhasil dikirim dan menunggu peninjauan admin. Artikel belum diterbitkan.', { exact: true }).waitFor();
      assert.equal(state.submissions.length, 1);
      assert.equal(state.uploadCalls, 1);
    }, { publicSubmissions: true, lostInsertResponse: true });
    await test('Gambar palsu dan >5 MB ditolak sebelum jaringan; base path /tumbuh/ bekerja', async ({ page, state, fillSubmission }) => {
      await fillSubmission('/tumbuh/');
      await page.locator('#cover-file').setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('bukan gambar sungguhan') });
      await page.locator('#submit-article-button').click();
      await page.getByText('Isi file tidak sesuai format gambar yang dipilih.', { exact: true }).waitFor();
      assert.equal(state.uploadCalls, 0);
      await page.locator('#cover-file').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
      assert.equal(await page.locator('#cover-file').evaluate((el) => el.files.length), 0);
      assert.equal(state.uploadCalls, 0);
      await page.locator('#cover-file').setInputFiles(path.join(root, 'favicon.png'));
      await page.locator('#submit-article-button').click();
      await page.getByText('Artikel berhasil dikirim dan menunggu peninjauan admin. Artikel belum diterbitkan.', { exact: true }).waitFor();
      assert.equal(state.submissions.length, 1);
    }, { publicSubmissions: true });
    await test('Daftar publik: pagination, pencarian, hasil kosong dan karakter filter aman', async ({ page, state, goto }) => {
      state.rows.forEach((row) => { row.status = 'published'; });
      state.rows[0].title = 'Menu "sehat", tanpa gula';
      await goto('/tumbuh/artikel/');
      await page.waitForFunction(() => document.querySelectorAll('#article-list .article-card').length === 9);
      await page.locator('#public-next').click();
      await page.waitForFunction(() => document.getElementById('public-page-label').textContent.includes('Halaman 2'));
      await page.locator('#article-search').fill('Menu "sehat",');
      await page.waitForFunction(() => document.querySelectorAll('#article-list .article-card').length === 1);
      assert((await page.locator('#article-list').innerText()).includes('Menu "sehat", tanpa gula'));
      await page.locator('#article-search').fill('tidak ada yang cocok');
      await page.getByText('Belum ada artikel dengan kata kunci tersebut.', { exact: true }).waitFor();
      await page.locator('#article-search').fill('x"),status.eq.pending');
      await page.getByText('Belum ada artikel dengan kata kunci tersebut.', { exact: true }).waitFor();
      await page.locator('#article-search').fill('');
      await page.waitForFunction(() => document.querySelectorAll('#article-list .article-card').length === 9);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(outputs, 'public-list-mobile.png'), fullPage: true });
    });
    await test('API publik gagal/ID tidak valid: tidak mengganti data dengan artikel contoh', async ({ page, state, goto }) => {
      state.articlesFailure = true;
      await goto('/');
      await page.getByText('Artikel belum dapat dimuat. Coba lagi beberapa saat lagi.', { exact: true }).waitFor();
      assert.equal(await page.locator('#home-articles .article-card').count(), 0);
      state.articlesFailure = false;
      await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
      await page.getByText('Belum ada artikel yang diterbitkan.', { exact: true }).waitFor();
      const requests = state.readCalls;
      await goto('/artikel/baca/?id=local-demo');
      await page.getByText('Artikel tidak tersedia.', { exact: true }).waitFor();
      assert.equal(state.readCalls, requests);
    });
  } finally {
    fs.writeFileSync(path.join(outputs, process.env.TUMBUH_TEST_FILTER ? 'admin-supabase-filtered.json' : 'admin-supabase.json'), JSON.stringify({ executedAt: new Date().toISOString(), filter: process.env.TUMBUH_TEST_FILTER || null, productionAuthenticatedTests: 'NOT RUN', results }, null, 2));
    await browser.close(); server.close();
  }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
