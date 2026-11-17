import { getInitialExamImages, getTaskImages, getExamImages } from './image-manifest'
const normalize = (value: unknown) => typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, '').trim() : ''
const answered = (value: unknown) => typeof value === 'string' && value.trim().length > 0
export function scoreResponses(source: any) {
  const responses = structuredClone(source)
  delete responses._input_events
  const grade = (rows: any[], trials: any[], task = false) => {
    const byId = new Map(trials.map(t => [t.id,t]))
    return (rows || []).map(row => {
      const trial = byId.get(row.trial_id)
      if (!trial) return {...row, scoring_status:'unknown_trial', correct:null, initial_correct:null, final_correct:null, ai_correct:null}
      const result = {...row, image_id:trial.imageId, category_code:trial.categoryCode, novelty:trial.novelty, correctCategory:trial.correctCategory, scoring_status:'scored'}
      if (!task) return {...result,correct:!row.skipped && answered(row.chosen) ? normalize(row.chosen)===normalize(trial.correctCategory) : null}
      const hasAI=answered(trial.aiCategory)
      return {...result,aiCategory:trial.aiCategory,aiReason:trial.aiReason,initial_correct:!row.skipped&&answered(row.initial)?normalize(row.initial)===normalize(trial.correctCategory):null,final_correct:!row.skipped&&answered(row.final)?normalize(row.final)===normalize(trial.correctCategory):null,ai_correct:hasAI?normalize(trial.aiCategory)===normalize(trial.correctCategory):null,aiCorrect:hasAI?normalize(trial.aiCategory)===normalize(trial.correctCategory):null,ai_scoring_status:hasAI?'scored':'mapping_missing',initial_eq_ai:hasAI&&answered(row.initial)?normalize(row.initial)===normalize(trial.aiCategory):null,final_eq_ai:hasAI&&answered(row.final)?normalize(row.final)===normalize(trial.aiCategory):null,changed:answered(row.initial)&&answered(row.final)?normalize(row.initial)!==normalize(row.final):null}
    })
  }
  const first=getInitialExamImages().exams,final=getExamImages().exams,tasks=getTaskImages().tasks
  responses._initial_exam_answers=grade(responses._initial_exam_answers,first)
  responses._exam_answers=grade(responses._exam_answers,final)
  responses._task_answers=grade(responses._task_answers,tasks,true)
  const summary=(rows:any[],planned:number,key='correct')=>{
    const scored=rows.filter(t=>typeof t[key]==='boolean')
    return {correct:scored.filter(t=>t[key]).length,answered:scored.length,total:planned,accuracy_answered:scored.length?scored.filter(t=>t[key]).length/scored.length:null}
  }
  responses._initial_exam_score=summary(responses._initial_exam_answers,first.length)
  responses._scoring={...responses._scoring,source:'server_stimulus_manifest',version:1,initial_exam_score:responses._initial_exam_score,exam_score:summary(responses._exam_answers,final.length),task:responses._task_answers.map(t=>({trial_id:t.trial_id,initial_correct:t.initial_correct,final_correct:t.final_correct,ai_correct:t.ai_correct,ai_scoring_status:t.ai_scoring_status,changed:t.changed,initial_eq_ai:t.initial_eq_ai,final_eq_ai:t.final_eq_ai})),task_initial_score:summary(responses._task_answers,tasks.length,'initial_correct'),task_final_score:summary(responses._task_answers,tasks.length,'final_correct'),ai_score:summary(responses._task_answers,tasks.length,'ai_correct')}
  return responses
}
