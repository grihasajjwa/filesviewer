create table public.files (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name text not null,
  type text not null,
  size bigint not null,
  url text not null,
  thumbnail text null,
  bucket_name text not null default 'files'::text,
  file_path text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  drive_link text null,
  drive_folder_link text null,
  folder_name text null,
  constraint files_pkey primary key (id),
  constraint files_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_files_updated_at BEFORE
update on files for EACH row
execute FUNCTION update_updated_at_column ();






create table public.internet_images (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text not null,
  url text not null,
  description text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint internet_images_pkey primary key (id)
) TABLESPACE pg_default;

create trigger update_internet_images_updated_at BEFORE
update on internet_images for EACH row
execute FUNCTION update_updated_at_column ();
