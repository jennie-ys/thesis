// 실험 자극 및 그룹별 초기 지시문 설정. 실제 이미지·AI 내용은 추후 입력합니다.
export const CATEGORIES = ['광선각화증', '기저세포암', '멜라닌세포성 모반', '피부섬유종', '혈관 병변']
const CODES = ['AK', 'BCC', 'NV', 'DF', 'VASC']
export const GROUPS = [
  { id: 'intervention', label: 'intervention', initialInstruction: null as string | null },
  { id: 'no-intervention', label: 'no-intervention', initialInstruction: null as string | null },
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
