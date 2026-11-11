import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { JSDOM, VirtualConsole } from 'jsdom'
import app from '../dist/_worker.js'
const html = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8')
const tick = () => new Promise(resolve => setTimeout(resolve, 2))
const get = async path => (await app.request('/api/' + path)).json()
const config = await get('experiment-config')
assert.deepEqual(config.groups.map(g=>g.id), ['intervention','no-intervention'])
assert.equal(config.categories.length,5)
assert(!html.includes('흑색종'))
assert(config.groups.every(g=>g.initialInstruction===null))
const sets = {}
for (const [path,key] of [['images','slides'],['initial-exam-images','exams'],['task-images','tasks'],['exam-images','exams']]) {
  const data = await get(path); const trials = data[key]; sets[path] = trials
  assert.equal(trials.length,30); assert.equal(new Set(trials.map(t=>t.id)).size,30)
  assert(trials.every(t=>t.url===null))
  for(const category of config.categories) assert.equal(trials.filter(t=>t.correctCategory===category).length,6)
}
assert(sets['task-images'].every(t=>t.aiCategory===null&&t.aiReason===null))
const summaries = []
for (const group of config.groups.map(g=>g.id)) {
  const errors = [], console = new VirtualConsole()
  console.on('jsdomError',err=>errors.push(err.message))
  const dom = new JSDOM(html,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:console})
  const w = dom.window, d = w.document
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}
  w.fetch = () => { throw Error('Unexpected external request') }
  const timeout = w.setTimeout.bind(w); w.setTimeout = (fn,delay,...args) => timeout(fn,0,...args)
  for(const script of d.querySelectorAll('script')) w.eval(script.textContent)
  d.dispatchEvent(new w.Event('DOMContentLoaded')); await tick()
  const read = () => JSON.parse(w.sessionStorage.getItem('__preview_exp_v2_state__'))
  const element = selector => { const el = d.querySelector(selector); assert(el,'Missing '+selector); return el }
  const click = async id => {
    for(let i=0;i<2000;i++){
      const el = d.getElementById(id)
      if(el && !el.disabled && !el.hidden && !el.closest('[hidden]')){ el.click(); await tick(); return }
      await tick()
    }
    throw Error('Button unavailable: '+id+' at '+read()?.screen)
  }
  const fill = (id,value) => { const el=element('#'+id); el.value=value; el.dispatchEvent(new w.Event('input',{bubbles:true})) }
  const check = selector => { const el=element(selector); el.checked=true; el.dispatchEvent(new w.Event('change',{bubbles:true})) }
  const jol = async (screen,value) => { assert.equal(read().screen,screen); fill('jol-input',String(value)); await click('btn-jol-next') }
  await click('btn-group-'+group); await click('btn-next')
  assert.equal(read().screen,'learning-intro'); await click('btn-next')
  await click('btn-next') // Wait for the first learning round's break screen.
  for(let i=0;i<3000 && read().screen!=='jol-learning';i++) await tick()
  assert.equal(read().learning.length,60)
  for(const round of [1,2]) assert.equal(read().learning.filter(t=>t.round===round).length,30)
  fill('jol-input','101'); await click('btn-jol-next'); assert.equal(read().screen,'jol-learning')
  await jol('jol-learning',0); await jol('jol-initial-exam',100); await click('btn-next')
  assert.equal(read().screen,'initial-exam')
  await click('btn-initial-exam-next'); assert.equal(read().initialExam.length,0)
  for(let i=0;i<30;i++){
    const trial = sets['initial-exam-images'][i]
    assert.equal(d.querySelectorAll('input[type="radio"]').length,10) // hidden post-survey radios only
    assert(!element('.stimulus-empty').textContent.includes(trial.correctCategory))
    const reference=element('#category-reference').textContent
    assert(config.categories.every(cat=>reference.includes(cat)))
    fill('written-answer',i<24 ? ' '+trial.correctCategory.replace(' ','  ')+' ' : '모르겠다')
    await click('btn-initial-exam-next')
  }
  assert.equal(read().screen,'initial-feedback'); assert.match(element('.score-display').textContent,/24\s*\/ 30점/)
  await click('btn-next'); await jol('jol-ai-prediction',70); await click('btn-next')
  for(let i=0;i<30;i++){
    assert.equal(read().screen,'task'); assert.equal(read().phase,'initial')
    assert.equal(d.querySelectorAll('input[name="initial"]').length,5)
    assert(!d.getElementById('confidence-input'))
    check('input[name="initial"]'); await click('btn-initial-next')
    assert.equal(read().phase,'ai'); assert.equal(element('.ai-result-empty').textContent,'')
    assert([...d.querySelectorAll('input[name="initial"]')].every(e=>e.disabled))
    await click('btn-ai-next'); assert.equal(read().phase,'final')
    check('input[name="final"]'); await click('btn-final-next')
  }
  await jol('jol-task',80); await jol('jol-no-ai',60)
  assert.equal(read().screen,'math-intro'); await click('btn-next'); assert.equal(read().screen,'math')
  if(group==='intervention'){
    for(let i=0;i<100;i++){
      const current=read().math; const problem=current.problems[current.answers.length]
      fill('math-answer',String(problem.answer)); await click('btn-math-submit')
    }
    assert.equal(read().math.score,100)
  }else{
    // Check the actual deadline path, independently of skip controls.
    const now=w.Date.now; w.Date.now=()=>now()+180001
    for(let i=0;i<500&&read().screen==='math';i++) await tick()
    assert.equal(read().screen,'final-exam-intro')
    w.Date.now=now
  }
  assert.equal(read().screen,'final-exam-intro'); await click('btn-next')
  for(let i=0;i<30;i++){
    assert.equal(read().screen,'final-exam'); assert.equal(d.querySelectorAll('input[name="exam"]').length,5)
    assert(!d.querySelector('.ai-result-empty'))
    check('input[name="exam"]'); await click('btn-exam-next')
  }
  assert.equal(read().screen,'step-ps-0'); await click('btn-ps0-next');check('input[name="q4"]');await click('btn-ps1-next')
  fill('q5-input','50');await click('btn-ps2-next')
  check('input[name="ai_k1"]');check('input[name="ai_k1"][value="틀리다"]')
  assert.equal(d.querySelectorAll('.ai-survey-item').length,2) // Revising an earlier answer does not reveal extra questions.
  for(let i=2;i<=6;i++)check('input[name="ai_k'+i+'"]')
  await click('btn-ai-survey-next')
  for(let i=1;i<=8;i++)check('input[name="ai_a'+i+'"]')
  await click('btn-ai-survey-b-next'); fill('q6-age','25'); check('input[name="q6_gender"]'); fill('q6-major','테스트');await click('btn-ps3-submit')
  for(let i=0;i<200&&read().screen!=='step-done';i++)await tick()
  assert.equal(read().screen,'step-done');assert.match(element('#submission-result').textContent,/제출되지/)
  const responses=read().lastResponses
  assert.equal(responses._group,group);assert.equal(responses._initial_exam_score.correct,24)
  assert.equal(responses._learning_presentations.length,60);assert.equal(responses._task_answers.length,30);assert.equal(responses._exam_answers.length,30)
  assert.deepEqual(Object.keys(responses._jol),['after_learning','initial_exam_prediction','ai_exam_prediction','after_ai_task'])
  assert.deepEqual(responses._jol.after_ai_task,{jol1:80,jol2:60})
  assert(responses._task_answers.every(t=>Object.keys(t.phase_durations_ms).join(',')==='initial_ms,ai_ms,final_ms'))
  assert.equal(responses._ai_survey.ai_k1,'틀리다');assert.equal(Object.keys(responses._ai_survey).length,14)
  assert.deepEqual(errors,[])
  summaries.push(read().pages.map(p=>[p.screen,p.index,p.phase,p.round]))
  process.stdout.write(group+': 60 learning presentations, 5 JOLs, 30 written trials, score, 30 T-format tasks, math, 30 final trials and unchanged surveys PASS\n')
  dom.window.close()
}
// Exclude the different number of math practice responses used by the two tests.
const common = rows => rows.filter(([screen])=>screen!=='math')
assert.deepEqual(common(summaries[0]),common(summaries[1]))
process.stdout.write('Both groups follow the identical non-instruction procedure PASS\n')
