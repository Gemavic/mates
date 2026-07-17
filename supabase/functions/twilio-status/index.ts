// supabase/functions/twilio-status/index.ts
//
// Self-diagnostic for launch readiness — reports which Twilio secrets
// are SET or MISSING in this Supabase project's Edge Function config.
// Never returns actual secret values, safe to call from anywhere.
//
// After deploying, visit:
//   https://<your-project-ref>.supabase.co/functions/v1/twilio-status
// with header: apikey: <your anon key>
// to confirm video/audio calling is correctly configured before launch.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const check = (name: string) => ({ name, set: !!Deno.env.get(name) });

  const required = [
    check('TWILIO_ACCOUNT_SID'),
    check('TWILIO_API_KEY'),
    check('TWILIO_API_SECRET'),
  ];
  const voiceOnly = [check('TWILIO_TWIML_APP_SID')];

  const videoReady = required.every((v) => v.set);
  const voiceReady = videoReady && voiceOnly.every((v) => v.set);

  return new Response(
    JSON.stringify({
      video_calling_ready: videoReady,
      voice_calling_ready: voiceReady,
      required_for_video: required,
      additionally_required_for_voice: voiceOnly,
      note: videoReady
        ? 'Video/audio secrets look configured. Test an actual call to confirm end-to-end.'
        : 'Missing secrets above. Set them in Supabase Dashboard -> Edge Functions -> Secrets, then redeploy twilio-video-token and twilio-voice-token.',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
