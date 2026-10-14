/**
 * FamLink SmallTalk & Family Chore Smart Category Helpers (TypeScript)
 */

export interface ChoreIconMeta {
  icon: string;
  category: string;
  iconBg: string;
  tagColor: string;
}

export const getChoreIconMeta = (
  category?: string | null,
  title: string = ''
): ChoreIconMeta => {
  const safe = (title || '').toLowerCase();
  if (
    safe.includes('분리수거') ||
    safe.includes('쓰레기') ||
    safe.includes('음식물') ||
    safe.includes('재활용')
  ) {
    return { icon: '🗑️', category: '분리수거', iconBg: '#C7D2FE', tagColor: '#1E40AF' };
  }
  if (safe.includes('설거지') || safe.includes('식기') || safe.includes('그릇')) {
    return { icon: '🍽️', category: '설거지', iconBg: '#F5F0E8', tagColor: '#78716C' };
  }
  if (
    safe.includes('식탁') ||
    safe.includes('요리') ||
    safe.includes('밥') ||
    safe.includes('저녁') ||
    safe.includes('아침') ||
    safe.includes('점심')
  ) {
    return { icon: '🍳', category: '식사/요리', iconBg: '#FDE68A', tagColor: '#78350F' };
  }
  if (
    safe.includes('청소기') ||
    safe.includes('청소') ||
    safe.includes('물걸레') ||
    safe.includes('걸레') ||
    safe.includes('정리') ||
    safe.includes('환기')
  ) {
    return { icon: '🧹', category: '청소/정리', iconBg: '#DDD6FE', tagColor: '#5B21B6' };
  }
  if (
    safe.includes('빨래') ||
    safe.includes('세탁') ||
    safe.includes('건조기') ||
    safe.includes('이불') ||
    safe.includes('옷')
  ) {
    return { icon: '🧺', category: '세탁/빨래', iconBg: '#FED7AA', tagColor: '#9A3412' };
  }
  if (
    safe.includes('산책') ||
    safe.includes('브루노') ||
    safe.includes('강아지') ||
    safe.includes('고양이') ||
    safe.includes('배변')
  ) {
    return { icon: '🐕', category: '반려동물', iconBg: '#A7F3D0', tagColor: '#064E3B' };
  }
  if (
    safe.includes('화분') ||
    safe.includes('식물') ||
    safe.includes('물 주기') ||
    safe.includes('물주기')
  ) {
    return { icon: '🌿', category: '식물관리', iconBg: '#BBF7D0', tagColor: '#166534' };
  }
  if (
    safe.includes('욕실') ||
    safe.includes('화장실') ||
    safe.includes('세면대') ||
    safe.includes('변기')
  ) {
    return { icon: '🚿', category: '욕실청소', iconBg: '#BFDBFE', tagColor: '#1E40AF' };
  }
  if (
    safe.includes('마트') ||
    safe.includes('장보기') ||
    safe.includes('심부름') ||
    safe.includes('택배') ||
    safe.includes('우유') ||
    safe.includes('사오기')
  ) {
    return { icon: '🛒', category: '심부름', iconBg: '#FBCFE8', tagColor: '#9D174D' };
  }

  const presetMap: Record<string, ChoreIconMeta> = {
    야외: { icon: '🌿', category: '야외', iconBg: '#A7F3D0', tagColor: '#064E3B' },
    거실: { icon: '🛋️', category: '거실', iconBg: '#DDD6FE', tagColor: '#5B21B6' },
    기타: { icon: '📋', category: '기타', iconBg: '#F5F0E8', tagColor: '#78716C' },
    침실: { icon: '🛏️', category: '침실', iconBg: '#FBCFE8', tagColor: '#9D174D' },
    욕실: { icon: '🚿', category: '욕실', iconBg: '#BFDBFE', tagColor: '#1E40AF' },
    주방: { icon: '🍳', category: '주방', iconBg: '#FDE68A', tagColor: '#78350F' },
  };

  if (category && presetMap[category]) {
    return presetMap[category];
  }

  return {
    icon: '✅',
    category: category || '할 일',
    iconBg: '#E8E0D0',
    tagColor: '#1C1917',
  };
};

export const renderGoalCategorySvg = (): null => null;
