// /api/config-check — self-diagnostic for launch readiness.
// Reports which required environment variables are SET or MISSING —
// never their values. Safe to call from a browser; leaks nothing.
//
// Visit https://<your-domain>/api/config-check after setting env vars
// in Vercel to confirm everything is wired correctly before launch.

export default async function handler(req, res) {
  const check = (name) => ({ name, set: !!process.env[name] });

  const groups = {
    core: [check('SUPABASE_URL'), check('SUPABASE_SERVICE_ROLE_KEY')],
    crypto_payments: [
      check('NOWPAYMENTS_API_KEY'),
      check('NOWPAYMENTS_IPN_SECRET'),
    ],
    receipt_emails: [check('RESEND_API_KEY'), check('RECEIPT_FROM_EMAIL')],
    legal_identification: [
      check('BUSINESS_NAME'),
      check('BUSINESS_ADDRESS'),
      check('SUPPORT_EMAIL'),
    ],
  };

  const allCore = groups.core.every((v) => v.set);
  const allPayments = groups.crypto_payments.every((v) => v.set);
  const allEmails = groups.receipt_emails.every((v) => v.set);

  // ------------------------------------------------------------------
  // The detailed diagnostic, behind a key.
  //
  // Why it exists: "RESEND_API_KEY is set in Vercel" and "this running
  // function can see RESEND_API_KEY" are two different facts, and when
  // they disagree the usual causes are invisible from the dashboard. The
  // variable was added to Preview/Development but not Production; it was
  // added AFTER the last deploy (Vercel bakes env vars in at build time,
  // so an existing deployment never picks up a new one until you
  // redeploy); it is on a different Vercel project than the one serving
  // this domain; or the name has a stray space or a typo.
  //
  // Why it is gated: the answer is a list of environment variable NAMES
  // and their character lengths. That is not a secret, but it does tell a
  // stranger which mail provider is in use and how long its key is, so it
  // is not something to hand out at a public URL either. Values are never
  // returned, gate or no gate.
  //
  // The key is the last 8 characters of SUPABASE_SERVICE_ROLE_KEY, which
  // the operator can read off their own Vercel dashboard and nobody else
  // can guess:
  //     /api/config-check?key=<last 8 chars of SUPABASE_SERVICE_ROLE_KEY>
  // ------------------------------------------------------------------
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const expectedKey = serviceKey.length >= 8 ? serviceKey.slice(-8) : null;
  // Vercel hands back an array when a parameter is repeated, and an array
  // has a .length but no .split — which would have thrown a TypeError out
  // of an unauthenticated handler for anyone who passed ?key= eight times.
  const rawKey = req.query && req.query.key;
  const givenKey = Array.isArray(rawKey) ? '' : String(rawKey || '');
  const authorised =
    !!expectedKey &&
    givenKey.length === expectedKey.length &&
    // constant-time-ish; these are short strings but there is no reason
    // to leak position information on a mismatch.
    givenKey.split('').reduce((acc, c, i) => acc | (c.charCodeAt(0) ^ expectedKey.charCodeAt(i)), 0) === 0;

  const EMAILISH = /RESEND|RECEIPT|EMAIL|SMTP|MAIL|FROM|BUSINESS|SUPPORT|UNSUBSCRIBE/i;
  const detail = authorised
    ? {
        runtime: {
          vercel_env: process.env.VERCEL_ENV || null,
          deployment_url: process.env.VERCEL_URL || null,
          git_commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
          git_branch: process.env.VERCEL_GIT_COMMIT_REF || null,
        },
        emailish_variables_present: Object.keys(process.env)
          .filter((k) => EMAILISH.test(k))
          .sort()
          .map((k) => ({
            name: k,
            length: String(process.env[k] || '').length,
            // A trailing newline or space pasted in with a key is a classic
            // cause of "the key is set but every send 401s".
            has_surrounding_whitespace:
              String(process.env[k] || '') !== String(process.env[k] || '').trim(),
          })),
      }
    : {
        detail_available:
          'Append ?key=<the last 8 characters of your SUPABASE_SERVICE_ROLE_KEY> to see ' +
          'which environment this function is running in and the NAMES (never values) of ' +
          'every email-related variable it can actually see. That list is how a typo or a ' +
          'variable set on the wrong environment gets found in one look.',
      };

  return res.status(200).json({
    ready_for_payments: allCore && allPayments,
    ready_for_receipt_emails: allCore && allEmails,
    ready_for_casl_identification: groups.legal_identification.every((v) => v.set),
    groups,
    ...detail,
    diagnosis:
      allEmails
        ? 'Receipt emails are configured.'
        : 'Receipt emails are NOT configured in the environment this function is running in. ' +
          'Add ?key=<last 8 chars of SUPABASE_SERVICE_ROLE_KEY> for the variable-name list, ' +
          'then check that the variable is set for the "Production" environment on THIS ' +
          'Vercel project, and that ' +
          'you have redeployed since adding it — Vercel injects environment variables at ' +
          'build time, so a deployment made before the variable was added will never see it.',
    note:
      'This only checks Vercel environment variables (payments and email). ' +
      'Video/audio calling uses SEPARATE secrets configured in your ' +
      'Supabase project (Edge Functions -> Secrets): ' +
      'TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, ' +
      'TWILIO_TWIML_APP_SID. This endpoint cannot see those — check ' +
      'the Supabase dashboard directly, or the twilio-status endpoint ' +
      'noted in TWILIO_TROUBLESHOOTING.md once deployed there.',
  });
}
