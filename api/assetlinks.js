// /.well-known/assetlinks.json — the Digital Asset Links file Android reads
// to let the Google Play app open dates.care full-screen (a Trusted Web
// Activity) instead of inside a browser bar.
//
// The certificate fingerprints live in Vercel environment variables rather
// than in the repository, because the app-signing certificate is issued by
// Google Play after the first upload and the upload certificate is made on
// the developer's own machine; neither is known when this code is written.
//
//   ANDROID_PACKAGE       the app id (default care.dates.app)
//   ANDROID_CERT_SHA256   one or more SHA-256 fingerprints, comma-separated,
//                         in the AA:BB:CC form Play Console shows
//
// With nothing set, the file is an empty list and the app simply shows the
// browser bar - nothing breaks.

const FP = /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/;

export default async function handler(req, res) {
  const pkg = (process.env.ANDROID_PACKAGE || 'care.dates.app').trim();
  const prints = String(process.env.ANDROID_CERT_SHA256 || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => FP.test(s));

  const body = prints.length
    ? [{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: prints },
      }]
    : [];

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(JSON.stringify(body));
}
