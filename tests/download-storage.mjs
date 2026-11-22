import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {JSDOM,VirtualConsole} from 'jsdom'
const html=await readFile(new URL('../docs/index.html',import.meta.url),'utf8')
const embedded=await readFile(new URL('../../index.html',import.meta.url),'utf8')
const key='__download_exp_v2_state__',wait=()=>new Promise(r=>setTimeout(r,5))
async function boot(page,snapshot,storageKey=key){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message))
 const dom=new JSDOM(page,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:vc})
 const w=dom.window,d=w.document,files=[]
 w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{}
 w.Image=class{set src(v){queueMicrotask(()=>this.onload?.())}async decode(){}}
 w.fetch=()=>{throw Error('Unexpected network request')}
 w.URL.createObjectURL=blob=>{files.push({blob});return 'blob:download-test'}
 w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){files.at(-1).filename=this.download}
 if(snapshot)w.sessionStorage.setItem(storageKey,JSON.stringify(snapshot))
 for(const script of d.querySelectorAll('script'))w.eval(script.textContent)
 d.dispatchEvent(new w.Event('DOMContentLoaded'));await wait()
 const unlock=()=>{for(const key of 'yepl')d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true}))}
 return {dom,w,d,files,errors,unlock,state:()=>JSON.parse(w.sessionStorage.getItem(key))}
}
const seed={version:'two-group-six-v1',participantId:'local-test-001',group:'no-intervention',screen:'step-ps-3',index:0,round:1,phase:'initial',learning:[],initialExam:[],task:[],finalExam:[],jol:{},survey:{},pages:[],submittedResponses:{},jolRT:{},math:null,instructionCheck:{passed:false,attempts:[]},startedAt:'2026-11-23T00:00:00.000Z',pageEntered:Date.now(),submissionSaved:null}
const one=await boot(html,seed)
one.unlock();one.d.getElementById('temporary-skip').click();await wait()
assert.equal(one.state().screen,'step-done');assert.equal(one.files.length,0)
assert(one.d.getElementById('developer-menu').hidden)
one.d.getElementById('btn-download-again').click();assert.equal(one.files.length,0)
one.unlock();one.d.getElementById('btn-download-again').click();assert.equal(one.files.length,1)
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
assert(two.d.getElementById('developer-menu').hidden)
two.unlock();two.d.getElementById('btn-download-again').click();await wait()
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
three.unlock();three.d.getElementById('temporary-skip').click();await wait()
assert.equal(three.files.length,0);three.unlock();three.d.getElementById('btn-download-again').click();await wait()
assert.notEqual(three.files[0].filename,snapshot.downloadFilename)
assert.equal(three.state().downloadSubmission.participant_id,nextId)
assert.deepEqual(three.errors,[]);three.dom.window.close()
console.log('Researcher-only JSON download, zero automatic downloads, skipped answers, reload recovery, identical re-download and participant reset PASS')

// Recover the exact completed responses from the former preview session on the same tab.
const legacy={...snapshot};delete legacy.downloadSubmission;delete legacy.downloadFilename;delete legacy.downloadRequestedAt
legacy.lastResponses._submitted_responses=[{field:'q6_major',value:'복구 확인',rt_ms:123.45}]
const migrated=await boot(html,legacy,'__preview_exp_v2_state__')
assert.equal(migrated.state().participantId,legacy.participantId)
assert.equal(migrated.state().screen,'step-done');assert.equal(migrated.files.length,0)
assert.equal(migrated.d.getElementById('submission-result').textContent,'')
assert(migrated.d.getElementById('developer-menu').hidden)
assert(!migrated.d.getElementById('submission-result').textContent.includes('제출되지 않았습니다'))
assert.deepEqual(migrated.state().lastResponses._submitted_responses,legacy.lastResponses._submitted_responses)
assert.equal(migrated.state().downloadSubmission.recovered_from,'legacy_preview_session')
migrated.unlock();migrated.d.getElementById('btn-download-again').click();await wait()
assert.equal(migrated.files.length,1)
assert.equal(migrated.state().downloadSubmission.participant_id,legacy.participantId)
assert.deepEqual(migrated.errors,[]);migrated.dom.window.close()
// The new entry URL ships identical bytes rather than the obsolete preview page.
assert.equal(await readFile(new URL('../docs/experiment-download-v2.html',import.meta.url),'utf8'),html)
console.log('Legacy preview completion recovery preserves participant, submitted responses and RT; fresh download entry matches current build PASS')

// Old temporary-skip completion never assembled lastResponses; reconstruct only committed state.
const partial={...legacy,lastResponses:undefined,skips:[{screen:'step-ps-3'}]}
const partialSession=await boot(html,partial,'__preview_exp_v2_state__')
assert.equal(partialSession.state().screen,'step-done')
assert(partialSession.d.getElementById('btn-download-again'))
assert.equal(partialSession.state().downloadSubmission.responses.q6_age,null)
assert.equal(partialSession.state().downloadSubmission.responses._scoring.initial_exam_score.answered,0)
partialSession.unlock();partialSession.d.getElementById('btn-download-again').click();await wait()
assert.equal(partialSession.files.length,1);assert.deepEqual(partialSession.errors,[])
partialSession.dom.window.close()
console.log('Legacy skipped completion without lastResponses recovers committed state as explicit missing responses PASS')
