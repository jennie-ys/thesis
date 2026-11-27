import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {JSDOM,VirtualConsole} from 'jsdom'
const html=await readFile(new URL('../docs/index.html',import.meta.url),'utf8')
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message))
const dom=new JSDOM(html,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:vc})
const w=dom.window,d=w.document
w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{}
w.Image=class{set src(v){queueMicrotask(()=>this.onload?.())}async decode(){}}
for(const script of d.querySelectorAll('script'))w.eval(script.textContent)
d.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,10))
const state=()=>JSON.parse(w.sessionStorage.getItem('__download_exp_v2_state__'))
const type=(target,text,options={})=>{for(const key of text)target.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,...options}))}
const menu=d.getElementById('developer-menu')
assert(menu.hidden);assert(menu.contains(d.getElementById('temporary-skip')));assert(menu.contains(d.getElementById('developer-reset')))
assert.equal(d.querySelectorAll('.temporary-controls').length,0)
const before=JSON.stringify(state());d.getElementById('temporary-skip').click();assert.equal(JSON.stringify(state()),before)
const input=d.createElement('input');d.body.appendChild(input);input.focus();type(input,'yepl');assert(menu.hidden)
const editable=d.createElement('div');editable.setAttribute('contenteditable','true');d.body.appendChild(editable);type(editable,'yepl');assert(menu.hidden)
type(d.body,'yepl',{ctrlKey:true});assert(menu.hidden)
type(d.body,'yepl',{isComposing:true});assert(menu.hidden)
type(d.body,'yepl');assert(!menu.hidden);assert.equal(JSON.stringify(state()),before)
assert.equal(d.body.firstElementChild,menu)
d.getElementById('developer-close').click();assert(menu.hidden)
type(d.body,'yepl');assert(!menu.hidden)
d.getElementById('temporary-skip').click();assert.equal(state().screen,'instruction');assert.equal(state().skips.length,1)
const oldId=state().participantId;d.getElementById('developer-reset').click()
assert.equal(state().screen,'group');assert.notEqual(state().participantId,oldId);assert(!menu.hidden)
assert.deepEqual(state().submittedResponses,{});assert.deepEqual(state().initialExam,[])
// Each destination opens the first screen without manufacturing participant responses.
const jump=screen=>{if(menu.hidden)type(d.body,'yepl');const button=d.querySelector('#developer-pages button[data-screen="'+screen+'"]');assert(button,screen);button.click()}
jump('group');d.getElementById('btn-group-intervention').click();assert.equal(state().group,'intervention')
assert.equal(d.querySelectorAll('#developer-pages button[data-screen="step-ps-3"]').length,1)
const expectedJOL={
 'jol-initial-exam':'_jol.initial_exam_prediction'
}
for(const [screen,name] of Object.entries(expectedJOL))assert.equal(d.querySelector('#developer-pages button[data-screen="'+screen+'"]').dataset.name,name)
for(const screen of ['instruction','learning-intro','learning-break','initial-exam-intro','initial-feedback','task-intro','task-notice','task-check','math-intro','final-exam-intro','step-ps-0','step-ps-1','step-ps-2','step-ai-survey','step-ai-survey-b','step-ai-error-belief','step-ps-3','step-done','step-error']){
 jump(screen);assert.equal(state().screen,screen)
 assert.deepEqual(state().initialExam,[]);assert.deepEqual(state().task,[]);assert.deepEqual(state().finalExam,[])
 assert.deepEqual(state().submittedResponses,{})
}
for(const screen of ['initial-exam','task','final-exam']){jump(screen);assert.equal(state().screen,screen);assert.equal(state().index,0);assert.equal(state().phase,'initial')}
for(const round of [1,2]){d.querySelector('#developer-pages button[data-screen="learning"][data-round="'+round+'"]').click();assert.equal(state().screen,'learning');assert.equal(state().index,0);assert.equal(state().round,round)}
jump('math');assert.equal(state().screen,'math');assert.equal(state().math.answers.length,0)
const deadline=state().math.deadline;jump('math-intro');jump('math');assert.equal(state().math.deadline,deadline)
// Only the original baseline prediction JOL remains in navigation and exported data.
for(const [screen,value] of [['jol-initial-exam',11]]){
 jump(screen);d.getElementById('jol-input').value=String(value);d.getElementById('btn-jol-next').click()
}
w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{}
jump('step-ps-3');d.getElementById('temporary-skip').click();await new Promise(r=>setTimeout(r,5))
const saved=state().lastResponses
assert.deepEqual(saved._jol,{initial_exam_prediction:11})
assert(!('jol1' in saved));assert(!('jol2' in saved))
assert.deepEqual(Object.keys(saved._jol_rt_ms),['initialExamPrediction'])
for(const screen of ['jol-ai-prediction','jol-task','jol-no-ai'])assert(!d.querySelector('#developer-pages button[data-screen="'+screen+'"]'))
assert(!saved._submitted_responses.some(r=>String(r.value).includes('yepl')))
assert.deepEqual(errors,[])
dom.window.close()
console.log('Developer menu stays hidden by default; body-only yepl activation preserves responses; skip and reset remain inside the top menu PASS')

// Resume old in-progress sessions without resetting a participant or reopening retired JOLs.
for(const group of ['intervention','no-intervention'])for(const [oldScreen,target] of [['jol-ai-prediction','task-intro'],['jol-task','math-intro'],['jol-no-ai','math-intro']]){
 const vconsole=new VirtualConsole(),issues=[];vconsole.on('jsdomError',e=>issues.push(e.message))
 const legacyDom=new JSDOM(html,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:vconsole})
 const lw=legacyDom.window,ld=lw.document
 lw.structuredClone=structuredClone;lw.scrollTo=()=>{};lw.HTMLElement.prototype.scrollIntoView=()=>{}
 lw.Image=class{set src(v){queueMicrotask(()=>this.onload?.())}async decode(){}}
 const legacy={version:'two-group-six-v1',participantId:'resume-'+group+'-'+oldScreen,group,screen:oldScreen,index:0,round:1,phase:'initial',learning:[],initialExam:[],task:[],finalExam:[],survey:{pk1:4},pages:[],math:null,jol:{initialExamPrediction:61,aiPrediction:72,jol1:83,jol2:94},jolRT:{initialExamPrediction:100,aiPrediction:200,jol1:300,jol2:400},submittedResponses:Object.fromEntries(['initialExamPrediction','aiPrediction','jol1','jol2','pk1'].map((field,i)=>[field,{field,value:i+1,rt_ms:123}])),startedAt:new Date().toISOString(),pageEntered:Date.now()}
 const storage='__download_exp_v2_state__';lw.sessionStorage.setItem(storage,JSON.stringify(legacy))
 for(const script of ld.querySelectorAll('script'))lw.eval(script.textContent)
 ld.dispatchEvent(new lw.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,5))
 const current=()=>JSON.parse(lw.sessionStorage.getItem(storage))
 assert.equal(current().screen,target);assert.equal(current().participantId,legacy.participantId)
 for(const key of 'yepl')ld.body.dispatchEvent(new lw.KeyboardEvent('keydown',{key,bubbles:true}))
 ld.querySelector('#developer-pages button[data-screen="step-ps-3"]').click();ld.getElementById('temporary-skip').click()
 const responses=current().lastResponses
 assert.deepEqual(responses._jol,{initial_exam_prediction:61})
 assert.deepEqual(responses._jol_rt_ms,{initialExamPrediction:100})
 assert.deepEqual(responses._submitted_responses.map(r=>r.field),['initialExamPrediction','pk1'])
 assert(!('jol1' in responses));assert(!('jol2' in responses));assert.equal(responses.pk1,4)
 assert.deepEqual(issues,[]);legacyDom.window.close()
}
console.log('Both groups retain only baseline JOL; old in-progress JOL screens resume at the correct next stage with responses and RT filtered PASS')
