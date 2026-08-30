CREATE TABLE public.certificate_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edit_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  organization TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  verify_headline TEXT NOT NULL DEFAULT 'Certificate verified',
  verify_message TEXT NOT NULL DEFAULT 'This certificate was issued by our organization and is valid.',
  contact_email TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.certificate_batches(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE DEFAULT upper(encode(gen_random_bytes(5), 'hex')),
  recipient_name TEXT NOT NULL,
  cert_title TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  issue_date TEXT NOT NULL DEFAULT '',
  signatory_name TEXT NOT NULL DEFAULT '',
  signatory_role TEXT NOT NULL DEFAULT '',
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX certificates_batch_id_idx ON public.certificates(batch_id);

GRANT ALL ON public.certificate_batches TO service_role;
GRANT ALL ON public.certificates TO service_role;

ALTER TABLE public.certificate_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;