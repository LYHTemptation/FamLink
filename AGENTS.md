# 🚀 FamLink — Google Antigravity & AI Agent Engineering Guide

이 문서는 **FamLink(팜링크)** 저장소에서 작업하는 AI 코딩 에이전트(**Google Antigravity**, **Gemini 3.8 Flash / Gemini 4 Argon**, **Claude Code**)가 최소한의 토큰·쿼터 소모로 가장 빠르고 정확하게 코드를 수정하도록 설계된 핵심 규칙서입니다.

---

## 1. ⚡ Antigravity 에이전트 핵심 동작 규칙 (Agentic Workflow Rules)

1. **한국어 소통 및 커밋 메시지**:
   - 사용자와의 모든 응답, 작업 요약, `git commit` 메시지는 **명확하고 간결한 한국어**로 작성하세요.
   - 불필요한 인사말이나 서론을 생략하고, 변경 원인과 수정된 파일·핵심 로직만 간결하게 브리핑하세요.
2. **채팅창 전체 코드 덤프 금지 & 정밀 파일 편집 (Targeted Diff Edit)**:
   - 사용자가 명시적으로 요청하지 않는 한, 채팅창에 수백 줄짜리 마크다운 코드 블록을 출력하지 마세요(토큰 및 5시간/주간 쿼터 낭비 방지).
   - 파일 편집 도구를 사용해 **수정이 필요한 함수·컴포넌트·스타일 구간만 정밀하게 수정**하세요.
3. **불필요한 외부 문서 브라우징 금지**:
   - 이미 프로젝트에 검증된 패턴(`theme/`, `services/`, `components/`)이 존재하므로, 매 작업마다 외부 Expo 문서를 웹 브라우징하지 마세요.
4. **모호한 요구사항 확인**:
   - 기획 의도나 데이터 스키마가 불분명할 때는 임의로 추측해 대규모 코드를 작성하지 말고, 먼저 짧은 선택지로 질문하세요.

---

## 2. 🏗️ 기술 스택 및 모듈화 아키텍처 맵 (Tech Stack & Architecture Map)

### 기술 스택 기준 버전 (`package.json` 실제 스펙)
- **Framework**: Expo SDK 57 (`expo: ^57.0.22`), React Native `0.86.3`, React `19.2.3`, React Native Web `^0.21.0`
- **Language**: TypeScript (`~6.0.3`, 신규·분리 모듈 `.ts`/`.tsx` 필수) & JavaScript (`.js` 점진적 전환 중)
- **Backend / DB**: Supabase (`@supabase/supabase-js: ^2.108.2`, PostgreSQL, Realtime Broadcast & Postgres Changes, Storage, 가족 단위 RLS)
- **AI**: Google Gemini REST API (`services/geminiService.ts` 경유)

### 디렉토리 및 모듈 책임 경계 (파일 탐색 최소화 가이드)
새 기능을 추가하거나 수정할 때 **단일 화면 파일(`PhotobookStudioScreen.js`, `ChatScreen.js`, `SmallTalkScreen.js`, `App.js`)에 인라인으로 코드를 누적하지 말고**, 아래 모듈 구조에 맞춰 분리 작성하세요:

```text
FamLink/
├── App.js                                  # 루트 상태 컨테이너 및 화면 라우팅
├── types/
│   └── domain.ts                           # 전역 도메인 인터페이스 (FamilyMember, UserProfile, ChatMessage 등)
├── theme/                                  # 디자인 시스템 단일 진실 공급원 (SSOT)
│   ├── colors.ts                           # Warm Cozy Living 컬러 토큰
│   ├── typography.ts                       # 폰트 크기 및 두께 스케일
│   ├── commonStyles.ts                     # 공통 화면/카드/버튼/모달 스타일
│   └── index.ts                            # 테마 통합 export
├── services/                               # 외부 API 및 Supabase DB 비즈니스 로직 계층 (UI 내 직접 호출 금지)
│   ├── geminiService.ts                    # Gemini 2.5 Flash 텍스트·비전·이미지 생성 통합 서비스
│   ├── photobookService.ts                 # 포토북 DB 동기화(family_photobooks) 및 주문(photobook_orders)
│   ├── smallTalkService.ts                 # 스몰톡 질문 DB 조회·시딩 및 일자별 매핑
│   └── familyDataService.ts                # 반복 집안일 자정 리셋, 메시지 포맷팅, 반려몽 생체 게이지 계산
├── lib/                                    # 코어 클라이언트 및 엔진 유틸리티 (TypeScript)
│   ├── supabase.ts                         # Supabase 클라이언트 인스턴스
│   ├── aiSystemPrompts.ts                  # Gemini 표준 시스템 프롬프트 & 페이로드 빌더
│   ├── imageTransparencyService.ts         # 온디바이스 BFS 배경 투명화 파이프라인 & useTransparentImage 훅
│   ├── petmongEvolution.ts                 # 반려몽 4단계 성장 마일스톤 및 진화 프롬프트 스펙
│   └── petmongEvolutionService.ts          # 반려몽 단계별 AI 이미지 체이닝 및 캐시/스토리지 동기화
├── utils/                                  # 순수 유틸리티 (TypeScript)
│   ├── errorHandler.ts                     # 전역 에러 알림 핸들러
│   ├── koreanHolidays.ts                   # 2024~2030 대한민국 법정·대체공휴일 계산기
│   ├── notifications.ts                    # Expo Push 알림 토큰 발급 및 전송
│   ├── topics.ts                           # 이모지 제거(stripEmojis) 및 기본 스몰톡 질문 풀
│   └── webAlertPolyfill.ts                 # React Native Web 전용 Alert.alert 폴리필
└── components/                             # 화면 및 도메인별 서브 패키지
    ├── app/                                # AppNavigationShell.tsx, appConstants.ts, AppStyles.ts
    ├── photobook/                          # photobookConstants.ts, PhotobookHudModals.tsx, PhotobookStyles.ts
    ├── chat/                               # chatHelpers.ts, ChatAttachmentModals.tsx, ChatStyles.ts
    ├── smalltalk/                          # smallTalkHelpers.ts, SmallTalkModals.tsx, SmallTalkStyles.ts
    ├── minigames/                          # SnackCatchGame.js, CardMatchGame.js, BubblePopGame.js, DreamConstellationGame.js
    ├── icons/                              # 커스텀 SVG 아이콘 팩 (MoodIcons.tsx 등)
    ├── HomeScreen.js                       # 통합 홈 대시보드
    ├── ChatScreen.js                       # 실시간 가족 메신저 메인 뷰
    ├── SmallTalkScreen.js                  # 오늘 함께(스몰톡·집안일·미니게임) 메인 뷰
    ├── InteriorScreen.js & InteriorStyles.ts # 반려몽 감성 거실 룸 & 외형/테마 관리
    ├── PetmongGameEngine.js                # 가족 대화 온기 흡수 자율 성장 엔진 & 비밀 귓속말
    ├── PetmongGrowthBookModal.js           # 반려몽 4단계 성장 앨범 모달
    ├── PhotoAlbumScreen.tsx                # 포토북 스튜디오 & 스몰톡 아카이브 탭 컨테이너
    ├── PhotobookStudioScreen.js            # 150×210mm A5 16P 포토북 조판 캔버스
    ├── CalendarScreen.js                   # 공유 캘린더 & 공휴일/D-Day
    ├── ShoppingListScreen.js               # 장보기 & 집안일 체크리스트
    ├── FamilyScreen.js                     # 가족 구성원(최대 10인) & 프로필/기분 관리
    └── UserAvatar.tsx                      # 다중 포맷(URL/Base64/이모지) 원형 아바타
```

---

## 3. 🧠 AI (Gemini) 및 Supabase 연동 규칙

### Gemini API 호출 규칙 (`services/geminiService.ts` 일원화)
- **컴포넌트 내 직접 `fetch` 금지**: 화면 컴포넌트(`.js`/`.tsx`) 내부에서 `generativelanguage.googleapis.com` 엔드포인트를 직접 호출하거나 `process.env.EXPO_PUBLIC_GEMINI_API_KEY`를 직접 읽지 마세요. 반드시 **`services/geminiService.ts`**의 함수를 호출하거나 확장하세요.
- **API 키 하드코딩 절대 금지**: 모든 키는 `.env`의 `EXPO_PUBLIC_*` 환경 변수로만 주입하며, 키가 없을 때도 앱이 멈추지 않도록 안전한 Fallback(프리셋 에세이, 벡터 SVG 캐릭터 등)을 제공해야 합니다.
- **모델 및 페이로드 규격**:
  - 텍스트/비전 기본 모델: `gemini-2.5-flash`
  - 멀티모달 이미지 생성 모델: `gemini-2.5-flash-image`, `gemini-3.1-flash-image`
  - REST API 페이로드 작성 시 반드시 카멜 케이스(`inlineData`, `mimeType`, `systemInstruction`)를 사용하세요 (`inline_data` 스네이크 케이스 금지).
  - 시스템 프롬프트는 `lib/aiSystemPrompts.ts`의 `AI_SYSTEM_PROMPTS` 상수를 재사용하세요.

### Supabase DB & Realtime 규칙
- **가족 단위 RLS 준수 (`supabase_schema.sql`)**: 모든 핵심 테이블은 `family_id = public.get_my_family_id()` 기반의 RLS 정책으로 보호됩니다. 쿼리 및 INSERT 작성 시 `family_id` 누락이 없는지 확인하세요.
- **실시간 채널 및 타이머 클린업**: `supabase.channel(...)`, `requestAnimationFrame`, `setInterval`, `Animated.Value` 리스너는 컴포넌트 언마운트 시 `useEffect` 클린업에서 반드시 해제하여 메모리 누수와 중복 구독을 차단하세요.
- **낙관적 UI & 로컬 캐시**: 네트워크 지연 시에도 즉각 반응하도록 낙관적 업데이트(Optimistic UI)와 `AsyncStorage` 캐시를 병행하세요.

---

## 4. 🐾 반려몽 & 미니게임 도메인 설계 기준 (현행 아키텍처)

- **가족 대화 온기 기반 자율 성장 (`PetmongGameEngine.js`)**:
  - 구형 다마고치식 단순 노동 버튼(밥/목욕/놀이/잠 수동 게이지 채우기)을 사용하지 않습니다.
  - 가족 단톡방 대화량과 데일리 스몰톡 참여율로 **가족 대화 온기(0~100%)**가 차오르고, **온기 열매 수확(+25 EXP, +30P)**과 **5대 자율 일상 루틴(독서, 앨범 감상, 창밖 구경, 낮잠, 미소)**, **비밀 귓속말 편지 배달(`petmong_whispers`)**로 교감합니다.
- **체류형 미니게임 (`components/minigames/`)**:
  - `함께` 탭(`SmallTalkScreen.js`) 내 서브탭에서 **1인당 일일 3회까지 반려몽 성장 EXP(+15~+50 EXP)**를 획득할 수 있으며, 3회 초과 시 **자유 연습 모드(EXP +0)**로 동작합니다.
  - 구성: `SnackCatchGame.js`(간식 캐치/슬라이스), `CardMatchGame.js`(3×6 카드 짝맞추기), `BubblePopGame.js`(비누방울 머지/팝), `DreamConstellationGame.js`(야간 별자리 잇기 이스터에그).

---

## 5. 🎨 디자인 시스템 & UI/아이콘 헌장 (Design System Charter)

### 1. 단일 진실 공급원 (`theme/colors.ts`, `theme/commonStyles.ts`)
- 모든 화면과 스타일시트(`*Styles.ts`)는 `theme`에서 `colors`, `typography`, `commonStyles`를 import하여 사용하세요.
- **Figma Warm Cozy Living 핵심 토큰**:
  - `colors.primary`: `#FF6B47` (코랄 오렌지 — 주요 CTA, 활성 탭, 강조 배지)
  - `colors.primaryLight`: `#FFF5F2` (소프트 피치 — 선택된 칩 배경, 연한 배지)
  - `colors.primaryBorder`: `#FFE8E0` (피치 보더)
  - `colors.background`: `#FAF8F3` (웜 아이보리 — 앱 전역 캔버스 배경)
  - `colors.card`: `#FFFFFF` (카드 표면)
  - `colors.border` / `colors.divider`: `#F5F0E8` (웜 스톤 외곽선/구분선)
  - `colors.text`: `primary` (`#1C1917`), `secondary` (`#78716C`), `muted` (`#A8A29E`), `inverse` (`#FFFFFF`)
  - `colors.petmongPurple`: `#7C3AED` (반려몽 전용 포인트)
- **🚫 절대 사용 금지 레거시 컬러**: 구형 핑크(`#FF7E82`, `#FFF2F3`, `#FFE5E7`) 및 차가운 쿨그레이(`#F8F9FA`, `#F2F2F7`)는 코드에 절대 사용하지 마세요.

### 2. 벡터 아이콘 우선 원칙 (Vector First)
- UI 버튼, 탭, 상태 배지에는 유니코드 이모지 대신 `lucide-react-native` 또는 `components/icons/`의 `react-native-svg` 기반 벡터 아이콘 컴포넌트를 최우선으로 사용하세요.
- 스몰톡 질문 텍스트(`small_talk_topics`)는 `stripEmojis()`를 거쳐 이모티콘 없는 정갈한 한국어 문장으로만 저장·렌더링합니다.

### 3. 크로스 플랫폼(모바일 & PC 웹) 호환성
- `Platform.OS === 'web'`에서의 마우스 클릭, 가로 스크롤, 입력창 포커스 스타일(`outlineStyle: 'none'`)과 모바일 Safe Area(`SafeAreaView`) 및 `KeyboardAvoidingView`를 항상 함께 고려하세요.

---

## 6. 🛡️ 작업 완료 전 필수 무결성 검증 (Mandatory Pre-Completion Check)

코드를 추가·수정·리팩토링한 뒤에는 완료 보고 전에 **반드시** 아래 명령어를 실행하세요:

```bash
npm run verify
```
1. **`npm run check:syntax` (`scripts/check-syntax.js`)**: 프로젝트 내 모든 `.js`, `.jsx`, `.ts`, `.tsx` 파일을 Babel AST로 파싱하여 문법 오류(`SyntaxError`)와 미선언 식별자(`ReferenceError`, import 누락 등)가 **0건**인지 전수 검사합니다.
2. **`npm run docs:sync` (`scripts/sync-readme.js`)**: `components/` 내 모든 화면 컴포넌트가 `README.md`에 누락 없이 문서화되어 있는지 검증합니다. 새로운 화면이나 주요 기능을 추가했다면 `README.md`를 함께 업데이트하세요.
3. 터미널에서 `✨ All files passed static verification!`과 `🎉 모든 주요 컴포넌트와 기능이 README.md에 완벽하게 문서화되어 있습니다!` 출력을 확인한 뒤에만 작업을 종료하세요.

---

## 7. 🧪 로컬 멀티 로그인 & 포인트 검증용 테스트 환경

- **시뮬레이터/테스트 용도**: 일반 브라우저 창과 시크릿 창에 서로 다른 가족 구성원 계정을 로그인하여 실시간 채팅(`messages`), 포토북 공동 편집 브로드캐스트(`family-photobook-${familyId}`), 가족 포인트 적립·차감을 검증합니다.
- **고액 포인트 테스트 프리셋**: 가족코드 `FAM-RICH99` (초기 보유 포인트 `50,000 P` — 반려몽 500P 외형 환생 및 포토북 12,000P 할인 주문 테스트용).
