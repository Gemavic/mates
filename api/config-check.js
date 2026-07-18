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
    receipt_emails_optional: [
      check('RESEND_API_KEY'),
      check('RECEIPT_FROM_EMAIL'),
    ],
  };

  const allCore = groups.core.every((v) => v.set);
  const allPayments = groups.crypto_payments.every((v) => v.set);
  const allEmails = groups.receipt_emails_optional.every((v) => v.set);

  return res.status(200).json({
    ready_for_payments: allCore && allPayments,
    ready_for_receipt_emails: allCore && allEmails,
    groups,
    note:
      'This only checks Vercel environment variables (payments). ' +
      'Video/audio calling uses SEPARATE secrets configured in your ' +
      'Supabase project (Edge Functions -> Secrets): ' +
      'TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, ' +
      'TWILIO_TWIML_APP_SID. This endpoint cannot see those — check ' +
      'the Supabase dashboard directly, or the twilio-status endpoint ' +
      'noted in TWILIO_TROUBLESHOOTING.md once deployed there.',
  });
}
