CREATE TABLE public.custom_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_token text NOT NULL,
  name text NOT NULL,
  background_url text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX custom_templates_owner_token_idx ON public.custom_templates (owner_token);

-- Access is mediated by server functions that require the private owner token,
-- mirroring the certificate_batches edit_token trust model. No anon/authenticated grants.
GRANT ALL ON public.custom_templates TO service_role;

ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.custom_templates IS 'User-uploaded certificate designs; rows are read/written only through privileged server functions after owner_token verification.';