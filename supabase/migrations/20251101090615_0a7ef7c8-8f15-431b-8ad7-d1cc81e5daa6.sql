-- Create table to track page visits
CREATE TABLE public.page_visit_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  page_path text NOT NULL UNIQUE,
  visit_count bigint NOT NULL DEFAULT 0,
  last_visited_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT page_visit_stats_pkey PRIMARY KEY (id)
);

-- Create index for faster lookups
CREATE INDEX idx_page_visit_stats_page_path ON public.page_visit_stats(page_path);

-- Create function to increment visit count
CREATE OR REPLACE FUNCTION public.increment_page_visit(page_path_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.page_visit_stats (page_path, visit_count, last_visited_at)
  VALUES (page_path_param, 1, now())
  ON CONFLICT (page_path)
  DO UPDATE SET 
    visit_count = page_visit_stats.visit_count + 1,
    last_visited_at = now();
END;
$$;

-- Enable RLS (but make it accessible to everyone including anonymous users)
ALTER TABLE public.page_visit_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read visit stats
CREATE POLICY "Anyone can view visit stats"
ON public.page_visit_stats
FOR SELECT
USING (true);

-- Insert initial row for home page
INSERT INTO public.page_visit_stats (page_path, visit_count) 
VALUES ('/', 0)
ON CONFLICT (page_path) DO NOTHING;