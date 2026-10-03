// FamLink Daily Small-talk Topics Rotation Utility

/**
 * 문자열에서 모든 유니코드 이모티콘을 완벽하게 제거하고 공백을 정돈합니다.
 */
export function stripEmojis(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FE}\u{25FD}\u{200D}\u{FE0F}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

// 이모티콘이 전혀 없는 순수 고품질 가족 소통 질문 리스트
export const PREDEFINED_TOPICS = [
  '오늘 하루 중 가장 많이 웃었던 일은 무엇인가요?',
  '최근에 산 물건 중 가장 마음에 드는 것은 무엇인가요?',
  '가족들과 다 함께 꼭 가보고 싶은 버킷리스트 여행지는 어디인가요?',
  '오늘 나에게 어울리는 노래 한 곡을 추천한다면?',
  '어릴 때 가장 좋아했던 추억의 간식은 무엇인가요?',
  '만약 오늘 갑자기 100만 원이 생긴다면 어떻게 쓰고 싶나요?',
  '가족 중 누군가에게 최근 고마웠던 순간은 언제인가요?',
  '오늘 하루 열심히 보낸 나에게 해주고 싶은 칭찬 한마디는?',
  '요즘 새롭게 관심이 가거나 즐겨 하는 취미가 있나요?',
  '다 같이 모여서 배달시켜 먹고 싶은 최애 야식 메뉴는 무엇인가요?',
  '이번 주말에 가족과 꼭 함께하고 싶은 여가 활동은 무엇인가요?',
  '최근에 본 영화나 드라마 중 가족에게 추천하고 싶은 작품은 무엇인가요?',
  '오늘 본 하늘의 모습이나 오늘 하루 기분을 한 단어로 표현한다면?',
  '내가 생각하는 우리 가족의 가장 큰 매력이나 장점은 무엇인가요?',
  '최근에 다른 사람 몰래 했던 소소한 선행이나 배려가 있나요?',
  '만약 영화 속 주인공이나 초능력자가 된다면 어떤 능력을 갖고 싶나요?',
  '학창 시절 가장 기억에 남는 소풍이나 추억의 장소는 어디인가요?',
  '오늘 먹었던 식사 중 가장 맛있었던 메뉴는 무엇인가요?',
  '집 안에서 가장 마음이 편해지는 나만의 공간은 어디인가요?',
  '나를 동물로 표현한다면 어떤 동물에 가장 가깝다고 생각하나요?',
  '내가 가장 좋아하는 계절과 그 계절이 기다려지는 이유는 무엇인가요?',
  '우리 가족만의 특별한 습관이나 닮은 점이 있다면 무엇인가요?',
  '힘들거나 지칠 때 나에게 가장 큰 위로가 되는 것은 무엇인가요?',
  '타임머신이 있다면 과거와 미래 중 어디로 가보고 싶나요?',
  '가족들에게 평소 쑥스러워서 전하지 못했던 고마운 마음이 있다면 무엇인가요?',
  '내 인생에서 가장 큰 용기를 내었던 순간은 언제인가요?',
  '나만의 스트레스 해소법이나 기분 전환 방법이 있다면 무엇인가요?',
  '요즘 나를 가장 설레게 하거나 기대되는 일은 무엇인가요?',
  '10년 뒤 우리 가족은 어떤 모습으로 살아가고 있을까요?',
  '가족에게 듣고 싶은 따뜻한 응원의 한마디는 무엇인가요?',
];

export function getTopicForDate(date = new Date()) {
  const d = new Date(date);
  // Calculate day of year (0-365)
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Deterministic pick based on date
  const index = Math.abs(dayOfYear) % PREDEFINED_TOPICS.length;
  return stripEmojis(PREDEFINED_TOPICS[index]);
}

export function getTopicForToday() {
  return getTopicForDate(new Date());
}
