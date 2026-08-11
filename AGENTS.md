# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# AI (Gemini / Imagen) 연동 필수 규칙

- **최신 모델 강제 사용**: 구형 모델(1.5 등)을 절대 사용하지 말고, 항상 최신 모델(e.g., `gemini-2.5-flash`, `imagen-4.0-generate-001` 이상)을 기본값으로 사용하세요.
- **엔드포인트 검증**: 현재 지원되는 모델 이름이나 메서드(`generateContent`, `predict` 등)가 불확실할 경우, 코드를 짜기 전에 반드시 `ModelService.ListModels` 엔드포인트에 `curl`을 날려 최신 지원 목록을 확인하세요.
- **REST API 페이로드 문법**: SDK 없이 직접 REST API를 호출할 때는 반드시 카멜 케이스(`inlineData`, `mimeType`)를 사용하세요. (스네이크 케이스 `inline_data` 절대 금지)
