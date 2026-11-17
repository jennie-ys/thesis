import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const manifest=JSON.parse(await readFile(new URL('../data/stimulus-order.json',import.meta.url),'utf8'))
const stage=manifest.stages
for(const [name,rows] of Object.entries(stage)){
 assert.equal(rows.length,name==='initial-exam'?15:30)
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
 if(name==='learning'||name==='ai-task')for(let i=0;i<30;i+=5){assert.equal(new Set(rows.slice(i,i+5).map(t=>t.categoryCode)).size,5);assert(rows.slice(i,i+5).every(t=>t.block===i/5+1))}
}
assert.notEqual(stage.learning[0].categoryCode,stage.learning.at(-1).categoryCode)
const learned=new Set(stage.learning.map(t=>t.imageId)),baseline=new Set(stage['initial-exam'].map(t=>t.imageId))
assert(stage['initial-exam'].every(t=>learned.has(t.imageId)&&t.novelty==='old'))
assert(stage['ai-task'].every(t=>!learned.has(t.imageId)&&t.novelty==='new'))
assert.equal(stage['final-exam'].filter(t=>t.novelty==='old').length,15)
assert.equal(stage['final-exam'].filter(t=>t.novelty==='new').length,15)
assert(stage['final-exam'].every(t=>(t.novelty==='old')===learned.has(t.imageId)))
const baselineHashes=new Set(stage['initial-exam'].map(t=>t.sha256))
const aiHashes=new Set(stage['ai-task'].map(t=>t.sha256))
const studyHashes=new Set(stage.learning.map(t=>t.sha256))
for(const code of ['AK','BCC','NV','DF','VASC']){
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
console.log('All 105 stage assets match uploaded bytes; fixed blocked/full orders, category boundaries and old/new membership PASS')
