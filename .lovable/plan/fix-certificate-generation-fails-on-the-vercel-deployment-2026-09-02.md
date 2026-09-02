# Fix: certificate generation fails on the Vercel deployment

## What is happening

Generation starts by calling the server to register the batch and mint verification codes. That server call needs two backend credentials (`SUPABASE_URL` and the service key) that Lovable's own hosting injects automatically. A Vercel deployment does not have them, so the very first step throws and the whole run stops with the generic "Something went wrong while generating certificates" toast — even though the drawing/export part of the app works entirely in the browser.

Note: this diagnosis is based on how the code is wired (the batch call runs first and hard-fails without those variables). The first implementation step confirms it against the live deployment before anything else changes.

## Plan

1. **Confirm the cause** — call the batch endpoint on the deployed site and read the real status/message, so we fix the actual failure and not a guess.
2. **Show the real error instead of a generic toast** — surface the server's message in the toast and in a small inline error box, so future failures are self-explanatory.
3. **Make generation degrade gracefully** — if the verification backend is unavailable, still generate every certificate (offline mode) with QR codes omitted, plus a clear notice explaining that verification links need the backend configured. Certificates, PNG/ZIP and PDF export keep working.
4. **Document the deployment requirement** — add the required environment variables to `roadmap.md` / a short README section so the Vercel project can be configured to restore QR verification.

## Choice you should be aware of

QR verification only works when the site can reach the project's backend. Two ways to get it back on Vercel:

- Add the backend URL + service key as environment variables in the Vercel project (I will list exactly which ones; the values come from your project settings).
- Or keep publishing through Lovable's Publish button, where they are wired automatically.

Either way, after this fix the site never blocks certificate generation because of the backend.

## Technical notes

- `src/routes/index.tsx`: wrap `createBatch` in its own try/catch, keep a `verificationEnabled` flag, build jobs without codes/QR when it fails, and pass the caught message to the toast.
- `src/components/Certificate.tsx`: render the QR block only when a code exists.
- `src/lib/verification.functions.ts`: return a typed, readable error rather than letting the raw missing-env exception escape as a 500.
- No schema or export-pipeline changes.
