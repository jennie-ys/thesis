# Thesis 실험 웹페이지

흰 배경, 검정·회색 구성 요소, 검정·빨강 글씨를 사용하는 피부 병변 학습 실험입니다. 현재 버전은 **intervention / no-intervention** 두 그룹입니다. AI 협업 과제 직전의 그룹별 지시문 및 intervention 이해 확인 이외에는 화면, 자극, 시행 수, 타이밍, 설문 및 응답 형식이 동일합니다.

## 절차

| 순서 | 단계 | 구성 |
| --- | --- | --- |
| 0 | 그룹 선택 및 초기 안내 | intervention / no-intervention 공통 안내입니다. |
| 1 | 학습 | 5범주 × 6사례 = 30시행을 2회 반복합니다. 장당 5초, 사이 공백 0.1초와 두 번째 학습 안내를 유지합니다. |
| 2 | JOL 1문항 | 다음 시험의 예상 정답률만 묻습니다. 학습 정도를 묻는 문항은 제거했습니다. |
| 3 | 첫 시험 | 15시행(범주당 3개). 5개 범주명을 참고 목록으로 보여주고 범주명을 직접 입력합니다. |
| 4 | 총점 피드백 | 첫 시험의 정답 수 / 실제 문항 수와 정답률을 제시합니다. |
| 5 | JOL 1문항 | AI 분석 결과를 참고할 다음 시험의 예상 정답률을 묻습니다. |
| 6a | 그룹별 AI 안내 | 공통 과제 안내 다음, 첫 문항 전에 제시합니다. intervention에는 Cirkel 등(2026)의 진단 정확도 67.8%와 오답 가능성을 안내하고, no-intervention에는 범주 확인만 안내합니다. |
| 6b | AI 협업 과제 | 30시행. 기존 T조건과 동일한 초기 진단 → AI 분석 확인 → 최종 진단 형식입니다. 시행별 확신도 입력은 없습니다. |
| 7 | 기존 JOL 2문항 | AI 협업 과제 정답률 추정, 이후 AI 없이 수행할 때의 예상 정답률을 기존 문구로 묻습니다. |
| 8 | 수학 방해과제 | 3분. 두 자리 정수의 덧셈·뺄셈을 제시합니다. 최대 100문제입니다. |
| 9 | NO-AI 최종시험 | 30시행. 5지선다형이며 AI 정보는 제시하지 않습니다. |
| 10 | 기존 사후설문 | 사전지식, 학습 전 정확도 예측, AI 지식 6문항, AI 태도 8문항, 인구통계 문구·선택지를 유지합니다. AI 태도 문항 다음에는 AI 오답 가능성 및 조건부 예상 정답률 질문을 제시합니다. |

JOL(Judgment of Learning)은 학습 수준 또는 이후 수행에 대한 자기 판단입니다. 모든 JOL 응답은 0~100 정수입니다. 새 JOL 2문항은 요청 내용에 맞춘 초안이며, AI 협업 후 기존 JOL 2문항은 그대로 유지합니다.

## 범주와 자극

흑색종을 제외한 **광선각화증 / 기저세포암 / 멜라닌세포성 모반 / 피부섬유종 / 혈관 병변** 5범주입니다.

`public/static/stimuli/{learning,initial-exam,ai-task,final-exam}/{범주코드}/{old,new,cases}/`에 첨부 JPEG 원본을 저장합니다. `data/stimulus-order.json`은 모든 참가자와 두 조건이 공유하는 고정 순서입니다. `data/stimulus-order.csv`는 검토용 순서표입니다. 참가자 브라우저에서는 순서를 생성하거나 섞지 않습니다.

학습과 AI 과제는 5개 범주가 각각 한 번 등장하는 5시행 블록을 6회 제시합니다. 범주 내 이미지와 블록 내 범주 순서는 고정 난수로 섞었습니다. 첫 시험과 최종시험은 블록 제한 없이 전체 이미지를 섞되, 동일 범주가 연속되는 순서는 제외했습니다. 학습 2회차는 같은 고정 순서를 반복하며 회차 경계에서도 동일 범주가 이어지지 않습니다.

첫 시험은 사용자가 확정한 15문항(범주당 3개)입니다. 최종시험은 old 15장, new 15장입니다. 최종시험 old는 모든 범주에서 학습 6장 중 baseline에 사용하지 않은 정확히 나머지 3장입니다. `data/final-old-images.csv`에 최종 목록과 학습·최종시험 제시 위치를 저장합니다. 기존 범주·old/new 순서와 유효한 이미지 위치는 유지하고 잘못 연결된 AK 2장, BCC 1장, DF 2장만 교체했습니다. 첫 시험은 모두 old이고 AI 과제 이미지는 모두 학습에 등장하지 않은 new입니다. 학습 단계의 old/new는 해당 없음(null)입니다. 참가자 화면에는 범주코드·파일명·old/new를 노출하지 않고 응답 메타데이터에 저장합니다.

수정 제출용 `data/ai-mapping-review.csv`에는 원본 매핑을 채워 두었습니다. aiCategory와 aiReason을 수정하여 전달할 수 있습니다. 원본 AI 답변 30개는 `data/original-ai-mapping.audit.json`에 대조용으로 복원했습니다. 원본은 15/30 정답이며 3개 답변이 흑색종이어서 현재 과제에 자동 적용하지 않습니다. 사용자가 수정 매핑을 제공하기로 선택했으므로 AI 답변·설명은 대기 상태(`aiMappingPending: true`)입니다.

실험 초기화 시 이미지 전체를 미리 로드하고 디코딩한 뒤 절차를 시작합니다. 실패하면 오류를 표시하며 시간 제한이 있는 학습을 시작하지 않습니다. GitHub Pages용 `docs/`에는 동일 이미지 파일을 포함하고, 첨부용 `index.html`에는 이미지 원본 바이트를 내장하여 외부 이미지 요청 없이 열립니다.


`GROUPS[].taskInstruction`에 사용자 지정 그룹별 지시문을 저장하고 `boldPhrases`로 지정된 부분만 굵게 표시합니다. 그룹별 차이는 AI 협업 과제의 첫 문항 직전에만 제시됩니다. AI 내용이 비어 있는 현재 버전에서는 지시문의 선행연구 정확도에 맞춘 실제 AI 응답을 생성하지 않습니다.

## 실행

```bash
npm ci
npm run dev
npm run build
npm run build:preview
npm test
```

- `src/index.tsx`: 서버 API, 응답 저장, 기존 사후설문 화면입니다.
- `src/image-manifest.ts`: 그룹, AI 과제 직전 지시문, 범주, 시행, 이미지·AI 내용, 시간 설정입니다.
- `public/static/experiment.js`: 공통 절차, JOL, 채점, 세션 복원, 타이밍 기록입니다.
- `public/static/style.css`: 공통 디자인입니다.
- `docs/index.html`: 서버 없이 열 수 있는 확인용 단일 HTML입니다.

미리보기의 하단 버튼으로 처음부터 다시 볼 수 있습니다. 모든 화면의 임시 skip 버튼은 `previewControls`로 관리합니다. 스킵한 화면과 미응답 시행은 별도로 기록하며 실제 응답 값을 만들지 않습니다. 실제 연구 전에는 `false`로 변경하세요. 새 자극을 넣은 뒤 `npm run build:preview`로 확인용 파일을 다시 생성합니다.

## 응답 데이터

두 그룹의 데이터 구조는 동일합니다. 그룹명, 60개 학습 제시 기록, 첫 시험 15개 응답과 총점, 단계별 JOL 4개, AI 협업 30개 초기·최종 진단, 단계별 반응 시간, 수학 과제, NO-AI 최종시험 30개 응답, 사후설문을 기록합니다. 브라우저 새로고침 시 현재 단계와 완료한 응답을 복원합니다. 이전 3그룹 버전과 세션 키를 분리했습니다.

Cloudflare에서 실제 수집을 하려면 별도의 **비공개 응답 저장소**를 준비하고 환경 변수 `GITHUB_OWNER`, `GITHUB_REPO`와 secret `GITHUB_TOKEN`을 설정합니다. 공개 코드 저장소 `thesis`에는 참가자 응답을 저장하지 마세요. 저장소 미설정 시 완료 화면에 미제출 상태를 표시하며, 저장 실패 시 재시도할 수 있습니다.

정적 미리보기는 모든 API를 문서 내부에서 처리하므로 응답·백업을 외부로 전송하지 않습니다. 미리보기 세션도 실제 앱과 별도로 저장합니다.

## 배포

### GitHub Pages 확인용

저장소 **Settings → Pages → Deploy from a branch → main → /docs → Save**로 설정합니다. `docs/index.html`은 내려받아 브라우저에서 직접 열 수도 있습니다.

### Cloudflare Pages

| 항목 | 값 |
| --- | --- |
| Repository | `jennie-ys/thesis` |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 저장소 루트 |

`wrangler.jsonc`에 Pages 출력 경로와 `nodejs_compat` 설정이 포함되어 있습니다. Cloudflare 인증 후 `npm run deploy -- --project-name thesis`로 배포할 수 있습니다. `gas/experiment_receiver.gs`는 연결되지 않은 원본 참고 파일입니다.

## 화면 및 지시문

페이지 상단 제목·진행 막대·시행 번호는 표시하지 않습니다. 객관식 보기는 A–E 표기 없이 범주명만 표시합니다. 총점 피드백의 점수와 수학 과제의 3분 제한은 유지하지만 화면에 타이머를 표시하지 않습니다. 기존 안내 문구는 원본을 사용하고, 학습 범주 수만 5종으로 맞췄습니다. 새 주관식 시험 안내는 원본 문체를 따라 작성했습니다. 첫 시험 예측 JOL에는 AI를 언급하지 않습니다. AI 협업의 문제 문구는 원본의 질문 형식으로 표시합니다. 입력란 placeholder는 회색이고 참가자가 입력한 값은 검정입니다.

### 사후설문 페이지 및 저장 구조

진행 순서는 **pk1 → pk2 → AI 지식 → AI 태도 → AI 신뢰 → 인구통계**입니다. AI 지식, AI 태도, AI 신뢰는 각각 별도의 페이지와 별도의 척도입니다. AI 신뢰는 AI 태도 문항에 포함되거나 4점 척도로 응답하지 않습니다.

| 저장 순서 | JSON 키 | 문항 및 응답 |
| --- | --- | --- |
| 1 | `pk1` | 사전지식1, 1~7 정수 |
| 2 | `pk2` | 사전지식2, 0~100 정수 |
| 3 | `ai_k` | `ai_k1`~`ai_k6`, 맞다/틀리다 |
| 4 | `ai_a` | `ai_a1`~`ai_a8`, 1~4 정수 |
| 5 | `ai_t` | `ai_t1`: 예/아니오(yes/no), `ai_t2`: 예상 정답률 0~100 정수 |

AI 신뢰 페이지에서 “AI가 오답을 낼 수 있다고 생각하나요?”를 예/아니오로 묻습니다. 아니오를 선택하면 `ai_t1="no"`, `ai_t2=null`, `ai_t2_status="not_applicable"`로 저장하고 인구통계 페이지로 바로 이동합니다. 예를 선택하면 같은 페이지 아래에 예상 정답률 입력란을 표시합니다. 0~100 정수를 입력하면 `ai_t1="yes"`, `ai_t2=응답값`, `ai_t2_status="answered"`로 저장합니다. 실제 0% 응답은 숫자 0으로 유지하며 비해당이나 결측으로 바꾸지 않습니다.

임시 스킵은 `ai_t1=null`, `ai_t2=null`, `ai_t2_status="skipped"`로 구별합니다. 아직 응답하지 않은 상태는 `"unanswered"`입니다. 상태값은 문항이 아닌 결측 구분 메타데이터입니다. AI 신뢰 2문항을 AI 태도 점수에 합치거나 두 문항을 임의로 합산하지 않습니다.

제출 데이터에 `_survey_schema_version=3`를 기록합니다. 세 척도를 합쳤던 `_ai_survey`와 AI 신뢰의 과거 최상위 필드는 새 제출 데이터에 포함하지 않습니다. 이전 버전의 진행 중 세션을 불러오면 AI 지식·태도를 분리하고 AI 신뢰를 새 구조로 변환합니다.

AI 지식·태도 문항의 기존 이름 `ai_k1`~`ai_k6`, `ai_a1`~`ai_a8`은 유지하며, 신뢰는 `ai_t1`·`ai_t2`를 사용합니다. 저장 묶음 역시 `pk1 → pk2 → ai_k → ai_a → ai_t` 순서입니다. 이전 버전의 긴 묶음 이름을 가진 진행 중 세션도 짧은 이름으로 변환합니다.

intervention 지시문은 사용자 지정 문구를 사용하며, 지정한 5개 구절만 굵게 표시합니다. 이 페이지의 안내문 글자 크기만 기존 .96rem에서 1.1rem으로 키웠습니다. no-intervention 안내는 유지합니다.

intervention 문구의 두 번째 문단은 쉼표 뒤에서 줄을 바꾸며, “예를 들어” 문단만 1.2rem(기본 19.2px)으로 표시합니다. 나머지 안내는 1.1rem(기본 17.6px)입니다. “따라서,”는 일반 글씨로 두고 이후 판단 지시문과 마지막 준비 안내를 각각 굵게 표시합니다.

### Intervention 지시문 이해 확인

intervention 안내의 “다음→” 버튼은 별도의 진단 정확도 확인 문항으로 이동합니다. 정답은 선행연구 수치인 67.8%입니다. 다른 수치로 답하면 지시문으로 돌아가고, 정답이면 같은 확인 페이지에 “과제 시작하기” 버튼이 표시됩니다. no-intervention에는 이 문항을 제시하지 않습니다.

확인 문항에서는 임시 skip도 지시문으로 돌아가도록 하여 정답 확인 없이 과제를 시작할 수 없게 했습니다. 새로고침 시 확인 상태와 시도 내역을 복원하며, 제출 데이터의 `_instruction_check`에 통과 여부와 각 시도의 응답·정오답·반응시간·제출시각을 저장합니다. no-intervention에서는 null입니다.


## Cloudflare 배포 및 응답 저장

기본 배포 대상은 기존 Worker `thesis`의 `https://thesis.jennie-283.workers.dev`입니다. Workers의 Build command는 `npm run build`, Deploy command는 `npx wrangler deploy`입니다. `wrangler.jsonc`에 Worker 진입점 `dist/_worker.js`, 정적 자산 `dist`, ASSETS 바인딩을 정의합니다. `.assetsignore`는 서버 번들과 Pages 전용 라우팅 파일을 정적 자산에서 제외합니다.

Pages는 `wrangler.pages.jsonc`로 별도 유지합니다. Pages에도 배포하려면 `wrangler pages deploy dist --config wrangler.pages.jsonc --project-name=thesis --branch=main`을 사용합니다. 기본 설정 파일과 Pages 설정 파일을 서로 덮어쓰지 않습니다.

실제 웹페이지가 실행되는 Worker의 Settings → Variables and Secrets에 `GITHUB_TOKEN` Secret을 설정합니다. 대상 저장소 Contents 읽기·쓰기 권한이 필요하며 Cloudflare 배포 토큰과 다른 값입니다. GITHUB_OWNER=jennie-ys, GITHUB_REPO=thesis는 기본 설정에 포함되어 있습니다. Pages에만 저장한 Secret은 Worker로 자동 복사되지 않습니다. 저장이 미설정이면 서버는 503을 반환하고 완료로 처리하지 않습니다.

완료 응답은 `response/{participant_id}.json`에 저장하고 재시도는 같은 파일을 갱신합니다. 원시 백업은 `response/backups/`입니다. 빌드 제외 경로에 `response/**`를 설정합니다.

RT는 밀리초 단위입니다. 시행별 duration_ms, AI 과제 단계별 RT, `_jol_rt_ms`, 수학 각 문항 RT를 기록합니다. `_input_events`에는 모든 입력·선택 값과 화면·문항·단계·필드명 및 performance.now 기반 RT를 보관합니다. 순차 공개 설문은 각 문항 공개 시점부터 측정합니다. 새로고침은 새 제시 구간이며 이전 이벤트는 보존합니다. 스킵은 별도 기록합니다.
