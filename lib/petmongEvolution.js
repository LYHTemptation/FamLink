// Family Companion Growth Milestones & System
// Stage 1: Lv.1 ~ 4   (아기 시절 / Baby)
// Stage 2: Lv.5 ~ 9   (개구쟁이 단짝 / Playful Friend)
// Stage 3: Lv.10 ~ 19 (든든한 짝꿍 / Loyal Companion)
// Stage 4: Lv.20+     (평생 식구 / Lifelong Family)

export const EVOLUTION_MILESTONES = [1, 5, 10, 20];

// 4개월(120일) 약 14,000 EXP 완주 목표 레벨업 밸런스 공식
// Stage 1 (Lv.1~4): 총 2,000 EXP 소요 (약 2~3주차 Lv.5 도달)
// Stage 2 (Lv.5~9): 총 5,000 EXP 소요 (약 2개월차 Lv.10 도달, 누적 7,000 EXP)
// Stage 3 (Lv.10~19): 총 7,000 EXP 소요 (약 4개월차 Lv.20 도달, 누적 14,000 EXP)
// Stage 4 (Lv.20+): 최종 진화 완료 (이후 레벨당 1,000 EXP 유지)
export const TOTAL_FINAL_EXP = 14000;

export const getRequiredExpForLevel = (level = 1) => {
  const lvl = Math.max(1, Number(level) || 1);
  if (lvl < 5) {
    // Lv.1: 350, Lv.2: 450, Lv.3: 550, Lv.4: 650 -> 합계 2,000 EXP (Lv.5 달성)
    return 350 + (lvl - 1) * 100;
  }
  if (lvl < 10) {
    // Lv.5: 800, Lv.6: 900, Lv.7: 1,000, Lv.8: 1,100, Lv.9: 1,200 -> 합계 5,000 EXP (Lv.10 달성)
    return 800 + (lvl - 5) * 100;
  }
  if (lvl < 20) {
    // Lv.10: 610, Lv.11: 630, Lv.12: 650, ..., Lv.19: 790 -> 합계 7,000 EXP (Lv.20 달성)
    return 610 + (lvl - 10) * 20;
  }
  // Lv.20 이상 최종 단계 유지
  return 1000;
};

// 특정 레벨 도달까지 필요한 총 누적 EXP 계산
export const getCumulativeExpForLevel = (targetLevel = 1) => {
  const target = Math.max(1, Number(targetLevel) || 1);
  let total = 0;
  for (let l = 1; l < target; l++) {
    total += getRequiredExpForLevel(l);
  }
  return total;
};

export const EVOLUTION_STAGES = {
  1: {
    stage: 1,
    minLevel: 1,
    maxLevel: 4,
    name: '아기 시절',
    stageTitle: '1단계: 아기 시절 (Baby)',
    scale: 0.88,
    desc: '가족의 품에 갓 안긴 작고 보송보송한 친구! 호기심 어린 눈망울로 온 가족을 바라봐요.',
    badgeColor: '#FFA39E',
    targetPeriod: '시작 (Day 1)',
    requiredExp: '0 EXP',
    aura: null,
  },
  2: {
    stage: 2,
    minLevel: 5,
    maxLevel: 9,
    name: '개구쟁이 단짝',
    stageTitle: '2단계: 개구쟁이 단짝 (Playful Friend)',
    scale: 1.0,
    desc: '온 집안을 총총 뛰어다니며 가족의 하루를 환하게 밝혀주는 사랑스러운 활력소예요.',
    badgeColor: '#52C41A',
    targetPeriod: '약 2~3주차',
    requiredExp: '누적 2,000 EXP (Lv.5)',
    aura: 'sprout',
  },
  3: {
    stage: 3,
    minLevel: 10,
    maxLevel: 19,
    name: '든든한 짝꿍',
    stageTitle: '3단계: 든든한 짝꿍 (Loyal Companion)',
    scale: 1.18,
    desc: '가족의 기쁨과 지친 마음을 조용히 곁에서 보듬어주는 듬직하고 다정한 단짝 친구예요.',
    badgeColor: '#1890FF',
    targetPeriod: '약 2개월차',
    requiredExp: '누적 7,000 EXP (Lv.10)',
    aura: 'elemental',
  },
  4: {
    stage: 4,
    minLevel: 20,
    maxLevel: 999,
    name: '평생 식구',
    stageTitle: '4단계: 평생 식구 (Lifelong Family)',
    scale: 1.35,
    desc: '온 가족의 소중한 시간과 추억을 함께 나누어온 대체할 수 없는 진짜 가족이에요.',
    badgeColor: '#FAAD14',
    targetPeriod: '약 4개월차 (최종)',
    requiredExp: '누적 14,000 EXP (Lv.20)',
    aura: 'ultimate_mega',
  },
};

export const getStageNameWithPet = (stageNum = 1, petName = '반려친구') => {
  const name = petName || '반려친구';
  switch (Number(stageNum)) {
    case 1:
      return `아기 ${name}`;
    case 2:
      return `개구쟁이 ${name}`;
    case 3:
      return `든든한 짝꿍 ${name}`;
    case 4:
      return `평생 식구 ${name}`;
    default:
      return name;
  }
};

export const getEvolutionStage = (level = 1) => {
  if (level >= 20) return EVOLUTION_STAGES[4];
  if (level >= 10) return EVOLUTION_STAGES[3];
  if (level >= 5) return EVOLUTION_STAGES[2];
  return EVOLUTION_STAGES[1];
};

export const isMilestoneLevel = (level) => {
  return [5, 10, 20].includes(level);
};

// // 10 Distinct Companion Species Lineages & Evolution Data
export const PETMONG_SPECIES_LIST = [
  {
    id: 'canine',
    name: '강아지',
    emoji: '🐶',
    desc: '의리와 사랑의 상징! 앙증맞은 아기 강아지에서 온 가족의 든든한 평생 짝꿍으로 성장해요.',
    chain: ['🐾 아기 꼬물이', '🐶 장난꾸러기 친구', '🐕 든든한 가족 짝꿍', '✨🐕 온 가족의 평생 식구'],
  },
  {
    id: 'feline',
    name: '고양이',
    emoji: '🐱',
    desc: '도도하고 다정한 사랑둥이! 사랑스러운 솜뭉치에서 눈빛만 봐도 통하는 단짝 냥이로 성장해요.',
    chain: ['🐾 아기 솜뭉치', '🐱 호기심 꼬마 냥이', '🐈 마음 통하는 단짝', '✨🐱 온 가족의 평생 식구'],
  },
  {
    id: 'rabbit',
    name: '토끼',
    emoji: '🐰',
    desc: '포근하고 지혜로운 요정! 쫑긋한 귀의 아기 토끼에서 활기와 위로를 건네는 가족 친구로 자라나요.',
    chain: ['🐾 아기 솜토끼', '🐰 깡충 귀염둥이', '🐇 든든한 짝꿍 토끼', '✨🐰 온 가족의 평생 식구'],
  },
  {
    id: 'bear',
    name: '곰돌이',
    emoji: '🐻',
    desc: '푸근하고 묵직한 안식처! 둥글둥글 아기 곰에서 가족을 포근하게 안아주는 듬직한 식구로 성장해요.',
    chain: ['🐾 아기 곰돌이', '🐻 씩씩한 곰 친구', '🐻‍❄️ 든든하고 푸근한 짝꿍', '✨🐻 온 가족의 평생 식구'],
  },
  {
    id: 'bird',
    name: '새 / 파랑새',
    emoji: '🐥',
    desc: '행복과 희망의 날갯짓! 작은 아기 새에서 가족에게 매일 기쁜 소식을 물어다 주는 파랑새로 자라나요.',
    chain: ['🐾 솜털 아기 새', '🐥 날갯짓하는 친구', '🕊️ 다정한 짝꿍 파랑새', '✨🕊️ 온 가족의 평생 식구'],
  },
  {
    id: 'fox',
    name: '여우',
    emoji: '🦊',
    desc: '사랑스럽고 영특한 눈망울! 복슬복슬 아기 여우에서 가족의 온기를 지키는 든든한 동반자가 돼요.',
    chain: ['🐾 아기 여우 꼬물이', '🦊 호기심 여우 친구', '🦊 영특한 단짝 짝꿍', '✨🦊 온 가족의 평생 식구'],
  },
  {
    id: 'deer',
    name: '꽃사슴',
    emoji: '🦌',
    desc: '맑고 평온한 숲의 온기! 초롱초롱한 아기 사슴에서 가족에게 평화와 위안을 주는 듬직한 반려가 돼요.',
    chain: ['🐾 아기 꽃사슴', '🦌 사뿐사뿐 사슴 친구', '🦌 온화하고 듬직한 짝꿍', '✨🦌 온 가족의 평생 식구'],
  },
  {
    id: 'rodent',
    name: '햄스터',
    emoji: '🐹',
    desc: '작지만 커다란 행복! 볼빵빵 아기 햄스터에서 가족에게 매일 미소를 선물하는 든든한 짝꿍이 돼요.',
    chain: ['🐾 볼빵빵 아기 햄스터', '🐹 도토리 나르는 친구', '🐹 든든한 짝꿍 햄찌', '✨🐹 온 가족의 평생 식구'],
  },
  {
    id: 'dragon',
    name: '아기용',
    emoji: '🐲',
    desc: '용기와 신비로운 축복! 앙증맞은 꼬마 용에서 가족의 모든 소원을 함께 품어주는 든든한 수호룡이 돼요.',
    chain: ['🐾 꼬마 아기 용', '🦎 날개 돋은 어린 용', '🐲 온화하고 듬직한 수호룡', '✨🐲 온 가족의 평생 식구'],
  },
  {
    id: 'aquatic',
    name: '물범',
    emoji: '🦭',
    desc: '푸른 바다처럼 넓은 다정함! 통통한 아기 물범에서 온 가족의 마음을 시원하고 포근하게 감싸줘요.',
    chain: ['🐾 뽀송뽀송 아기 물범', '🦭 파도 타는 어린 물범', '🐬 언제나 곁을 지키는 짝꿍', '✨🐬 온 가족의 평생 식구'],
  },
];

// 4-Stage Emoji Evolution Tree
const EMOJI_EVOLUTION_CHAINS = {
  '🐶': ['🥚', '🐶', '🐕', '✨🐕'],
  '🐕': ['🥚', '🐶', '🐕', '✨🐕'],
  '🐱': ['🥚', '🐱', '🐈', '✨🐱'],
  '🐈': ['🥚', '🐱', '🐈', '✨🐱'],
  '🐰': ['🥚', '🐰', '🐇', '✨🐰'],
  '🐇': ['🥚', '🐰', '🐇', '✨🐰'],
  '🐻': ['🥚', '🐻', '🐻‍❄️', '✨🐻'],
  '🧸': ['🥚', '🐻', '🐻‍❄️', '✨🐻'],
  '🐼': ['🥚', '🐼', '🐼', '✨🐼'],
  '🐣': ['🥚', '🐣', '🕊️', '✨🕊️'],
  '🐥': ['🥚', '🐣', '🕊️', '✨🕊️'],
  '🦊': ['🥚', '🦊', '🦊', '✨🦊'],
  '🦌': ['🥚', '🦌', '🦌', '✨🦌'],
  '🐹': ['🥚', '🐹', '🐹', '✨🐹'],
  '🐲': ['🥚', '🦎', '🐲', '✨🐲'],
  '🦭': ['🥚', '🦭', '🐬', '✨🐬'],
  '🌱': ['🌰', '🌱', '🌿', '🌳'],
};

export const getEvolvedEmoji = (baseEmoji = '🐶', level = 1) => {
  let actualEmoji = baseEmoji;
  let actualLevel = level;
  if (typeof baseEmoji === 'number' && typeof level === 'string') {
    actualEmoji = level;
    actualLevel = baseEmoji;
  }
  const stage = getEvolutionStage(actualLevel).stage;
  const index = Math.min(stage - 1, 3);
  
  if (EMOJI_EVOLUTION_CHAINS[actualEmoji]) {
    return EMOJI_EVOLUTION_CHAINS[actualEmoji][index] || actualEmoji;
  }
  
  // Generic Evolution Chain
  const genericChain = ['🐾', actualEmoji, `💖${actualEmoji}`, `✨${actualEmoji}`];
  return genericChain[index] || actualEmoji;
};

// Image-to-Image Stage Prompts for AI Evolution (Warm Family Companionship - Sumone Style)
export const getStageEvolutionPrompt = (targetStage, characterTraits = '', personalityTrait = '') => {
  const baseInstruction = `IMAGE-TO-IMAGE CHARACTER GROWTH & EVOLUTION:
Reference character: ${characterTraits}.
CRITICAL IDENTITY LOCK: Look at the provided input image. This is the exact character at an earlier stage. You MUST maintain 100% of the character's facial features, exact eye shape, expression, smile, ear/tail style, and lovely color palette from the reference image.
Art Style: Consistent 'Sumone' app art style, minimalist 2D flat kawaii vector creature mascot, clean bold lines, soft pastel tones, rounded cuddly silhouette, zero photorealistic human textures.
Requirements: Plain solid pure white background (#FFFFFF) only. Zero background elements, no borders, no scenery, NEVER draw checkerboard grid, NEVER draw checkered tiles or fake transparency squares. Centered character on clean solid white canvas.`;

  if (targetStage === 2) {
    return `${baseInstruction}
Growth Stage 2 (개구쟁이 단짝):
The tiny baby creature has grown into a slightly bigger, energetic juvenile companion!
Standing happily on two cute little feet, perked-up cheerful ears, lively tail, expressing ${personalityTrait}. Chubby, playful, and full of curious energy.`;
  }

  if (targetStage === 3) {
    return `${baseInstruction}
Growth Stage 3 (든든한 짝꿍):
The creature has matured into a dependable, warm, and loyal adult family companion!
Slightly larger, comforting and cuddly body, wearing an adorable cute small scarf, collar, or cape. Expressing ${personalityTrait} with gentle, loving eyes that warmly protect the home.`;
  }

  if (targetStage === 4) {
    return `${baseInstruction}
Growth Stage 4 (평생 식구):
The ultimate cherished form representing eternal family love and togetherness!
Adorned with an adorable tiny golden crown or floating celestial stars above its head, radiating a soft gentle warm aura. Deeply happy, serene, and beloved guardian companion expressing ${personalityTrait}.`;
  }

  return `${baseInstruction}\nGrowth Stage 1 (아기 시절): Tiny adorable baby creature hatched from an egg.`;
};
