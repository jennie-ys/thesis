// Fixed image order is generated offline; participant sessions never reshuffle it.
import stimulusOrder from '../data/stimulus-order.json'
export const CATEGORIES = ['광선각화증', '기저세포암', '멜라닌세포성 모반', '피부섬유종', '혈관 병변']
export const GROUPS = [
  {
    id: 'intervention', label: 'intervention',
    taskInstruction: "이제부터 피부 병변 이미지를 분류하는 과제에서 AI의 답변을 참고할 수 있습니다.\n\nAI는 피부 병변의 시각적 특징을 분석하여 답변을 제시하지만,\n모든 이미지를 정확하게 분류하는 것은 아닙니다.\n\n예를 들어, 선행 연구에서 네 종류의 피부질환 사진 500장을 평가한 GPT-4o 모델의 진단 정확도는 67.8%로 보고되었습니다(Cirkel et al., 2026). 즉, 약 3문항 중 1문항의 비율로 잘못된 답변이 제시될 수 있습니다. 다만 어떤 문항에서 AI가 정답 또는 오답을 제시하는지는 알 수 없습니다.\n\n따라서, AI의 답변과 자신의 판단을 함께 고려하여 최종 답변을 선택하십시오.\n\n준비되었으면 다음 버튼을 눌러주세요.",
    boldPhrases: ["AI의 답변을 참고", "진단 정확도는 67.8%", "약 3문항 중 1문항의 비율로 잘못된 답변", "AI의 답변과 자신의 판단을 함께 고려하여 최종 답변을 선택하십시오.", "준비되었으면 다음 버튼을 눌러주세요."],
  },
  {
    id: 'no-intervention', label: 'no-intervention',
    taskInstruction: '이제부터 피부 병변 이미지를 분류하는 과제에서 AI의 답변을 참고할 수 있습니다.\n\n각 문항에서는 AI가 해당 이미지를 어떤 범주로 분류했는지 확인할 수 있습니다.\n\nAI의 답변과 자신의 판단을 함께 고려하여 최종 답변을 선택해 주십시오.',
    boldPhrases: ['AI의 답변과 자신의 판단을 함께 고려하여 최종 답변을 선택해 주십시오.'],
  },
]

const learning = stimulusOrder.stages.learning.map(trial => ({ ...trial, category: trial.correctCategory }))
const initialExam = stimulusOrder.stages['initial-exam']
const tasks = stimulusOrder.stages['ai-task']
const finalExam = stimulusOrder.stages['final-exam']

export function getExperimentConfig() {
  return {
    version: 'two-group-v3-images',
    categories: CATEGORIES,
    groups: GROUPS,
    learningRounds: 2,
    learningMs: 5000,
    blankMs: 100,
    phaseDelayMs: 3000,
    instructionCheckAccuracy: 67.8,
    mathDurationMs: 180000,
    previewControls: true,
    stimuliPending: false,
    aiMappingPending: true,
    stimulusOrderVersion: stimulusOrder.orderVersion,
    trialCounts: { learning: learning.length, initialExam: initialExam.length, tasks: tasks.length, finalExam: finalExam.length },
  }
}
export function getLearningImages() { return { slides: learning } }
export function getInitialExamImages() { return { exams: initialExam } }
export function getTaskImages() { return { tasks, categories: CATEGORIES } }
export function getExamImages() { return { exams: finalExam } }
