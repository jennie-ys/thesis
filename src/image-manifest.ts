// 실험 자극 및 그룹별 AI 과제 직전 지시문 설정. 실제 이미지·AI 내용은 추후 입력합니다.
export const CATEGORIES = ['광선각화증', '기저세포암', '멜라닌세포성 모반', '피부섬유종', '혈관 병변']
const CODES = ['AK', 'BCC', 'NV', 'DF', 'VASC']
export const GROUPS = [
  {
    id: 'intervention', label: 'intervention',
    taskInstruction: '이제부터 피부 병변 이미지를 분류하는 과제에서 AI의 답변을 참고할 수 있습니다.\n\n이 과제에 사용되는 AI는 모든 문항에 정확하게 답하지 않습니다. 실제로 이번 과제에서 제시되는 AI 답변의 정답률은 약 66.7%이며, 약 3문항 중 1문항에서는 잘못된 답변을 제시합니다.\n\nAI의 답변과 자신의 판단을 함께 고려하여 최종 답변을 선택해 주십시오.',
    boldPhrases: ['66.7%', '3문항 중 1문항에서는 잘못된 답변', 'AI의 답변과 자신의 판단을 함께 고려하여 최종 답변을 선택해 주십시오.'],
  },
  {
    id: 'no-intervention', label: 'no-intervention',
    taskInstruction: '이제부터 피부 병변 이미지를 분류하는 과제에서 AI의 답변을 참고할 수 있습니다.\n\n각 문항에서는 AI가 해당 이미지를 어떤 범주로 분류했는지 확인할 수 있습니다.\n\nAI의 답변과 자신의 판단을 함께 고려하여 최종 답변을 선택해 주십시오.',
    boldPhrases: ['AI의 답변과 자신의 판단을 함께 고려하여 최종 답변을 선택해 주십시오.'],
  },
]

// 6블록 × 5범주. 그룹과 관계없이 동일한 순서와 자극을 사용합니다.
function createTrials(stage: string) {
  return Array.from({ length: 6 }, (_, block) =>
    CATEGORIES.map((_, position) => {
      const index = (position + block) % CATEGORIES.length
      return {
        id: `${stage}-${CODES[index]}-${String(block + 1).padStart(2, '0')}`,
        caseNumber: block + 1,
        correctCategory: CATEGORIES[index],
        url: null as string | null,
      }
    })
  ).flat()
}

// 새 자극이 준비되면 각 배열의 url 및 과제의 aiCategory, aiReason을 채웁니다.
const learning = createTrials('learning').map(trial => ({ ...trial, category: trial.correctCategory }))
const initialExam = createTrials('initial-exam')
const tasks = createTrials('ai-task').map(trial => ({ ...trial, aiCategory: null as string | null, aiReason: null as string | null }))
const finalExam = createTrials('final-exam')

export function getExperimentConfig() {
  return {
    version: 'two-group-v2',
    categories: CATEGORIES,
    groups: GROUPS,
    learningRounds: 2,
    learningMs: 5000,
    blankMs: 100,
    phaseDelayMs: 3000,
    mathDurationMs: 180000,
    previewControls: true,
    stimuliPending: true,
  }
}
export function getLearningImages() { return { slides: learning } }
export function getInitialExamImages() { return { exams: initialExam } }
export function getTaskImages() { return { tasks, categories: CATEGORIES } }
export function getExamImages() { return { exams: finalExam } }
