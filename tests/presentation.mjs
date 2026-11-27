import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {JSDOM,VirtualConsole} from 'jsdom'
const html=await readFile(new URL('../docs/index.html',import.meta.url),'utf8')
const errors=[], vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message))
const dom=new JSDOM(html,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:vc})
const w=dom.window,d=w.document
w.structuredClone=structuredClone;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{}
w.Image = class { set src(value) { queueMicrotask(()=>this.onload?.()) } async decode() {} }; w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{}
for(const script of d.querySelectorAll('script'))w.eval(script.textContent)
d.dispatchEvent(new w.Event('DOMContentLoaded'))
const wait=()=>new Promise(r=>setTimeout(r,2))
await wait()
assert(d.getElementById('developer-menu').hidden)
for(const key of 'yepl')d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true}))
assert(!d.getElementById('developer-menu').hidden)
const state=()=>JSON.parse(w.sessionStorage.getItem('__download_exp_v2_state__'))
const expected=['group','instruction','learning-intro','learning','learning-break','learning','jol-initial-exam','initial-exam-intro','initial-exam','initial-feedback','task-intro','task-notice','task','math-intro','math','final-exam-intro','final-exam','step-ps-0','step-ps-1','step-ps-2','step-ai-survey','step-ai-survey-b','step-ai-error-belief','step-ps-3','step-done']
for(const screen of expected){
  assert.equal(state().screen,screen)
  const root=d.getElementById('experiment-root'), active=root.hidden ? d.querySelector('.step.active') : root
  assert.equal(active.querySelectorAll('h1,h2,h3,.page-header,[role="progressbar"],.trial-progress,.task-progress-track,.task-progress-text').length,0)
  assert(!/\b\d+\s*\/\s*36\b/.test(active.textContent.replace(/\s+/g,' ')) || screen==='initial-feedback')
  assert(!d.querySelector('.preview-bar'))
  const button=d.getElementById('temporary-skip');assert(button&&!button.hidden&&!button.disabled)
  if(screen==='learning-break')assert.deepEqual([...active.querySelectorAll('.instruct-body p')].map(e=>e.textContent),['지금부터 같은 학습을 한 번 더 하게 됩니다.','준비되었으면 아래 버튼을 눌러주세요. 학습이 시작됩니다.'])
  if(screen==='learning')assert(!/사례\s*\d/.test(active.textContent))
  if(screen==='jol-initial-exam')assert(!active.textContent.includes('AI')&&!active.textContent.includes('스스로'))
  if(screen==='initial-exam-intro'){
    assert(active.textContent.includes('지금부터 피부 병변의 범주를 분류하는 시험을 시작합니다.'))
    assert(active.textContent.includes('범주명을 답 입력란에 직접 작성해주세요.'))
  }
  if(screen==='jol-initial-exam'){
    const input=d.getElementById('jol-input');assert.equal(input.value,'');assert.equal(input.placeholder,'0 – 100')
    const rules=[...d.styleSheets].flatMap(sheet=>[...sheet.cssRules])
    const hint=rules.filter(rule=>rule.selectorText?.includes('input::placeholder')).at(-1)
    assert.match(hint.style.color,/#808080|rgb\(128, 128, 128\)/)
    input.value='50';assert.equal(w.getComputedStyle(input).color,'rgb(17, 17, 17)')
  }
  if(screen==='math')assert(!active.querySelector('#math-timer'))
  if(screen==='task'||screen==='final-exam'){
    const choiceGrid=active.querySelector('.task-choices')
    assert.equal(choiceGrid.children.length,6)
    assert.equal(w.getComputedStyle(choiceGrid).display,'grid')
    assert.equal(w.getComputedStyle(choiceGrid).gridTemplateColumns.replace(/\s/g,'').replace(/0px/g,'0'),'repeat(3,minmax(0,1fr))')
    if(screen==='task'){
      const layout=active.querySelector('.review-task-layout')
      assert.equal(w.getComputedStyle(layout).gridTemplateColumns,'1fr')
      assert(layout.children[0].querySelector('.task-img'))
      assert(layout.children[1].classList.contains('task-boxes'))
    }
  }
  if(screen==='task-intro'){
    assert.equal(active.querySelector('.instruct-lead').textContent,'학습이 끝났습니다. 지금부터 피부 병변에 대한 AI 협업 분류 과제를 시작합니다')
    assert.equal(active.querySelector('.instruct-ready').textContent,'준비되었으면 다음 버튼을 눌러주세요.')
    assert.equal(active.querySelector('#btn-next').textContent,'다음→')
  }
  if(screen==='task')assert(active.textContent.includes('이 이미지의 피부 병변 범주를 선택하세요.')&&!active.textContent.includes('초기 진단'))
  if(screen==='step-done'){
    assert(d.getElementById('developer-menu').hidden)
    assert.equal(active.textContent.replace(/\s+/g,' ').trim(),'실험에 참여해 주셔서 감사합니다.연구자를 불러주세요.')
    for(const key of 'yepl')d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true}))
    button.click();assert.equal(state().screen,'step-done')
    const confirm=d.getElementById('download-confirm');confirm.checked=true;confirm.dispatchEvent(new w.Event('change'))
  }
  button.click();await wait()
  if(screen==='step-ai-error-belief')assert.deepEqual(state().survey.ai_t,{ai_t1:null,ai_t2:null,ai_t2_status:'skipped'})
}
assert.equal(state().screen,'group')
assert.deepEqual(errors,[])
dom.window.close()
process.stdout.write('Every screen has a working skip; no page headings or trial counters; original second-learning copy and gray input hints PASS\n')
