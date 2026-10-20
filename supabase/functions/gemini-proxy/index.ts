// Supabase Edge Function: gemini-proxy
// 클라이언트 앱에 Gemini API 키를 노출하지 않고 서버 측 환경변수(GEMINI_API_KEY)로 안전하게 프록시 호출합니다.
// 배포 명령어:
//   npx supabase secrets set GEMINI_API_KEY="AIzaSy..."
//   npx supabase functions deploy gemini-proxy

// @ts-ignore: Deno runtime environment on Supabase Edge Functions
declare const Deno: any;

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server GEMINI_API_KEY secret is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const model = body?.model || 'gemini-3.8-flash';
    const payload = body?.payload;

    if (!payload || typeof payload !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid Gemini payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const upstreamResp = await fetch(
      `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await upstreamResp.json();
    return new Response(JSON.stringify(data), {
      status: upstreamResp.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal proxy error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
