import { mkdir, readFile, writeFile, cp } from 'node:fs/promises'
import app from '../dist/_worker.js'
const request = path => app.fetch(new Request('https://experiment.local' + path))

// Reuse the actual server-rendered screens and API manifests, without a server.
const inline = value => value.replace(/<\/script/gi, '<\\/script')
const routes = {}
for (const path of ['experiment-config', 'images', 'initial-exam-images', 'task-images', 'exam-images']) {
  const response = await request('/api/' + path)
  if (!response.ok) throw new Error('Cannot build experiment configuration: ' + path)
  routes['/api/' + path] = await response.json()
}
const css = await readFile(new URL('../public/static/style.css', import.meta.url), 'utf8')
const experiment = (await readFile(new URL('../public/static/experiment.js', import.meta.url), 'utf8'))
  .replaceAll('__exp_', '__preview_exp_')
const makeAdapter = routes => `
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
const baseHtml = await (await request('/')).text()
let html = baseHtml
html = html.replace('<title>온라인 실험 참가</title>', '<title>Thesis · 실험 절차 미리보기</title>')
html = html.replace('<link rel="stylesheet" href="/static/style.css" />', `<style>${css}</style>`)
const footer = '<footer class="preview-footer"><span>미리보기에서는 응답을 서버에 저장하지 않습니다.</span><button id="preview-reset" type="button">처음부터 다시 보기</button></footer>'
html = html.replace('<script src="/static/experiment.js"></script>', `${footer}<script>${inline(makeAdapter(routes))}</script>\n<script>${inline(experiment)}</script>`)
const output = new URL('../docs/', import.meta.url)
await mkdir(output, { recursive: true })
// GitHub Pages uses relative asset URLs; Cloudflare's public assets keep /static URLs.
const pageRoutes = structuredClone(routes)
const embeddedRoutes = structuredClone(routes)
for (const path of Object.keys(routes)) {
  const keys = ['slides','exams','tasks']
  for (const key of keys) {
    for (let i=0; i<(routes[path][key] || []).length; i++) {
      const url = routes[path][key][i].url
      pageRoutes[path][key][i].url = '.' + url
      const bytes = await readFile(new URL('../public' + url, import.meta.url))
      embeddedRoutes[path][key][i].url = 'data:image/jpeg;base64,' + bytes.toString('base64')
    }
  }
}
await writeFile(new URL('index.html', output), html.replace(inline(makeAdapter(routes)), inline(makeAdapter(pageRoutes))))
await cp(new URL('../public/static/stimuli/',import.meta.url),new URL('static/stimuli/',output),{recursive:true})
await writeFile(new URL('../../index.html',import.meta.url),html.replace(inline(makeAdapter(routes)),inline(makeAdapter(embeddedRoutes))))
await writeFile(new URL('.nojekyll', output), '')
console.log('Built docs/index.html: standalone preview, no API server required.')
