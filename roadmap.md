# GenCertificates roadmap

- [x] 60+ certificate templates with luxury textures
- [x] PDF / PNG / ZIP export
- [x] Custom brand uploads: logo, accent + text colors, heading/body fonts
- [x] Unique QR verification code per certificate + public verification page
- [x] Creator-editable verification page (private editor link, revoke certificates)
- [x] CSV / Excel name import with column picker

## Deploying outside Lovable (e.g. Vercel)

Certificate design, preview, PNG/ZIP and PDF export run entirely in the browser and
work on any host. QR verification (`/verify/<code>`, `/manage/<id>`) needs the
backend, which Lovable's own Publish wires up automatically.

On a third-party host, set these environment variables in the project settings,
otherwise the app falls back to "offline mode": certificates still generate, but
without QR verification codes.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Note that the build target is a serverless/edge worker; publishing through Lovable
is the supported path.
