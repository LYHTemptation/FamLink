import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PERSONALITY_TRAIT_MAP: Record<string, string> = {
  '다정한': 'affectionate, gentle and warm smiling expression',
  '장난꾸러기': 'playful, mischievous expression with a cheeky grin',
  '잠꾸러기': 'sleepy, cozy expression with eyelids drooping sleepily',
  '애교쟁이': 'super cute, charming and loving sparkling eyes expression',
  '호기심많은': 'curious, wide-eyed inquisitive expression',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { 
      imageBase64, 
      personality = '다정한',
      mode = 'create', // 'create' or 'evolve'
      targetStage = 2,
      characterName = '반려몽',
    } = payload;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use provided key from request body or environment variable (NEVER hardcode secrets)
    const GEMINI_API_KEY = payload.apiKey || Deno.env.get('GEMINI_API_KEY') || "";

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. .env에 EXPO_PUBLIC_GEMINI_API_KEY를 설정해주세요.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Clean base64 prefix if exists
    const isSvg = imageBase64.includes('image/svg') || imageBase64.includes('<svg');
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const personalityTrait = PERSONALITY_TRAIT_MAP[personality] || `${personality} expression`;

    let finalPrompt = '';

    if (mode === 'evolve') {
      // ==========================================
      // Mode B: Image-to-Image Evolution (진화 생성)
      // ==========================================
      console.log(`[Evolve Mode] Analyzing current petmong for Stage ${targetStage} evolution...`);

      let characterTraits = "A cute 2D pet monster";

      // Step 1: Analyze existing petmong characteristics to preserve identity
      if (isSvg) {
        try {
          const svgText = atob(cleanBase64);
          const colMatches = svgText.match(/#[0-9a-fA-F]{6}/g) || [];
          const mainColor = colMatches[0] || '#FFAAA6';
          characterTraits = `A 2D pet creature with primary body color ${mainColor}, distinct species anatomy, expressing ${personalityTrait}.`;
        } catch (_) {
          characterTraits = `A 2D pet creature expressing ${personalityTrait}.`;
        }
      } else {
        const visionResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Analyze this cute 2D pet monster. Describe its exact primary body color, ear/tail/body shape, facial features, and overall vibe in 2 concise sentences so that its older evolved form can strictly maintain 100% visual identity." },
                  { inlineData: { mimeType: mimeType === 'image/svg+xml' ? 'image/png' : mimeType, data: cleanBase64 } }
                ]
              }]
            })
          }
        );

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          characterTraits = visionData.candidates?.[0]?.content?.parts?.[0]?.text || characterTraits;
        }
      }
      console.log("Original Character Traits:", characterTraits);

      // Step 2: Build Species-Tailored Natural Lineage Evolution Prompt
      let stageInstructions = "";
      if (targetStage === 2) {
        stageInstructions = "Stage 2 (Rookie / 성장기). The cute baby has grown into an agile and sturdy juvenile of its specific species! Standing upright on two muscular little legs, species-specific traits emerging prominently (alert ears, longer paws, playful agile tail, confident adventurer stance).";
      } else if (targetStage === 3) {
        stageInstructions = "Stage 3 (Champion Mature Beast / 성숙기 성체 대각성). A DRAMATIC, NATURAL ADULT METAMORPHOSIS tailored specifically to its animal/creature species: If canine -> majestic noble wolf/hound with thick mane; if feline -> sleek powerful panther/tiger; if rabbit -> swift muscular warrior hare; if bird -> majestic soaring falcon/raptor; if bear -> colossal guardian bear; if fantasy beast -> majestic adult creature true to its anatomy. Impressive, powerful adult beast evolution with dynamic battle-ready posture, not human clothes.";
      } else {
        stageInstructions = "Stage 4 (Mega Ancient Guardian Deity / 궁극체 전설의 수호신). THE PINNACLE MYTHOLOGICAL ASCENSION tailored to its species lineage: If canine -> Celestial Spirit Wolf; if feline -> Mythic Astral Tiger; if rabbit -> Ancient Moon Rabbit Deity; if bird -> Resplendent Phoenix; if bear -> Ancient Mountain Deity Ursa; if fantasy beast -> Arch-Guardian Deity. Radiant armor/aura of light, majestic energy wings/crest, supreme family protector radiating warmth and ancient power.";
      }

      finalPrompt = `Image-to-Image evolution of this exact character: ${characterTraits}. Create the ${stageInstructions}. STRICT REQUIREMENT: Retain 100% of the original color palette, species DNA, and facial expression features from the reference image, but elevate it into an epic evolved form matching its species lineage. High quality 2D anime creature art, dynamic lines, clean white background, expressing ${personalityTrait}.`;

    } else {
      // ==========================================
      // Mode A: New Pet Hatching (초기 아기몽 부화)
      // ==========================================
      console.log("[Create Mode] Analyzing photo with Gemini Vision...");
      const visionResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Analyze this photo (person, pet, or avatar). Which of our 10 animal lineages does their face, expression, or atmosphere resemble most? Choose one from [canine(dog/wolf), feline(cat/tiger), rabbit, bear, bird, fox, deer, rodent(hamster), dragon, aquatic(seal)]. Describe their core features (hair/eyes/palette/vibe) and state the chosen animal lineage in 1 or 2 concise sentences." },
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
              ]
            }]
          })
        }
      );

      const visionData = await visionResponse.json();
      const description = visionData.candidates?.[0]?.content?.parts?.[0]?.text || "A cute person resembling a puppy";
      console.log("Image description:", description);

      finalPrompt = `A cute, simple, 2D flat vector art of a tiny kawaii baby creature hatched from an egg (Stage 1 Baby). White background. 'Sumone' app style, no shadows, extremely cute and iconic. The monster must visually combine the chosen animal species with these specific features from the photo: ${description}. The monster MUST express this distinct personality vibe: ${personalityTrait}. Keep it very minimal, iconic, and adorable.`;
    }

    // Step 3: Generate the Image using Imagen (Imagen 4.0 first, Imagen 3.0 fallback)
    console.log("Calling Imagen Model with final prompt...");
    let imageGenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: finalPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            outputMimeType: "image/jpeg"
          }
        })
      }
    );

    if (!imageGenResponse.ok) {
      console.log("Imagen 4.0 not available or errored, falling back to Imagen 3.0...");
      imageGenResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: finalPrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
              outputMimeType: "image/jpeg"
            }
          })
        }
      );
    }

    if (!imageGenResponse.ok) {
      throw new Error(`Imagen Error: ${await imageGenResponse.text()}`);
    }

    const imageGenData = await imageGenResponse.json();
    const generatedBase64 = imageGenData.predictions?.[0]?.bytesBase64Encoded;

    if (!generatedBase64) {
      throw new Error('No image generated from Imagen API');
    }

    const dataUri = `data:image/jpeg;base64,${generatedBase64}`;

    return new Response(JSON.stringify({ 
      imageUrl: dataUri,
      stage: mode === 'evolve' ? targetStage : 1,
      mode: mode,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
