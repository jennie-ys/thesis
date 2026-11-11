# Thesis 실험 웹페이지

흰 배경, 검정·회색 구성 요소, 검정·빨강 글씨를 사용하는 피부 병변 학습 실험입니다. 현재 버전은 **intervention / no-intervention** 두 그룹입니다. 그룹별 초기 지시문 이외에는 화면, 자극, 시행 수, 타이밍, 설문 및 응답 형식이 동일합니다.

## 절차

| 순서 | 단계 | 구성 |
| --- | --- | --- |
| 0 | 그룹 선택 및 초기 안내 | intervention / no-intervention. 개입 지시문은 추후 입력합니다. |
| 1 | 학습 | 5범주 × 6사례 = 30시행을 2회 반복합니다. 장당 5초, 사이 공백 0.1초와 두 번째 학습 안내를 유지합니다. |
| 2 | JOL 2문항 | 앞선 학습에 대한 판단, AI 없는 다음 시험의 예상 정답률을 묻습니다. |
| 3 | 첫 시험 | 30시행. 5개 범주명을 참고 목록으로 보여주고 범주명을 직접 입력합니다. |
| 4 | 총점 피드백 | 첫 시험의 정답 수 / 30점과 정답률을 제시합니다. |
| 5 | JOL 1문항 | AI 분석 결과를 참고할 다음 시험의 예상 정답률을 묻습니다. |
| 6 | AI 협업 과제 | 30시행. 기존 T조건과 동일한 초기 진단 → AI 분석 확인 → 최종 진단 형식입니다. 시행별 확신도 입력은 없습니다. |
| 7 | 기존 JOL 2문항 | AI 협업 과제 정답률 추정, 이후 AI 없이 수행할 때의 예상 정답률을 기존 문구로 묻습니다. |
| 8 | 수학 방해과제 | 3분. 두 자리 정수의 덧셈·뺄셈을 제시합니다. 최대 100문제입니다. |
| 9 | NO-AI 최종시험 | 30시행. 5지선다형이며 AI 정보는 제시하지 않습니다. |
| 10 | 기존 사후설문 | 사전지식, 학습 전 정확도 예측, AI 지식 6문항, AI 태도 8문항, 인구통계 문구·선택지를 유지합니다. |

JOL(Judgment of Learning)은 학습 수준 또는 이후 수행에 대한 자기 판단입니다. 모든 JOL 응답은 0~100 정수입니다. 새 JOL 3문항은 요청 내용에 맞춘 초안이며, AI 협업 후 기존 JOL 2문항은 그대로 유지합니다.

## 범주와 자극

흑색종을 제외한 **광선각화증 / 기저세포암 / 멜라닌세포성 모반 / 피부섬유종 / 혈관 병변** 5범주입니다.

`src/image-manifest.ts`에 학습, 첫 시험, AI 과제, 최종시험의 30개 슬롯이 각각 정의되어 있습니다. 각 범주는 단계당 6회 제시되며 그룹과 관계없이 동일한 순서입니다. 모든 이미지 URL과 AI 범주·설명은 `null`로 비워뒀습니다. 시험·과제 화면의 빈 이미지 영역에는 정답 범주나 정답을 유추할 수 있는 자극 ID를 표시하지 않습니다.

이미지가 없는 현재 총점 피드백은 절차 검토용입니다. AI 결과와 설명도 채우지 않았으므로 AI 협업의 효과를 측정하는 실제 연구 자료로 사용하지 않습니다. 실제 자극을 입력한 후 `stimuliPending`과 검토용 안내를 갱신하세요.

`GROUPS[].initialInstruction`에 두 그룹의 초기 지시문을 입력할 수 있습니다. 현재 모두 `null`이며 임의의 개입 내용을 만들지 않았습니다. 그 외 그룹에 따른 절차 분기는 없습니다.

## 실행

```bash
npm ci
npm run dev
npm run build
npm run build:preview
npm test
```

- `src/index.tsx`: 서버 API, 응답 저장, 기존 사후설문 화면입니다.
- `src/image-manifest.ts`: 그룹, 초기 지시문, 범주, 시행, 이미지·AI 내용, 시간 설정입니다.
- `public/static/experiment.js`: 공통 절차, JOL, 채점, 세션 복원, 타이밍 기록입니다.
- `public/static/style.css`: 공통 디자인입니다.
- `docs/index.html`: 서버 없이 열 수 있는 확인용 단일 HTML입니다.

미리보기의 상단 버튼으로 처음부터 다시 볼 수 있습니다. 학습·수학 단계의 검토용 skip 버튼은 `previewControls`로 관리합니다. 실제 연구 전에는 `false`로 변경하세요. 새 자극을 넣은 뒤 `npm run build:preview`로 확인용 파일을 다시 생성합니다.

## 응답 데이터

두 그룹의 데이터 구조는 동일합니다. 그룹명, 60개 학습 제시 기록, 첫 시험 30개 응답과 총점, 단계별 JOL 5개, AI 협업 30개 초기·최종 진단, 단계별 반응 시간, 수학 과제, NO-AI 최종시험 30개 응답, 사후설문을 기록합니다. 브라우저 새로고침 시 현재 단계와 완료한 응답을 복원합니다. 이전 3그룹 버전과 세션 키를 분리했습니다.

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
