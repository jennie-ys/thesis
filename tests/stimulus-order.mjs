import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const manifest=JSON.parse(await readFile(new URL('../data/stimulus-order.json',import.meta.url),'utf8'))
const stage=manifest.stages
for(const [name,rows] of Object.entries(stage)){
 assert.equal(rows.length,name==='initial-exam'?18:36)
 assert.equal(new Set(rows.map(t=>t.imageId)).size,rows.length)
 for(let i=0;i<rows.length;i++){
  const t=rows[i];assert.equal(t.position,i+1)
  if(i)assert.notEqual(t.categoryCode,rows[i-1].categoryCode)
  const bytes=await readFile(new URL('../public'+t.url,import.meta.url))
  assert.equal(createHash('sha256').update(bytes).digest('hex'),t.sha256)
  assert(t.width>0&&t.height>0)
  const published=await readFile(new URL('../docs'+t.url,import.meta.url))
  assert(bytes.equals(published))
 }
 if(name==='learning'||name==='ai-task')for(let i=0;i<36;i+=6){assert.equal(new Set(rows.slice(i,i+6).map(t=>t.categoryCode)).size,6);assert(rows.slice(i,i+6).every(t=>t.block===i/6+1))}
}
assert.notEqual(stage.learning[0].categoryCode,stage.learning.at(-1).categoryCode)
const learned=new Set(stage.learning.map(t=>t.imageId)),baseline=new Set(stage['initial-exam'].map(t=>t.imageId))
assert(stage['initial-exam'].every(t=>learned.has(t.imageId)&&t.novelty==='old'))
assert(stage['ai-task'].every(t=>!learned.has(t.imageId)&&t.novelty==='new'))
assert.equal(stage['final-exam'].filter(t=>t.novelty==='old').length,18)
assert.equal(stage['final-exam'].filter(t=>t.novelty==='new').length,18)
assert(stage['final-exam'].every(t=>(t.novelty==='old')===learned.has(t.imageId)))
const baselineHashes=new Set(stage['initial-exam'].map(t=>t.sha256))
const aiHashes=new Set(stage['ai-task'].map(t=>t.sha256))
const studyHashes=new Set(stage.learning.map(t=>t.sha256))
for(const code of ['AK','BCC','NV','DF','VASC','MEL']){
 const study=stage.learning.filter(t=>t.categoryCode===code)
 assert.equal(study.length,6)
 const base=stage['initial-exam'].filter(t=>t.categoryCode===code)
 assert.equal(base.length,3);assert(base.every(t=>study.some(s=>s.sha256===t.sha256)))
 const old=stage['final-exam'].filter(t=>t.categoryCode===code&&t.novelty==='old')
 const expected=study.filter(t=>!baselineHashes.has(t.sha256))
 assert.equal(old.length,3)
 assert.deepEqual(old.map(t=>t.sha256).sort(),expected.map(t=>t.sha256).sort())
 const fresh=stage['final-exam'].filter(t=>t.categoryCode===code&&t.novelty==='new')
 assert.equal(fresh.length,3);assert(fresh.every(t=>!studyHashes.has(t.sha256)&&!aiHashes.has(t.sha256)))
}
assert(stage['final-exam'].every(t=>!baselineHashes.has(t.sha256)))
console.log('All 126 stage assets match uploaded bytes; fixed blocked/full orders, category boundaries and old/new membership PASS')

const original=JSON.parse(await readFile(new URL('../data/ai-mapping.json',import.meta.url),'utf8'))
assert.equal(original.trials.length,36)
for(const t of stage['ai-task']){
 const r=original.trials.find(r=>r.filename===t.filename)
 assert(r);assert.equal(t.correctCategory,r.correctCategory);assert.equal(t.aiCategory,r.aiCategory);assert.equal(t.aiReason,r.aiReason);assert.equal(t.aiCorrect,r.aiCorrect);assert.equal(t.aiCorrect,t.aiCategory===t.correctCategory)
}
assert.equal(stage['ai-task'].filter(t=>t.aiCorrect).length,25)
console.log('All 36 original image-to-AI categories, explanations and correctness flags match; 25 correct / 11 incorrect PASS')

// Pin the complete original live API mapping, including punctuation and spaces in explanations.
const canonical=original.trials.map(t=>[t.filename,t.correctCategory,t.aiCategory,t.aiCorrect,t.aiReason]).sort((a,b)=>a[0].localeCompare(b[0]))
assert.equal(createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),'411868b435283f95798afd0ea5181fd1eca2177076f2b1b98223633c178c1c5e')
console.log('All 36 original live API mappings match verbatim SHA-256 PASS')
