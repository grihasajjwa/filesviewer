ALTER TABLE public.file_user_shares
  ADD COLUMN IF NOT EXISTS shared_with_username text,
  ADD COLUMN IF NOT EXISTS shared_by_username text;