import assert from 'node:assert/strict'
import app from '../dist/_worker.js'
const original=globalThis.fetch, writes=[]
const env={GITHUB_TOKEN:'test-only-token',GITHUB_OWNER:'jennie-ys',GITHUB_REPO:'thesis'}
const get=async path=>(await app.fetch(new Request('https://experiment.test/api/'+path))).json()
const first=(await get('initial-exam-images')).exams[0],final=(await get('exam-images')).exams[0],task=(await get('task-images')).tasks[0]
const body={participant_id:'participant-123',responses:{pk1:3,ai_t:{ai_t1:'yes',ai_t2:0},_input_events:[{field:'q5-input',value:'0',rt_ms:123.4}],_jol_rt_ms:{initialExamPrediction:456},_initial_exam_answers:[{trial_id:first.id,chosen:first.correctCategory,correct:false,duration_ms:234.5}],_exam_answers:[{trial_id:final.id,chosen:'잘못된 답',correct:true,duration_ms:345.6}],_task_answers:[{trial_id:task.id,initial:task.correctCategory,final:'잘못된 답',aiCategory:'가짜 AI',phase_durations_ms:{initial_ms:100,ai_ms:200,final_ms:300}}]}}
const request=()=>new Request('https://experiment.test/api/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
try{
 const missing=await (await app.fetch(new Request('https://experiment.test/api/storage-status'),{})).json();assert(missing.missing.includes('GITHUB_TOKEN'))
 assert.equal((await app.fetch(request(),{})).status,503)
 let exists=false,fail=false
 globalThis.fetch=async(url,init={})=>{
  assert(String(url).includes('/contents/response/participant-123.json'))
  if(!init.method)return exists?Response.json({sha:'previous-sha'}):new Response('',{status:404})
  if(fail)return new Response('upstream unavailable',{status:500})
  writes.push(JSON.parse(init.body));exists=true
  return Response.json({content:{path:'response/participant-123.json'}},{status:201})
 }
 let r=await app.fetch(request(),env);assert.equal(r.status,200);assert.equal((await r.json()).saved,'github')
 r=await app.fetch(request(),env);assert.equal(r.status,200);assert.equal(writes[1].sha,'previous-sha')
 const decoded=JSON.parse(Buffer.from(writes[0].content,'base64').toString('utf8'))
 assert(!('_input_events' in decoded.responses))
 assert.deepEqual(decoded.responses._jol_rt_ms,body.responses._jol_rt_ms)
 assert.equal(decoded.responses._initial_exam_answers[0].correct,true)
 assert.equal(decoded.responses._initial_exam_answers[0].duration_ms,234.5)
 assert.equal(decoded.responses._exam_answers[0].correct,false)
 assert.equal(decoded.responses._task_answers[0].initial_correct,true)
 assert.equal(decoded.responses._task_answers[0].final_correct,false)
 assert.equal(decoded.responses._task_answers[0].ai_correct,null)
 assert.equal(decoded.responses._task_answers[0].ai_scoring_status,'mapping_missing')
 assert.deepEqual(decoded.responses._task_answers[0].phase_durations_ms,{initial_ms:100,ai_ms:200,final_ms:300})
 assert.equal(decoded.responses._scoring.source,'server_stimulus_manifest')
 fail=true;assert.equal((await app.fetch(request(),env)).status,502)
 console.log('Participant JSON path, all response/RT fields, idempotent retry and explicit storage failures PASS')
}finally{globalThis.fetch=original}
