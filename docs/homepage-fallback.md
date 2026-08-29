# The homepage fallback in `index.html`

## Why it exists

Google's OAuth brand verification fetched `https://dates.care` and rejected the
app twice:

> Your homepage is behind a login page.

> The app name 'Datescare' configured for your OAuth consent screen does not
> match the app name on your homepage.

Neither complaint was about the app. Both were about what the **served HTML**
says before React runs.

`index.html` shipped an empty `<div id="app"></div>`. Everything a visitor sees
— the hero, the description, the trust points — is rendered by React after the
bundle downloads and executes. Fetch the URL without running JavaScript and the
document contains meta tags and nothing else. There is no description of the
service, and the string "Dates.care" appears only inside `<title>`.

So a checker that does not execute JavaScript sees no homepage content at all,
and one that does execute it lands on a screen whose most prominent controls are
*Create your free account* and *Sign in* — which is what "behind a login page"
means.

## How it works

The content lives inside `<div id="app">` rather than beside it.

`createRoot(container)` clears the container's existing children on its first
render. So the fallback is the entire page to anything that does not run the
bundle, and it is gone the instant React mounts. No flag to unset, no cleanup
code, no element left in the tree competing with the app.

It is styled with the app's own gradient so the moment before hydration reads as
a first paint rather than a flash of unrelated content.

## What it must keep

Three things, or the verification complaints come back:

1. **`Dates.care` in an `<h1>`.** The consent-screen app name must match a name
   visible on the homepage. Set the Google Cloud app name to exactly
   `Dates.care` — not `Datescare`, which is what was rejected.
2. **A description of the service before any sign-in control.** State what
   Dates.care is and what it offers. The fallback mentions no sign-in at all,
   which is the safest reading of "not behind a login page".
3. **Real `<a>` elements for the policy links.** A crawler follows anchors; it
   does not click React handlers.

`src/screens/Welcome/Welcome.tsx` carries the name in its hero for the same
reason — that covers a checker that *does* render JavaScript.

## When editing

Keep it plain HTML with inline styles. Tailwind classes will not work here: the
stylesheet is a separate request and may not have arrived, and the fallback's
whole purpose is to be correct with nothing else loaded.
