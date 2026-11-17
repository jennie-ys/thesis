import assert from 'node:assert/strict'
import app from '../dist/_worker.js'
const original=globalThis.fetch, writes=[]
const env={GITHUB_TOKEN:'test-only-token',GITHUB_OWNER:'jennie-ys',GITHUB_REPO:'thesis'}
const body={participant_id:'participant-123',responses:{pk1:3,ai_t:{ai_t1:'yes',ai_t2:0},_input_events:[{field:'q5-input',value:'0',rt_ms:123.4}],_jol_rt_ms:{initialExamPrediction:456}}}
const request=()=>new Request('https://experiment.test/api/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
try{
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
 assert.deepEqual(decoded.responses,body.responses)
 fail=true;assert.equal((await app.fetch(request(),env)).status,502)
 console.log('Participant JSON path, all response/RT fields, idempotent retry and explicit storage failures PASS')
}finally{globalThis.fetch=original}
