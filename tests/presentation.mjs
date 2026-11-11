import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {JSDOM,VirtualConsole} from 'jsdom'
const html=await readFile(new URL('../docs/index.html',import.meta.url),'utf8')
const errors=[], vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message))
const dom=new JSDOM(html,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:vc})
const w=dom.window,d=w.document
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{}
for(const script of d.querySelectorAll('script'))w.eval(script.textContent)
d.dispatchEvent(new w.Event('DOMContentLoaded'))
const wait=()=>new Promise(r=>setTimeout(r,2))
await wait()
const state=()=>JSON.parse(w.sessionStorage.getItem('__preview_exp_v2_state__'))
const expected=['group','instruction','learning-intro','learning','learning-break','learning','jol-learning','jol-initial-exam','initial-exam-intro','initial-exam','initial-feedback','jol-ai-prediction','task-intro','task-notice','task','jol-task','jol-no-ai','math-intro','math','final-exam-intro','final-exam','step-ps-0','step-ps-1','step-ps-2','step-ai-survey','step-ai-survey-b','step-ai-error-belief','step-ps-3','step-done']
for(const screen of expected){
  assert.equal(state().screen,screen)
  const root=d.getElementById('experiment-root'), active=root.hidden ? d.querySelector('.step.active') : root
  assert.equal(active.querySelectorAll('h1,h2,h3,.page-header,[role="progressbar"],.trial-progress,.task-progress-track,.task-progress-text').length,0)
  assert(!/\b\d+\s*\/\s*30\b/.test(active.textContent.replace(/\s+/g,' ')) || screen==='initial-feedback')
  assert(!d.querySelector('.preview-bar'))
  const button=d.getElementById('temporary-skip');assert(button&&!button.hidden&&!button.disabled)
  if(screen==='learning-break')assert.deepEqual([...active.querySelectorAll('.instruct-body p')].map(e=>e.textContent),['지금부터 같은 학습을 한 번 더 하게 됩니다.','준비되었으면 아래 버튼을 눌러주세요. 학습이 시작됩니다.'])
  if(screen==='learning')assert(!/사례\s*\d/.test(active.textContent))
  if(screen==='jol-initial-exam')assert(!active.textContent.includes('AI')&&!active.textContent.includes('스스로'))
  if(screen==='initial-exam-intro'){
    assert(active.textContent.includes('지금부터 피부 병변의 범주를 분류하는 시험을 시작합니다.'))
    assert(active.textContent.includes('범주명을 답 입력란에 직접 작성해주세요.'))
  }
  if(screen==='jol-learning'){
    const input=d.getElementById('jol-input');assert.equal(input.value,'');assert.equal(input.placeholder,'0 – 100')
    const rules=[...d.styleSheets].flatMap(sheet=>[...sheet.cssRules])
    const hint=rules.filter(rule=>rule.selectorText?.includes('input::placeholder')).at(-1)
    assert.match(hint.style.color,/#808080|rgb\(128, 128, 128\)/)
    input.value='50';assert.equal(w.getComputedStyle(input).color,'rgb(17, 17, 17)')
  }
  if(screen==='math')assert(!active.querySelector('#math-timer'))
  if(screen==='task')assert(active.textContent.includes('이 이미지의 피부 병변 범주를 선택하세요.')&&!active.textContent.includes('초기 진단'))
  button.click();await wait()
  if(screen==='step-ai-error-belief')assert.deepEqual(state().survey.ai_trust,{ai_t1:null,ai_t2:null,ai_t2_status:'skipped'})
}
assert.equal(state().screen,'group')
assert.deepEqual(errors,[])
dom.window.close()
process.stdout.write('Every screen has a working skip; no page headings or trial counters; original second-learning copy and gray input hints PASS\n')
