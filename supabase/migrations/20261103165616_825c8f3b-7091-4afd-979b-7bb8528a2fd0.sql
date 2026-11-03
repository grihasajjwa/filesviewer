ALTER TABLE public.files ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS files_deleted_at_idx ON public.files (deleted_at);