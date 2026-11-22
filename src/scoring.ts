import { getInitialExamImages, getTaskImages, getExamImages } from './image-manifest'
import { gradeResponses } from './grade-responses.js'

export function scoreResponses(source: any) {
  return gradeResponses(source, {initialExams:getInitialExamImages().exams, tasks:getTaskImages().tasks, finalExams:getExamImages().exams})
}
