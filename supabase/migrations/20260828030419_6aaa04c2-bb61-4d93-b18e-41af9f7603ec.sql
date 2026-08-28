ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS drive_file_id text,
  ADD COLUMN IF NOT EXISTS drive_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS drive_share_link text;