-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.file_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  share_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'::text) UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_by uuid NOT NULL,
  CONSTRAINT file_shares_pkey PRIMARY KEY (id),
  CONSTRAINT file_shares_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id),
  CONSTRAINT file_shares_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  size bigint NOT NULL,
  url text NOT NULL,
  thumbnail text,
  bucket_name text NOT NULL DEFAULT 'files'::text,
  file_path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  drive_link text,
  drive_folder_link text,
  folder_name text,
  CONSTRAINT files_pkey PRIMARY KEY (id),
  CONSTRAINT files_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.internet_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT internet_images_pkey PRIMARY KEY (id)
);
CREATE TABLE public.page_visit_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  page_path text NOT NULL UNIQUE,
  visit_count bigint NOT NULL DEFAULT 0,
  last_visited_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT page_visit_stats_pkey PRIMARY KEY (id)
);
