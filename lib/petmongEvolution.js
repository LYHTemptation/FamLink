// Petmong Evolution Milestones & System
// Stage 1: Lv.1 ~ 4  (아기몽 / Baby)
// Stage 2: Lv.5 ~ 9  (성장기 / Child)
// Stage 3: Lv.10 ~ 19 (청소년기 / Youth)
// Stage 4: Lv.20+    (완전체 수호신 / Guardian)

export const EVOLUTION_MILESTONES = [1, 5, 10, 20];

export const EVOLUTION_STAGES = {
  1: {
    stage: 1,
    minLevel: 1,
    maxLevel: 4,
    name: '아기몽',
    stageTitle: '알 / 꼬물이 (Baby)',
    scale: 0.88,
    desc: '갓 깨어난 꼬물이! 가족의 따뜻한 관심과 방울을 먹고 무럭무럭 자라요.',
    badgeColor: '#FFA39E',
    aura: null,
  },
  2: {
    stage: 2,
    minLevel: 5,
    maxLevel: 9,
    name: '성장기 몽이',
    stageTitle: '호기심 성장기 (Child)',
    scale: 1.0,
    desc: '두 발로 서서 깡충깡충 뛰어다녀요! 호기심 가득한 눈으로 방 안을 탐색합니다.',
    badgeColor: '#52C41A',
    aura: 'sprout',
  },
  3: {
    stage: 3,
    minLevel: 10,
    maxLevel: 19,
    name: '청소년기 몽이',
    stageTitle: '의젓한 청소년 (Youth)',
    scale: 1.15,
    desc: '의젓해진 우리 반려몽! 가족 사랑 스카프와 반짝이는 별빛 아우라를 둘렀어요.',
    badgeColor: '#1890FF',
    aura: 'star',
  },
  4: {
    stage: 4,
    minLevel: 20,
    maxLevel: 999,
    name: '완전체 수호신',
    stageTitle: '우리 가족 수호신 (Guardian)',
    scale: 1.3,
    desc: '영롱한 천사 날개와 황금빛 오라를 두른 우리 집 최강의 든든한 수호신이에요!',
    badgeColor: '#FAAD14',
    aura: 'guardian',
  },
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

// 4-Stage Emoji Evolution Tree
const EMOJI_EVOLUTION_CHAINS = {
  '🐶': ['🥚', '🐶', '🐕', '👑🐕'],
  '🐕': ['🥚', '🐶', '🐕', '👑🐕'],
  '🐱': ['🥚', '🐱', '🐈', '👑🐱'],
  '🐈': ['🥚', '🐱', '🐈', '👑🐱'],
  '🐰': ['🥚', '🐰', '🐇', '👑🐰'],
  '🐇': ['🥚', '🐰', '🐇', '👑🐰'],
  '🐻': ['🥚', '🐻', '🧸', '👑🐻'],
  '🧸': ['🥚', '🐻', '🧸', '👑🐻'],
  '🐣': ['🥚', '🐣', '🐥', '🦚'],
  '🐥': ['🥚', '🐣', '🐥', '🦚'],
  '🦊': ['🥚', '🦊', '🐺', '👑🦊'],
  '🐼': ['🥚', '🐼', '🐾🐼', '👑🐼'],
  '🌱': ['🌰', '🌱', '🌿', '🌳'],
};

export const getEvolvedEmoji = (baseEmoji = '🐶', level = 1) => {
  const stage = getEvolutionStage(level).stage;
  const index = Math.min(stage - 1, 3);
  
  if (EMOJI_EVOLUTION_CHAINS[baseEmoji]) {
    return EMOJI_EVOLUTION_CHAINS[baseEmoji][index] || baseEmoji;
  }
  
  // Generic Evolution Chain
  const genericChain = ['🥚', baseEmoji, `✨${baseEmoji}`, `👑${baseEmoji}`];
  return genericChain[index] || baseEmoji;
};

// Image-to-Image Stage Prompts for AI Evolution
export const getStageEvolutionPrompt = (targetStage, originalDescription = '', personalityTrait = '') => {
  switch (targetStage) {
    case 2:
      return `Growing child stage of this exact same pet monster. Slightly larger and chubbier body, standing up cutely on two tiny feet, bright playful eyes, a tiny green sprout or small ribbon on top, expressing ${personalityTrait}. Must keep the identical color palette, body shape, and face characteristics from the reference image. Cute 2D flat vector, Sumone style, white background.`;
    case 3:
      return `Youth/Teenager stage of this exact same pet monster. Noticeably grown, confident and cheerful pose, wearing a cozy warm scarf or stylish accessory, surrounded by subtle cheerful sparkles, expressing ${personalityTrait}. Strict consistency with the original creature's colors, eye style, and core features. Cute 2D flat vector, Sumone style, white background.`;
    case 4:
      return `Final Guardian/Master evolution stage of this exact same pet monster. Full-grown majestic yet adorable family guardian, small golden celestial halo or tiny glowing wings on back, gentle loving aura, radiating warmth and strength while fully preserving the original cute creature identity and color tones. Cute 2D flat vector, Sumone style, white background.`;
    default:
      return `Baby stage of this exact same pet monster. Cute 2D flat vector, Sumone style, white background.`;
  }
};
