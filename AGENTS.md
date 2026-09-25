# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# AI (Gemini / Imagen) 연동 필수 규칙

- **최신 모델 강제 사용**: 구형 모델(1.5 등)을 절대 사용하지 말고, 항상 최신 모델(e.g., `gemini-2.5-flash`, `imagen-4.0-generate-001` 이상)을 기본값으로 사용하세요.
- **엔드포인트 검증**: 현재 지원되는 모델 이름이나 메서드(`generateContent`, `predict` 등)가 불확실할 경우, 코드를 짜기 전에 반드시 `ModelService.ListModels` 엔드포인트에 `curl`을 날려 최신 지원 목록을 확인하세요.
- **REST API 페이로드 문법**: SDK 없이 직접 REST API를 호출할 때는 반드시 카멜 케이스(`inlineData`, `mimeType`)를 사용하세요. (스네이크 케이스 `inline_data` 절대 금지)

# 테스트 계정 정보 (Test Accounts)

- **윤호 계정**: `test@naver.com` / `kun916211`
- **윤성 계정**: `test2@naver.com` / `kun916211`
- **포인트 부자 테스트 계정**: `rich_test@famlink.com` / `password1234!` (가족코드: `FAM-RICH99`, 포인트: `50,000 P`)
- **용도**: 브라우저 일반 창 vs 시크릿 창 다중 로그인 테스트, 1:1 채팅 및 가구 해금/포인트 상점 검증용

# README.md 문서 최신화 강제 규칙 (Auto-update README)

- **기능 추가 및 개편 시 즉시 반영**: 새로운 기능, 화면 컴포넌트, 서비스 로직이 추가되거나 기존 기능이 대폭 개편될 때마다 작업 마무리 단계에서 **반드시 `README.md`의 `주요 기능 (Key Features)` 및 `프로젝트 구조 (Project Structure)`를 함께 업데이트**하세요.
- **동기화 검증 스크립트 실행**: 변경 사항 적용 후 `npm run docs:sync`를 실행하여 누락된 컴포넌트가 없는지 확인하세요.

# 🐾 반려몽 4대 체류형 인터랙티브 미니게임 로드맵 (Mini-Game Master Roadmap)

- [x] **제1탄 [와구와구 간식 캐치] (Snack Rush)**:
  - **연동 액션**: 밥주기 (`🍗`)
  - **스펙**: 30초 동안 떨어지는 사과, 고기, 케이크, 별사탕을 반려몽을 좌우로 직접 스와이프 조작하여 받아먹는 아케이드 캐치 게임. 폭탄/고추 회피, 8콤보 피버 타임(2배 점수), S/A/B/C 등급제, 포만감 100% 완충 + 대량 EXP + 가족 포인트(P) 보상.
  - **파일**: `components/minigames/SnackCatchGame.js`
- [ ] **제2탄 [핑퐁 리프팅 랠리] (Keepy-Uppy Challenge)**:
  - **연동 액션**: 놀아주기 (`⚽`)
  - **스펙**: 공이 바닥에 떨어지지 않도록 유저가 손가락 패들로 튕겨 올려 반려몽과 탁구/배구 랠리를 주고받는 인터랙티브 핑퐁 게임. 랠리 횟수 콤보, 점진적 속도 증가 긴장감, 최고 랠리 기록 갱신 및 보상.
- [ ] **제3탄 [뽀득뽀득 버블 팝] (Bubble Pop Frenzy)**:
  - **연동 액션**: 목욕하기 (`🧼`)
  - **스펙**: 반려몽 몸 주변에 피어오르는 무수한 비누방울을 손가락으로 연속 탭/스와이프하여 팡팡 터트리는 쾌감 액션. 황금 거품/시간 연장 거품 기믹, 청결도 100% 게이지 달성 보상.
- [ ] **제4탄 [꿈나라 별자리 잇기] (Dream Constellation)**:
  - **연동 액션**: 재우기 (`🌙`)
  - **스펙**: 밤하늘 천장의 빛나는 별들을 순서대로 선으로 이어 별자리를 완성하는 힐링 감성 퍼즐. 완성 시 꿀잠 에너지 완충 + 다음 날 아침 깜짝 보물상자 선물 연동.


