import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {JSDOM,VirtualConsole} from 'jsdom'
const html=await readFile(new URL('../docs/index.html',import.meta.url),'utf8'),key='__preview_exp_v2_state__'
async function open(state){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message))
  const dom=new JSDOM(html,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:vc}),w=dom.window
  w.Image = class { set src(value) { queueMicrotask(()=>this.onload?.()) } async decode() {} }; w.scrollTo=()=>{};w.sessionStorage.setItem(key,JSON.stringify(state))
  for(const script of w.document.querySelectorAll('script'))w.eval(script.textContent)
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,10))
  return {dom,w,d:w.document,errors,read:()=>JSON.parse(w.sessionStorage.getItem(key))}
}
const seed={version:'two-group-six-v1',participantId:'gate-test',group:'intervention',screen:'task-notice',index:0,round:1,phase:'initial',learning:[],initialExam:[],task:[],finalExam:[],jol:{},survey:{},pages:[],pageEntered:Date.now(),math:null}
let app=await open(seed)
const click=id=>app.d.getElementById(id).click()
click('temporary-skip');assert.equal(app.read().screen,'task-check');assert(!app.d.getElementById('btn-checked-task-start'))
click('temporary-skip');assert.equal(app.read().screen,'task-notice');assert(!app.read().instructionCheck.passed)
click('btn-next');app.d.getElementById('instruction-check-answer').value='66.7';click('btn-instruction-check')
assert.equal(app.read().screen,'task-check');assert.equal(app.read().instructionCheck.attempts[0].correct,false)
assert(app.d.body.textContent.includes('오답입니다.'));assert(app.d.getElementById('instruction-check-answer').disabled);assert(!app.d.getElementById('btn-checked-task-start'))
const wrongState=app.read();app.dom.window.close();app=await open(wrongState)
assert(app.d.getElementById('btn-instruction-read-again'));click('btn-instruction-read-again');assert.equal(app.read().screen,'task-notice')
click('btn-next');app.d.getElementById('instruction-check-answer').value='67.8';click('btn-instruction-check')
assert.equal(app.read().screen,'task-check');assert(app.read().instructionCheck.passed);assert(app.d.getElementById('btn-checked-task-start'))
const saved=app.read();assert.deepEqual(app.errors,[]);app.dom.window.close()
app=await open(saved);assert.equal(app.read().screen,'task-check');assert(app.d.getElementById('btn-checked-task-start'));assert(app.d.getElementById('instruction-check-answer').disabled)
click('btn-checked-task-start');assert.equal(app.read().screen,'task');assert.deepEqual(app.errors,[]);app.dom.window.close()
app=await open({...seed,screen:'task',instructionCheck:{passed:false,attempts:[]}})
assert.equal(app.read().screen,'task-notice');assert(!app.d.querySelector('input[name="initial"]'));assert.deepEqual(app.errors,[]);app.dom.window.close()
process.stdout.write('Wrong answer shows feedback and reread button; 67.8 unlocks start; skip cannot bypass; reload preserves pass; task entry requires pass PASS\n')
