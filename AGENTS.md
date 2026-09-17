# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# AI (Gemini / Imagen) 연동 필수 규칙

- **최신 모델 강제 사용**: 구형 모델(1.5 등)을 절대 사용하지 말고, 항상 최신 모델(e.g., `gemini-2.5-flash`, `imagen-4.0-generate-001` 이상)을 기본값으로 사용하세요.
- **엔드포인트 검증**: 현재 지원되는 모델 이름이나 메서드(`generateContent`, `predict` 등)가 불확실할 경우, 코드를 짜기 전에 반드시 `ModelService.ListModels` 엔드포인트에 `curl`을 날려 최신 지원 목록을 확인하세요.
- **REST API 페이로드 문법**: SDK 없이 직접 REST API를 호출할 때는 반드시 카멜 케이스(`inlineData`, `mimeType`)를 사용하세요. (스네이크 케이스 `inline_data` 절대 금지)

# 테스트 계정 정보 (Test Accounts)

- **윤호 계정**: `test@naver.com` / `kun916211`
- **윤성 계정**: `test2@naver.com` / `kun916211`
- **용도**: 브라우저 일반 창 vs 시크릿 창 다중 로그인 테스트, 1:1 채팅 및 가족 간 상호작용 기능 검증용

# README.md 문서 최신화 강제 규칙 (Auto-update README)

- **기능 추가 및 개편 시 즉시 반영**: 새로운 기능, 화면 컴포넌트, 서비스 로직이 추가되거나 기존 기능이 대폭 개편될 때마다 작업 마무리 단계에서 **반드시 `README.md`의 `주요 기능 (Key Features)` 및 `프로젝트 구조 (Project Structure)`를 함께 업데이트**하세요.
- **동기화 검증 스크립트 실행**: 변경 사항 적용 후 `npm run docs:sync`를 실행하여 누락된 컴포넌트가 없는지 확인하세요.

