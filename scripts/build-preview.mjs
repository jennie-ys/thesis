import { mkdir, readFile, writeFile } from 'node:fs/promises'
import app from '../dist/_worker.js'

// Reuse the actual server-rendered screens and API manifests, without a server.
const inline = value => value.replace(/<\/script/gi, '<\\/script')
const svg = await readFile(new URL('../public/static/placeholder.svg', import.meta.url), 'utf8')
const placeholder = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
const routes = {}
for (const [path, key] of [['images', 'slides'], ['task-images', 'tasks'], ['exam-images', 'exams']]) {
  const response = await app.request('/api/' + path)
  if (!response.ok) throw new Error('Cannot build image manifest: ' + path)
  const data = await response.json()
  // Placeholders are intentional in the review version until new images arrive.
  data[key] = data[key].map(item => ({ ...item, url: placeholder }))
  routes['/api/' + path] = data
}
const css = await readFile(new URL('../public/static/style.css', import.meta.url), 'utf8')
const experiment = (await readFile(new URL('../public/static/experiment.js', import.meta.url), 'utf8'))
  .replaceAll('__exp_', '__preview_exp_')
const adapter = `
;(() => {
  const routes = ${JSON.stringify(routes).replaceAll('<', '\\u003c')};
  // Every request stays in this document. No participant data is transmitted.
  window.fetch = async (input, init = {}) => {
    const path = typeof input === 'string' ? input : input.url;
    const method = (init.method || 'GET').toUpperCase();
    if (method === 'GET' && Object.hasOwn(routes, path)) {
      return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(routes[path])) };
    }
    if (method === 'POST' && (path === '/api/submit' || path === '/api/backup')) {
      return { ok: true, status: 200, json: async () => ({ status: 'preview', saved: false }) };
    }
    throw new Error('미리보기에서는 외부 요청을 사용하지 않습니다.');
  };
  document.getElementById('preview-reset').addEventListener('click', () => {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('__preview_exp_')) sessionStorage.removeItem(key);
    }
    location.reload();
  });
})();`
let html = await (await app.request('/')).text()
html = html.replace('<title>온라인 실험 참가</title>', '<title>Thesis · 실험 절차 미리보기</title>')
html = html.replace('<link rel="stylesheet" href="/static/style.css" />', `<style>${css}
.preview-bar { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; padding:12px 24px; border-bottom:1px solid #d4d4d4; background:#f3f3f3; color:#111111; font-size:14px; }
.preview-bar button { border:1px solid #111111; background:#ffffff; color:#111111; padding:6px 12px; border-radius:4px; cursor:pointer; font:inherit; }
</style>`)
html = html.replace('<body>', '<body><aside class="preview-bar" aria-label="미리보기 안내"><p><strong>확인용 미리보기</strong> · 응답은 서버에 저장되지 않습니다. · 이미지는 업로드 대기 중입니다.</p><button id="preview-reset" type="button">처음부터 다시 보기</button></aside>')
html = html.replace('<script src="/static/experiment.js"></script>', `<script>${inline(adapter)}</script>\n<script>${inline(experiment)}</script>`)
const output = new URL('../docs/', import.meta.url)
await mkdir(output, { recursive: true })
await writeFile(new URL('index.html', output), html)
await writeFile(new URL('.nojekyll', output), '')
console.log('Built docs/index.html: standalone preview, no API server required.')
