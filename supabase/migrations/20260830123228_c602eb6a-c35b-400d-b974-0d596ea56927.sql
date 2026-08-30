REVOKE EXECUTE ON FUNCTION public.is_file_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_file_shared_with(uuid, uuid) FROM PUBLIC, anon, authenticated;