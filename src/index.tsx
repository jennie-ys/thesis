import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getExperimentConfig, getLearningImages, getInitialExamImages, getTaskImages, getExamImages } from './image-manifest'

type Bindings = { GITHUB_TOKEN: string; GITHUB_OWNER: string; GITHUB_REPO: string }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/api/*', cors())
app.get('/api/experiment-config', c => c.json(getExperimentConfig()))
app.get('/api/images', c => c.json(getLearningImages()))
app.get('/api/initial-exam-images', c => c.json(getInitialExamImages()))
app.get('/api/task-images', c => c.json(getTaskImages()))
app.get('/api/exam-images', c => c.json(getExamImages()))

app.post('/api/submit', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'bad_request' }, 400)

  const { participant_id, responses } = body
  if (!participant_id || !responses) return c.json({ error: 'missing_fields' }, 400)

  const submittedAt = new Date().toISOString()
  const dateStr     = submittedAt.slice(0, 10)          // "YYYY-MM-DD"
  const group       = responses._group ?? 'unknown'

  // IP 해시 (익명화)
  const rawIp  = c.req.header('CF-Connecting-IP')
              ?? c.req.header('X-Forwarded-For')
              ?? 'unknown'
  const ipHash = await hashIp(rawIp)

  // 저장할 전체 페이로드
  const payload = {
    participant_id,
    group,
    ip_hash:      ipHash,
    submitted_at: submittedAt,
    responses
  }

  const token = c.env?.GITHUB_TOKEN
  const owner = c.env?.GITHUB_OWNER
  const repo  = c.env?.GITHUB_REPO

  const isConfigured = !!(
    token && owner && repo
    && !token.includes('여기에')
    && !owner.includes('your-')
  )

  if (isConfigured) {
    // ── GitHub Contents API: responses/{날짜}/{pid_8자리}_{timestamp}.json ──
    const safeId   = participant_id.slice(0, 8).replace(/[^a-z0-9]/gi, '_')
    const tsMs     = Date.now()
    const filePath = `responses/${dateStr}/${safeId}_${tsMs}.json`
    // Cloudflare Workers 런타임: unescape()가 없으므로 TextEncoder 방식으로 base64 인코딩
    // 청크 처리로 스택 오버플로우 방지 (대용량 JSON 안전)
    const jsonStr  = JSON.stringify(payload, null, 2)
    const encoded  = new TextEncoder().encode(jsonStr)
    let binary = ''
    for (let i = 0; i < encoded.length; i++) binary += String.fromCharCode(encoded[i])
    const content  = btoa(binary)

    try {
      const ghRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization':        `Bearer ${token}`,
            'Content-Type':         'application/json',
            'Accept':               'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent':           'experiment-webapp'
          },
          body: JSON.stringify({
            message: `[응답] ${dateStr} | ${safeId} | group:${group}`,
            content
          })
        }
      )

      if (!ghRes.ok) {
        const detail = await ghRes.text()
        console.error('[SUBMIT] GitHub API error:', detail)
        // 저장 실패를 클라이언트에 전달하여 재시도할 수 있도록 합니다.
        return c.json({ error: 'response_storage_failed' }, 502)
      }

      const result = await ghRes.json() as { content: { path: string } }
      return c.json({ status: 'ok', saved: 'github', path: result.content?.path ?? filePath })

    } catch (err) {
      console.error('[SUBMIT] upstream error:', err)
      // 네트워크 오류 시 성공으로 처리하지 않습니다.
      return c.json({ error: 'response_storage_failed' }, 502)
    }
  }

  // 저장소 미설정 시에는 절차 미리보기로만 완료합니다.
  return c.json({ status: 'preview', saved: false })
})

// ─────────────────────────────────────────────────────────────
// POST /api/backup  — 제출 직전 sessionStorage raw 데이터를 GitHub에 백업
//   • 성공/실패 모두 200 반환 (제출 흐름을 절대 막지 않음)
//   • 저장 경로: responses/{날짜}/{pid}_backup_{timestamp}.json
//   • 정식 응답 파일과 구분: 파일명에 _backup_ 포함
// ─────────────────────────────────────────────────────────────
app.post('/api/backup', async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    if (!body?.participant_id || !body?.session_raw) {
      return c.json({ status: 'skip', reason: 'missing_fields' })
    }

    const { participant_id, session_raw } = body
    const token = c.env?.GITHUB_TOKEN
    const owner = c.env?.GITHUB_OWNER
    const repo  = c.env?.GITHUB_REPO

    const isConfigured = !!(
      token && owner && repo
      && !token.includes('여기에')
      && !owner.includes('your-')
    )
    if (!isConfigured) return c.json({ status: 'skip', reason: 'not_configured' })

    const now      = new Date().toISOString()
    const dateStr  = now.slice(0, 10)
    const safeId   = participant_id.slice(0, 8).replace(/[^a-z0-9]/gi, '_')
    const tsMs     = Date.now()
    const filePath = `responses/${dateStr}/${safeId}_backup_${tsMs}.json`

    const payload  = { participant_id, backed_up_at: now, session_raw }
    const jsonStr  = JSON.stringify(payload, null, 2)
    const encoded  = new TextEncoder().encode(jsonStr)
    let binary = ''
    for (let i = 0; i < encoded.length; i++) binary += String.fromCharCode(encoded[i])
    const content = btoa(binary)

    const ghRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization':        `Bearer ${token}`,
          'Content-Type':         'application/json',
          'Accept':               'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent':           'experiment-webapp'
        },
        body: JSON.stringify({
          message: `[백업] ${dateStr} | ${safeId}`,
          content
        })
      }
    )

    if (!ghRes.ok) {
      const detail = await ghRes.text()
      console.error('[BACKUP] GitHub API error:', detail)
      return c.json({ status: 'error', reason: 'github_api_error' })
    }

    return c.json({ status: 'ok', path: filePath })

  } catch (err) {
    // 백업 실패는 조용히 처리 — 제출 흐름에 영향 없음
    console.error('[BACKUP] error:', err)
    return c.json({ status: 'error', reason: String(err) })
  }
})

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + 'exp_salt_2025')
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

app.get('/', c => c.html(/* html */`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>온라인 실험 참가</title>
  <link rel="stylesheet" href="/static/style.css" />
</head>
<body>
<div id="experiment-root" class="page-wrap"><p role="status">실험을 준비하고 있습니다.</p></div>
<div id="step-ps-0" class="step">
  <div class="page-wrap">
    <div class="card instruct-card">
      <div class="instruct-body">
        <p class="instruct-lead">모든 시험이 끝났습니다.</p>
        <p>지금부터는 다음 질문을 읽고, 해당하는 정도에 체크해주세요.</p>
        <p style="margin-top:.8rem;font-size:.9rem"><strong style="color:#e53e3e">(답변에 관계없이 실험이 완료되면 보상이 지급되니, 솔직하게 응답해주세요.)</strong></p>
        <p class="instruct-ready">준비되었으면 아래 버튼을 눌러주세요.</p>
      </div>
      <div class="btn-row">
        <button id="btn-ps0-next" class="btn-primary">다음 →</button>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════
     STEP 13-1 : Q4 사전지식
══════════════════════════════════════════════════════════ -->
<div id="step-ps-1" class="step">
  <div class="page-wrap">
    <div class="card">
      <fieldset>
        <legend style="font-size:1.05rem;font-weight:600;line-height:1.6"><strong style="color:#e53e3e">본 실험에 참가하기 전</strong>, 피부 병변에 대해 얼마나 알고 있었나요?<br>
          <span style="font-size:.93rem;font-weight:400;color:var(--muted)">피부 병변에 대한 사전지식이 얼마나 있었는지 7점 척도로 응답해주세요.</span>
        </legend>
        <div class="scale-row" style="margin-top:1.4rem">
          <span class="scale-label-end" style="font-size:.75rem">피부 병변에 대한<br>사전지식이<br>전혀 없었음</span>
          <label class="scale-item"><input type="radio" name="q4" value="1" /><span>1</span></label>
          <label class="scale-item"><input type="radio" name="q4" value="2" /><span>2</span></label>
          <label class="scale-item"><input type="radio" name="q4" value="3" /><span>3</span></label>
          <label class="scale-item"><input type="radio" name="q4" value="4" /><span>4</span></label>
          <label class="scale-item"><input type="radio" name="q4" value="5" /><span>5</span></label>
          <label class="scale-item"><input type="radio" name="q4" value="6" /><span>6</span></label>
          <label class="scale-item"><input type="radio" name="q4" value="7" /><span>7</span></label>
          <span class="scale-label-end" style="font-size:.75rem">피부 병변에 대해<br>많이 알고<br>있었음</span>
        </div>
      </fieldset>
      <p id="ps1-err" class="inline-err" style="display:none"></p>
      <div class="btn-row" style="margin-top:1.4rem">
        <button id="btn-ps1-next" class="btn-primary" disabled>다음 →</button>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════
     STEP 13-2 : Q5 초기 정확도 예측
══════════════════════════════════════════════════════════ -->
<div id="step-ps-2" class="step">
  <div class="page-wrap">
    <div class="card">
      <fieldset>
        <legend style="font-size:1.05rem;font-weight:600;line-height:1.7">만약 <strong style="color:#e53e3e">학습단계 없이</strong> 실험을 시작하자마자 바로 사진을 보고<br>피부 병변의 종류를 맞히는 시험을 봤다면, 몇 %의 문제를 맞혔을 거라고 생각하나요?<br>
          <span style="font-size:.93rem;font-weight:400;color:var(--muted)">0~100 사이의 숫자를 입력해주세요.</span>
        </legend>
        <div class="math-input-row" style="max-width:300px;margin-top:1.4rem">
          <input type="number" id="q5-input" name="q5" min="0" max="100" class="math-input" placeholder="0 – 100" />
          <span style="font-size:1.1rem;font-weight:600;color:var(--muted)">%</span>
        </div>
      </fieldset>
      <p id="ps2-err" class="inline-err" style="display:none"></p>
      <div class="btn-row" style="margin-top:1.4rem">
        <button id="btn-ps2-next" class="btn-primary">다음 →</button>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════
     STEP 13-2b : AI 지식 설문 (맞다/틀리다)
══════════════════════════════════════════════════════════ -->
<div id="step-ai-survey" class="step">
  <div class="page-wrap">
    <div class="card" id="ai-survey-card">
      <!-- JS가 문항을 순차적으로 주입 -->
    </div>
    <p id="ai-survey-err" class="inline-err" style="display:none"></p>
    <div class="btn-row" style="margin-top:1.2rem;display:none" id="ai-survey-next-row">
      <button id="btn-ai-survey-next" class="btn-primary">다음 →</button>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════
     STEP 13-2c : AI 태도 설문 (동의 정도)
══════════════════════════════════════════════════════════ -->
<div id="step-ai-survey-b" class="step">
  <div class="page-wrap">
    <div class="card" id="ai-survey-b-card">
      <!-- JS가 문항을 순차적으로 주입 -->
    </div>
    <p id="ai-survey-b-err" class="inline-err" style="display:none"></p>
    <div class="btn-row" style="margin-top:1.2rem;display:none" id="ai-survey-b-next-row">
      <button id="btn-ai-survey-b-next" class="btn-primary">다음 →</button>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════
     STEP 13-3 : Q6 인구통계
══════════════════════════════════════════════════════════ -->
<div id="step-ps-3" class="step">
  <div class="page-wrap">
    <div class="card">
      <fieldset>
        <legend style="font-size:1.05rem;font-weight:600;line-height:1.6">지금부터는 아래의 질문에 답해주세요.</legend>
        <div class="demog-wrap" style="margin-top:1.2rem">
          <div class="demog-row">
            <label class="demog-label" for="q6-age">만 나이</label>
            <input type="number" id="q6-age" name="q6_age" min="0" max="120" class="demog-input" placeholder="숫자 입력" />
          </div>
          <div class="demog-row">
            <label class="demog-label">성별</label>
            <div class="demog-radio-group">
              <label class="demog-radio"><input type="radio" name="q6_gender" value="male" /><span>남자</span></label>
              <label class="demog-radio"><input type="radio" name="q6_gender" value="female" /><span>여자</span></label>
              <label class="demog-radio"><input type="radio" name="q6_gender" value="no_answer" /><span>응답을 원치 않음</span></label>
            </div>
          </div>
          <div class="demog-row">
            <label class="demog-label" for="q6-major">전공</label>
            <input type="text" id="q6-major" name="q6_major" class="demog-input" placeholder="전공을 입력해주세요" />
          </div>
        </div>
      </fieldset>
      <div class="btn-row" style="margin-top:1.4rem">
        <button id="btn-ps3-submit" class="btn-primary btn-full">제출하기</button>
      </div>
      <p id="ps3-err" class="inline-err" style="display:none"></p>
    </div>
  </div>
</div>


<div id="step-done" class="step"><div class="page-wrap"><div class="card"><h1>실험에 참여해 주셔서 감사합니다.</h1><p id="submission-result"></p></div></div></div>
<div id="step-error" class="step"><div class="page-wrap"><div class="card"><h1>진행 오류</h1><p id="error-msg" class="inline-err"></p><button id="btn-retry" class="btn-secondary">다시 시도</button></div></div></div>
<script src="/static/experiment.js"></script>
</body></html>`))
export default app
