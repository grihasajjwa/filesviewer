-- Add drive_link column to files table
ALTER TABLE public.files
ADD COLUMN drive_link TEXT;