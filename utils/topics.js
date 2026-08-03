// FamLink Daily Small-talk Topics Rotation Utility

export const PREDEFINED_TOPICS = [
  '오늘 가장 많이 웃었던 일은 무엇인가요? 😂',
  '최근에 산 물건 중 가장 마음에 드는 것은 무엇인가요? 🛍️',
  '가족들과 다 함께 가보고 싶은 버킷리스트 여행지는? ✈️',
  '오늘 나에게 어울리는 노래 한 곡을 추천한다면? 🎵',
  '어릴 때 가장 좋아했던 추억의 간식은 무엇인가요? 🍭',
  '만약 오늘 갑자기 100만 원이 생긴다면 어떻게 쓰고 싶나요? 💸',
  '가족 중 누군가에게 최근 고마웠던 순간은 언제인가요? 💕',
  '오늘 하루 열심히 보낸 나에게 해주고 싶은 칭찬 한마디는? 🌟',
  '요즘 새롭게 관심이 가거나 즐겨 하는 취미가 있나요? 🎮',
  '다 같이 모여서 배달시켜 먹고 싶은 최애 야식 메뉴는? 🍕',
  '이번 주말에 꼭 하고 싶은 여가 활동은 무엇인가요? 📅',
  '최근에 본 영화나 드라마 중 추천할 만한 작품은? 🎬',
  '오늘 본 하늘의 모습이나 오늘 기분을 이모지로 표현해 주세요! ☀️',
  '내가 생각하는 우리 가족의 가장 큰 매력이나 장점은? 👨‍👩‍👧‍👦',
  '최근에 다른 사람 몰래 했던 소소한 선행이 있나요? 😇',
  '만약 영화 속 주인공이나 초능력자가 된다면 어떤 능력을 갖고 싶나요? 🦸',
  '학창 시절 기억에 남는 소풍이나 추억의 장소는 어디인가요? 🏫',
  '오늘 먹었던 식사 중 가장 맛있었던 메뉴는? 🍱',
  '집 안에서 가장 마음이 편해지는 나만의 공간은 어디인가요? 🏠',
  '나를 동물로 표현한다면 어떤 동물에 가장 가깝다고 생각하나요? 🦁',
];

export function getTopicForToday() {
  const today = new Date();
  
  // Calculate day of year (0-365)
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  // Deterministic pick based on date
  const index = dayOfYear % PREDEFINED_TOPICS.length;
  return PREDEFINED_TOPICS[index];
}
