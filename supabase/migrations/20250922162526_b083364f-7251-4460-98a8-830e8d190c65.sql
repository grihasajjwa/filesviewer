-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true);

-- Create RLS policies for file uploads
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'files' AND 
  auth.role() = 'authenticated'
);

-- Allow public access to view files
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'files');

-- Allow file owners to delete their files
CREATE POLICY "Allow authenticated delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'files' AND 
  auth.role() = 'authenticated'
);

-- Allow file owners to update their files
CREATE POLICY "Allow authenticated update own files" ON storage.objects  
FOR UPDATE USING (
  bucket_id = 'files' AND 
  auth.role() = 'authenticated'
);