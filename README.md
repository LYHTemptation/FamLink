# 🏡 FamLink (팜링크) - 가족 전용 소통 & 퀘스트 메신저

> **"대화가 줄어든 가족에게 유쾌한 소통의 핑계를 선물합니다."**  
> **FamLink**는 가족 전용 단톡방, 데일리 대화 미션(스몰톡), 공유 캘린더, 집안일/장보기 체크리스트 및 포인트 보상 쿠폰 시스템이 결합된 **가족 전용 올인원 게이미피케이션 플랫폼**입니다.

---

## 🌟 주요 기능 (Key Features)

### 1. 💬 가족 실시간 메신저
- **실시간 대화 & 사진 공유**: 가족 간 텍스트 및 고화질 이미지 실시간 공유
- **투명한 읽음 확인**: 메시지별 '모두 읽음' 및 개별 읽은 멤버 리스트 실시간 확인
- **가족 구성원 프로필 & 기분 표출**: 엄마, 아빠, 아들, 딸 프로필과 개별 기분 상태(😊, 😴 등) 표출

### 2. 💡 오늘의 스몰톡 (소통 미션)
- **일일 질문 자동 제공**: "오늘 가장 맛있게 먹은 음식은?", "요즘 자주 듣는 노래는?" 등 대화거리를 지속적으로 던져주는 소통 핑계 시스템
- **가족 전원 참여 보상**: 온 가족이 오늘 질문에 답변을 남기면 **+100P** 보상 획득

### 3. 📅 공유 캘린더 & D-Day
- **단일일 & 기간 범위 일정 등록**: 하루 일정뿐만 아니라 나들이, 휴가 등 범위(`2026-08-01 ~ 2026-08-05`) 지정 지원 및 `+1일`, `+2일`, `+7일` 퀵 기간 설정
- **D-Day 하이라이트 배너**: 다가오는 가족 기념일/생일 D-Day 카루셀 및 '진행 중' 일정 노출
- **일정 수정 & 삭제 confirmation**: 작성한 일정의 내용/날짜 수정 및 안전한 삭제 확인 Alert

### 4. 🛒 가족 장보기 & 집안일 체크리스트
- **담당자 지정 체크리스트**: 필요한 장보기 물품 및 가족 집안일 등록 및 담당자 지정
- **어뷰징 방지 보상 시스템**: 
  - **최초 1회 포인트 지급**: 동일 항목 중복 체크를 통한 포인트 남발 방지
  - **일일 보상 한도 제한 (Daily Cap)**: 하루 최대 30P (3건)까지만 포인트 적립 가능하도록 제한하여 어뷰징 완벽 차단

### 5. 🎟️ 포인트 상점 & 내 쿠폰함 (보상 시스템)
- **가족 커스텀 쿠폰 생성**: "설거지 1회 대행권", "등 안마 15분", "자유시간 1시간" 등 유쾌한 보상 쿠폰 직접 등록
- **쿠폰 교환 & 사용 요청**: 모은 포인트로 쿠폰 교환 후 [내 쿠폰함]에서 제공자에게 사용 요청

### 6. 🔔 앱 푸시 알림 (Expo Push Notifications)
- **실시간 원격 푸시 알림**: 메신저 새 메시지 도착 시 상대방 기기(iOS/Android)로 푸시 알림 전송 및 터치 시 해당 화면 자동 이동

---

## 🛠 기술 스택 (Tech Stack)

### Frontend
- **Framework**: React Native (Expo SDK 54)
- **Icons & Styling**: `lucide-react-native`, Vanilla React Native StyleSheet
- **Notifications**: `expo-notifications`, `expo-device`
- **Storage & Media**: `@react-native-async-storage/async-storage`, `expo-image-picker`

### Backend & Infrastructure
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth)
- **Real-time Sync**: Supabase Realtime Channels (Websocket)
- **File Storage**: Supabase Storage (`family-photos` bucket)
- **Push Service**: Expo Push Notification API

---

## 🚀 시작하기 (Getting Started)

### 1. 프로젝트 클론 및 패키지 설치
```bash
git clone https://github.com/LYHTemptation/FamLink.git
cd FamLink
npm install
```

### 2. 환경 변수 (`.env`) 설정
프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 Supabase 접속 정보를 작성합니다:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Supabase 데이터베이스 구축
Supabase 대시보드의 **SQL Editor**에서 프로젝트 내 [`supabase_schema.sql`](./supabase_schema.sql) 파일의 전체 SQL 스크립트를 붙여넣고 실행합니다.

### 4. 앱 실행
```bash
# Expo 개발 서버 시작
npx expo start
```
- **Android**: 스마트폰의 `Expo Go` 앱으로 터미널의 QR 코드를 스캔
- **iOS**: 스마트폰 카메라 앱으로 QR 코드를 스캔하여 `Expo Go`로 열기

---

## 📂 프로젝트 구조 (Project Structure)

```
FamLink/
├── assets/                  # 이미지, 아이콘 자원
├── components/              # 주요 화면 컴포넌트
│   ├── ChatScreen.js        # 가족 메신저 화면
│   ├── CalendarScreen.js    # 공유 캘린더 & D-Day 화면
│   ├── SmallTalkScreen.js   # 스몰톡 & 포인트 상점 화면
│   ├── ShoppingListScreen.js# 장보기 & 체크리스트 화면
│   ├── FamilyScreen.js      # 가족 상태 & 기분 프로필 화면
│   └── PhotoAlbumScreen.js  # 가족 사진첩 그리드 화면
├── lib/                     # Supabase 클라이언트 설정 (supabase.js)
├── screens/                 # 로그인 및 가입 화면 (AuthScreen.js)
├── utils/                   # 유틸리티 (notifications.js, topics.js 등)
├── App.js                   # 메인 애플리케이션 진입점 & 네비게이션
├── app.json                 # Expo 프로젝트 설정
├── supabase_schema.sql      # Supabase 전체 데이터베이스 스키마
└── package.json             # 의존성 패키지 명세
```

---

## 📄 라이선스 (License)

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
