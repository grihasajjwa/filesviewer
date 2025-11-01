-- Fix search_path for security
DROP FUNCTION IF EXISTS public.increment_page_visit(text);

CREATE OR REPLACE FUNCTION public.increment_page_visit(page_path_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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