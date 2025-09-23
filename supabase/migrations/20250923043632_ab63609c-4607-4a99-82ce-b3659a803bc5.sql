-- Create table for internet image links
CREATE TABLE public.internet_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.internet_images ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own internet images" 
ON public.internet_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own internet images" 
ON public.internet_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own internet images" 
ON public.internet_images 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own internet images" 
ON public.internet_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_internet_images_updated_at
BEFORE UPDATE ON public.internet_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_name column to files table for better folder organization
ALTER TABLE public.files 
ADD COLUMN folder_name TEXT;