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
import { supabase, isSupabaseReady } from '../lib/supabase';
import { PetmongStylePreset } from '../types/domain';

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
  // 로컬 API 키가 있거나 Supabase 서버(gemini-proxy Edge Function)가 연결된 경우 활성화
  return Boolean(getGeminiApiKey()) || Boolean(isSupabaseReady);
}

/**
 * 보안 일원화 호출기:
 * 1순위: 로컬 개발 키(EXPO_PUBLIC_GEMINI_API_KEY)가 없는 배포 환경에서는 Supabase Edge Function('gemini-proxy')을 통해 서버 측 비밀키로 안전하게 호출
 * 2순위: 로컬 개발 환경(.env) 또는 프록시 미배포 시 클라이언트 키로 Fallback 호출
 */
async function callGeminiModel(model: string, payload: Record<string, any>): Promise<any | null> {
  const localApiKey = getGeminiApiKey();

  // 1. 배포 환경 (클라이언트에 키가 숨겨진 경우) -> Supabase Edge Function 호출
  if (!localApiKey && isSupabaseReady) {
    try {
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { model, payload },
      });
      if (!error && data && !data.error) {
        return data;
      }
    } catch (proxyErr) {
      console.warn('[geminiService] Edge Function proxy note:', proxyErr);
    }
    return null;
  }

  // 2. 로컬 개발 환경 키가 있는 경우 직접 호출 (실패 시 Edge Function 백업 시도)
  if (localApiKey) {
    try {
      const resp = await fetch(
        `${GEMINI_API_BASE}/${model}:generateContent?key=${localApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (resp.ok) {
        return await resp.json();
      }
    } catch (err) {
      console.warn('[geminiService] Direct fetch error, trying proxy fallback:', err);
    }

    if (isSupabaseReady) {
      try {
        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
          body: { model, payload },
        });
        if (!error && data && !data.error) {
          return data;
        }
      } catch (_) {}
    }
  }

  return null;
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
  if (!isGeminiConfigured()) return null;

  const model = options.model || GEMINI_TEXT_MODEL;
  const payload = buildGeminiPayload(
    options.systemInstruction,
    userPrompt,
    { generationConfig: options.generationConfig }
  );

  const data = await callGeminiModel(model, payload);
  if (!data) return null;

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
  if (!isGeminiConfigured() || !base64Data) return '';

  const normalizedMime = mimeType === 'image/svg+xml' ? 'image/png' : mimeType;

  try {
    const vData = await callGeminiModel(GEMINI_TEXT_MODEL, {
      contents: [
        {
          parts: [
            { text: promptText },
            { inlineData: { mimeType: normalizedMime, data: base64Data } },
          ],
        },
      ],
    });
    if (vData) {
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
  if (!isGeminiConfigured()) return null;

  for (const model of models) {
    try {
      const imgData = await callGeminiModel(model, { contents: [{ parts }] });
      if (imgData) {
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
  stylePreset?: PetmongStylePreset;
}): Promise<{
  generatedImageUrl: string | null;
  detectedSpecies: string;
  detectedColor: string;
  detailedError: string | null;
}> {
  const { base64Photo, personality, targetStageNum, stylePreset = 'cozy_creature' } = params;
  let generatedImageUrl: string | null = null;
  let detailedError: string | null = null;
  const detectedColor = '#FFAAA6';
  let detectedSpecies = 'fantasy';

  if (!isGeminiConfigured()) {
    return { generatedImageUrl: null, detectedSpecies, detectedColor, detailedError: null };
  }

  try {
    const cleanBase64 = base64Photo.replace(/^data:image\/\w+;base64,/, '');

    // Step 1: Vision 분석 - 피사체(인물, 아기, 반려동물)의 매력과 본질을 객관적·생생하게 추출
    const visualFeatureDescription = await analyzeImageWithGeminiVision(
      cleanBase64,
      'image/jpeg',
      "Analyze this photo in depth. Identify the subject (person, child, or pet) and capture their most distinctive and charming visual essence: facial expression, eye sparkle and shape, warm smile, hairstyle or ears/fur texture, signature accessories (like glasses, hats), and overall emotional aura. Describe them in 2-3 vivid sentences so they can be faithfully and artistically transformed into a stylized character."
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

    // Step 2: 멀티모달 Image-to-Image 캐릭터 생성 (스타일 프리셋 분기)
    const personalityTraitMap: Record<string, string> = {
      '다정한': 'affectionate, gentle and warm smiling expression with loving eyes',
      '장난꾸러기': 'playful, mischievous expression with a cheeky grin and lively sparkle',
      '잠꾸러기': 'sleepy, cozy expression with eyelids drooping comfortably',
      '애교쟁이': 'super cute, charming and loving sparkling eyes with blushy cheeks',
      '호기심많은': 'curious, wide-eyed inquisitive expression tilted with wonder',
    };
    const trait = personalityTraitMap[personality] || `${personality} expression`;

    // 4대 스타일 프리셋별 아트 디렉션 정의
    const STYLE_PROMPTS: Record<PetmongStylePreset, { title: string; prompt: string }> = {
      cozy_creature: {
        title: '포근한 동물 요정',
        prompt: `Art Style: Charming 'Sumone' app aesthetic, minimalist 2D flat kawaii vector creature mascot. Clean bold outlines, soft gentle pastel tones, rounded cuddly silhouette, iconic proportions, zero photorealism.`,
      },
      chibi_family: {
        title: '귀여운 웹툰 인물',
        prompt: `Art Style: Adorable 2.5-head chibi family webtoon illustration. Faithfully preserve the human subject's signature hairstyle, glasses, outfit, and facial expressions in a clean, heartwarming Korean webtoon aesthetic with smooth linework and cozy coloring.`,
      },
      warm_watercolor: {
        title: '따뜻한 그림책 수채화',
        prompt: `Art Style: Warm classic storybook illustration with soft watercolor wash and colored pencil outlines. Gentle pastel palette, hand-drawn warmth, nostalgic and heartwarming bedtime story aesthetic.`,
      },
      comic_caricature: {
        title: '유쾌한 코미디 카툰',
        prompt: `Art Style: Hilarious, witty and charming cartoon caricature (playful comic strip style). Expressive exaggerated cute expressions, dynamic humorous cartoon energy, bold lively linework, vibrant playful colors, heartwarming family comedy vibe that brings an instant laugh.`,
      },
    };

    const styleInfo = STYLE_PROMPTS[stylePreset] || STYLE_PROMPTS.cozy_creature;

    const finalPrompt = `IMAGE-TO-IMAGE CHARACTER MASCOT GENERATION:
Transform the uploaded photo into an irresistibly charming, lovable family character (Stage ${targetStageNum}).

Visual Analysis of the Photo:
${visualFeatureDescription || 'Faithfully capture the cheerful facial expression, sweet eyes, and lovely aura from the provided photo.'}

Core Design Instructions:
1. Reinterpret the Subject: Seamlessly translate the subject's distinct facial expression, eye characteristics, lovely smile, and unique charm from the photo into an endearing character.
2. Personality & Mood: Radiate an adorable ${trait}.
3. Aesthetics: ${styleInfo.prompt}
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
