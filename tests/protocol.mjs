import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { JSDOM, VirtualConsole } from 'jsdom'
import app from '../dist/index.js'
const html = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8')
const tick = () => new Promise(resolve => setTimeout(resolve, 2))
const get = async path => (await app.fetch(new Request('https://experiment.local/api/' + path))).json()
const config = await get('experiment-config')
assert.deepEqual(config.groups.map(g=>g.id), ['intervention','no-intervention'])
assert.equal(config.categories.length,5)
assert(!html.includes('흑색종'))
assert(config.groups.every(g=>g.taskInstruction&&g.boldPhrases.length))
const sets = {}
for (const [path,key] of [['images','slides'],['initial-exam-images','exams'],['task-images','tasks'],['exam-images','exams']]) {
  const data = await get(path); const trials = data[key]; sets[path] = trials
  const count = path==='initial-exam-images'?15:30
  assert.equal(trials.length,count); assert.equal(new Set(trials.map(t=>t.id)).size,count)
  assert(trials.every(t=>t.url.startsWith('/static/stimuli/')))
  for(const category of config.categories) assert.equal(trials.filter(t=>t.correctCategory===category).length,count/5)
}
assert(sets['task-images'].every(t=>t.aiCategory===null&&t.aiReason===null))
const summaries = []
for (const group of config.groups.map(g=>g.id)) {
  const errors = [], console = new VirtualConsole()
  console.on('jsdomError',err=>errors.push(err.message))
  const dom = new JSDOM(html,{url:'https://jennie-ys.github.io/thesis/',runScripts:'outside-only',virtualConsole:console})
  const w = dom.window, d = w.document
  w.Image = class { set src(value) { queueMicrotask(()=>this.onload?.()) } async decode() {} }; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}
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
  for(let i=0;i<3000 && read().screen!=='jol-initial-exam';i++) await tick()
  assert.equal(read().learning.length,60)
  for(const round of [1,2]) assert.equal(read().learning.filter(t=>t.round===round).length,30)
  fill('jol-input','101'); await click('btn-jol-next'); assert.equal(read().screen,'jol-initial-exam')
  await jol('jol-initial-exam',100); await click('btn-next')
  assert.equal(read().screen,'initial-exam')
  await click('btn-initial-exam-next'); assert.equal(read().initialExam.length,0)
  for(let i=0;i<sets['initial-exam-images'].length;i++){
    const trial = sets['initial-exam-images'][i]
    assert.equal(element('#experiment-root').querySelectorAll('input[type="radio"]').length,0)
    assert.equal(element('.task-img').alt,'피부 병변 사례')
    const reference=element('#category-reference').textContent
    assert(config.categories.every(cat=>reference.includes(cat)))
    fill('written-answer',i<12 ? ' '+trial.correctCategory.replace(' ','  ')+' ' : '모르겠다')
    await click('btn-initial-exam-next')
  }
  assert.equal(read().screen,'initial-feedback'); assert.match(element('.score-display').textContent,/12\s*\/ 15점/)
  await click('btn-next'); await jol('jol-ai-prediction',70); await click('btn-next')
  assert.equal(read().screen,'task-notice')
  const groupConfig=config.groups.find(g=>g.id===group)
  assert.deepEqual([...element('#experiment-root').querySelectorAll('strong')].map(e=>e.textContent),groupConfig.boldPhrases)
  assert.equal(element('.instruct-body').textContent,groupConfig.taskInstruction.replaceAll('\n',''))
  if(group==='intervention') {
    assert.equal(element('.intervention-instruction').querySelectorAll('p').length,5)
    assert(element('.instruct-body').textContent.endsWith("준비되었으면 다음 버튼을 눌러주세요."))
    assert.equal(w.getComputedStyle(element('.intervention-instruction')).fontSize,'17.6px')
    assert.equal(w.getComputedStyle(element('.intervention-evidence')).fontSize,'19.2px')
    const paragraphs=element('.intervention-instruction').querySelectorAll('p')
    assert.equal(paragraphs[1].querySelectorAll('br').length,1)
    assert(paragraphs[2].classList.contains('intervention-evidence'))
    assert.equal(paragraphs[3].firstChild.textContent,'따라서, ')
    assert.equal(paragraphs[3].querySelector('strong').textContent,'AI의 답변과 자신의 판단을 함께 고려하여 최종 답변을 선택하십시오.')
    assert.equal(paragraphs[4].querySelector('strong').textContent,paragraphs[4].textContent)
  }
  assert(!element('.instruct-body').textContent.includes('**'))
  assert.equal(element('.instruct-body').textContent.includes('67.8%'),group==='intervention')
  await click('btn-next')
  if(group==='intervention'){
    assert.equal(read().screen,'task-check');assert(!d.getElementById('btn-checked-task-start'))
    await click('btn-instruction-check');assert.equal(read().screen,'task-check')
    fill('instruction-check-answer','70');await click('btn-instruction-check')
    assert.equal(read().screen,'task-check');assert.equal(read().instructionCheck.passed,false)
    assert(d.body.textContent.includes('오답입니다.'));assert(!d.getElementById('btn-checked-task-start'))
    await click('btn-instruction-read-again');assert.equal(read().screen,'task-notice')
    assert.equal(read().instructionCheck.attempts.length,1)
    assert.equal(element('#btn-next').textContent,'다음→');await click('btn-next')
    assert.equal(read().screen,'task-check');assert.equal(element('#instruction-check-answer').value,'')
    fill('instruction-check-answer','67.80');await click('btn-instruction-check')
    assert.equal(read().screen,'task-check');assert(read().instructionCheck.passed)
    assert.equal(element('#btn-checked-task-start').textContent,'과제 시작하기')
    assert(element('#instruction-check-answer').disabled)
    await click('btn-checked-task-start')
  }
  for(let i=0;i<30;i++){
    assert.equal(read().screen,'task'); assert.equal(read().phase,'initial')
    assert.equal(d.querySelectorAll('input[name="initial"]').length,5)
    assert(!d.getElementById('confidence-input')); assert(!d.querySelector('.task-choice-alpha'))
    check('input[name="initial"]'); await click('btn-initial-next')
    assert.equal(read().phase,'ai'); assert.equal(element('.ai-result-empty').textContent,'')
    assert([...d.querySelectorAll('input[name="initial"]')].every(e=>e.disabled))
    await click('btn-ai-next'); assert.equal(read().phase,'final'); assert(element('#box-final').textContent.includes('자신의 판단과 AI의 의견을 종합하여 최종 답안을 선택하세요.')); assert(!element('#box-final').textContent.includes('최종 진단'))
    check('input[name="final"]'); await click('btn-final-next')
  }
  await jol('jol-task',80); await jol('jol-no-ai',60)
  assert.equal(read().screen,'math-intro'); await click('btn-next'); assert.equal(read().screen,'math'); assert(!d.getElementById('math-timer'))
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
  await click('btn-ai-survey-b-next')
  assert.equal(read().screen,'step-ai-error-belief');assert.equal(element('.step.active').dataset.surveyScale,'ai_t');assert.equal(element('.step.active').querySelectorAll('input[type=radio]').length,2);assert(element('#ai-belief-followup').hidden)
  check('input[name="ai_t1"][value="yes"]');assert(!element('#ai-belief-followup').hidden)
  if(group==='intervention'){
    await click('btn-ai-belief-next');assert.equal(read().screen,'step-ai-error-belief')
    fill('ai-expected-accuracy','101');await click('btn-ai-belief-next');assert.equal(read().screen,'step-ai-error-belief')
    fill('ai-expected-accuracy','0');await click('btn-ai-belief-next')
  }else{
    fill('ai-expected-accuracy','80');check('input[name="ai_t1"][value="no"]')
  }
  assert.equal(read().screen,'step-ps-3')
  fill('q6-age','25'); check('input[name="q6_gender"]'); fill('q6-major','테스트');await click('btn-ps3-submit')
  for(let i=0;i<200&&read().screen!=='step-done';i++)await tick()
  assert.equal(read().screen,'step-done');assert.match(element('#submission-result').textContent,/제출되지/)
  const responses=read().lastResponses
  assert.equal(responses.ai_t.ai_t1,group==='intervention'?'yes':'no')
  assert.equal(responses.ai_t.ai_t2,group==='intervention'?0:null)
  assert.equal(responses.ai_t.ai_t2_status,group==='intervention'?'answered':'not_applicable')
  assert.equal(responses._survey_schema_version,3)
  assert.deepEqual(Object.keys(responses).slice(3,8),['pk1','pk2','ai_k','ai_a','ai_t'])
  assert.equal(typeof responses.pk1,'number');assert.equal(typeof responses.pk2,'number')
  assert(!('_ai_survey' in responses));assert(!('ai_can_be_wrong' in responses));assert(!('ai_expected_accuracy' in responses))
  assert.equal(responses._instruction_check?.passed ?? null,group==='intervention'?true:null)
  if(group==='intervention')assert.deepEqual(responses._instruction_check.attempts.map(a=>[a.answer,a.correct]),[[70,false],[67.8,true]])
  assert.equal(responses._group,group);assert.equal(responses._initial_exam_score.correct,12)
  assert.equal(responses._learning_presentations.length,60);assert.equal(responses._task_answers.length,30);assert.equal(responses._exam_answers.length,30)
  assert.deepEqual(Object.keys(responses._jol),['initial_exam_prediction','ai_exam_prediction','after_ai_task'])
  assert.deepEqual(responses._jol.after_ai_task,{jol1:80,jol2:60})
  assert(responses._task_answers.every(t=>Object.keys(t.phase_durations_ms).join(',')==='initial_ms,ai_ms,final_ms'))
  assert.equal(responses.ai_k.ai_k1,'틀리다')
  assert.deepEqual(Object.keys(responses.ai_k),Array.from({length:6},(_,i)=>'ai_k'+(i+1)))
  assert.deepEqual(Object.keys(responses.ai_a),Array.from({length:8},(_,i)=>'ai_a'+(i+1)))
  assert(Object.values(responses.ai_a).every(v=>typeof v==='number'&&v>=1&&v<=4))
  assert(Object.keys(responses.ai_t).every(key=>key.startsWith('ai_t')))
  assert.deepEqual(errors,[])
  summaries.push(read().pages.map(p=>[p.screen,p.index,p.phase,p.round]))
  process.stdout.write(group+': 60 learning presentations, 4 JOLs, 15 written trials, score, 30 T-format tasks, math, 30 final trials and unchanged surveys PASS\n')
  dom.window.close()
}
// Exclude the different number of math practice responses used by the two tests.
const common = rows => rows.filter(([screen])=>!['math','task-notice','task-check'].includes(screen))
assert.deepEqual(common(summaries[0]),common(summaries[1]))
process.stdout.write('Both groups follow the identical non-instruction procedure PASS\n')
