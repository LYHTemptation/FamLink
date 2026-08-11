import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use provided key or environment variable
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || "AIzaSyAjqo-3PK6Hkmj2E_FxeJ4ganikNWL92Zs";
    
    // Clean base64 prefix if exists
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Step 1: Analyze the image with Gemini 2.5 Flash
    console.log("Step 1: Analyzing image with Gemini Vision...");
    const visionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
    });

    if (!visionResponse.ok) {
      throw new Error(`Gemini Vision Error: ${await visionResponse.text()}`);
    }

    const visionData = await visionResponse.json();
    const description = visionData.candidates?.[0]?.content?.parts?.[0]?.text || "A cute person";
    console.log("Image description:", description);

    // Step 2: Generate character with Gemini Image Model
    console.log("Step 2: Generating character with Gemini Image...");
    const finalPrompt = `A cute, simple, 2D flat vector art of a tiny kawaii blob monster hatched from an egg. White background. 'Sumone' app style, no shadows, extremely cute and emotional. The monster must visually incorporate these specific features from the person: ${description}. Keep it very minimal and adorable.`;

    const imageGenResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: finalPrompt }]
        }]
      })
    });

    if (!imageGenResponse.ok) {
      throw new Error(`Gemini Image Error: ${await imageGenResponse.text()}`);
    }

    const imageGenData = await imageGenResponse.json();
    
    // Find the inlineData part that contains the image
    const parts = imageGenData.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);
    const generatedBase64 = imagePart?.inlineData?.data;

    if (!generatedBase64) {
      throw new Error('No image generated from Gemini API');
    }

    // Return the generated image as a base64 Data URI
    const dataUri = `data:image/jpeg;base64,${generatedBase64}`;

    return new Response(JSON.stringify({ imageUrl: dataUri }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
