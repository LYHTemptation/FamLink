import { PetmongStylePreset } from '../types/domain';

export interface EvolutionStageSpec {
  stage: number;
  minLevel: number;
  maxLevel: number;
  name: string;
  stageTitle: string;
  scale: number;
  desc: string;
  badgeColor: string;
  targetPeriod: string;
  requiredExp: string;
  aura: string | null;
}

export interface PetmongSpeciesSpec {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  chain: string[];
}

// Family Companion Growth Milestones & System
// Stage 1: Lv.1 ~ 4   (꼬물이 시절 / Baby Bean)
// Stage 2: Lv.5 ~ 9   (총총이 시절 / Playful Little)
// Stage 3: Lv.10 ~ 19 (포근이 시절 / Plush Companion)
// Stage 4: Lv.20+     (지킴이 시절 / Cherished Guardian)

export const EVOLUTION_MILESTONES = [1, 5, 10, 20];

// 4개월(120일) 약 14,000 EXP 완주 목표 레벨업 밸런스 공식
// Stage 1 (Lv.1~4): 총 2,000 EXP 소요 (약 2~3주차 Lv.5 도달)
// Stage 2 (Lv.5~9): 총 5,000 EXP 소요 (약 2개월차 Lv.10 도달, 누적 7,000 EXP)
// Stage 3 (Lv.10~19): 총 7,000 EXP 소요 (약 4개월차 Lv.20 도달, 누적 14,000 EXP)
// Stage 4 (Lv.20+): 최종 진화 완료 (이후 레벨당 1,000 EXP 유지)
export const TOTAL_FINAL_EXP = 14000;

export const getRequiredExpForLevel = (level: number = 1): number => {
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
export const getCumulativeExpForLevel = (targetLevel: number = 1): number => {
  const target = Math.max(1, Number(targetLevel) || 1);
  let total = 0;
  for (let l = 1; l < target; l++) {
    total += getRequiredExpForLevel(l);
  }
  return total;
};

export const EVOLUTION_STAGES: Record<number, EvolutionStageSpec> = {
  1: {
    stage: 1,
    minLevel: 1,
    maxLevel: 4,
    name: '꼬물이',
    stageTitle: '1단계: 꼬물이 시절 (Baby Bean)',
    scale: 1.0,
    desc: '한 손에 쏙 들어오는 작고 동글동글한 콩알! 호기심 어린 눈망울로 온 가족을 바라봐요.',
    badgeColor: '#FFA39E',
    targetPeriod: '시작 (Day 1)',
    requiredExp: '0 EXP',
    aura: null,
  },
  2: {
    stage: 2,
    minLevel: 5,
    maxLevel: 9,
    name: '총총이',
    stageTitle: '2단계: 총총이 시절 (Playful Little)',
    scale: 1.08,
    desc: '아장아장 총총 뛰놀며 온 집안에 생기발랄한 웃음과 활력을 선물하는 사랑스러운 꼬마예요.',
    badgeColor: '#52C41A',
    targetPeriod: '약 2~3주차',
    requiredExp: '누적 2,000 EXP (Lv.5)',
    aura: 'sprout',
  },
  3: {
    stage: 3,
    minLevel: 10,
    maxLevel: 19,
    name: '포근이',
    stageTitle: '3단계: 포근이 시절 (Plush Companion)',
    scale: 1.18,
    desc: '두 팔로 와락 안아주고 싶을 만큼 듬직하고 포근한 찹쌀떡 체형! 가족의 지친 하루를 따스하게 감싸줘요.',
    badgeColor: '#1890FF',
    targetPeriod: '약 2개월차',
    requiredExp: '누적 7,000 EXP (Lv.10)',
    aura: 'elemental',
  },
  4: {
    stage: 4,
    minLevel: 20,
    maxLevel: 999,
    name: '지킴이',
    stageTitle: '4단계: 지킴이 시절 (Cherished Guardian)',
    scale: 1.28,
    desc: '온 가족의 사랑을 듬뿍 받아 완성된 영원한 수호신! 언제나 곁을 든든하게 지켜주는 평생 한식구예요.',
    badgeColor: '#FAAD14',
    targetPeriod: '약 4개월차 (최종)',
    requiredExp: '누적 14,000 EXP (Lv.20)',
    aura: 'ultimate_mega',
  },
};

export const getStageNameWithPet = (stageNum: number = 1, petName: string = '반려친구'): string => {
  const name = petName || '반려친구';
  switch (Number(stageNum)) {
    case 1:
      return `꼬물이 ${name}`;
    case 2:
      return `총총이 ${name}`;
    case 3:
      return `포근이 ${name}`;
    case 4:
      return `지킴이 ${name}`;
    default:
      return name;
  }
};

export const getEvolutionStage = (level: number = 1): EvolutionStageSpec => {
  if (level >= 20) return EVOLUTION_STAGES[4];
  if (level >= 10) return EVOLUTION_STAGES[3];
  if (level >= 5) return EVOLUTION_STAGES[2];
  return EVOLUTION_STAGES[1];
};

export const isMilestoneLevel = (level: number): boolean => {
  return [5, 10, 20].includes(level);
};

export type PetmongArchetype =
  | 'canine'
  | 'feline'
  | 'rodent'
  | 'large_beast'
  | 'avian'
  | 'aquatic'
  | 'dinosaur'
  | 'dragon_mythical'
  | 'fairy_insect'
  | 'plant_nature'
  | 'human'
  | 'mecha_object';

export function detectArchetype(
  emoji: string = '',
  name: string = '',
  description: string = ''
): PetmongArchetype {
  const s = `${emoji || ''} ${name || ''} ${description || ''}`.toLowerCase();

  // 1. Canine (강아지/늑대/여우)
  if (
    s.includes('🐶') || s.includes('🐕') || s.includes('🐩') || s.includes('🐺') || s.includes('🦊') ||
    s.includes('개') || s.includes('강아지') || s.includes('댕댕') || s.includes('멍멍') || s.includes('늑대') || s.includes('여우') ||
    s.includes('dog') || s.includes('puppy') || s.includes('wolf') || s.includes('fox') || s.includes('canine') || s.includes('vulpine')
  ) return 'canine';

  // 2. Feline (고양이/호랑이/사자)
  if (
    s.includes('🐱') || s.includes('🐈') || s.includes('🦁') || s.includes('🐯') ||
    s.includes('고양이') || s.includes('냥') || s.includes('호랑이') || s.includes('사자') || s.includes('표범') ||
    s.includes('cat') || s.includes('kitten') || s.includes('tiger') || s.includes('lion') || s.includes('feline')
  ) return 'feline';

  // 3. Rodent (토끼/햄스터/다람쥐/고슴도치)
  if (
    s.includes('🐰') || s.includes('🐇') || s.includes('🐹') || s.includes('🐿️') || s.includes('🐭') || s.includes('🦔') ||
    s.includes('토끼') || s.includes('햄스터') || s.includes('다람쥐') || s.includes('고슴도치') || s.includes('쥐') ||
    s.includes('rabbit') || s.includes('bunny') || s.includes('hamster') || s.includes('squirrel') || s.includes('rodent') || s.includes('hedgehog')
  ) return 'rodent';

  // 4. Large Beast (곰/판다/사슴/코끼리)
  if (
    s.includes('🐻') || s.includes('🧸') || s.includes('🐼') || s.includes('🦌') || s.includes('🐘') || s.includes('🦛') ||
    s.includes('곰') || s.includes('판다') || s.includes('팬더') || s.includes('사슴') || s.includes('코끼리') ||
    s.includes('bear') || s.includes('panda') || s.includes('deer') || s.includes('elephant') || s.includes('beast')
  ) return 'large_beast';

  // 5. Avian (새/병아리/오리/앵무새/독수리/펭귄)
  if (
    s.includes('🐣') || s.includes('🐥') || s.includes('🦅') || s.includes('🦆') || s.includes('🦜') || s.includes('🐧') || s.includes('🕊️') ||
    s.includes('새') || s.includes('병아리') || s.includes('오리') || s.includes('앵무새') || s.includes('독수리') || s.includes('펭귄') || s.includes('파랑새') ||
    s.includes('bird') || s.includes('chick') || s.includes('duck') || s.includes('parrot') || s.includes('eagle') || s.includes('penguin') || s.includes('avian')
  ) return 'avian';

  // 6. Aquatic (물고기/물범/고래/돌고래/상어/수중생물)
  if (
    s.includes('🦭') || s.includes('🐬') || s.includes('🐳') || s.includes('🐋') || s.includes('🐟') || s.includes('🐠') || s.includes('🦈') || s.includes('🦦') ||
    s.includes('물범') || s.includes('물고기') || s.includes('돌고래') || s.includes('고래') || s.includes('상어') || s.includes('수달') || s.includes('해달') ||
    s.includes('seal') || s.includes('dolphin') || s.includes('whale') || s.includes('fish') || s.includes('shark') || s.includes('otter') || s.includes('aquatic')
  ) return 'aquatic';

  // 7. Dinosaur (공룡/티라노/랩터/파충류/도마뱀/악어/거북이)
  if (
    s.includes('🦖') || s.includes('🦕') || s.includes('🦎') || s.includes('🐊') || s.includes('🐢') ||
    s.includes('공룡') || s.includes('티라노') || s.includes('랩터') || s.includes('도마뱀') || s.includes('악어') || s.includes('거북이') ||
    s.includes('dinosaur') || s.includes('dino') || s.includes('t-rex') || s.includes('raptor') || s.includes('lizard') || s.includes('reptile') || s.includes('turtle')
  ) return 'dinosaur';

  // 8. Mythical (드래곤/용/신수/해태/봉황/유니콘)
  if (
    s.includes('🐲') || s.includes('🐉') || s.includes('🦄') ||
    s.includes('용') || s.includes('드래곤') || s.includes('신수') || s.includes('해태') || s.includes('봉황') || s.includes('유니콘') ||
    s.includes('dragon') || s.includes('drake') || s.includes('wyvern') || s.includes('unicorn') || s.includes('phoenix') || s.includes('mythical')
  ) return 'dragon_mythical';

  // 9. Fairy / Insect (나비/꿀벌/무당벌레/풍뎅이/요정)
  if (
    s.includes('🦋') || s.includes('🐝') || s.includes('🐞') || s.includes('🧚') || s.includes('🪲') ||
    s.includes('나비') || s.includes('벌') || s.includes('무당벌레') || s.includes('풍뎅이') || s.includes('요정') ||
    s.includes('butterfly') || s.includes('bee') || s.includes('ladybug') || s.includes('beetle') || s.includes('fairy') || s.includes('sprite') || s.includes('insect')
  ) return 'fairy_insect';

  // 10. Plant / Nature (새싹/꽃/과일/나무/선인장)
  if (
    s.includes('🌱') || s.includes('🌿') || s.includes('🌸') || s.includes('🌻') || s.includes('🌹') || s.includes('🍎') || s.includes('🍓') || s.includes('🌳') || s.includes('🌵') ||
    s.includes('새싹') || s.includes('풀') || s.includes('꽃') || s.includes('과일') || s.includes('나무') || s.includes('선인장') || s.includes('식물') ||
    s.includes('plant') || s.includes('sprout') || s.includes('flower') || s.includes('tree') || s.includes('fruit') || s.includes('flora')
  ) return 'plant_nature';

  // 11. Humanoid (사람/인물/아기/어린이/얼굴)
  if (
    s.includes('👦') || s.includes('👧') || s.includes('👨') || s.includes('👩') || s.includes('👶') || s.includes('🧑') ||
    s.includes('사람') || s.includes('인물') || s.includes('아이') || s.includes('아기') || s.includes('가족') || s.includes('엄마') || s.includes('아빠') ||
    s.includes('human') || s.includes('person') || s.includes('child') || s.includes('baby') || s.includes('girl') || s.includes('boy') || s.includes('man') || s.includes('woman')
  ) return 'human';

  // 12. Mecha / Object (로봇/기계/자동차/레고/장난감/음식/사물)
  if (
    s.includes('🤖') || s.includes('🚗') || s.includes('🚀') || s.includes('⚙️') || s.includes('🥖') || s.includes('☕') || s.includes('🍞') ||
    s.includes('로봇') || s.includes('자동차') || s.includes('기계') || s.includes('레고') || s.includes('건담') || s.includes('빵') || s.includes('커피') || s.includes('토이') ||
    s.includes('robot') || s.includes('mecha') || s.includes('car') || s.includes('machine') || s.includes('bread') || s.includes('toy') || s.includes('object')
  ) return 'mecha_object';

  return 'canine';
}
export const PETMONG_SPECIES_LIST: PetmongSpeciesSpec[] = [
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
const EMOJI_EVOLUTION_CHAINS: Record<string, string[]> = {
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

export const getEvolvedEmoji = (baseEmoji: string | number = '🐶', level: number | string = 1): string => {
  let actualEmoji: string = String(baseEmoji);
  let actualLevel: number = Number(level) || 1;
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

// 12 Distinct Lineage Lifecycle Growth Specifications (Newborn Infant -> Toddler -> Teen -> Majestic Adult)
interface ArchetypeLifecycleSpec {
  name: string;
  stage1Baby: string;
  stage2Toddler: string;
  stage3Teen: string;
  stage4Adult: string;
}

const ARCHETYPE_LIFECYCLE_MAP: Record<PetmongArchetype, ArchetypeLifecycleSpec> = {
  canine: {
    name: '강아지/늑대/여우 (Canine Lineage)',
    stage1Baby:
      'True newborn puppy/cub stage. 1.0 to 1.2 head-to-body baby bean proportions. Round dumpling body, soft downy puppy fur, tiny folded/floppy baby ears, stubby carrot tail. Still cannot stand tall, playfully lying or crawling on tummy with tiny paws, huge watery innocent baby eyes.',
    stage2Toddler:
      'Playful little puppy/kid stage (개린이). 1.6 to 1.8 heads tall. Now standing up on two little feet, learning to trot and bounce energetically. Ears perking up, tail wagging merrily, mischievous grin with bright curious eyes full of puppy energy.',
    stage3Teen:
      'Lanky, athletic adolescent canine (청소년 아성체). 2.2 to 2.5 heads tall. Baby fat is completely gone; limbs and torso have visibly lengthened into a sleek, agile build. Distinct fur markings and colors, confident and bright standing posture.',
    stage4Adult:
      'Full-grown, magnificent adult canine guardian (완성된 듬직한 어른). 2.8 to 3.2 heads tall. Broad, sturdy chest, luxurious neck ruff/coat and bushy tail, mature and dignified stance radiating unconditional loyalty, deep warmth, and reliable family protection.',
  },
  feline: {
    name: '고양이/호랑이/사자 (Feline Lineage)',
    stage1Baby:
      'True newborn kitten stage. 1.0 to 1.2 head-to-body proportions. Soft little ball of fluff with tiny folded baby ears, rounded chubby cheeks, and a tiny nubby tail. Lying or rolling on its tummy, unable to stand, looking up with huge glossy baby eyes and innocent sweet expression.',
    stage2Toddler:
      'Playful, cheeky kitten toddler stage (캣초딩). 1.6 to 1.8 heads tall. Now standing up on two hind paws, playfully batting front paws in the air, bounding with elastic kitten agility. Ears growing alert and pointed, tail lengthening, brimming with delightful mischief.',
    stage3Teen:
      'Sleek, supple adolescent feline (청소년 냥이). 2.2 to 2.5 heads tall. Torso and long legs have stretched out with graceful, agile feline proportions. Vivid, sharp coat patterns, upright poised posture, clever and caring teenage gaze.',
    stage4Adult:
      'Regal, magnificent adult feline guardian (기품 있는 완성형 어른 냥이). 2.8 to 3.2 heads tall. Noble, full-grown body with rich, velvety fur coat, graceful long tail, stately and calm posture radiating wisdom, supreme elegance, and gentle guardian comfort.',
  },
  rodent: {
    name: '토끼/햄스터/다람쥐 (Rodent Lineage)',
    stage1Baby:
      'Tiny newborn pocket baby kit. 1.0 to 1.2 heads tall. Palm-sized round jelly bean with tiny button nose, short velvety baby ears, and tiny paws tucked against chubby belly. Curled up like a soft warm mochi puff, sweet watery eyes.',
    stage2Toddler:
      'Bouncy toddler bunny/hamster kid. 1.6 to 1.8 heads tall. Standing on two hind feet, cheeks puffed with curiosity, ears standing taller and alert, hopping around with lively springy energy.',
    stage3Teen:
      'Agile, spirited adolescent rodent. 2.1 to 2.4 heads tall. Sleek lengthened body, strong hind legs built for swift hops, beautifully groomed coat, bright and alert youthful expression.',
    stage4Adult:
      'Plush, deeply cuddly adult guardian chief. 2.6 to 3.0 heads tall. Full, dense, comforting coat of fur, majestic long ears and proud posture, radiating profound warmth, gentle peace, and abundant family coziness.',
  },
  large_beast: {
    name: '곰/판다/사슴 (Large Beast Lineage)',
    stage1Baby:
      'Tiny newborn bear cub/fawn. 1.0 to 1.2 heads tall. Incredibly round, clumsy baby puff with stubby limbs, lying on floor hugging a toy or paws, round fuzzy baby ears and innocent sleepy eyes.',
    stage2Toddler:
      'Sturdy little toddler cub. 1.6 to 1.8 heads tall. Wobbly but strong footsteps, standing up proudly on two feet with arms open wide, playful round belly and happy smiling face.',
    stage3Teen:
      'Growing athletic adolescent beast. 2.2 to 2.5 heads tall. Clear growth spurt: broadened shoulders, longer limbs, noble posture, distinct handsome facial structure and thick fur.',
    stage4Adult:
      'Colossal, heartwarming guardian beast (거대한 안식처 어른). 2.8 to 3.2 heads tall. Broad, deeply comforting, and majestic mature build with rich thick fur coat. A mighty yet infinitely gentle family protector that can embrace the entire household.',
  },
  avian: {
    name: '새/병아리/오리/독수리 (Avian Lineage)',
    stage1Baby:
      'Freshly hatched fluffy baby chick/nestling. 1.0 to 1.1 heads tall. Pure yellow/soft pastel downy puff, tiny stubby down-covered wing buds (cannot fly), tiny beak chirping for food, huge innocent baby eyes looking up from the nest.',
    stage2Toddler:
      'Active fledgling little bird. 1.5 to 1.7 heads tall. Standing and trotting swiftly on two little bird feet, flapping cute developing wings, practice hopping with cheerful chirps and lively curiosity.',
    stage3Teen:
      'Sleek, aerodynamic adolescent bird. 2.2 to 2.5 heads tall. Wings have grown broad with distinct flight feathers and vibrant tail plumes. Sleek athletic posture ready to take flight into the sky.',
    stage4Adult:
      'Magnificent celestial guardian bird / sovereign eagle (하늘의 대수호조). 2.8 to 3.2 heads tall. Breathtakingly majestic wingspan, rich royal plumage, crowned head crest, proud noble stance radiating sovereign grace, visionary hope, and celestial protection.',
  },
  aquatic: {
    name: '물범/돌고래/고래/해양생물 (Aquatic Lineage)',
    stage1Baby:
      'Newborn fluffy baby seal pup / tiny dolphin calf. 1.0 to 1.2 heads tall. Round, smooth water drop baby bean, tiny flipper buds, rolling softly on tummy with sweet watery eyes and chubby cheeks.',
    stage2Toddler:
      'Playful toddler marine pup. 1.5 to 1.8 heads tall. Balancing on tail or splashing upright with cheerful flippers open, bouncing waves with bright giggles and sparkling ocean curiosity.',
    stage3Teen:
      'Streamlined, agile adolescent marine companion. 2.2 to 2.5 heads tall. Sleek, hydrodynamic lengthened torso and powerful flukes/fins, gliding smoothly with athletic ocean vitality and confidence.',
    stage4Adult:
      'Majestic sovereign whale/guardian leviathan of the deep. 2.8 to 3.2 heads tall. Grand, noble, serene silhouette with shimmering oceanic crests and deep loving wisdom in its eyes, cradling the family in peaceful ocean harmony.',
  },
  dinosaur: {
    name: '공룡/랩터/티라노/파충류 (Dinosaur Lineage)',
    stage1Baby:
      'Newborn dinosaur hatchling (막 깨어난 아기 공룡). 1.0 to 1.2 heads tall. Round baby belly, soft baby scales, tiny blunt horns, short stubby tail. Crawling clumsily on all fours with big curious baby eyes.',
    stage2Toddler:
      'Bouncy little raptor/dino kid. 1.6 to 1.8 heads tall. Standing tall on two sturdy hind legs, balancing with a wagging tail, running around playfully with little clawed paws and an energetic happy roar.',
    stage3Teen:
      'Strong, muscular adolescent dinosaur. 2.2 to 2.5 heads tall. Stretched athletic torso, firm back ridges/spines, long powerful counter-balancing tail, bold and heroic stance.',
    stage4Adult:
      'Mighty prehistoric apex guardian king (백악기 대수호 공룡). 2.8 to 3.2 heads tall. Stately, armored scales, magnificent crest/horns, towering yet warm and gentle guardian posture, standing as an unshakeable family fortress.',
  },
  dragon_mythical: {
    name: '드래곤/신수/해태/봉황 (Mythical Lineage)',
    stage1Baby:
      'Mythical baby drake / celestial hatchling. 1.0 to 1.2 heads tall. Tiny pearlescent baby scales, soft little nub horns, tiny folded bat-wing buds, curled up on tummy with magical sparkling eyes.',
    stage2Toddler:
      'Playful young mythical creature. 1.6 to 1.8 heads tall. Fluttering tiny dragon wings, scampering and breathing little harmless sparkles of starlight, spirited and full of celestial wonder.',
    stage3Teen:
      'Noble, soaring adolescent dragon. 2.2 to 2.5 heads tall. Wingspan has broadened dramatically, horns have grown sharp and elegant, long serpentine or quadrupedal tail, surrounded by a subtle magical mist.',
    stage4Adult:
      'Eternal sovereign dragon deity / Great Celestial Guardian (전설의 대수호룡). 2.8 to 3.2 heads tall. Grand, sweeping dragon wings, glowing celestial horns and majestic mane, radiating divine blessing, ancient wisdom, and invincible family protection.',
  },
  fairy_insect: {
    name: '나비/무당벌레/요정 (Fairy/Insect Lineage)',
    stage1Baby:
      'Tiny newborn caterpillar grub / glowing droplet sprite. 1.0 to 1.1 heads tall. Cute chubby jelly body, soft antenna nubs, no wings yet, crawling sweetly on leaves with innocent blinking eyes.',
    stage2Toddler:
      'Sprightly toddler fairy bug. 1.5 to 1.7 heads tall. Tiny translucent fluttery wings have sprouted, standing upright on little feet and hovering just above ground, full of magical giggles.',
    stage3Teen:
      'Graceful adolescent butterfly/fairy companion. 2.2 to 2.4 heads tall. Vivid patterned stained-glass wings, slender elegant torso, gliding through the breeze with poise and agility.',
    stage4Adult:
      'Enchanting High Fairy Queen / Great Floral Guardian. 2.7 to 3.1 heads tall. Breathtaking, iridescent multi-layered wings radiating sparkling fairy dust, crowned with flower blossoms and supreme natural grace.',
  },
  plant_nature: {
    name: '새싹/꽃/과일/나무 (Plant Lineage)',
    stage1Baby:
      'Tiny newborn green seedling sprout (아기 새싹). 1.0 to 1.1 heads tall. Tiny cotyledon two-leaf sprout poking out of a round seed/earth pod, chubby baby face, sleepy sweet smile.',
    stage2Toddler:
      'Lively little flower bud toddler. 1.5 to 1.7 heads tall. Green stem has grown into little arms and legs, running and dancing, sporting a cute unopened flower bud hat on head.',
    stage3Teen:
      'Vibrant blossoming adolescent flora spirit. 2.2 to 2.5 heads tall. Slender woody or leafy frame, colorful fragrant petals fully bloomed into a radiant crown, leaves fluttering with life.',
    stage4Adult:
      'Mighty World Tree Spirit / Ancient Guardian Flora (대자연의 수호 세계수). 2.8 to 3.2 heads tall. Broad leafy canopy, golden ripe fruits, glowing nature energy, providing eternal shade, shelter, and vitality for the entire family.',
  },
  human: {
    name: '인물/가족/치비 (Human Lineage)',
    stage1Baby:
      'True newborn infant baby (옹알이하는 갓난아기). 1.0 to 1.2 head-to-body proportions. Chubby baby cheeks, soft downy hair, round diaper tummy, crawling on tummy or kicking feet playfully, big innocent watery eyes.',
    stage2Toddler:
      'Energetic toddler / kindergarten kid (아장아장 어린이). 1.6 to 1.8 heads tall. Standing on two feet, walking, hopping, and exploring with wide beaming smile and rosy cheeks, full of bright childish vitality.',
    stage3Teen:
      'Tall, handsome/pretty adolescent teenager (쑥쑥 자란 청소년). 2.2 to 2.5 heads tall. Noticeable growth spurt: slender neck, longer arms and legs, stylish hair, mature and caring youthful smile.',
    stage4Adult:
      'Dignified, handsome/beautiful mature adult guardian (완성된 듬직한 어른). 2.8 to 3.2 heads tall. Broad confident shoulders, well-proportioned adult build, calm, deeply loving and protective family presence.',
  },
  mecha_object: {
    name: '로봇/자동차/사물/음식 (Mecha/Object Lineage)',
    stage1Baby:
      'Tiny palm-sized nano-bot / mini dough sprite (나노 마이크로봇). 1.0 to 1.1 heads tall. Rounded chibi casing, blinking LED eyes, tiny wobbly wheels or stubby legs, cute beeping baby presence.',
    stage2Toddler:
      'Compact bipedal scout bot / lively little mascot. 1.5 to 1.7 heads tall. Functional bipedal legs, springy antennas, cheerful digital emoji expressions, running around exploring.',
    stage3Teen:
      'High-performance sleek booster mecha / polished mascot. 2.2 to 2.5 heads tall. Aerodynamic armor plating, twin propulsion thrusters, sharp energetic proportions and confident tech posture.',
    stage4Adult:
      'Ultimate Titan Guardian Mecha / Masterpiece Family Protector (궁극의 타이탄 수호 메카). 2.8 to 3.2 heads tall. Heavy duty shining armor, glowing family-heart arc core reactor, shoulder energy shields, towering as an invincible high-tech family guardian.',
  },
};

const STYLE_AESTHETICS: Record<PetmongStylePreset, string> = {
  cozy_creature: "Charming 'Sumone' app aesthetic, minimalist 2D flat kawaii vector creature mascot, clean bold lines, soft pastel tones, rounded cuddly silhouette, zero photorealism.",
  chibi_family: "Adorable 2.5D/2D chibi family webtoon illustration, clean heartwarming line art, cozy gentle coloring, faithful likeness of human facial features, zero uncanny realism.",
  warm_watercolor: "Warm classic storybook illustration, soft watercolor washes and colored pencil outlines, gentle pastel palette, hand-drawn warmth.",
  comic_caricature: "Hilarious, witty and charming cartoon caricature (playful comic strip style), expressive and humorous cartoon energy, bold lively linework, vibrant playful colors.",
};

export const getStageEvolutionPrompt = (
  targetStage: number,
  characterTraits: string = '',
  personalityTrait: string = '',
  stylePreset: PetmongStylePreset = 'cozy_creature',
  archetypeHint?: PetmongArchetype
): string => {
  const chosenStyle = STYLE_AESTHETICS[stylePreset] || STYLE_AESTHETICS.cozy_creature;
  const resolvedArchetype: PetmongArchetype =
    archetypeHint || detectArchetype('', '', characterTraits);
  const spec = ARCHETYPE_LIFECYCLE_MAP[resolvedArchetype] || ARCHETYPE_LIFECYCLE_MAP.canine;

  const baseInstruction = `IMAGE-TO-IMAGE CHARACTER TRUE BIOLOGICAL & PHYSICAL GROWTH EVOLUTION:
Reference character identity: ${characterTraits}
Identified Lineage: ${spec.name}

CRITICAL IDENTITY & STYLE LOCK:
Look carefully at the provided input image. This is the exact character at an earlier growth stage.
You MUST maintain 100% of the character's core visual DNA: exact facial characteristics, eyes/expression, signature color palette, markings, hairstyle/ears/horns, and emotional warmth.
Art Style & Medium: ${chosenStyle}

CRITICAL VISIBLE PHYSICAL GROWTH RULE:
Do NOT keep the character as an identical static doll. The character MUST show dramatic, clear biological maturation from Stage 1 to Stage 4!
- Stage 1 = Genuine newborn infant / baby bean (1.0 to 1.2 heads, lying on tummy / baby crawling)
- Stage 2 = Energetic toddler / little kid (1.6 to 1.8 heads, standing on two feet, playful)
- Stage 3 = Tall, athletic adolescent / juvenile (2.2 to 2.5 heads, lengthened limbs, mature frame)
- Stage 4 = Full-grown magnificent adult guardian (2.8 to 3.2 heads, stately, majestic mature build)

Composition: Prominent full-body framing filling 85% to 90% of canvas with minimal empty padding. Clean solid pure white background (#FFFFFF) only, zero background scenery, zero checkerboard grid.`;

  if (targetStage === 2) {
    return `${baseInstruction}
TARGET EVOLUTION: STAGE 2 (총총이 시절 - Toddler / Playful Little Stage)
Physical Maturation Details:
${spec.stage2Toddler}
Posture & Personality:
Radiating lively ${personalityTrait} energy. Standing up on feet, jumping with joy and exploring, visibly older and more active than Stage 1.`;
  }

  if (targetStage === 3) {
    return `${baseInstruction}
TARGET EVOLUTION: STAGE 3 (포근이 시절 - Adolescent / Tall Juvenile Stage)
Physical Maturation Details:
${spec.stage3Teen}
Posture & Personality:
Noticeable growth spurt! Limbs and torso have grown visibly longer and leaner. Standing tall with confident, caring ${personalityTrait} posture, looking like a dependable youthful companion.`;
  }

  if (targetStage === 4) {
    return `${baseInstruction}
TARGET EVOLUTION: STAGE 4 (지킴이 시절 - Full-Grown Majestic Adult Guardian)
Physical Maturation Details:
${spec.stage4Adult}
Posture & Personality:
The ultimate peak of full-grown maturity and dignity. Stately adult proportions, broad and protective build, peaceful, deep loving ${personalityTrait} gaze as the eternal guardian of the family.`;
  }

  return `${baseInstruction}
TARGET EVOLUTION: STAGE 1 (꼬물이 시절 - True Newborn Baby Infant Stage)
Physical Maturation Details:
${spec.stage1Baby}
Posture & Personality:
Sweet, innocent, baby-like expression with ${personalityTrait} warmth, curled up or crawling on floor.`;
};
