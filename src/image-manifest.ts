// 원본 이미지 순서·정답·AI 피드백을 유지합니다. 새 이미지 업로드 후 false로 변경하세요.
export const USE_PLACEHOLDER_IMAGES = true

export function getLearningImages() {
  const slides: { category: string; url: string }[] = [
    // ── 블록 1: AK → DF → BCC → NV → MEL → VASC ──
    { category: '광선각화증',        url: '/static/images/%EA%B4%91%EC%84%A0%EA%B0%81%ED%99%94%EC%A6%9D(AK)/ISIC_0146067.jpg' },
    { category: '피부섬유종',         url: '/static/images/%ED%94%BC%EB%B6%80%EC%84%AC%EC%9C%A0%EC%A2%85(DF)/ISIC_0811703.jpg' },
    { category: '기저세포암',        url: '/static/images/%EA%B8%B0%EC%A0%80%EC%84%B8%ED%8F%AC%EC%95%94(BCC)/ISIC_0195347.jpg' },
    { category: '멜라닌세포성 모반', url: '/static/images/%EB%A9%9C%EB%9D%BC%EB%8B%8C%EC%84%B8%ED%8F%AC%EC%84%B1%20%EB%AA%A8%EB%B0%98(NV)/ISIC_0073863.jpg' },
    { category: '흑색종',            url: '/static/images/%ED%9D%91%EC%83%89%EC%A2%85(MEL)/ISIC_0156507.jpg' },
    { category: '혈관 병변',        url: '/static/images/%ED%98%88%EA%B4%80%20%EB%B3%91%EB%B3%80(VASC)/ISIC_0552734.jpg' },
    // ── 블록 2: AK → VASC → NV → BCC → MEL → DF ──
    { category: '광선각화증',        url: '/static/images/%EA%B4%91%EC%84%A0%EA%B0%81%ED%99%94%EC%A6%9D(AK)/ISIC_0260732.jpg' },
    { category: '혈관 병변',        url: '/static/images/%ED%98%88%EA%B4%80%20%EB%B3%91%EB%B3%80(VASC)/ISIC_0686612.jpg' },
    { category: '멜라닌세포성 모반', url: '/static/images/%EB%A9%9C%EB%9D%BC%EB%8B%8C%EC%84%B8%ED%8F%AC%EC%84%B1%20%EB%AA%A8%EB%B0%98(NV)/ISIC_0080219.jpg' },
    { category: '기저세포암',        url: '/static/images/%EA%B8%B0%EC%A0%80%EC%84%B8%ED%8F%AC%EC%95%94(BCC)/ISIC_0365517.jpg' },
    { category: '흑색종',            url: '/static/images/%ED%9D%91%EC%83%89%EC%A2%85(MEL)/ISIC_0184224.jpg' },
    { category: '피부섬유종',         url: '/static/images/%ED%94%BC%EB%B6%80%EC%84%AC%EC%9C%A0%EC%A2%85(DF)/ISIC_0919412.jpg' },
    // ── 블록 3: VASC → AK → MEL → NV → DF → BCC ──
    { category: '혈관 병변',        url: '/static/images/%ED%98%88%EA%B4%80%20%EB%B3%91%EB%B3%80(VASC)/ISIC_1996485.jpg' },
    { category: '광선각화증',        url: '/static/images/%EA%B4%91%EC%84%A0%EA%B0%81%ED%99%94%EC%A6%9D(AK)/ISIC_0478016.jpg' },
    { category: '흑색종',            url: '/static/images/%ED%9D%91%EC%83%89%EC%A2%85(MEL)/ISIC_0204323.jpg' },
    { category: '멜라닌세포성 모반', url: '/static/images/%EB%A9%9C%EB%9D%BC%EB%8B%8C%EC%84%B8%ED%8F%AC%EC%84%B1%20%EB%AA%A8%EB%B0%98(NV)/ISIC_0097262.jpg' },
    { category: '피부섬유종',         url: '/static/images/%ED%94%BC%EB%B6%80%EC%84%AC%EC%9C%A0%EC%A2%85(DF)/ISIC_1176432.jpg' },
    { category: '기저세포암',        url: '/static/images/%EA%B8%B0%EC%A0%80%EC%84%B8%ED%8F%AC%EC%95%94(BCC)/ISIC_0368554.jpg' },
    // ── 블록 4: AK → VASC → MEL → NV → BCC → DF ──
    { category: '광선각화증',        url: '/static/images/%EA%B4%91%EC%84%A0%EA%B0%81%ED%99%94%EC%A6%9D(AK)/ISIC_0496864.jpg' },
    { category: '혈관 병변',        url: '/static/images/%ED%98%88%EA%B4%80%20%EB%B3%91%EB%B3%80(VASC)/ISIC_3849096.jpg' },
    { category: '흑색종',            url: '/static/images/%ED%9D%91%EC%83%89%EC%A2%85(MEL)/ISIC_0212251.jpg' },
    { category: '멜라닌세포성 모반', url: '/static/images/%EB%A9%9C%EB%9D%BC%EB%8B%8C%EC%84%B8%ED%8F%AC%EC%84%B1%20%EB%AA%A8%EB%B0%98(NV)/ISIC_0101767.jpg' },
    { category: '기저세포암',        url: '/static/images/%EA%B8%B0%EC%A0%80%EC%84%B8%ED%8F%AC%EC%95%94(BCC)/ISIC_0369681.jpg' },
    { category: '피부섬유종',         url: '/static/images/%ED%94%BC%EB%B6%80%EC%84%AC%EC%9C%A0%EC%A2%85(DF)/ISIC_1342857.jpg' },
    // ── 블록 5: VASC → NV → MEL → BCC → AK → DF ──
    { category: '혈관 병변',        url: '/static/images/%ED%98%88%EA%B4%80%20%EB%B3%91%EB%B3%80(VASC)/ISIC_5409072.jpg' },
    { category: '멜라닌세포성 모반', url: '/static/images/%EB%A9%9C%EB%9D%BC%EB%8B%8C%EC%84%B8%ED%8F%AC%EC%84%B1%20%EB%AA%A8%EB%B0%98(NV)/ISIC_0106322.jpg' },
    { category: '흑색종',            url: '/static/images/%ED%9D%91%EC%83%89%EC%A2%85(MEL)/ISIC_0305865.jpg' },
    { category: '기저세포암',        url: '/static/images/%EA%B8%B0%EC%A0%80%EC%84%B8%ED%8F%AC%EC%95%94(BCC)/ISIC_0377749.jpg' },
    { category: '광선각화증',        url: '/static/images/%EA%B4%91%EC%84%A0%EA%B0%81%ED%99%94%EC%A6%9D(AK)/ISIC_0605910.jpg' },
    { category: '피부섬유종',         url: '/static/images/%ED%94%BC%EB%B6%80%EC%84%AC%EC%9C%A0%EC%A2%85(DF)/ISIC_4324758.jpg' },
    // ── 블록 6: NV → DF → BCC → AK → MEL → VASC ──
    { category: '멜라닌세포성 모반', url: '/static/images/%EB%A9%9C%EB%9D%BC%EB%8B%8C%EC%84%B8%ED%8F%AC%EC%84%B1%20%EB%AA%A8%EB%B0%98(NV)/ISIC_0115114.jpg' },
    { category: '피부섬유종',         url: '/static/images/%ED%94%BC%EB%B6%80%EC%84%AC%EC%9C%A0%EC%A2%85(DF)/ISIC_4959784.jpg' },
    { category: '기저세포암',        url: '/static/images/%EA%B8%B0%EC%A0%80%EC%84%B8%ED%8F%AC%EC%95%94(BCC)/ISIC_0381913.jpg' },
    { category: '광선각화증',        url: '/static/images/%EA%B4%91%EC%84%A0%EA%B0%81%ED%99%94%EC%A6%9D(AK)/ISIC_0707479.jpg' },
    { category: '흑색종',            url: '/static/images/%ED%9D%91%EC%83%89%EC%A2%85(MEL)/ISIC_0320008.jpg' },
    { category: '혈관 병변',        url: '/static/images/%ED%98%88%EA%B4%80%20%EB%B3%91%EB%B3%80(VASC)/ISIC_5866736.jpg' },
  ]
  return { slides }
}

export function getTaskImages() {
  const CATS = ['광선각화증','기저세포암','멜라닌세포성 모반','피부섬유종','혈관 병변','흑색종']

  // 표시명(약자 없음) → 실제 폴더명(약자 포함) 매핑
  const FOLDER: Record<string, string> = {
    '광선각화증':        '광선각화증(AK)',
    '기저세포암':        '기저세포암(BCC)',
    '멜라닌세포성 모반': '멜라닌세포성 모반(NV)',
    '피부섬유종':        '피부섬유종(DF)',
    '혈관 병변':         '혈관 병변(VASC)',
    '흑색종':            '흑색종(MEL)',
  }

  // 오답용 카테고리 풀 (각 카테고리의 그럴듯한 오답 2가지 - 카테고리별 고정)
  const wrongAnswers: Record<string, [string, string]> = {
    '광선각화증':       ['기저세포암',       '흑색종'],
    '기저세포암':      ['광선각화증',        '멜라닌세포성 모반'],
    '멜라닌세포성 모반':['흑색종',           '피부섬유종'],
    '피부섬유종':       ['멜라닌세포성 모반', '혈관 병변'],
    '혈관 병변':      ['피부섬유종',        '광선각화증'],
    '흑색종':          ['멜라닌세포성 모반', '기저세포암'],
  }

  // AI 분석 근거 문장 (카테고리별, 정답/오답 각 1벌)
  const reasons: Record<string, { correct: string; wrong: string[] }> = {
    '광선각화증': {
      correct: '표면의 각질화 패턴과 홍반성 배경이 관찰됩니다. 경계가 불규칙하며 거친 표면 텍스처와 미세한 케라틴 구조물이 확인되어 광선각화증으로 분류하였습니다.',
      wrong: [
        '가지형 혈관 구조와 청회색 색소 침착이 확인됩니다. 색소망이 불규칙하게 분포하고 있어 기저세포암의 전형적 소견으로 판단하였습니다.',
        '불규칙한 경계와 다색성 색소 분포가 관찰됩니다. 비대칭적 구조와 비정형 색소망이 뚜렷하여 흑색종으로 분류하였습니다.',
      ]
    },
    '기저세포암': {
      correct: '색소망의 부재와 함께 가지형 혈관 구조가 명확히 관찰됩니다. 청회색 구조물과 궤양성 변화가 확인되어 기저세포암으로 분류하였습니다.',
      wrong: [
        '표면의 각질화와 홍반성 변화가 관찰됩니다. 경계부의 거친 텍스처와 케라틴 비후 소견이 광선각화증 패턴과 일치합니다.',
        '균일한 색상 분포와 대칭적 구조가 확인됩니다. 규칙적인 색소망과 명확한 경계가 멜라닌세포성 모반의 전형적 소견입니다.',
      ]
    },
    '멜라닌세포성 모반': {
      correct: '균일한 색상 분포와 대칭적인 구조가 확인됩니다. 규칙적인 색소망과 명확한 경계선이 관찰되어 멜라닌세포성 모반으로 분류하였습니다.',
      wrong: [
        '비대칭성 및 불규칙한 경계 소견이 관찰됩니다. 다색성 색소 분포와 비정형 색소망이 확인되어 흑색종으로 분류하였습니다.',
        '중심부 백색 반흔과 주변부 색소망의 이중 패턴이 관찰됩니다. 중심-주변 대비 구조가 뚜렷하여 피부섬유종으로 판단하였습니다.',
      ]
    },
    '피부섬유종': {
      correct: '중심부에 백색 반흔 형태의 구조물이 확인됩니다. 주변부의 색소망과 결합된 특징적인 중심-주변 대비 패턴이 관찰되어 피부섬유종으로 분류하였습니다.',
      wrong: [
        '균일한 색소 분포와 규칙적인 색소망이 관찰됩니다. 대칭적 구조와 명확한 경계가 멜라닌세포성 모반의 전형적 패턴과 일치합니다.',
        '적색 계열의 색상과 함께 혈관 구조물이 관찰됩니다. 표재성 혈관 확장 소견이 혈관 병변의 특성에 부합합니다.',
      ]
    },
    '혈관 병변': {
      correct: '적색 및 청색 계열의 색상 분포가 확인됩니다. 병변 내 혈관 구조가 명확히 관찰되며 주변 조직과의 경계가 뚜렷하여 혈관 병변으로 분류하였습니다.',
      wrong: [
        '중심부 백색 구조물과 주변 색소망의 이중 패턴이 확인됩니다. 특징적인 중심-주변 대비 구조가 피부섬유종과 일치합니다.',
        '표면의 각질화와 홍반성 변화가 관찰됩니다. 불규칙한 경계와 케라틴 비후 소견이 광선각화증 패턴에 해당합니다.',
      ]
    },
    '흑색종': {
      correct: '비대칭적 구조와 불규칙한 경계가 뚜렷하게 관찰됩니다. 다색성 색소 분포와 비정형 색소망, 색소 퇴행 소견이 확인되어 흑색종으로 분류하였습니다.',
      wrong: [
        '균일한 색소 분포와 대칭적 구조가 관찰됩니다. 규칙적인 색소망과 명확한 경계선이 멜라닌세포성 모반의 특성과 일치합니다.',
        '가지형 혈관과 청회색 색소 침착이 확인됩니다. 색소망 소실과 궤양성 변화 소견이 기저세포암 패턴에 부합합니다.',
      ]
    },
  }

  // 카테고리별 파일 목록 (2개입단계.zip, 범주당 6개)
  // 인덱스 0~2 → 정답 AI 피드백, 3~5 → 오답(가짜) AI 피드백
  const files: Record<string, string[]> = {
    '광선각화증':        ['ISIC_0723926.jpg','ISIC_0970615.jpg','ISIC_1076265.jpg','ISIC_1099402.jpg','ISIC_1115156.jpg','ISIC_1119486.jpg'],
    '기저세포암':       ['ISIC_0382621.jpg','ISIC_0913648.jpg','ISIC_0962183.jpg','ISIC_1186941.jpg','ISIC_1217127.jpg','ISIC_1230479.jpg'],
    '멜라닌세포성 모반': ['ISIC_0125513.jpg','ISIC_0167803.jpg','ISIC_0174869.jpg','ISIC_0179367.jpg','ISIC_0216815.jpg','ISIC_0356038.jpg'],
    '피부섬유종':         ['ISIC_5813817.jpg','ISIC_5844410.jpg','ISIC_6043617.jpg','ISIC_6312345.jpg','ISIC_6558326.jpg','ISIC_6943256.jpg'],
    '혈관 병변':        ['ISIC_6141128.jpg','ISIC_6192197.jpg','ISIC_7134919.jpg','ISIC_8020470.jpg','ISIC_8190843.jpg','ISIC_8462138.jpg'],
    '흑색종':            ['ISIC_0406149.jpg','ISIC_0410802.jpg','ISIC_0414164.jpg','ISIC_0529633.jpg','ISIC_1019384.jpg','ISIC_1074795.jpg'],
  }

  const tasks: {
    url: string
    correctCategory: string
    aiCategory: string
    aiReason: string
    aiCorrect: boolean
  }[] = []

  for (const cat of CATS) {
    const fList = files[cat]
    const r     = reasons[cat]
    const w     = wrongAnswers[cat]
    fList.forEach((f, i) => {
      // 0~2: 정답 AI, 3~4: 오답1, 5: 오답2
      const isCorrect = i < 3
      const wrongIdx  = i < 5 ? 0 : 1
      tasks.push({
        url: `/static/task-images/${encodeURIComponent(FOLDER[cat] ?? cat)}/${f}`,
        correctCategory: cat,
        aiCategory: isCorrect ? cat : w[wrongIdx],
        aiReason:   isCorrect ? r.correct : r.wrong[wrongIdx],
        aiCorrect:  isCorrect,
      })
    })
  }

  return { tasks, categories: CATS }
}

export function getExamImages() {
  // 표시명(약자 없음) → 실제 폴더명(약자 포함) 매핑
  const FOLDER: Record<string, string> = {
    '광선각화증':        '광선각화증(AK)',
    '기저세포암':        '기저세포암(BCC)',
    '멜라닌세포성 모반': '멜라닌세포성 모반(NV)',
    '피부섬유종':        '피부섬유종(DF)',
    '혈관 병변':         '혈관 병변(VASC)',
    '흑색종':            '흑색종(MEL)',
  }

  const examImages: Record<string, string[]> = {
    '광선각화증':        ['ISIC_3004699.jpg','ISIC_3009842.jpg','ISIC_3531459.jpg','ISIC_3532225.jpg'],
    '기저세포암':       ['ISIC_1464471.jpg','ISIC_1484722.jpg','ISIC_2231864.jpg','ISIC_2232926.jpg'],
    '멜라닌세포성 모반': ['ISIC_0422017.jpg','ISIC_0597607.jpg','ISIC_0767613.jpg','ISIC_0769255.jpg'],
    '피부섬유종':         ['ISIC_7009788.jpg','ISIC_7454975.jpg','ISIC_8705648.jpg','ISIC_8981897.jpg'],
    '혈관 병변':        ['ISIC_8600102.jpg','ISIC_8614567.jpg','ISIC_8791057.jpg','ISIC_9504198.jpg'],
    '흑색종':            ['ISIC_1264034.jpg','ISIC_1285798.jpg','ISIC_3642584.jpg','ISIC_4563142.jpg'],
  }

  const exams: { url: string; correctCategory: string }[] = []
  for (const [cat, files] of Object.entries(examImages)) {
    for (const f of files) {
      exams.push({
        url: `/static/exam-images/${encodeURIComponent(FOLDER[cat] ?? cat)}/${f}`,
        correctCategory: cat,
      })
    }
  }
  return { exams }
}

