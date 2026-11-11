import { mkdir, readFile, writeFile } from 'node:fs/promises'
import app from '../dist/_worker.js'

// Reuse the actual server-rendered screens and API manifests, without a server.
const inline = value => value.replace(/<\/script/gi, '<\\/script')
const routes = {}
for (const path of ['experiment-config', 'images', 'initial-exam-images', 'task-images', 'exam-images']) {
  const response = await app.request('/api/' + path)
  if (!response.ok) throw new Error('Cannot build experiment configuration: ' + path)
  routes['/api/' + path] = await response.json()
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
html = html.replace('<link rel="stylesheet" href="/static/style.css" />', `<style>${css}</style>`)
const footer = '<footer class="preview-footer"><span>미리보기에서는 응답을 서버에 저장하지 않습니다.</span><button id="preview-reset" type="button">처음부터 다시 보기</button></footer>'
html = html.replace('<script src="/static/experiment.js"></script>', `${footer}<script>${inline(adapter)}</script>\n<script>${inline(experiment)}</script>`)
const output = new URL('../docs/', import.meta.url)
await mkdir(output, { recursive: true })
await writeFile(new URL('index.html', output), html)
await writeFile(new URL('.nojekyll', output), '')
console.log('Built docs/index.html: standalone preview, no API server required.')
