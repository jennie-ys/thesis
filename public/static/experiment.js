/** Two common procedures; only the initial instruction is configurable by group. */
;(() => {
  'use strict'
  const STATE_KEY = '__exp_v2_state__'
  let config, slides, initialExams, tasks, finalExams
  let timer = null, interval = null, renderEpoch = 0, phaseStarted = Date.now(), initStarted = false
  let state
  const $ = id => document.getElementById(id)
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]))
  const normalize = value => value.normalize('NFKC').replace(/\s/g, '')
  function freshState() {
    return { version:'two-group-v2', participantId:crypto.randomUUID(), group:null, screen:'group', index:0, round:1,
      phase:'initial', learning:[], initialExam:[], task:[], finalExam:[], jol:{}, survey:{}, pages:[],
      math:null, startedAt:new Date().toISOString(), pageEntered:Date.now(), submissionSaved:null }
  }
  function persist() { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)) }
  function leavePage() {
    state.pages.push({ screen:state.screen, index:state.index, phase:state.phase, round:state.round,
      entered_at:new Date(state.pageEntered).toISOString(), duration_ms:Date.now() - state.pageEntered })
    state.pageEntered = Date.now()
  }
  function go(screen, patch = {}) {
    leavePage(); Object.assign(state, patch, { screen }); persist(); render()
  }
  function clearTimers() { clearTimeout(timer); clearInterval(interval); timer = interval = null; renderEpoch++ }
  function attachSkipControl() {
    if ((config && !config.previewControls) || $('temporary-skip')) return
    const controls = document.createElement('nav')
    controls.className = 'temporary-controls'; controls.setAttribute('aria-label', '임시 검토 도구')
    const skip = document.createElement('button')
    skip.id = 'temporary-skip'; skip.type = 'button'; skip.className = 'btn-skip'
    skip.textContent = '(임시) skip →'; skip.onclick = skipCurrentScreen
    controls.appendChild(skip); document.body.appendChild(controls)
  }
  function skipCurrentScreen() {
    if (!state || !config) { location.reload(); return }
    state.skips ||= []
    state.skips.push({screen:state.screen,index:state.index,phase:state.phase,round:state.round,at:new Date().toISOString()})
    const missingTrials = (items, answers) => {
      for (const item of items.slice(answers.length)) {
        answers.push({trial_id:item.id,correctCategory:item.correctCategory,chosen:null,correct:null,skipped:true,duration_ms:null})
      }
    }
    switch (state.screen) {
      case 'group': go('instruction'); break
      case 'instruction': go('learning-intro'); break
      case 'learning-intro': go('learning',{index:0,round:1}); break
      case 'learning': go(state.round === 1 ? 'learning-break' : 'jol-learning'); break
      case 'learning-break': go('learning',{index:0,round:2}); break
      case 'jol-learning': state.jol.learning = null; go('jol-initial-exam'); break
      case 'jol-initial-exam': state.jol.initialExamPrediction = null; go('initial-exam-intro'); break
      case 'initial-exam-intro': go('initial-exam',{index:state.initialExam.length}); break
      case 'initial-exam': missingTrials(initialExams,state.initialExam); go('initial-feedback'); break
      case 'initial-feedback': go('jol-ai-prediction'); break
      case 'jol-ai-prediction': state.jol.aiPrediction = null; go('task-intro'); break
      case 'task-intro': go('task',{index:state.task.length,phase:'initial'}); break
      case 'task':
        for (const item of tasks.slice(state.task.length)) {
          const pending = state.pendingTask?.trial_id === item.id ? state.pendingTask : {}
          state.task.push({trial_id:item.id,correctCategory:item.correctCategory,aiCategory:item.aiCategory,aiReason:item.aiReason,
            initial:null,final:null,phase_durations_ms:{},...pending,skipped:true})
        }
        state.pendingTask = null; go('jol-task',{phase:'initial'}); break
      case 'jol-task': state.jol.jol1 = null; go('jol-no-ai'); break
      case 'jol-no-ai': state.jol.jol2 = null; go('math-intro'); break
      case 'math-intro': startMath(); break
      case 'math': endMath(true); break
      case 'final-exam-intro': go('final-exam',{index:state.finalExam.length}); break
      case 'final-exam': missingTrials(finalExams,state.finalExam); goToPostSurvey(); break
      case 'step-ps-0': showPS1(); break
      case 'step-ps-1': showPS2(); break
      case 'step-ps-2': showAiSurvey(); break
      case 'step-ai-survey': showAiSurveyB(); break
      case 'step-ai-survey-b': showPS3(); break
      case 'step-ps-3': state.submissionSaved = false; go('step-done'); break
      default:
        state = freshState(); psData = state.survey
        document.querySelectorAll('.step input').forEach(input => { input.value = input.type === 'radio' ? input.value : ''; input.checked = false })
        persist(); render()
    }
  }
  function button(id, text, extra = '') { return `<button id="${id}" type="button" class="btn-primary" ${extra}>${text}</button>` }
  function bind(id, fn) { $(id).onclick = fn }
  function shell(title, body, footer = '') {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'))
    $('experiment-root').hidden = false
    $('experiment-root').innerHTML = `${body}${footer}`
    window.scrollTo(0, 0)
  }
  function card(body) { return `<div class="card">${body}</div>` }
  function next(id = 'btn-next', label = '다음 →') { return `<div class="btn-row">${button(id, label)}</div>` }
  function delayed(id) {
    const b = $(id), epoch = renderEpoch; b.hidden = true
    timer = setTimeout(() => { if (epoch === renderEpoch) b.hidden = false }, config.phaseDelayMs)
  }
  function stimulus(trial) {
    if (trial.url) return `<img class="task-img" src="${escape(trial.url)}" alt="피부 병변 사례" />`
    // Do not display the hidden category or category-coded trial ID on test/task screens.
    return `<div class="stimulus-empty" role="img" aria-label="이미지가 없는 사례 영역"><p>이미지 영역</p></div>`
  }
  function choices(name, chosen = null, locked = false) {
    return `<div class="task-choices">${config.categories.map((cat, i) => `<label class="task-choice"><input type="radio" name="${name}" value="${escape(cat)}" ${chosen === cat ? 'checked' : ''} ${locked ? 'disabled' : ''}/><span class="task-choice-alpha">${String.fromCharCode(65+i)}.</span><span>${escape(cat)}</span></label>`).join('')}</div>`
  }
  function error(message) { $('screen-error').textContent = message }
  function errorArea() { return '<p id="screen-error" class="inline-err" role="alert"></p>' }
  function score(answers) { return { correct:answers.filter(a => a.correct).length, total:answers.length } }
  function jolScreen(title, text, key, destination) {
    shell(title, card(`<form id="jol-form" novalidate><label class="jol-question" for="jol-input">${text}</label><div class="math-input-row"><input id="jol-input" class="math-input" type="number" min="0" max="100" step="1" placeholder="0 – 100" value="${state.jol[key] ?? ''}" /><span>%</span></div>${errorArea()}${next('btn-jol-next')}</form>`))
    const submit = e => {
      e.preventDefault(); const raw = $('jol-input').value.trim(), value = Number(raw)
      if (!raw || !Number.isInteger(value) || value < 0 || value > 100) { error('0~100 사이의 정수를 입력해 주세요.'); $('jol-input').focus(); return }
      state.jol[key] = value; go(destination)
    }
    $('jol-form').onsubmit = submit; bind('btn-jol-next', submit); delayed('btn-jol-next')
  }
  function info(title, text, fn, label = '시작하기') {
    shell(title, card(`<div class="instruct-body">${text}</div>${next('btn-next', label)}`)); bind('btn-next', fn)
  }
  function render() {
    clearTimers(); phaseStarted = Date.now()
    attachSkipControl()
    if (state.screen.startsWith('step-')) { restoreSurvey(); return }
    switch (state.screen) {
      case 'group':
        shell('참가 조건을 선택해 주세요', `<div class="branch-wrap">${config.groups.map(g => `<button id="btn-group-${g.id}" class="branch-btn">${escape(g.label)}</button>`).join('')}</div>`)
        config.groups.forEach(g => bind('btn-group-'+g.id, () => go('instruction', {group:g.id})))
        break
      case 'instruction': {
        const instruction = config.groups.find(g => g.id === state.group)?.initialInstruction
        info('실험 안내', `<p class="instruct-lead">지금부터 실험을 시작합니다.</p><p>실험에 참여하는 동안, 컴퓨터를 이용한 다른 작업(예. 카카오톡, 인터넷 서핑 등)을 할 수 없습니다.</p><p>모든 실험단계에 집중하여 성심성의껏 참여해 주시길 요청드립니다.</p><p>또한, 필기구나 휴대폰 등을 활용해 학습내용을 기록할 수 없습니다.</p>${instruction ? `<div class="initial-instruction">${escape(instruction).replace(/\n/g,'<br>')}</div>` : ''}`, () => go('learning-intro'), '→')
        break
      }
      case 'learning-intro':
        info('', "<p class=\"instruct-lead\">지금부터 5종의 피부 병변을 진단하기 위한 학습을 시작합니다.</p><p>한 장씩 제시되는 피부 병변의 사진과 이름을 보며 시각적 특징을 학습하면 됩니다.<br>\n        화면은 5초마다 자동으로 넘어가며, 다음 화면으로 넘어가면 앞으로 돌아갈 수 없습니다.</p>\n        <p>학습할 피부 병변 5종의 이름은 다음과 같습니다.</p>\n\n        <p class=\"lesion-names\">\n          <strong>광선각화증, 기저세포암, 멜라닌세포성 모반, 피부섬유종, 혈관 병변</strong>\n        </p>\n\n        <p class=\"instruct-ready\">준비되었으면 아래 버튼을 눌러주세요. 학습이 시작됩니다.</p>", () => go('learning', {index:0, round:1}), "학습 시작하기")
        break
      case 'learning': renderLearning(); break
      case 'learning-break':
        info('', "<p>지금부터 같은 학습을 한 번 더 하게 됩니다.</p>\n        <p>준비되었으면 아래 버튼을 눌러주세요. 학습이 시작됩니다.</p>", () => go('learning', {index:0, round:2}), "학습 시작하기")
        break
      case 'jol-learning':
        jolScreen('학습에 대한 판단', '앞서 진행된 학습에서 피부 병변 5개 범주의 특징을 얼마나 잘 학습했다고 생각하나요? 0에서 100 사이의 값으로 표시하십시오.', 'learning', 'jol-initial-exam')
        break
      case 'jol-initial-exam':
        jolScreen('시험 수행 예측', '만약 지금부터 피부 병변 분류 시험을 보게 된다면, 얼마나 많은 문제를 맞힐 수 있을 것이라고 생각하나요?', 'initialExamPrediction', 'initial-exam-intro')
        break
      case 'initial-exam-intro':
        info('', "<p class=\"instruct-lead\">지금부터 피부 병변의 범주를 분류하는 시험을 시작합니다.</p>\n<p>피부 병변 이미지가 한 장씩 제시되면, 앞서 학습한 내용을 바탕으로 해당하는 병변의 범주를 판단하세요.</p>\n<p>화면에 제시되는 5개의 범주명을 참고하여, 해당한다고 생각하는 범주명을 답 입력란에 직접 작성해주세요.</p>\n<p>답을 작성한 후 아래 버튼을 누르면 다음 이미지로 넘어갑니다. 다음 화면으로 넘어가면 앞으로 돌아갈 수 없습니다.</p>\n<p class=\"instruct-ready\">준비되었으면 아래 버튼을 눌러주세요. 시험이 시작됩니다.</p>", () => go('initial-exam', {index:state.initialExam.length}), "시험 시작하기")
        break
      case 'initial-exam': renderInitialExam(); break
      case 'initial-feedback': {
        const result = score(state.initialExam)
        info('시험 총점', `<div class="score-display"><strong>${result.correct}</strong><span> / ${result.total}점</span></div><p>정답률 ${result.total ? (result.correct/result.total*100).toFixed(1) : '0.0'}%</p>${config.stimuliPending ? '<p class="preview-score-note">현재 점수는 이미지가 없는 상태에서 절차를 확인하기 위한 점수입니다.</p>' : ''}`, () => go('jol-ai-prediction'), '다음 →')
        break
      }
      case 'jol-ai-prediction':
        jolScreen('AI 협업 과제 수행 예측', '다음에는 AI 분석 결과를 참고하여 피부 병변 분류 시험을 다시 볼 수 있습니다. AI 분석 결과를 참고한다면, 몇 %의 문제를 맞힐 수 있을 것이라고 생각하나요?', 'aiPrediction', 'task-intro')
        break
      case 'task-intro':
        info('', "<p class=\"instruct-lead\">학습이 끝났습니다. 지금부터 피부 병변 분류 과제를 시작합니다.</p>\n        <p>이 과제에서는 피부 병변 이미지를 보고 해당 병변의 범주를 판단하게 됩니다.</p>\n        <p>각 이미지에 대해 아래의 순서대로 진행합니다.</p>\n        <!-- 집단별 순서 안내 (JS가 채움) -->\n        <ol class=\"lesion-list\"><li>이미지를 충분히 관찰한 후, 해당 병변의 범주를 선택하여 <strong>초기 답안</strong>을 제출하십시오.</li>\n<li>동일한 이미지에 대한 <strong>AI 분석 결과</strong>를 확인하십시오.</li>\n<li>초기 판단과 AI의 의견을 종합하여 <strong>최종 답안</strong>을 제출하십시오.</li></ol>\n        <p>위 과정을 모든 이미지에 대해 반복합니다.</p>\n        <p class=\"instruct-ready\">준비되었으면 아래 버튼을 눌러주세요.</p>", () => go('task', {index:state.task.length, phase:'initial'}), "과제 시작하기")
        break
      case 'task': renderTask(); break
      case 'jol-task':
        jolScreen('AI 협업 과제 정확도 추정', '앞서 진행된 AI 협업 피부 병변 분류 과제에서 얼마나 정답을 맞혔다고 생각하나요? 0에서 100 사이의 값으로 표시하십시오.<br><span>최종적으로 제출한 답변에 대한 정답률을 예측해보세요</span>', 'jol1', 'jol-no-ai')
        break
      case 'jol-no-ai':
        jolScreen('AI 없이 수행할 때의 판단', '만약 지금부터 AI 없이 스스로 피부 병변 분류 과제를 하게 된다면, 얼마나 많은 문제를 맞힐 수 있을 것이라고 생각하나요?', 'jol2', 'math-intro')
        break
      case 'math-intro':
        info('', "<p class=\"instruct-lead\">피부 병변 분류 과제를 마쳤습니다. 이제 간단한 수학 문제를 풉니다.</p>\n        <p>3분 동안 문제를 풀 수 있으며, 3분이 되면 자동으로 페이지가 넘어갑니다.<br>문제를 가능한 한 빠르고 정확하게 풀어주세요.</p>\n        <p class=\"instruct-ready\">준비 되었으면 아래 버튼을 눌러주세요.</p>", startMath, "시작하기")
        break
      case 'math': renderMath(); break
      case 'final-exam-intro':
        info('', "<p class=\"instruct-lead\">지금부터는 AI 없이 피부 병변 범주를 분류하는 문제를 풀게 됩니다.</p>\n        <p>피부 병변 이미지가 제시되면, 해당하는 병변의 종류를 보기에서 찾아 선택하세요.</p>\n        <p class=\"instruct-ready\">준비되었으면 아래 버튼을 눌러주세요.</p>", () => go('final-exam', {index:state.finalExam.length}), "시험 시작하기")
        break
      case 'final-exam': renderFinalExam(); break
      default: showError('현재 단계를 불러올 수 없습니다. 처음부터 다시 시작해주세요.')
    }
  }
  function renderLearning() {
    const item = slides[state.index], epoch = renderEpoch
    shell('', card(`${stimulus(item)}<p class="learn-name">${escape(item.category)}</p>`))
    let advanced = false
    const advance = () => {
      if (advanced || epoch !== renderEpoch) return
      advanced = true
      state.learning.push({trial_id:item.id, round:state.round, duration_ms:Date.now()-phaseStarted})
      if (state.index+1 < slides.length) go('learning', {index:state.index+1})
      else go(state.round === 1 ? 'learning-break' : 'jol-learning')
    }
    timer = setTimeout(() => {
      if (epoch !== renderEpoch) return
      $('experiment-root').querySelector('.card').style.visibility = 'hidden'
      timer = setTimeout(advance, config.blankMs)
    }, config.learningMs)
  }
  function renderInitialExam() {
    const item = initialExams[state.index]
    shell('피부 병변 분류 시험', card(`${stimulus(item)}`) + card(`<p id="category-reference"><strong>범주명 보기</strong><br>${config.categories.map(escape).join(' · ')}</p><form id="initial-exam-form"><label for="written-answer">이 사례의 피부 병변 범주명을 입력하세요.</label><input id="written-answer" type="text" class="demog-input written-answer" autocomplete="off" spellcheck="false" />${errorArea()}${next('btn-initial-exam-next')}</form>`))
    const submit = e => {
      e.preventDefault(); const answer = $('written-answer').value.trim()
      if (!answer) { error('범주명을 입력해 주세요.'); $('written-answer').focus(); return }
      state.initialExam.push({trial_id:item.id, correctCategory:item.correctCategory, chosen:answer,
        correct:normalize(answer) === normalize(item.correctCategory), duration_ms:Date.now()-phaseStarted})
      go(state.index+1 < initialExams.length ? 'initial-exam' : 'initial-feedback', {index:state.index+1})
    }
    $('initial-exam-form').onsubmit = submit; bind('btn-initial-exam-next', submit); $('written-answer').focus()
  }
  function renderTask() {
    const item = tasks[state.index], pending = state.pendingTask || {trial_id:item.id, correctCategory:item.correctCategory,
      aiCategory:item.aiCategory, aiReason:item.aiReason, aiCorrect:item.aiCategory == null ? null : item.aiCategory === item.correctCategory, phase_durations_ms:{}}
    state.pendingTask = pending; persist()
    const phase = state.phase
    const initial = `<section id="box-initial" class="task-box ${phase === 'initial' ? 'task-box--active' : 'task-box--locked'}"><p class="task-box-desc">이 이미지의 피부 병변 범주를 선택하세요.</p>${choices('initial', pending.initial, phase !== 'initial')}${phase === 'initial' ? next('btn-initial-next') : ''}</section>`
    const ai = phase !== 'initial' ? `<section id="box-ai" class="task-box ${phase === 'ai' ? 'task-box--active' : 'task-box--locked'}"><p class="ai-label-row"><span class="ai-badge">AI 분석 결과</span></p><div class="ai-result-empty" aria-label="AI 분석 결과 영역">${item.aiCategory ? `<p>${escape(item.aiCategory)}</p>` : ''}${item.aiReason ? `<p>${escape(item.aiReason)}</p>` : ''}</div>${phase === 'ai' ? next('btn-ai-next') : ''}</section>` : ''
    const final = phase === 'final' ? `<section id="box-final" class="task-box task-box--active"><p class="task-box-desc">자신의 판단과 AI의 의견을 종합하여 최종 답안을 선택하세요.</p>${choices('final')}${next('btn-final-next', '제출')}</section>` : ''
    shell('AI 협업 과제', `<div class="review-task-layout">${card(stimulus(item))}<div class="task-boxes">${initial}${ai}${final}</div></div>${errorArea()}`)
    if (phase === 'initial') {
      $('btn-initial-next').disabled = true
      document.querySelectorAll('input[name="initial"]').forEach(r => r.onchange = () => { $('btn-initial-next').disabled = false })
      bind('btn-initial-next', () => {
        const chosen = document.querySelector('input[name="initial"]:checked')?.value
        if (!chosen) return
        pending.initial = chosen; pending.phase_durations_ms.initial_ms = Date.now()-phaseStarted
        go('task', {phase:'ai'})
      }); delayed('btn-initial-next')
    } else if (phase === 'ai') {
      bind('btn-ai-next', () => { pending.phase_durations_ms.ai_ms = Date.now()-phaseStarted; go('task', {phase:'final'}) }); delayed('btn-ai-next')
    } else {
      $('btn-final-next').disabled = true
      document.querySelectorAll('input[name="final"]').forEach(r => r.onchange = () => { $('btn-final-next').disabled = false })
      bind('btn-final-next', () => {
        const chosen = document.querySelector('input[name="final"]:checked')?.value
        if (!chosen) return
        pending.final = chosen; pending.phase_durations_ms.final_ms = Date.now()-phaseStarted
        state.task.push(pending); state.pendingTask = null
        go(state.index+1 < tasks.length ? 'task' : 'jol-task', {index:state.index+1, phase:'initial'})
      }); delayed('btn-final-next')
    }
  }
  function startMath() {
    if (!state.math) {
      const problems = []
      while (problems.length < 100) {
        const a = 10+Math.floor(Math.random()*90), b = 10+Math.floor(Math.random()*90), op = Math.random()<.5 ? '+' : '-'
        const answer = op === '+' ? a+b : a-b
        if (answer >= 10 && answer <= 99) problems.push({a,b,op,answer})
      }
      state.math = {problems, answers:[], started_at:Date.now(), deadline:Date.now()+config.mathDurationMs, score:0}
    }
    go('math')
  }
  function endMath(skipped = false) {
    if (state.screen !== 'math') return
    state.math.duration_ms = Date.now()-state.math.started_at; state.math.skipped = skipped
    go('final-exam-intro')
  }
  function renderMath() {
    const math = state.math
    if (Date.now() >= math.deadline || math.answers.length >= math.problems.length) { endMath(); return }
    const p = math.problems[math.answers.length]
    shell('수학 문제', card(`<p id="math-timer" class="math-timer"></p><p class="math-question">${p.a} ${p.op} ${p.b} = ?</p><form id="math-form" class="math-input-row"><input id="math-answer" type="number" class="math-input" placeholder="답을 입력하세요" autocomplete="off"/>${button('btn-math-submit','확인')}</form>${errorArea()}`))
    const submit = e => {
      e.preventDefault(); if (Date.now() >= math.deadline) { endMath(); return }
      const raw = $('math-answer').value.trim(), answer = Number(raw)
      if (!raw || !Number.isInteger(answer)) { error('숫자로 답을 입력해 주세요.'); return }
      const correct = answer === p.answer; if (correct) math.score++
      math.answers.push({q:`${p.a}${p.op}${p.b}`, userAns:answer, correct}); persist(); render()
    }
    $('math-form').onsubmit = submit; bind('btn-math-submit', submit)
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((math.deadline-Date.now())/1000))
      if (remaining === 0) { endMath(); return }
      $('math-timer').textContent = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`
    }
    tick(); interval = setInterval(tick, 250); $('math-answer').focus()
  }
  function renderFinalExam() {
    const item = finalExams[state.index]
    shell('NO-AI 최종시험', card(`${stimulus(item)}`) + card(`<fieldset><legend>이 이미지의 피부 병변 범주를 선택하세요.</legend>${choices('exam')}</fieldset>${next('btn-exam-next')}`))
    $('btn-exam-next').disabled = true
    document.querySelectorAll('input[name="exam"]').forEach(r => r.onchange = () => { $('btn-exam-next').disabled = false })
    bind('btn-exam-next', () => {
      const chosen = document.querySelector('input[name="exam"]:checked')?.value
      if (!chosen) return
      state.finalExam.push({trial_id:item.id, correctCategory:item.correctCategory, chosen, correct:chosen === item.correctCategory, duration_ms:Date.now()-phaseStarted})
      if (state.index+1 < finalExams.length) go('final-exam', {index:state.index+1})
      else goToPostSurvey()
    })
  }
  function _showErr(id, msg) { const el = $(id); el.textContent = msg; el.style.display = '' }
  function showStep(id) {
    clearTimers(); leavePage(); state.screen = id; persist(); activateSurvey(id)
  }
  function activateSurvey(id) {
    attachSkipControl()
    $('experiment-root').hidden = true
    document.querySelectorAll('.step').forEach(el => el.classList.toggle('active', el.id === id)); window.scrollTo(0,0)
  }
  function restoreSurvey() {
    const restore = {'step-ps-0':goToPostSurvey, 'step-ps-1':showPS1, 'step-ps-2':showPS2, 'step-ai-survey':showAiSurvey, 'step-ai-survey-b':showAiSurveyB, 'step-ps-3':showPS3}
    if (restore[state.screen]) restore[state.screen]()
    else {
      activateSurvey(state.screen)
      if (state.screen === 'step-done') $('submission-result').textContent = state.submissionSaved ? '응답해 주신 내용이 제출되었습니다.' : '절차 미리보기를 완료했습니다. 응답 저장소가 설정되지 않아 데이터는 제출되지 않았습니다.'
      if (state.screen === 'step-error') bind('btn-retry', () => go('step-ps-3'))
    }
  }
  let psData
  // 13-0: 안내
  function goToPostSurvey() {
    showStep('step-ps-0')
    const btn = document.getElementById('btn-ps0-next')
    if (btn) {
      const nb = btn.cloneNode(true)
      btn.parentNode.replaceChild(nb, btn)
      nb.addEventListener('click', () => showPS1(), { once: true })
    }
  }

  // 13-1: Q4 사전지식 7점 척도
  function showPS1() {
    showStep('step-ps-1')
    const btnNext = document.getElementById('btn-ps1-next')
    if (btnNext) {
      btnNext.disabled = true
      const nb = btnNext.cloneNode(true)
      btnNext.parentNode.replaceChild(nb, btnNext)
      nb.disabled = !document.querySelector('input[name="q4"]:checked')
      document.querySelectorAll('input[name="q4"]').forEach(r => {
        r.addEventListener('change', () => { if (nb) nb.disabled = false })
      })
      nb.addEventListener('click', () => {
        const val = document.querySelector('input[name="q4"]:checked')?.value
        if (!val) { _showErr('ps1-err', '응답을 선택해 주세요.'); return }
        psData.pk1 = val
        showPS2()
      }, { once: true })
    }
  }

  // 13-2: Q5 초기 정확도
  function showPS2() {
    showStep('step-ps-2')
    const btn = document.getElementById('btn-ps2-next')
    if (btn) {
      const nb = btn.cloneNode(true)
      btn.parentNode.replaceChild(nb, btn)
      function onPS2Click() {
        const inp = document.getElementById('q5-input')
        const val = inp?.value?.trim()
        if (!val || !Number.isInteger(Number(val)) || Number(val)<0 || Number(val)>100) { _showErr('ps2-err', '0~100 사이의 숫자를 입력해 주세요.'); if (inp) inp.focus(); return }
        nb.removeEventListener('click', onPS2Click)
        psData.pk2 = val
        showAiSurvey()   // ← Q5 다음에 AI 설문으로 이동
      }
      nb.addEventListener('click', onPS2Click)
    }
  }

  // ════════════════════════════════════════════════════════════════
  // ── 13-2b : AI 지식·태도 설문 (순차 문항 공개) ──────────────────
  // ════════════════════════════════════════════════════════════════

  // ── 섹션 A: 지식 문항 (맞다/틀리다) ────────────────────────────
  const AI_SURVEY_ITEMS_A = [
    { type: 'yn', name: 'ai_k1', text: '생성형 AI는 수학적 문제를 신뢰할 만하게 해결할 수 있다.', correct: '틀리다' },
    { type: 'yn', name: 'ai_k2', text: '생성형 AI는 동일한 질문에 대해 동일한 답변을 제공한다.', correct: '틀리다' },
    { type: 'yn', name: 'ai_k3', text: '생성형 AI는 인간의 언어 행동을 가능한 한 가깝게 모방하도록 설계되었다.', correct: '맞다' },
    { type: 'yn', name: 'ai_k4', text: '생성형 AI는 웹 검색을 수행한다.', correct: '틀리다' },
    { type: 'yn', name: 'ai_k5', text: '생성형 AI는 사실에 근거하지 않은 내용을 제공할 수 있다.', correct: '맞다' },
    { type: 'yn', name: 'ai_k6', text: '생성형 AI는 매일 업데이트되는 정보를 검색하거나 가져온다.', correct: '틀리다' },
  ]

  // ── 섹션 B: 태도 문항 (4점 척도) ─────────────────────────────
  const AI_SURVEY_ITEMS_B = [
    { type: 'likert4', name: 'ai_a1', text: '생성형 AI는 신뢰할 수 있다.' },
    { type: 'likert4', name: 'ai_a2', text: '생성형 AI는 개인정보 사용과 관련된 위험을 내포한다.' },
    { type: 'likert4', name: 'ai_a3', text: '생성형 AI는 고정관념과 편견을 재생산한다.' },
    { type: 'likert4', name: 'ai_a4', text: '생성형 AI 사용은 저작권 문제를 초래한다.' },
    { type: 'likert4', name: 'ai_a5', text: '생성형 AI는 너무 많은 전력을 소비한다.' },
    { type: 'likert4', name: 'ai_a6', text: '생성형 AI는 21세기의 가장 중요한 발명 중 하나이다.' },
    { type: 'likert4', name: 'ai_a7', text: '생성형 AI는 기반이 되는 텍스트 자료에 대해 투명하지 않다.' },
    { type: 'likert4', name: 'ai_a8', text: '생성형 AI는 잘못된 정보의 확산에 기여한다.' },
  ]

  const LIKERT4_LABELS = ['전혀 그렇지 않다', '그렇지 않다', '그렇다', '매우 그렇다']

  // ── 공통: 문항 목록을 카드에 순차 주입하는 헬퍼 ──────────────
  function _buildSurveyPage(items, cardId, errId, nextRowId, btnId, sectionText, onComplete) {
    const card = $(cardId), nextRow = $(nextRowId)
    card.innerHTML = ''; nextRow.style.display = 'none'
    if (!psData._ai_survey) psData._ai_survey = {}
    const answers = psData._ai_survey
    let shown = 0
    const heading = document.createElement('p'); heading.className = 'ai-survey-section'; heading.textContent = sectionText; card.appendChild(heading)
    function revealNext() {
      if (shown >= items.length) return
      const item = items[shown++]
      const wrap = document.createElement('div'); wrap.className = 'ai-survey-item'; wrap.id = 'ai-item-' + item.name
      const labels = item.type === 'yn' ? ['맞다','틀리다'] : LIKERT4_LABELS
      wrap.innerHTML = `<p class="ai-survey-q">${escape(item.text)}</p><div class="${item.type === 'yn' ? 'ai-choice-yn' : 'ai-choice-likert4'}">${labels.map((label,i) => {
        const value = item.type === 'yn' ? label : String(i+1)
        return `<label class="ai-radio-label"><input type="radio" name="${item.name}" value="${value}" ${answers[item.name] === value ? 'checked' : ''}/><span>${label}</span></label>`
      }).join('')}</div>`
      card.appendChild(wrap)
      wrap.querySelectorAll('input').forEach(r => r.addEventListener('change', () => {
        answers[item.name] = r.value; persist()
        if (items.slice(0,shown).every(q=>answers[q.name]) && shown < items.length) revealNext()
        nextRow.style.display = items.every(q=>answers[q.name]) ? '' : 'none'
      }))
      if (answers[item.name] && shown < items.length) revealNext()
      nextRow.style.display = items.every(q=>answers[q.name]) ? '' : 'none'
    }
    revealNext()
    const btn = $(btnId), nb = btn.cloneNode(true); btn.replaceWith(nb)
    nb.onclick = () => {
      if (items.some(q=>!answers[q.name])) { _showErr(errId,'모든 문항에 응답해 주세요.'); return }
      onComplete(Object.fromEntries(items.map(q=>[q.name,answers[q.name]])))
    }
  }

  // ── 섹션A 페이지 (맞다/틀리다) ───────────────────────────────
  function showAiSurvey() {
    showStep('step-ai-survey')
    _buildSurveyPage(
      AI_SURVEY_ITEMS_A,
      'ai-survey-card', 'ai-survey-err', 'ai-survey-next-row', 'btn-ai-survey-next',
      '다음 문항들은 생성형 AI에 관한 내용입니다. 각 문장이 맞다고 생각하면 "맞다", 틀리다고 생각하면 "틀리다"를 선택해 주십시오.',
      (answersA) => {
        if (!psData._ai_survey) psData._ai_survey = {}
        Object.assign(psData._ai_survey, answersA)
        showAiSurveyB()
      }
    )
  }

  // ── 섹션B 페이지 (동의 정도) ──────────────────────────────────
  function showAiSurveyB() {
    showStep('step-ai-survey-b')
    _buildSurveyPage(
      AI_SURVEY_ITEMS_B,
      'ai-survey-b-card', 'ai-survey-b-err', 'ai-survey-b-next-row', 'btn-ai-survey-b-next',
      '다음 문항들은 생성형 AI에 대한 귀하의 생각을 묻는 문항입니다. 각 문장에 대해 동의 정도를 선택해 주십시오.',
      (answersB) => {
        if (!psData._ai_survey) psData._ai_survey = {}
        Object.assign(psData._ai_survey, answersB)
        showPS3()
      }
    )
  }

  // 13-3: Q6 인구통계 + 최종 제출
  function showPS3() {
    showStep('step-ps-3')
    const btn = document.getElementById('btn-ps3-submit')
    if (btn) {
      const nb = btn.cloneNode(true)
      btn.parentNode.replaceChild(nb, btn)
      // once 없이 등록 — handlePS3Submit 내부에서 유효성 통과 후 직접 제거
      nb.addEventListener('click', () => handlePS3Submit(nb))
    }
  }

  async function handlePS3Submit(btn) {
    const age = $('q6-age').value.trim(), gender = document.querySelector('input[name="q6_gender"]:checked')?.value, major = $('q6-major').value.trim()
    if (!age || !Number.isInteger(Number(age)) || Number(age)<0 || Number(age)>120) { _showErr('ps3-err','만 나이를 0~120 사이의 정수로 입력해 주세요.'); return }
    if (!gender) { _showErr('ps3-err','성별을 선택해 주세요.'); return }
    if (!major) { _showErr('ps3-err','전공을 입력해 주세요.'); return }
    Object.assign(psData, {q6_age:age, q6_gender:gender, q6_major:major}); persist(); btn.disabled = true
    leavePage()
    const aiKnowledge = Object.fromEntries(AI_SURVEY_ITEMS_A.map(q => [q.name, psData._ai_survey?.[q.name] === q.correct]))
    const responses = {
      _version:config.version, _group:state.group, ...psData,
      _skipped_pages:state.skips || [], _stimuli_pending:config.stimuliPending, _learning_presentations:state.learning,
      _initial_exam_answers:state.initialExam, _initial_exam_score:score(state.initialExam),
      _jol:{after_learning:state.jol.learning, initial_exam_prediction:state.jol.initialExamPrediction, ai_exam_prediction:state.jol.aiPrediction, after_ai_task:{jol1:state.jol.jol1, jol2:state.jol.jol2}},
      jol1:state.jol.jol1, jol2:state.jol.jol2,
      _task_answers:state.task, _math:state.math ? {answers:state.math.answers, score:state.math.score, duration_ms:state.math.duration_ms, skipped:state.math.skipped} : null,
      _exam_answers:state.finalExam,
      _scoring:{initial_exam_score:score(state.initialExam), exam_score:score(state.finalExam), ai_k_correct:aiKnowledge, ai_k_score:{correct:Object.values(aiKnowledge).filter(Boolean).length,total:6},
        task:state.task.map(t=>({trial_id:t.trial_id,skipped:!!t.skipped,changed:t.skipped ? null : t.initial!==t.final,final_correct:t.skipped ? null : t.final===t.correctCategory,final_eq_ai:t.skipped || t.aiCategory == null ? null : t.final===t.aiCategory}))},
      _page_durations:state.pages, _task_phase_durations:state.task.map(t=>t.phase_durations_ms)
    }
    state.lastResponses = responses; persist()
    try { await fetch('/api/backup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({participant_id:state.participantId,session_raw:{state}})}) } catch (_) { /* Main submission remains retryable. */ }
    try {
      const res = await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({participant_id:state.participantId,responses})})
      const data = await res.json(); if (!res.ok || data.error) throw new Error('응답 저장에 실패했습니다.')
      state.submissionSaved = data.saved !== false; go('step-done')
    } catch (err) { btn.disabled = false; _showErr('ps3-err','제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.') }
  }
  function showError(message) {
    clearTimers(); $('experiment-root').hidden = true
    attachSkipControl()
    document.querySelectorAll('.step').forEach(el=>el.classList.toggle('active',el.id==='step-error'))
    $('error-msg').textContent = message; bind('btn-retry',()=>location.reload())
  }
  function saveSurveyDraft(event) {
    const input = event.target
    if (!input.matches('.step input') || !input.closest('.step.active')) return
    state.surveyDraft ||= {}
    state.surveyDraft[input.type === 'radio' ? input.name : input.id] = input.value
    persist()
  }
  async function init() {
    if (initStarted) return; initStarted = true
    try {
      const get = async path => { const r = await fetch(path); if (!r.ok) throw new Error('실험 설정을 불러올 수 없습니다.'); return r.json() }
      const data = await Promise.all(['/api/experiment-config','/api/images','/api/initial-exam-images','/api/task-images','/api/exam-images'].map(get))
      ;[config, {slides}, {exams:initialExams}, {tasks}, {exams:finalExams}] = data
      try { state = JSON.parse(sessionStorage.getItem(STATE_KEY)) } catch (_) {}
      if (!state || state.version !== config.version) state = freshState()
      if (state.group && !config.groups.some(g=>g.id===state.group)) state = freshState()
      psData = state.survey
      const drafts = state.surveyDraft || {}
      document.querySelectorAll('.step input').forEach(input => {
        const key = input.type === 'radio' ? input.name : input.id
        if (drafts[key] !== undefined) {
          if (input.type === 'radio') input.checked = input.value === drafts[key]
          else input.value = drafts[key]
        }
      })
      document.addEventListener('change', saveSurveyDraft)
      document.addEventListener('input', saveSurveyDraft)
      state.pageEntered = Date.now(); persist(); render()
    } catch (err) { showError(err.message) }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true})
  else init()
})()
