-- 1. Create file_shares table for secure sharing
CREATE TABLE public.file_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares for files they own or shares they created
CREATE POLICY "Users can view their own shares"
ON public.file_shares FOR SELECT
USING (auth.uid() = created_by);

-- Users can create shares for their own files
CREATE POLICY "Users can create shares for own files"
ON public.file_shares FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (SELECT 1 FROM public.files WHERE id = file_id AND user_id = auth.uid())
);

-- Users can delete their own shares
CREATE POLICY "Users can delete own shares"
ON public.file_shares FOR DELETE
USING (auth.uid() = created_by);

-- 2. Create function to get file by share token (for public access)
CREATE OR REPLACE FUNCTION public.get_file_by_share_token(token text)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  size bigint,
  url text,
  drive_link text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.name, f.type, f.size, f.url, f.drive_link
  FROM public.files f
  INNER JOIN public.file_shares s ON s.file_id = f.id
  WHERE s.share_token = token
    AND (s.expires_at IS NULL OR s.expires_at > now());
$$;

-- 3. Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view files for sharing" ON public.files;

-- 4. Fix storage policies - drop existing permissive ones
DROP POLICY IF EXISTS "Allow authenticated delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update own files" ON storage.objects;

-- 5. Create proper ownership-verified storage policies
-- Files should be stored as: {user_id}/{filename}
CREATE POLICY "Allow owners to delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow owners to update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);