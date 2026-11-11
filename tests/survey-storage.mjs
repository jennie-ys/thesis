import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {JSDOM,VirtualConsole} from 'jsdom'
const html=await readFile(new URL('../docs/index.html',import.meta.url),'utf8')
const key='__preview_exp_v2_state__'
const knowledge=Object.fromEntries(Array.from({length:6},(_,i)=>['ai_k'+(i+1),i%2?'맞다':'틀리다']))
const attitude=Object.fromEntries(Array.from({length:8},(_,i)=>['ai_a'+(i+1),String(i%4+1)]))
for(const example of [
  {survey:{ai_knowledge:knowledge,ai_attitude:attitude,ai_trust:{ai_t1:'yes',ai_t2:75}},expected:{ai_t1:'yes',ai_t2:75,ai_t2_status:'answered'}},
  {survey:{_ai_survey:{...knowledge,...attitude},pk1:'3',pk2:'0',ai_can_be_wrong:'yes',ai_expected_accuracy:0},expected:{ai_t1:'yes',ai_t2:0,ai_t2_status:'answered'}},
  {survey:{_ai_survey:{...knowledge,...attitude},ai_can_be_wrong:'no',ai_expected_accuracy:80},expected:{ai_t1:'no',ai_t2:null,ai_t2_status:'not_applicable'}},
  {survey:{ai_k:knowledge,ai_a:attitude,ai_t:{ai_t1:'yes',ai_t2:100}},expected:{ai_t1:'yes',ai_t2:100,ai_t2_status:'answered'}},
  {survey:{ai_t:{ai_t1:null,ai_t2:null,ai_t2_status:'skipped'}},expected:{ai_t1:null,ai_t2:null,ai_t2_status:'skipped'}},
]){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message))
  const dom=new JSDOM(html,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:vc}),w=dom.window
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{}
  w.sessionStorage.setItem(key,JSON.stringify({version:'two-group-v2',participantId:'storage-test',group:'intervention',screen:'step-ai-error-belief',index:0,round:1,phase:'initial',learning:[],initialExam:[],task:[],finalExam:[],jol:{},survey:example.survey,pages:[],pageEntered:Date.now(),math:null}))
  for(const script of w.document.querySelectorAll('script'))w.eval(script.textContent)
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'))
  await new Promise(r=>setTimeout(r,5))
  const survey=JSON.parse(w.sessionStorage.getItem(key)).survey
  assert.deepEqual(Object.keys(survey).slice(0,5),['pk1','pk2','ai_k','ai_a','ai_t'])
  assert.deepEqual(survey.ai_t,example.expected)
  assert.equal(Object.keys(survey.ai_k).length,6);assert.equal(Object.keys(survey.ai_a).length,8)
  assert(!('_ai_survey' in survey));assert(!('ai_expected_accuracy' in survey));assert(!('ai_can_be_wrong' in survey))
  if(example.survey.pk2==='0')assert.equal(survey.pk2,0)
  if(example.expected.ai_t1==='yes'){
    assert(!w.document.getElementById('ai-belief-followup').hidden)
    assert.equal(w.document.getElementById('ai-expected-accuracy').value,String(example.expected.ai_t2))
  }
  assert.deepEqual(errors,[]);dom.window.close()
}
process.stdout.write('Separate scale storage, legacy session migration, numeric 0/100, not-applicable and skipped statuses PASS\n')
