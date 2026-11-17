// Restore the original image-specific explanations; never substitute category templates.
import {readFile,writeFile} from 'node:fs/promises'
const read=async p=>JSON.parse(await readFile(new URL('../data/'+p,import.meta.url),'utf8'))
const historical=await read('historical-ai-25-11.json')
const reasons=await read('original-ai-reasons.json')
const source='https://3000-iud3ncq7xzf5hotxtl119-82b888ba.sandbox.novita.ai/api/task-images'
const trials=historical.trials.map(t=>{
 if(!reasons[t.filename])throw Error('Missing original explanation '+t.filename)
 if(t.aiCorrect!==(t.correctCategory===t.aiCategory))throw Error('Incorrect mapping '+t.filename)
 return {...t,imageId:t.filename.replace('.jpg',''),aiReason:reasons[t.filename],reasonRecovery:'verbatim image-specific explanation from original live API'}
})
if(Object.keys(reasons).length!==36||trials.length!==36||trials.filter(t=>t.aiCorrect).length!==25)throw Error('Expected 36 unique images and 25 correct / 11 incorrect')
await writeFile(new URL('../data/ai-mapping.json',import.meta.url),JSON.stringify({source,observedDate:'2026-11-17',crossCheckedSources:historical.sources.map(p=>'jennie-ys/Ai-metacog@4555ca1adcca9f360f3123446d4ec9c94da6e4dd/'+p),explanationSource:source,explanationNote:'All 36 explanations copied verbatim from the original live API and matched by filename. Categories and correctness cross-checked against three historical response records. No generated explanations or template substitutions.',trials},null,2)+'\n')
console.log({trials:trials.length,correct:25,incorrect:11,verbatimReasons:Object.keys(reasons).length})
