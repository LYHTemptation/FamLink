import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVOLUTION_STAGES, getStageEvolutionPrompt } from './petmongEvolution';

const STAGE_IMAGES_PREFIX = '@famlink_petmong_stages_';

// 1. Get cached stage images for a character: { 1: url, 2: url, 3: url, 4: url }
export async function getPetmongStageImages(characterId) {
  if (!characterId) return {};
  try {
    const raw = await AsyncStorage.getItem(`${STAGE_IMAGES_PREFIX}${characterId}`);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('getPetmongStageImages error:', err);
    return {};
  }
}

// 2. Save a stage image to cache
export async function savePetmongStageImage(characterId, stageNum, imageUrl) {
  if (!characterId || !stageNum || !imageUrl) return {};
  try {
    const current = await getPetmongStageImages(characterId);
    current[stageNum] = imageUrl;
    await AsyncStorage.setItem(`${STAGE_IMAGES_PREFIX}${characterId}`, JSON.stringify(current));
    return current;
  } catch (err) {
    console.error('savePetmongStageImage error:', err);
    return {};
  }
}

// Reset/clear cached stage images for a character (e.g., upon appearance change/reincarnation)
export async function resetPetmongStageImages(characterId) {
  if (!characterId) return;
  try {
    await AsyncStorage.removeItem(`${STAGE_IMAGES_PREFIX}${characterId}`);
  } catch (err) {
    console.error('resetPetmongStageImages error:', err);
  }
}

// Helper: Detect species from emoji or string (10 distinct lineages)
export function detectSpecies(emoji = '', name = '') {
  const s = `${emoji || ''} ${name || ''}`.toLowerCase();
  if (s.includes('🐶') || s.includes('🐕') || s.includes('🐩') || s.includes('🐺') || s.includes('개') || s.includes('강아지') || s.includes('늑대') || s.includes('dog') || s.includes('wolf') || s.includes('canine') || s.includes('hound')) return 'canine';
  if (s.includes('🐱') || s.includes('🐈') || s.includes('🦁') || s.includes('🐯') || s.includes('고양이') || s.includes('냥') || s.includes('호랑이') || s.includes('표범') || s.includes('cat') || s.includes('tiger') || s.includes('feline') || s.includes('panther')) return 'feline';
  if (s.includes('🐰') || s.includes('🐇') || s.includes('토끼') || s.includes('rabbit') || s.includes('bunny') || s.includes('hare') || s.includes('lapine')) return 'rabbit';
  if (s.includes('🐻') || s.includes('🧸') || s.includes('🐼') || s.includes('곰') || s.includes('팬더') || s.includes('판다') || s.includes('bear') || s.includes('panda') || s.includes('ursine')) return 'bear';
  if (s.includes('🐣') || s.includes('🐥') || s.includes('🦅') || s.includes('🦆') || s.includes('새') || s.includes('병아리') || s.includes('독수리') || s.includes('매') || s.includes('bird') || s.includes('chick') || s.includes('avian') || s.includes('phoenix')) return 'bird';
  if (s.includes('🦊') || s.includes('여우') || s.includes('구미호') || s.includes('fox') || s.includes('vulpine') || s.includes('kitsune')) return 'fox';
  if (s.includes('🦌') || s.includes('사슴') || s.includes('꽃사슴') || s.includes('노루') || s.includes('deer') || s.includes('elk') || s.includes('stag') || s.includes('cervine')) return 'deer';
  if (s.includes('🐹') || s.includes('🐿️') || s.includes('🐭') || s.includes('햄스터') || s.includes('다람쥐') || s.includes('hamster') || s.includes('squirrel') || s.includes('rodent')) return 'rodent';
  if (s.includes('🐲') || s.includes('🐉') || s.includes('🦎') || s.includes('용') || s.includes('드래곤') || s.includes('dragon') || s.includes('wyvern') || s.includes('draconian')) return 'dragon';
  if (s.includes('🦭') || s.includes('🐬') || s.includes('🐳') || s.includes('🐋') || s.includes('🦦') || s.includes('물범') || s.includes('수달') || s.includes('고래') || s.includes('seal') || s.includes('otter') || s.includes('whale') || s.includes('aquatic')) return 'aquatic';
  return 'fantasy';
}

// Helper: 4-Stage True Physical & Magical Growth Vector SVG Generator
export function createPetmongSvg(stage = 1, bodyColor = '#FFAAA6', personality = '다정한', speciesHint = 'fantasy') {
  const c = bodyColor || '#FFAAA6';
  const sp = (speciesHint || 'fantasy').toLowerCase();
  const stg = Math.min(Math.max(Number(stage) || 1, 1), 4);

  // 1. Stage-Specific Torso Silhouette & Proportions
  let bodyGeometry = '';
  let legsGeometry = '';
  let eyesGeometry = '';
  let mouthGeometry = '';
  let headDecorations = '';
  let speciesEarsAndHorns = '';
  let speciesWingsAndTail = '';
  let elementalAura = '';

  // -------------------------------------------------------------
  // Base Anatomy across 4 Distinct Growth Tiers
  // -------------------------------------------------------------
  if (stg === 1) {
    // Stage 1 (아기몽 Baby): Compact, chubby round baby bean, big innocent eyes
    bodyGeometry = `
      <ellipse cx="100" cy="126" rx="52" ry="44" fill="${c}" stroke="#2D3142" stroke-width="1.8" />
      <ellipse cx="100" cy="136" rx="26" ry="19" fill="#FFFFFF" opacity="0.45" />
      <ellipse cx="68" cy="128" rx="8" ry="4" fill="#FF4D6D" opacity="0.38" />
      <ellipse cx="132" cy="128" rx="8" ry="4" fill="#FF4D6D" opacity="0.38" />
    `;
    legsGeometry = `
      <ellipse cx="84" cy="164" rx="10" ry="6" fill="${c}" stroke="#2D3142" stroke-width="1.4" />
      <ellipse cx="116" cy="164" rx="10" ry="6" fill="${c}" stroke="#2D3142" stroke-width="1.4" />
    `;
    eyesGeometry = `
      <circle cx="76" cy="114" r="8.5" fill="#2D3142" />
      <circle cx="124" cy="114" r="8.5" fill="#2D3142" />
      <circle cx="79" cy="111" r="3" fill="#FFFFFF" />
      <circle cx="127" cy="111" r="3" fill="#FFFFFF" />
      <circle cx="74" cy="117" r="1.5" fill="#FFFFFF" />
      <circle cx="122" cy="117" r="1.5" fill="#FFFFFF" />
    `;
    mouthGeometry = `<path d="M 94 122 Q 100 128 106 122" stroke="#2D3142" stroke-width="2.5" fill="none" stroke-linecap="round" />`;

  } else if (stg === 2) {
    // Stage 2 (성장기 Rookie): Upright athletic teenager, longer torso, standing feet
    bodyGeometry = `
      <ellipse cx="100" cy="116" rx="46" ry="52" fill="${c}" stroke="#2D3142" stroke-width="2" />
      <path d="M 92 110 Q 100 122 108 110 Q 100 130 92 110 Z" fill="#FFFFFF" opacity="0.65" stroke="#2D3142" stroke-width="1" />
      <ellipse cx="58" cy="122" rx="9" ry="13" transform="rotate(-15 58 122)" fill="${c}" stroke="#2D3142" stroke-width="1.6" />
      <ellipse cx="142" cy="122" rx="9" ry="13" transform="rotate(15 142 122)" fill="${c}" stroke="#2D3142" stroke-width="1.6" />
      <ellipse cx="66" cy="118" rx="7" ry="3.5" fill="#FF4D6D" opacity="0.35" />
      <ellipse cx="134" cy="118" rx="7" ry="3.5" fill="#FF4D6D" opacity="0.35" />
    `;
    legsGeometry = `
      <ellipse cx="76" cy="166" rx="14" ry="9" fill="${c}" stroke="#2D3142" stroke-width="1.8" />
      <ellipse cx="124" cy="166" rx="14" ry="9" fill="${c}" stroke="#2D3142" stroke-width="1.8" />
    `;
    eyesGeometry = `
      <ellipse cx="75" cy="104" rx="7.5" ry="9" fill="#2D3142" />
      <ellipse cx="125" cy="104" rx="7.5" ry="9" fill="#2D3142" />
      <circle cx="77" cy="101" r="2.8" fill="#FFFFFF" />
      <circle cx="127" cy="101" r="2.8" fill="#FFFFFF" />
    `;
    mouthGeometry = `<path d="M 92 118 Q 100 128 108 118" stroke="#2D3142" stroke-width="2.5" fill="none" stroke-linecap="round" />`;

  } else if (stg === 3) {
    // Stage 3 (성숙기 Champion): Broad muscular adult beast, battle-ready stance & claws
    bodyGeometry = `
      <circle cx="48" cy="116" r="16" fill="${c}" stroke="#2D3142" stroke-width="1.8" />
      <circle cx="152" cy="116" r="16" fill="${c}" stroke="#2D3142" stroke-width="1.8" />
      <ellipse cx="100" cy="110" rx="58" ry="58" fill="${c}" stroke="#2D3142" stroke-width="2.2" />
      <path d="M 82 96 Q 100 106 118 96 L 112 126 Q 100 136 88 126 Z" fill="#2D3142" opacity="0.12" />
    `;
    legsGeometry = `
      <ellipse cx="72" cy="168" rx="18" ry="10" fill="${c}" stroke="#2D3142" stroke-width="2" />
      <ellipse cx="128" cy="168" rx="18" ry="10" fill="${c}" stroke="#2D3142" stroke-width="2" />
      <polygon points="64,175 67,169 70,175" fill="#2D3142" />
      <polygon points="122,175 125,169 128,175" fill="#2D3142" />
    `;
    eyesGeometry = `
      <polygon points="64,95 84,92 88,103 68,104" fill="#2D3142" />
      <polygon points="136,95 116,92 112,103 132,104" fill="#2D3142" />
      <circle cx="76" cy="98" r="3" fill="#FF4D6D" />
      <circle cx="124" cy="98" r="3" fill="#FF4D6D" />
      <circle cx="77" cy="97" r="1" fill="#FFFFFF" />
      <circle cx="125" cy="97" r="1" fill="#FFFFFF" />
    `;
    mouthGeometry = `
      <path d="M 90 114 Q 100 124 110 114" stroke="#2D3142" stroke-width="2.5" fill="none" stroke-linecap="round" />
      <polygon points="93,114 96,120 98,114" fill="#FFFFFF" />
      <polygon points="102,114 104,120 107,114" fill="#FFFFFF" />
    `;
    elementalAura = `
      <path d="M 32 105 Q 20 70 42 65" stroke="#3B82F6" stroke-width="3" fill="none" opacity="0.7" stroke-linecap="round" />
      <path d="M 168 105 Q 180 70 158 65" stroke="#3B82F6" stroke-width="3" fill="none" opacity="0.7" stroke-linecap="round" />
    `;

  } else {
    // Stage 4 (궁극체 Mega Guardian): Majestic celestial deity, solar halo, sacred golden armor
    elementalAura = `
      <circle cx="100" cy="52" r="48" fill="none" stroke="#FFD700" stroke-width="3" stroke-dasharray="10 5" opacity="0.9" />
      <circle cx="100" cy="52" r="38" fill="none" stroke="#FDE68A" stroke-width="1.5" opacity="0.65" />
      <polygon points="100,0 103,7 97,7" fill="#FFD700" />
      <polygon points="152,52 145,55 145,49" fill="#FFD700" />
      <polygon points="48,52 55,55 55,49" fill="#FFD700" />
      <polygon points="100,104 103,97 97,97" fill="#FFD700" />
    `;
    bodyGeometry = `
      <circle cx="44" cy="112" r="18" fill="#FFD700" stroke="#B45309" stroke-width="2" />
      <circle cx="156" cy="112" r="18" fill="#FFD700" stroke="#B45309" stroke-width="2" />
      <ellipse cx="100" cy="104" rx="64" ry="64" fill="${c}" stroke="#B45309" stroke-width="2.5" />
      <path d="M 78 86 L 100 100 L 122 86 L 116 118 L 100 128 L 84 118 Z" fill="#FFD700" stroke="#B45309" stroke-width="2" />
      <circle cx="100" cy="108" r="6.5" fill="#00F5D4" stroke="#FFFFFF" stroke-width="1.5" />
    `;
    legsGeometry = `
      <ellipse cx="70" cy="168" rx="18" ry="11" fill="${c}" stroke="#B45309" stroke-width="2" />
      <ellipse cx="130" cy="168" rx="18" ry="11" fill="${c}" stroke="#B45309" stroke-width="2" />
      <polygon points="62,176 66,168 70,176" fill="#FFD700" />
      <polygon points="122,176 126,168 130,176" fill="#FFD700" />
    `;
    eyesGeometry = `
      <polygon points="62,91 84,88 88,99 66,100" fill="#1E293B" stroke="#B45309" stroke-width="1.5" />
      <polygon points="138,91 116,88 112,99 134,100" fill="#1E293B" stroke="#B45309" stroke-width="1.5" />
      <circle cx="75" cy="94" r="4.2" fill="#FFD700" />
      <circle cx="125" cy="94" r="4.2" fill="#FFD700" />
      <circle cx="75" cy="94" r="2" fill="#FFFFFF" />
      <circle cx="125" cy="94" r="2" fill="#FFFFFF" />
    `;
    mouthGeometry = `<path d="M 93 112 Q 100 119 107 112" stroke="#B45309" stroke-width="2.5" fill="none" stroke-linecap="round" />`;
    headDecorations = `
      <polygon points="100,32 104,44 114,44 106,50 109,60 100,54 91,60 94,50 86,44 96,44" fill="#FFD700" stroke="#B45309" stroke-width="1" />
    `;
  }

  // -------------------------------------------------------------
  // 10 Distinct Animal Species Metamorphosis & Lineage Details
  // -------------------------------------------------------------
  if (sp.includes('canine') || sp.includes('dog') || sp.includes('wolf')) {
    // 1. 강아지 / 늑대족
    if (stg === 1) {
      speciesEarsAndHorns = `
        <path d="M 54 92 Q 38 122 56 128 Z" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
        <path d="M 146 92 Q 162 122 144 128 Z" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
      `;
    } else if (stg === 2) {
      speciesEarsAndHorns = `
        <path d="M 64 74 Q 45 42 70 50 Z" fill="${c}" stroke="#2D3142" stroke-width="1.6" />
        <path d="M 136 74 Q 155 42 130 50 Z" fill="${c}" stroke="#2D3142" stroke-width="1.6" />
      `;
      speciesWingsAndTail = `<path d="M 142 128 Q 168 116 160 98 Q 150 108 140 122" fill="${c}" stroke="#2D3142" stroke-width="1.5" />`;
    } else if (stg === 3) {
      speciesEarsAndHorns = `
        <path d="M 58 68 Q 36 28 66 42 Z" fill="${c}" stroke="#2D3142" stroke-width="2" />
        <path d="M 142 68 Q 164 28 134 42 Z" fill="${c}" stroke="#2D3142" stroke-width="2" />
      `;
      speciesWingsAndTail = `
        <path d="M 44 105 C 20 125, 35 155, 65 148 C 42 165, 75 174, 90 164" fill="#FFFFFF" opacity="0.85" />
        <path d="M 156 105 C 180 125, 165 155, 135 148 C 158 165, 125 174, 110 164" fill="#FFFFFF" opacity="0.85" />
        <path d="M 152 125 Q 185 110 178 85 Q 165 98 148 118" fill="${c}" stroke="#2D3142" stroke-width="2" />
      `;
    } else {
      speciesEarsAndHorns = `
        <path d="M 54 62 Q 25 18 64 36 Z" fill="#FFD700" stroke="#B45309" stroke-width="2" />
        <path d="M 146 62 Q 175 18 136 36 Z" fill="#FFD700" stroke="#B45309" stroke-width="2" />
      `;
      speciesWingsAndTail = `
        <path d="M 40 100 C 5 70, -5 40, 22 30 C 16 55, 32 75, 42 94 Z" fill="#FFD700" stroke="#B45309" stroke-width="2" />
        <path d="M 160 100 C 195 70, 205 40, 178 30 C 184 55, 168 75, 158 94 Z" fill="#FFD700" stroke="#B45309" stroke-width="2" />
        <path d="M 156 120 Q 195 95 190 65 Q 175 80 152 110" fill="#FFD700" stroke="#B45309" stroke-width="2" />
      `;
    }

  } else if (sp.includes('feline') || sp.includes('cat') || sp.includes('tiger')) {
    // 2. 고양이 / 호랑이족
    if (stg === 1) {
      speciesEarsAndHorns = `
        <polygon points="60,82 72,56 86,76" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
        <polygon points="140,82 128,56 114,76" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
      `;
    } else if (stg === 2) {
      speciesEarsAndHorns = `
        <polygon points="56,76 70,44 86,70" fill="${c}" stroke="#2D3142" stroke-width="1.6" />
        <polygon points="144,76 130,44 114,70" fill="${c}" stroke="#2D3142" stroke-width="1.6" />
      `;
      speciesWingsAndTail = `<path d="M 142 126 Q 170 120 165 95 Q 155 105 140 120" stroke="#2D3142" stroke-width="3" fill="none" stroke-linecap="round" />`;
    } else if (stg === 3) {
      speciesEarsAndHorns = `
        <polygon points="52,70 68,36 88,64" fill="#E76F51" stroke="#2D3142" stroke-width="2" />
        <polygon points="148,70 132,36 112,64" fill="#E76F51" stroke="#2D3142" stroke-width="2" />
      `;
      speciesWingsAndTail = `
        <path d="M 68 88 L 80 92 L 68 96" stroke="#2D3142" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M 132 88 L 120 92 L 132 96" stroke="#2D3142" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M 150 122 Q 185 110 180 80" stroke="#2D3142" stroke-width="4" fill="none" stroke-linecap="round" />
      `;
    } else {
      speciesEarsAndHorns = `
        <polygon points="50,64 68,26 90,58" fill="#F4A261" stroke="#B45309" stroke-width="2" />
        <polygon points="150,64 132,26 110,58" fill="#F4A261" stroke="#B45309" stroke-width="2" />
      `;
      speciesWingsAndTail = `
        <circle cx="100" cy="48" r="8" fill="#00B4D8" stroke="#FFFFFF" stroke-width="2" />
        <path d="M 38 120 C 10 100, 15 140, 42 145" stroke="#00B4D8" stroke-width="4" fill="none" stroke-linecap="round" />
        <path d="M 162 120 C 190 100, 185 140, 158 145" stroke="#00B4D8" stroke-width="4" fill="none" stroke-linecap="round" />
      `;
    }

  } else if (sp.includes('rabbit') || sp.includes('bunny')) {
    // 3. 토끼 / 달토끼족
    if (stg === 1) {
      speciesEarsAndHorns = `
        <ellipse cx="78" cy="54" rx="10" ry="26" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
        <ellipse cx="122" cy="54" rx="10" ry="26" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
      `;
    } else if (stg === 2) {
      speciesEarsAndHorns = `
        <ellipse cx="75" cy="42" rx="12" ry="36" fill="${c}" stroke="#2D3142" stroke-width="1.6" />
        <ellipse cx="125" cy="42" rx="12" ry="36" fill="${c}" stroke="#2D3142" stroke-width="1.6" />
      `;
      speciesWingsAndTail = `<ellipse cx="146" cy="136" rx="8" ry="8" fill="#FFFFFF" stroke="#2D3142" stroke-width="1.5" />`;
    } else if (stg === 3) {
      speciesEarsAndHorns = `
        <path d="M 64 74 C 48 18, 62 -8, 78 38 Z" fill="${c}" stroke="#2D3142" stroke-width="2" />
        <path d="M 136 74 C 152 18, 138 -8, 122 38 Z" fill="${c}" stroke="#2D3142" stroke-width="2" />
      `;
      speciesWingsAndTail = `
        <path d="M 32 110 Q 50 120 28 130" stroke="#00F5D4" stroke-width="3" fill="none" stroke-linecap="round" />
        <path d="M 168 110 Q 150 120 172 130" stroke="#00F5D4" stroke-width="3" fill="none" stroke-linecap="round" />
      `;
    } else {
      speciesEarsAndHorns = `
        <path d="M 62 68 C 42 8, 62 -18, 80 34 Z" fill="#FFF3B0" stroke="#E0A96D" stroke-width="2" />
        <path d="M 138 68 C 158 8, 138 -18, 120 34 Z" fill="#FFF3B0" stroke="#E0A96D" stroke-width="2" />
      `;
      speciesWingsAndTail = `
        <path d="M 90 26 A 16 16 0 0 0 110 26 A 12 12 0 0 1 90 26" fill="#FFD700" />
        <path d="M 32 88 C 12 128, 32 158, 48 148" stroke="#FFD700" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.85" />
        <path d="M 168 88 C 188 128, 168 158, 152 148" stroke="#FFD700" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.85" />
      `;
    }

  } else if (sp.includes('bear') || sp.includes('panda')) {
    // 4. 곰 / 판다족
    speciesEarsAndHorns = `
      <circle cx="66" cy="70" r="15" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
      <circle cx="134" cy="70" r="15" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
    `;
    if (stg >= 3) {
      headDecorations = `<circle cx="100" cy="50" r="12" fill="#E2E8F0" opacity="0.5" />`;
    }
    if (stg >= 4) {
      headDecorations = `
        <polygon points="85,38 100,20 115,38 100,34" fill="#FFD700" stroke="#B45309" stroke-width="1.5" />
      `;
    }

  } else if (sp.includes('bird') || sp.includes('chick') || sp.includes('avian')) {
    // 5. 새 / 피닉스족
    mouthGeometry = `<polygon points="94,115 106,115 100,126" fill="#F4A261" stroke="#2D3142" stroke-width="1.5" />`;
    if (stg === 1) {
      speciesWingsAndTail = `<path d="M 100 62 Q 95 46 106 42 Q 108 52 100 62" fill="#F4A261" />`;
    } else if (stg === 2) {
      speciesWingsAndTail = `
        <path d="M 42 115 Q 28 105 42 125 Z" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
        <path d="M 158 115 Q 172 105 158 125 Z" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
      `;
    } else if (stg === 3) {
      speciesWingsAndTail = `
        <path d="M 44 110 C 12 80, 8 122, 48 135 Z" fill="#2A9D8F" stroke="#2D3142" stroke-width="2" />
        <path d="M 156 110 C 188 80, 192 122, 152 135 Z" fill="#2A9D8F" stroke="#2D3142" stroke-width="2" />
      `;
    } else {
      speciesWingsAndTail = `
        <path d="M 44 110 C -8 55, -12 135, 48 140 Z" fill="#E76F51" stroke="#FFD700" stroke-width="2" />
        <path d="M 156 110 C 208 55, 212 135, 152 140 Z" fill="#E76F51" stroke="#FFD700" stroke-width="2" />
      `;
    }

  } else if (sp.includes('fox')) {
    // 6. 여우 / 구미호족
    speciesEarsAndHorns = `
      <polygon points="56,76 68,36 86,66" fill="#F4A261" stroke="#2D3142" stroke-width="1.8" />
      <polygon points="144,76 132,36 114,66" fill="#F4A261" stroke="#2D3142" stroke-width="1.8" />
    `;
    if (stg >= 2) {
      speciesWingsAndTail = `<path d="M 145 130 Q 185 110 175 80 Q 160 95 142 120" fill="#F4A261" stroke="#2D3142" stroke-width="1.8" />`;
    }
    if (stg >= 4) {
      speciesWingsAndTail = `
        <path d="M 28 100 Q 5 60 35 45" stroke="#FFD700" stroke-width="3" fill="none" opacity="0.8" />
        <path d="M 172 100 Q 195 60 165 45" stroke="#FFD700" stroke-width="3" fill="none" opacity="0.8" />
      `;
    }

  } else if (sp.includes('deer')) {
    // 7. 사슴 / 신록족
    speciesEarsAndHorns = `
      <ellipse cx="62" cy="72" rx="8" ry="16" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
      <ellipse cx="138" cy="72" rx="8" ry="16" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
    `;
    if (stg === 2) {
      headDecorations = `
        <path d="M 76 66 L 72 50" stroke="#8D6E63" stroke-width="3" stroke-linecap="round" />
        <path d="M 124 66 L 128 50" stroke="#8D6E63" stroke-width="3" stroke-linecap="round" />
      `;
    } else if (stg === 3) {
      headDecorations = `
        <path d="M 76 65 Q 52 32 42 22 M 52 32 Q 36 38 34 46" stroke="#8D6E63" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <path d="M 124 65 Q 148 32 158 22 M 148 32 Q 164 38 166 46" stroke="#8D6E63" stroke-width="3.5" fill="none" stroke-linecap="round" />
      `;
    } else if (stg === 4) {
      headDecorations = `
        <path d="M 74 65 Q 42 22 32 10 M 42 22 Q 22 32 18 42" stroke="#00F5D4" stroke-width="4" fill="none" stroke-linecap="round" />
        <path d="M 126 65 Q 158 22 168 10 M 158 22 Q 178 32 182 42" stroke="#00F5D4" stroke-width="4" fill="none" stroke-linecap="round" />
        <circle cx="32" cy="10" r="4" fill="#FFD700" />
        <circle cx="168" cy="10" r="4" fill="#FFD700" />
      `;
    }

  } else if (sp.includes('dragon')) {
    // 9. 용 / 드래곤족
    speciesEarsAndHorns = `
      <polygon points="62,70 48,42 74,56" fill="#52B788" stroke="#2D3142" stroke-width="1.8" />
      <polygon points="138,70 152,42 126,56" fill="#52B788" stroke="#2D3142" stroke-width="1.8" />
    `;
    if (stg >= 2) {
      speciesWingsAndTail = `
        <path d="M 44 110 C 14 78 4 124 48 134 Z" fill="#52B788" stroke="#2D3142" stroke-width="2" />
        <path d="M 156 110 C 186 78 196 124 152 134 Z" fill="#52B788" stroke="#2D3142" stroke-width="2" />
      `;
    }
    if (stg >= 4) {
      headDecorations = `<circle cx="100" cy="54" r="8" fill="#00F5D4" stroke="#FFFFFF" stroke-width="2" />`;
    }

  } else {
    // 10. 판타지 / 일반 영물
    if (stg === 1) {
      headDecorations = `<path d="M 100 60 Q 95 44 106 40 Q 108 50 100 60" fill="#84DCC6" />`;
    } else if (stg === 2) {
      speciesEarsAndHorns = `
        <path d="M 70 72 Q 58 46 76 56 Z" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
        <path d="M 130 72 Q 142 46 124 56 Z" fill="${c}" stroke="#2D3142" stroke-width="1.5" />
      `;
    } else if (stg === 3) {
      speciesEarsAndHorns = `
        <path d="M 60 70 C 38 38, 42 20, 66 34 C 58 46, 62 60, 66 70 Z" fill="#4A5568" stroke="#2D3142" stroke-width="1.8" />
        <path d="M 140 70 C 162 38, 158 20, 134 34 C 142 46, 138 60, 134 70 Z" fill="#4A5568" stroke="#2D3142" stroke-width="1.8" />
      `;
    } else {
      speciesWingsAndTail = `
        <path d="M 44 112 C 4 75, -6 40, 28 26 C 22 52, 36 72, 46 92 Z" fill="#FFD700" stroke="#B45309" stroke-width="2" />
        <path d="M 156 112 C 196 75, 206 40, 172 26 C 178 52, 164 72, 154 92 Z" fill="#FFD700" stroke="#B45309" stroke-width="2" />
      `;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    ${elementalAura}
    ${speciesWingsAndTail}
    ${legsGeometry}
    ${speciesEarsAndHorns}
    ${bodyGeometry}
    ${eyesGeometry}
    ${mouthGeometry}
    ${headDecorations}
  </svg>`;

  const base64 = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg).toString('base64');

  return `data:image/svg+xml;base64,${base64}`;
}

// Helper: Extract or fetch base64 data ({ mimeType, data }) from data URI or remote HTTP(S) URL
export async function getImageBase64Data(imgSource) {
  if (!imgSource || typeof imgSource !== 'string') return null;
  // If data URI
  if (imgSource.startsWith('data:image')) {
    const mimeMatch = imgSource.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const data = imgSource.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
    return { mimeType, data };
  }
  // If remote URL (http/https)
  if (imgSource.startsWith('http://') || imgSource.startsWith('https://')) {
    try {
      const resp = await fetch(imgSource);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const mimeType = blob.type || 'image/png';
      if (typeof FileReader !== 'undefined') {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result;
            if (typeof res === 'string') {
              const data = res.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
              resolve({ mimeType, data });
            } else {
              resolve(null);
            }
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } else if (typeof Buffer !== 'undefined') {
        const buffer = await resp.arrayBuffer();
        const data = Buffer.from(buffer).toString('base64');
        return { mimeType, data };
      }
    } catch (e) {
      console.warn('Failed to fetch image as base64:', e);
      return null;
    }
  }
  return null;
}

// 3. Generate a specific stage image for a petmong using AI (Strict Lineage Chaining)
export async function generateStageAiImage(character, targetStage) {
  if (!character) throw new Error('No character to evolve');

  // Chaining: Stage 2 builds on Stage 1; Stage 3 builds on Stage 2; Stage 4 builds on Stage 3
  const cachedStages = await getPetmongStageImages(character.id);
  let refImage = null;
  if (targetStage === 4) {
    refImage = cachedStages[3] || cachedStages[2] || cachedStages[1] || character.image_url;
  } else if (targetStage === 3) {
    refImage = cachedStages[2] || cachedStages[1] || character.image_url;
  } else {
    refImage = cachedStages[1] || character.image_url;
  }

  const clientApiKey = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GEMINI_API_KEY) || '';
  let evolvedImageUrl = null;
  let detectedColor = '#FFAAA6';
  let detectedSpecies = detectSpecies(character.emoji, character.name);
  let characterTraits = `${character.name} (${detectedSpecies})`;

  // Extract visual DNA from previous stage reference image (SVG or Raster)
  let refBase64Data = null;
  if (refImage) {
    const isSvg = refImage.includes('image/svg') || refImage.includes('<svg');
    if (isSvg) {
      try {
        const cleanB64 = refImage.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
        let rawSvg = '';
        if (typeof atob !== 'undefined') {
          rawSvg = atob(cleanB64);
        } else if (typeof Buffer !== 'undefined') {
          rawSvg = Buffer.from(cleanB64, 'base64').toString('utf8');
        }

        if (rawSvg) {
          // Extract specific body fill color (ignore outline, white, and blush)
          const fillMatches = [...rawSvg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map(m => m[1]);
          const candidateColor = fillMatches.find(c => c !== '#2D3142' && c !== '#FFFFFF' && c !== '#FF4D6D' && c !== '#000000');
          if (candidateColor) {
            detectedColor = candidateColor;
          } else {
            const allHex = rawSvg.match(/#[0-9a-fA-F]{6}/g);
            if (allHex && allHex.length > 0) detectedColor = allHex[0];
          }
        }
      } catch (_) {}
    } else {
      // Remote HTTPS URL or Data URI
      try {
        refBase64Data = await getImageBase64Data(refImage);
      } catch (err) {
        console.warn('Failed to extract reference image base64:', err);
      }
    }
  }

  // Vision Analysis to extract precise visual features if raster base64 is available
  if (clientApiKey && refBase64Data?.data) {
    try {
      const visionResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: refBase64Data.mimeType === 'image/svg+xml' ? 'image/png' : refBase64Data.mimeType,
                    data: refBase64Data.data
                  }
                },
                {
                  text: 'Analyze this creature mascot in detail. Describe its species, primary body color (hex code), facial features (eyes shape, expression, blush, smile), body shape, ears/horns/tail, and any unique accessories in 2-3 sentences. Focus strictly on visual identity so it can be evolved consistently.'
                }
              ]
            }]
          })
        }
      );
      if (visionResp.ok) {
        const vData = await visionResp.json();
        const txt = vData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (txt) {
          characterTraits = txt;
          const colMatch = txt.match(/#[0-9a-fA-F]{6}/);
          if (colMatch) detectedColor = colMatch[0];
        }
      }
    } catch (visionErr) {
      console.warn('Vision analysis fallback:', visionErr);
    }
  }

  // Direct client Image-to-Image with Gemini / Imagen (Multimodal image-first reference)
  if (!evolvedImageUrl && clientApiKey) {
    const stagePrompt = getStageEvolutionPrompt(
      targetStage,
      `Character Visual Identity: ${characterTraits}`,
      character.personality || '다정한'
    );

    const imgCandidates = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image'];
    for (const m of imgCandidates) {
      try {
        const parts = [];
        // Supply base character image first so the model references visual identity directly
        if (refBase64Data?.data) {
          parts.push({
            inlineData: {
              mimeType: refBase64Data.mimeType === 'image/svg+xml' ? 'image/png' : refBase64Data.mimeType,
              data: refBase64Data.data
            }
          });
        }
        parts.push({ text: stagePrompt });

        const imgResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${clientApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
          }
        );

        if (imgResp.ok) {
          const imgData = await imgResp.json();
          const imgPart = (imgData.candidates?.[0]?.content?.parts || []).find(p => p.inlineData);
          if (imgPart?.inlineData?.data) {
            evolvedImageUrl = `data:${imgPart.inlineData.mimeType || 'image/jpeg'};base64,${imgPart.inlineData.data}`;
            break;
          }
        }
      } catch (err) {
        console.log(`Image generation attempt on ${m}:`, err);
      }
    }
  }

  // 3. True Physical & Lineage Growth Vector SVG Fallback (instant & guaranteed)
  if (!evolvedImageUrl) {
    evolvedImageUrl = createPetmongSvg(targetStage, detectedColor, character.personality || '다정한', detectedSpecies);
  }

  if (evolvedImageUrl) {
    await savePetmongStageImage(character.id, targetStage, evolvedImageUrl);
    return evolvedImageUrl;
  }

  throw new Error('Failed to generate evolved image');
}

// 4. Background Queue Manager for Stages 2, 3, 4 (Sequential Lineage Growth)
const runningJobs = new Set();

export async function startBackgroundStagePreGeneration(character, onStageUpdated) {
  if (!character?.id || !character?.image_url) return;
  if (runningJobs.has(character.id)) return;

  runningJobs.add(character.id);

  try {
    const existing = await getPetmongStageImages(character.id);

    // Save Stage 1 as the original image if not yet saved
    if (!existing[1] && character.image_url) {
      await savePetmongStageImage(character.id, 1, character.image_url);
      if (onStageUpdated) onStageUpdated(1, character.image_url);
    }

    // Stages to generate sequentially: 2, 3, 4
    const stagesToGenerate = [2, 3, 4].filter(s => !existing[s]);

    for (const stage of stagesToGenerate) {
      try {
        console.log(`[Background Stage Generator] Starting Stage ${stage} generation for ${character.name}...`);
        const evolvedUrl = await generateStageAiImage(character, stage);
        if (evolvedUrl && onStageUpdated) {
          onStageUpdated(stage, evolvedUrl);
        }
        // Graceful pause between AI calls
        await new Promise(r => setTimeout(r, 1500));
      } catch (stageErr) {
        console.warn(`[Background Stage Generator] Stage ${stage} generation paused:`, stageErr);
        break; // Pause if network or rate limit happens
      }
    }
  } finally {
    runningJobs.delete(character.id);
  }
}
