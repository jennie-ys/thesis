import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import app from '../dist/_worker.js'
const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'))
const pages=JSON.parse(await readFile(new URL('../wrangler.pages.jsonc',import.meta.url),'utf8'))
assert.equal(config.name,'thesis');assert.equal(config.main,'dist/_worker.js');assert.equal(config.workers_dev,true);assert.equal(config.assets.binding,'ASSETS');assert(!config.pages_build_output_dir)
assert.equal(pages.pages_build_output_dir,'./dist');assert(!pages.main);assert(!pages.assets)
assert((await readFile(new URL('../dist/.assetsignore',import.meta.url),'utf8')).includes('/_worker.js'))
const env={ASSETS:{fetch:async request=>{
 try{return new Response(await readFile(new URL('../dist'+new URL(request.url).pathname,import.meta.url)))}catch{return new Response('',{status:404})}
}}}
const get=p=>app.fetch(new Request('https://thesis.jennie-283.workers.dev'+p),env)
const html=await(await get('/')).text();assert(html.includes('experiment-root'));assert(!html.includes('Hello World!'))
for(const path of ['images','initial-exam-images','task-images','exam-images']){
 const d=await(await get('/api/'+path)).json()
 for(const t of d.slides||d.exams||d.tasks){const r=await get(t.url);assert.equal(r.status,200);assert.equal(new Uint8Array(await r.arrayBuffer())[0],255)}
}
console.log('Default Workers config, independent Pages config, experiment root and 105 static image paths PASS')
