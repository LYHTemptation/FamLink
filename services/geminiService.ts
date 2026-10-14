/**
 * FamLink Unified Gemini AI Service (TypeScript)
 *
 * 프로젝트 전역의 Gemini 2.5 Flash 텍스트/비전/이미지 생성 REST 호출을 단일 서비스 계층으로 캡슐화합니다.
 * - API 키 참조 일원화 (Zero Hardcoded Secrets)
 * - 최신 모델 고정 (gemini-2.5-flash, gemini-2.5-flash-image, gemini-3.1-flash-image)
 * - 카멜케이스 REST 페이로드 준수 (inlineData, mimeType)
 */

import {
  AI_SYSTEM_PROMPTS,
  buildGeminiPayload,
  GeminiContentPart,
  GeminiGenerationConfig,
} from '../lib/aiSystemPrompts';

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image',
] as const;

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function getGeminiApiKey(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GEMINI_API_KEY) {
    return process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  }
  return '';
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

/**
 * 1. 범용 Gemini 텍스트 생성 (systemInstruction 지원)
 */
export async function generateGeminiText(
  userPrompt: string,
  options: {
    systemInstruction?: string;
    generationConfig?: GeminiGenerationConfig;
    model?: string;
  } = {}
): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const model = options.model || GEMINI_TEXT_MODEL;
  const payload = buildGeminiPayload(
    options.systemInstruction,
    userPrompt,
    { generationConfig: options.generationConfig }
  );

  const resp = await fetch(
    `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!resp.ok) {
    return null;
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}

/**
 * 2. Gemini 2.5 Flash 멀티모달 비전 분석 (이미지 -> 텍스트 특징 추출)
 */
export async function analyzeImageWithGeminiVision(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  promptText: string
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey || !base64Data) return '';

  const normalizedMime = mimeType === 'image/svg+xml' ? 'image/png' : mimeType;

  try {
    const resp = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                { inlineData: { mimeType: normalizedMime, data: base64Data } },
              ],
            },
          ],
        }),
      }
    );

    if (resp.ok) {
      const vData = await resp.json();
      return vData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }
  } catch (err) {
    console.warn('[geminiService] Vision analysis fallback:', err);
  }
  return '';
}

/**
 * 3. Gemini Flash Image 멀티모달 Image-to-Image 생성
 */
export async function generateImageWithGeminiModels(
  parts: GeminiContentPart[],
  models: readonly string[] = GEMINI_IMAGE_MODELS
): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  for (const model of models) {
    try {
      const imgResp = await fetch(
        `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );

      if (imgResp.ok) {
        const imgData = await imgResp.json();
        const respParts = imgData?.candidates?.[0]?.content?.parts || [];
        const imgPart = respParts.find((p: any) => p?.inlineData?.data);
        if (imgPart?.inlineData?.data) {
          const outMime = imgPart.inlineData.mimeType || 'image/jpeg';
          return `data:${outMime};base64,${imgPart.inlineData.data}`;
        }
      }
    } catch (err) {
      console.warn(`[geminiService] Image generation attempt on ${model} failed:`, err);
    }
  }

  return null;
}

/**
 * 4. 포토북 프롤로그(P.1) / 에필로그(P.16) AI 문학 에세이 집필 서비스
 */
export async function generatePhotobookEssay(params: {
  type: 'prologue' | 'epilogue' | string;
  memberNames: string;
  topicSnippets: string[];
}): Promise<string> {
  const { type, memberNames, topicSnippets } = params;
  const isPrologue = type === 'prologue';

  if (isGeminiConfigured()) {
    try {
      const userPrompt = isPrologue
        ? `[가족 도서 첫 페이지 '프롤로그(여는 글)' 집필 요청]
가족 구성원: ${memberNames}
가족들이 지난 6개월간 책에 실어둔 스몰톡 문답 기록:
${topicSnippets.join('\n')}

위 가족들의 실제 대화와 답변에 담긴 따스한 추억(음식, 일상, 감사, 소망 등)을 자연스럽게 녹여내어, 포토북 첫 장(P.1)에 수록될 감동적인 서문(프롤로그)을 작성해주세요.
- 분량: 2개 단락 (약 150~220자 내외)
- 어조: 다정하고 서정적인 문학 에세이 톤
- 제목이나 군더더기 인사말 없이, 책 본문에 바로 인쇄될 수 있는 에세이 본문 문장만 출력하세요.`
        : `[가족 도서 마지막 페이지 '에필로그(맺음말 & 가족 헌사)' 집필 요청]
가족 구성원: ${memberNames}
가족들이 지난 6개월간 책에 실어둔 스몰톡 문답 기록:
${topicSnippets.join('\n')}

위 가족들의 180일간의 여정을 마무리하며, 서로를 향한 고마움과 앞으로 다가올 계절(Vol. 2)에 대한 기대를 담은 감동적인 맺음말(에필로그)을 작성해주세요.
- 분량: 2개 단락 (약 150~220자 내외)
- 어조: 뭉클하고 깊은 울림을 주는 가족 헌정 에세이 톤
- 제목이나 군더더기 인사말 없이, 책 본문에 바로 인쇄될 수 있는 에세이 본문 문장만 출력하세요.`;

      const generated = await generateGeminiText(userPrompt, {
        systemInstruction: AI_SYSTEM_PROMPTS.FAMILY_STORY_AUTHOR,
        generationConfig: { temperature: 0.85, maxOutputTokens: 300 },
      });

      if (generated) {
        const cleaned = generated
          .replace(/^["'“”]/g, '')
          .replace(/["'“”]$/g, '');
        if (cleaned) return cleaned;
      }
    } catch (err) {
      console.warn('[geminiService] Essay generation error:', err);
    }
  }

  // Fallback 프리셋 에세이
  if (isPrologue) {
    return `가장 눈부신 순간은 언제나 멀리 있지 않았습니다. 함께 밥을 먹고, 사소한 농담을 주고받고, 문득 전해진 다정한 안부 속에 ${memberNames} 우리 가족의 가장 따뜻한 계절이 깃들어 있었습니다.\n\n지난 6개월간 매일 주고받은 스몰톡 문답과 카메라에 담긴 온기를 엮어, 우리들의 찬란했던 시간들을 이 한 권의 책에 고이 남깁니다.`;
  }
  return `계절은 바뀌어도 우리가 함께 나눈 사랑의 온도는 변하지 않습니다. ${memberNames} 함께여서 눈부셨던 180일간의 발자취는 이제 우리 마음속 가장 깊은 보물이 되었습니다.\n\n다음 6개월 뒤에도 더 풍성하고 다정한 추억으로 이 자리를 채워나가길 소망하며, 서로의 든든한 버팀목이 되어준 온 가족에게 이 책을 바칩니다.`;
}

/**
 * 5. 사용자 업로드 사진 기반 반려몽 마스코트 생성 파이프라인 (Vision + Image-to-Image)
 */
export async function generatePetmongMascotFromPhoto(params: {
  base64Photo: string;
  personality: string;
  targetStageNum: number;
}): Promise<{
  generatedImageUrl: string | null;
  detectedSpecies: string;
  detectedColor: string;
  detailedError: string | null;
}> {
  const { base64Photo, personality, targetStageNum } = params;
  let generatedImageUrl: string | null = null;
  let detailedError: string | null = null;
  const detectedColor = '#FFAAA6';
  let detectedSpecies = 'fantasy';

  if (!isGeminiConfigured()) {
    return { generatedImageUrl: null, detectedSpecies, detectedColor, detailedError: null };
  }

  try {
    const cleanBase64 = base64Photo.replace(/^data:image\/\w+;base64,/, '');

    // Step 1: Vision 분석으로 피사체 특징 및 동물상 추론
    const visualFeatureDescription = await analyzeImageWithGeminiVision(
      cleanBase64,
      'image/jpeg',
      "Analyze this photo in depth. What are the subject's most charming and distinctive visual features (facial expression, eye sparkle and shape, warm smile, hairstyle or ears/fur texture, signature accessories, and overall lovely energy)? Describe them in 2-3 vivid sentences so they can be captured as an irresistibly cute, lovable 2D pet creature mascot."
    );

    if (visualFeatureDescription) {
      const lower = visualFeatureDescription.toLowerCase();
      if (lower.includes('dog') || lower.includes('puppy') || lower.includes('canine')) detectedSpecies = 'canine';
      else if (lower.includes('cat') || lower.includes('kitten') || lower.includes('feline')) detectedSpecies = 'feline';
      else if (lower.includes('rabbit') || lower.includes('bunny')) detectedSpecies = 'rabbit';
      else if (lower.includes('bear') || lower.includes('panda')) detectedSpecies = 'bear';
      else if (lower.includes('bird') || lower.includes('chick')) detectedSpecies = 'bird';
      else if (lower.includes('fox')) detectedSpecies = 'fox';
      else if (lower.includes('hamster') || lower.includes('rodent')) detectedSpecies = 'rodent';
    }

    // Step 2: 멀티모달 Image-to-Image 캐릭터 생성
    const personalityTraitMap: Record<string, string> = {
      '다정한': 'affectionate, gentle and warm smiling expression with loving eyes',
      '장난꾸러기': 'playful, mischievous expression with a cheeky grin and lively sparkle',
      '잠꾸러기': 'sleepy, cozy expression with eyelids drooping comfortably',
      '애교쟁이': 'super cute, charming and loving sparkling eyes with blushy cheeks',
      '호기심많은': 'curious, wide-eyed inquisitive expression tilted with wonder',
    };
    const trait = personalityTraitMap[personality] || `${personality} expression`;
    const finalPrompt = `IMAGE-TO-IMAGE CREATURE MASCOT GENERATION:
Transform the uploaded photo into an irresistibly cute, lovable 2D flat kawaii pet creature mascot (Stage ${targetStageNum}) in the charming 'Sumone' app art style.

Visual Analysis of the Photo:
${visualFeatureDescription || 'Faithfully capture the cheerful facial expression, sweet eyes, and lovely aura from the provided photo.'}

Core Design Instructions:
1. Reinterpret the Subject: Seamlessly translate the subject's distinct facial expression, eye characteristics, lovely smile, and unique charm from the photo into an endearing creature face.
2. Personality & Mood: Radiate an adorable ${trait}.
3. Aesthetics: Minimalist 2D flat kawaii vector art, clean bold outlines, soft gentle pastel tones, rounded cuddly silhouette, iconic and lovable proportions, zero realistic human skin photorealism.
4. Plain solid pure white background (#FFFFFF) only: Zero background elements, no scenery, no borders, NEVER draw checkerboard grid, NEVER draw checkered tiles or fake transparency squares. Centered standalone character on clean pure white canvas.`;

    generatedImageUrl = await generateImageWithGeminiModels([
      { text: finalPrompt },
      { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
    ]);
  } catch (clientErr: any) {
    console.error('[geminiService] Client direct generation failed:', clientErr);
    detailedError = clientErr?.message || String(clientErr);
  }

  return {
    generatedImageUrl,
    detectedSpecies,
    detectedColor,
    detailedError,
  };
}
