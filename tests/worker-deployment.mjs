import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import app from '../dist/index.js'
const wrangler=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'))
assert.equal(wrangler.name,'thesis');assert.equal(wrangler.main,'dist/index.js');assert.equal(wrangler.assets.directory,'./dist');assert.equal(wrangler.assets.binding,'ASSETS');assert(!wrangler.pages_build_output_dir)
const excluded=await readFile(new URL('../dist/.assetsignore',import.meta.url),'utf8');assert(excluded.includes('/index.js'))
const env={ASSETS:{fetch:async request=>{
 const path=new URL(request.url).pathname
 try{const bytes=await readFile(new URL('../dist'+path,import.meta.url));return new Response(bytes)}catch{return new Response('Not Found',{status:404})}
}}}
const get=path=>app.fetch(new Request('https://thesis.jennie-283.workers.dev'+path),env)
const html=await (await get('/')).text();assert(html.includes('experiment-root'));assert(!html.includes('Hello World!'))
const config=await(await get('/api/experiment-config')).json();assert.equal(config.categories.length,5)
for(const route of ['images','initial-exam-images','task-images','exam-images']){
 const data=await(await get('/api/'+route)).json()
 for(const trial of data.slides||data.exams||data.tasks){
  const response=await get(trial.url);assert.equal(response.status,200)
  const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8)
 }
}
for(const path of ['/static/style.css','/static/experiment.js'])assert.equal((await get(path)).status,200)
assert.equal((await get('/static/missing-image.jpg')).status,404)
console.log('Workers entry, ASSETS binding, experiment root, APIs and all 105 image routes PASS')
