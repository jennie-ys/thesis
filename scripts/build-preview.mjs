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
  .replaceAll('__exp_', '__download_exp_')
const grading = (await readFile(new URL('../src/grade-responses.js', import.meta.url),'utf8')).replace('export function gradeResponses','function gradeResponses')
routes['/api/experiment-config'].storageMode = 'download'
const makeAdapter = routes => `
;(() => {
  const routes = ${JSON.stringify(routes).replaceAll('<', '\\u003c')};
  // Preserve responses completed in the previous preview build on this same origin/tab.
  if (!sessionStorage.getItem('__download_exp_v2_state__')) {
    for (const legacyKey of ['__preview_exp_v2_state__','__exp_v2_state__']) {
      try {
        const legacy=JSON.parse(sessionStorage.getItem(legacyKey));
        if (legacy && legacy.version===routes['/api/experiment-config'].version) {
          legacy.recoveredFrom=legacyKey;
          sessionStorage.setItem('__download_exp_v2_state__',JSON.stringify(legacy));
          break;
        }
      } catch (_) { /* Never replace a current session with unreadable legacy data. */ }
    }
  }
  ${grading}
  window.ExperimentScoring = {
    scoreResponses: responses => gradeResponses(responses, {
      initialExams:routes['/api/initial-exam-images'].exams,
      tasks:routes['/api/task-images'].tasks,
      finalExams:routes['/api/exam-images'].exams
    }, 'browser_stimulus_manifest')
  };
  // Configuration and stimuli are embedded; participant responses never leave this computer.
  window.fetch = async (input, init = {}) => {
    const path = typeof input === 'string' ? input : input.url;
    const method = (init.method || 'GET').toUpperCase();
    if (method === 'GET' && Object.hasOwn(routes, path)) {
      return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(routes[path])) };
    }
    if (method === 'POST' && (path === '/api/submit' || path === '/api/backup')) {
      throw new Error('이 실험은 JSON 다운로드 방식입니다. 서버로 응답을 전송하지 않습니다.');
    }
    throw new Error('다운로드 방식에서는 외부 API 요청을 사용하지 않습니다.');
  };
})();`
const baseHtml = await (await request('/')).text()
let html = baseHtml
html = html.replace('<title>온라인 실험 참가</title>', '<title>Thesis · 실험</title>')
html = html.replace('<link rel="stylesheet" href="/static/style.css" />', `<style>${css}</style>`)
const footer = '<footer class="preview-footer"><span>실험 완료 후 응답 JSON이 이 컴퓨터에 다운로드됩니다.</span></footer>'
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
await writeFile(new URL('experiment-download-v2.html', output), html.replace(inline(makeAdapter(routes)), inline(makeAdapter(pageRoutes))))
await cp(new URL('../public/static/stimuli/',import.meta.url),new URL('static/stimuli/',output),{recursive:true})
await writeFile(new URL('../../index.html',import.meta.url),html.replace(inline(makeAdapter(routes)),inline(makeAdapter(embeddedRoutes))))
await writeFile(new URL('.nojekyll', output), '')
console.log('Built docs/index.html: browser JSON download, no API server required.')
