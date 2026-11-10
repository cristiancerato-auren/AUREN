-- Allow signed-in users to update only their own contact fields.
-- RLS still restricts rows to auth.uid() = id, and the protect_profile_role
-- trigger prevents account_type changes from authenticated sessions.
grant update (full_name, phone) on public.profiles to authenticated;
