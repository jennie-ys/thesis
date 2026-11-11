# Thesis 실험 웹페이지

`jennie-ys/Ai-metacog`의 전체 실험 절차를 바탕으로 만든 기본 골조입니다. 흰 배경과 검정·회색 구성 요소, 검정·빨강 글씨를 사용합니다. 기존 참가자 응답과 원본 이미지 파일은 포함하지 않습니다.

## 실행과 빌드

```bash
npm ci
npm run dev
npm run build
```

## 실험 절차

| 순서 | 내용 |
| --- | --- |
| 1 | 조건 선택: T(내부 C), J(내부 E), A |
| 2 | 실험 시작 안내와 학습 안내 |
| 3 | 6범주 × 6장 학습: 장당 5초, 2회 반복, 중간 안내 포함 |
| 4 | AI 협업 과제 36문항 |
| 5 | 3분 수학 과제 |
| 6 | 과제 정답률 예측과 AI 없이 수행할 때의 자신감 평가 |
| 7 | AI 없이 병변 분류 시험 24문항 |
| 8 | 사전지식, 학습 전 정확도 예측, AI 지식 6문항, AI 태도 8문항, 인구통계 설문 |
| 9 | 응답 제출과 완료 |

- T: 초기 진단 → AI 피드백 → 최종 진단.
- J: 초기 진단 → 확신도 입력 → AI 피드백 → 최종 진단.
- A: AI 피드백 → 최종 진단.

원본과 동일하게 시작 동의 화면은 비활성 상태이며 조건 선택부터 시작합니다. 원본의 임시 skip 버튼도 유지했습니다. 실제 연구를 시작하기 전 단계 변경사항과 함께 검토하세요.

## 이미지 교체

`src/image-manifest.ts`에서 학습·과제·시험 이미지 목록, 정답, AI 피드백을 관리합니다. 현재 `USE_PLACEHOLDER_IMAGES = true`이므로 모든 이미지 영역에 업로드 대기 표시가 나옵니다. API의 `sourceUrl`에는 원래 파일 경로가 남아 있습니다.

1. 새 이미지를 `public/static/images/`, `public/static/task-images/`, `public/static/exam-images/`에 추가합니다.
2. 목록의 파일명·범주·정답·AI 피드백·제시 순서를 수정합니다.
3. `USE_PLACEHOLDER_IMAGES = false`로 변경합니다.

절차와 설문은 `public/static/experiment.js`, 화면 문구는 `src/index.tsx`, 디자인은 `public/static/style.css`에서 수정합니다.

## Cloudflare Pages 배포

GitHub의 `jennie-ys/thesis` 저장소를 Cloudflare Pages에 연결하고 다음 설정을 사용합니다.

| 항목 | 값 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 저장소 루트 |

`wrangler.jsonc`에 Pages 출력 경로와 `nodejs_compat` 설정이 포함되어 있습니다. CLI 배포는 Cloudflare 인증 후 `npm run deploy -- --project-name thesis`로 실행합니다.

## 응답 저장

기본 상태에서는 절차 미리보기만 가능하며 서버에 응답을 저장하지 않습니다. 완료 화면에도 미제출 상태를 표시합니다.

실제 수집 시에는 별도의 **비공개 응답 저장소**를 준비하고 Cloudflare 환경 변수 `GITHUB_OWNER`, `GITHUB_REPO`와 secret `GITHUB_TOKEN`을 설정합니다. 토큰은 해당 비공개 저장소의 Contents 쓰기 권한만 부여하고 소스 코드나 공개 저장소에 넣지 않습니다. 현재 공개 코드 저장소인 `thesis`를 응답 저장소로 설정하지 마세요.

저장소가 설정되면 원본과 같이 `responses/YYYY-MM-DD/` 아래에 정식 응답과 제출 전 백업을 기록합니다. 정식 저장이 실패하면 완료 처리하지 않고 재시도를 안내합니다. `gas/experiment_receiver.gs`는 원본의 선택적 Google Apps Script 참고 파일이며 현재 웹페이지와 연결되어 있지 않습니다.
