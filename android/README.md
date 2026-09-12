# Dates.care on Google Play

The Play app is the website, wrapped as a Trusted Web Activity: Android
opens dates.care full-screen with no browser bar, and every update to the
site is an update to the app. There is no second codebase.

## What is in the repository

- `twa-manifest.json` (repo root): the Bubblewrap configuration. Package id
  `care.dates.app`, portrait, notifications on.
- `api/assetlinks.js`, served at `/.well-known/assetlinks.json`: tells
  Android which signing certificates may open the site full-screen. The
  fingerprints come from Vercel environment variables (below), not from
  the code.
- `public/site.webmanifest`: the web app manifest the wrapper is built from.

## Build it (once, on your PC)

1. Install Node 18 or newer if it is not already there.
2. Make a folder outside the repository, for example `C:\Users\PC\dates-android`,
   and copy `twa-manifest.json` into it. Bubblewrap writes an Android
   project (gradle files, an `app` folder, the keystore) into the folder it
   runs in, and none of that belongs in the website's repository.
3. In that folder run `npx @bubblewrap/cli init --manifest https://dates.care/site.webmanifest`.
   Bubblewrap will offer to download a JDK and the Android SDK the first
   time; say yes. Accept the defaults it reads from `twa-manifest.json`.
   When it asks to create a signing key, choose a password and keep it and
   `android.keystore` somewhere safe. Losing the keystore means you can
   never update the app again.
4. Run `npx @bubblewrap/cli build`. It produces `app-release-bundle.aab`
   (what Play wants) and `app-release-signed.apk` (for testing on a phone).

## Publish it

1. Create a Google Play developer account at play.google.com/console
   (one-time US$25). Use the DATES CARE business identity once the
   incorporation is done; a company account is easier to transfer later.
2. Create app → name `Dates.care`, app, free, category Dating.
3. Upload `app-release-bundle.aab` to Internal testing first, then
   Production.
4. Setup → App integrity → App signing: copy the **App signing key
   certificate** SHA-256 fingerprint. In Vercel → Settings → Environment
   Variables add `ANDROID_CERT_SHA256` with that value (add the upload key
   fingerprint too, comma-separated, if you want the test APK to run
   full-screen). Redeploy. Check https://dates.care/.well-known/assetlinks.json
   shows it.
5. Fill in the listing from the text below, the content rating
   questionnaire (dating app: user-generated content, user interaction,
   shares location: no precise location), and the Data safety form
   (collects name, email, photos, approximate location as the city the
   member types; data is encrypted in transit; members can request
   deletion from Settings).
6. Privacy policy URL: https://dates.care/privacy

## Store listing text

**App name** (30 characters max)

Dates.care

**Short description** (80 characters max)

Dating for singles. Every photo is checked before it is shown. Join free.

**Full description** (4,000 characters max)

Dates.care is a dating site for singles who want real conversations with real people.

Every photo is screened before anyone sees it. Profiles can be verified. Contact details are kept out of profiles, so the first message happens here, where it is safer. Photos of you stay yours; we never post anything on your behalf.

How it works

- Join free and set up your profile in three short steps: a photo, who you are and who you are looking for, and where you are.
- See who is near you the moment you finish, then browse everyone.
- Like, send a wink, write a message, or start a voice or video call, all inside the app.
- Credits pay for calls, mail and gifts. Joining, browsing and being found are free. There is no auto-renewing charge: you buy what you use.
- Invite a friend with your personal link; when their profile is complete, you both receive complimentary credits.

Safety and trust

- Every photo is checked before it is shown.
- Report and block are one tap away on every profile.
- Video calls run inside the app, so you can see who you are talking to before you meet.
- A plain-English privacy policy and terms, written for people, not lawyers.

Care Blog

Practical writing on dating and relationships, life in Canada, and staying safe, from the Dates.care team.

Dates.care is operated by DATES CARE, Scarborough, Ontario. For 18+ only.

**What's new** (first release)

Dates.care on Google Play: the same site, full-screen on your phone.

## Screenshots

Play needs at least two phone screenshots (16:9 or 9:16, 320 to 3840 px)
and a 1024×500 feature graphic. Take them on a real profile grid with real,
screened photos, never mock-ups; the listing may not show anything the app
does not.
