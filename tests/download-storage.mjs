import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {JSDOM,VirtualConsole} from 'jsdom'
const html=await readFile(new URL('../docs/index.html',import.meta.url),'utf8')
const embedded=await readFile(new URL('../../index.html',import.meta.url),'utf8')
const key='__download_exp_v2_state__',wait=()=>new Promise(r=>setTimeout(r,5))
async function boot(page,snapshot){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message))
 const dom=new JSDOM(page,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:vc})
 const w=dom.window,d=w.document,files=[]
 w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{}
 w.Image=class{set src(v){queueMicrotask(()=>this.onload?.())}async decode(){}}
 w.fetch=()=>{throw Error('Unexpected network request')}
 w.URL.createObjectURL=blob=>{files.push({blob});return 'blob:download-test'}
 w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){files.at(-1).filename=this.download}
 if(snapshot)w.sessionStorage.setItem(key,JSON.stringify(snapshot))
 for(const script of d.querySelectorAll('script'))w.eval(script.textContent)
 d.dispatchEvent(new w.Event('DOMContentLoaded'));await wait()
 return {dom,w,d,files,errors,state:()=>JSON.parse(w.sessionStorage.getItem(key))}
}
const seed={version:'two-group-six-v1',participantId:'local-test-001',group:'no-intervention',screen:'step-ps-3',index:0,round:1,phase:'initial',learning:[],initialExam:[],task:[],finalExam:[],jol:{},survey:{},pages:[],submittedResponses:{},jolRT:{},math:null,instructionCheck:{passed:false,attempts:[]},startedAt:'2026-11-23T00:00:00.000Z',pageEntered:Date.now(),submissionSaved:null}
const one=await boot(html,seed)
one.d.getElementById('temporary-skip').click();await wait()
assert.equal(one.state().screen,'step-done');assert.equal(one.files.length,1)
const snapshot=one.state(),payload=JSON.stringify(snapshot.downloadSubmission)
assert.equal(snapshot.downloadSubmission.responses.q6_age,null)
assert.equal(snapshot.downloadSubmission.responses._scoring.initial_exam_score.answered,0)
assert.equal(snapshot.downloadSubmission.responses._scoring.initial_exam_score.total,18)
assert(snapshot.downloadSubmission.responses._skipped_pages.some(x=>x.screen==='step-ps-3'))
assert.equal(snapshot.downloadSubmission.responses._scoring.task_initial_score.total,36)
assert.equal(snapshot.downloadSubmission.responses._scoring.exam_score.total,36)
assert.equal(snapshot.downloadSubmission.storage,'browser_download')
assert(one.files[0].filename.endsWith('.json'));assert.deepEqual(one.errors,[])
one.dom.window.close()
// A reload restores the exact completed payload without silently downloading a duplicate.
const two=await boot(embedded,snapshot)
assert.equal(two.state().screen,'step-done');assert.equal(two.files.length,0)
assert.equal(JSON.stringify(two.state().downloadSubmission),payload)
two.d.getElementById('btn-download-again').click();await wait()
assert.equal(two.files.length,1);assert.equal(two.files[0].filename,snapshot.downloadFilename)
assert.equal(JSON.stringify(two.state().downloadSubmission),payload)
// The temporary skip cannot discard a completed session before the file is checked.
two.d.getElementById('temporary-skip').click();assert.equal(two.state().participantId,seed.participantId)
assert.equal(two.state().screen,'step-done')
const checked=two.d.getElementById('download-confirm');checked.checked=true;checked.dispatchEvent(new two.w.Event('change'))
two.d.getElementById('btn-next-participant').click();await wait()
const nextId=two.state().participantId;assert.notEqual(nextId,seed.participantId);assert.equal(two.state().screen,'group')
assert(!two.state().lastResponses);assert(!two.state().downloadSubmission)
assert.deepEqual(two.errors,[]);two.dom.window.close()
// The next participant receives a new filename and ID even on the same computer.
const three=await boot(html,{...seed,participantId:nextId})
three.d.getElementById('temporary-skip').click();await wait()
assert.notEqual(three.files[0].filename,snapshot.downloadFilename)
assert.equal(three.state().downloadSubmission.participant_id,nextId)
assert.deepEqual(three.errors,[]);three.dom.window.close()
console.log('Browser JSON download, skipped answers, reload recovery, identical re-download, guarded participant reset and unique filenames PASS')
