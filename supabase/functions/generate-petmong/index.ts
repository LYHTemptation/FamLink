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

    // Use provided key from request body or environment variable
    const GEMINI_API_KEY = payload.apiKey || Deno.env.get('GEMINI_API_KEY') || "";
    
    // Clean base64 prefix if exists
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const personalityTrait = PERSONALITY_TRAIT_MAP[personality] || `${personality} expression`;

    let finalPrompt = '';

    if (mode === 'evolve') {
      // ==========================================
      // Mode B: Image-to-Image Evolution (진화 생성)
      // ==========================================
      console.log(`[Evolve Mode] Analyzing current petmong for Stage ${targetStage} evolution...`);

      // Step 1: Analyze existing petmong characteristics to preserve identity
      const visionResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Analyze this cute 2D pet monster. Describe its exact primary body color, ear/tail/body shape, facial features, and overall vibe in 2 concise sentences so that its older evolved form can strictly maintain 100% visual identity." },
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
              ]
            }]
          })
        }
      );

      let characterTraits = "A cute pastel blob monster";
      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        characterTraits = visionData.candidates?.[0]?.content?.parts?.[0]?.text || characterTraits;
      }
      console.log("Original Character Traits:", characterTraits);

      // Step 2: Build Milestone Stage Evolution Prompt
      let stageInstructions = "";
      if (targetStage === 2) {
        stageInstructions = "EVOLVED Stage 2 (Child / 성장기). The monster has grown slightly bigger, standing proudly on two cute tiny legs, showing active curiosity with bright sparkling eyes, perhaps a tiny green sprout or playful hair accessory on top.";
      } else if (targetStage === 3) {
        stageInstructions = "EVOLVED Stage 3 (Youth / 청소년기). The monster has grown into a dignified and mature pet companion, wearing a warm cozy family scarf or cute bowtie, standing with confident posture, surrounded by gentle cheerful sparkles.";
      } else {
        stageInstructions = "EVOLVED Stage 4 (Guardian / 완전체 수호신). The ultimate final guardian form of the family. Full-grown, majestic yet supremely adorable, with small glowing celestial wings and a gentle golden halo aura, radiating boundless love and protection.";
      }

      finalPrompt = `Image-to-Image evolution of this exact character: ${characterTraits}. Create the ${stageInstructions}. STRICT REQUIREMENT: Retain the identical color palette, eye style, and core species features of the original creature in the reference image. Cute 2D flat vector art, 'Sumone' app style, clean white background, no 3D shading, emotional and heartwarming, expressing ${personalityTrait}.`;

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
                { text: "Describe the core features of this person's face, hair style, and overall vibe in 1 or 2 short sentences. Be extremely concise. Focus only on visual traits." },
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
              ]
            }]
          })
        }
      );

      const visionData = await visionResponse.json();
      const description = visionData.candidates?.[0]?.content?.parts?.[0]?.text || "A cute person";
      console.log("Image description:", description);

      finalPrompt = `A cute, simple, 2D flat vector art of a tiny kawaii baby blob monster hatched from an egg (Stage 1 Baby). White background. 'Sumone' app style, no shadows, extremely cute and emotional. The monster must visually incorporate these specific features from the person: ${description}. The monster MUST express this distinct personality vibe: ${personalityTrait}. Keep it very minimal, iconic, and adorable.`;
    }

    // Step 3: Generate the Image using Imagen 3
    console.log("Calling Imagen 3 Model with final prompt...");
    const imageGenResponse = await fetch(
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
