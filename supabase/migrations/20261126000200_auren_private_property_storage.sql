-- AUREN: make property photographs private and expose only approved listings.
-- Apply only after deploying the signed-URL-aware frontend and testing it on a preview.
-- No existing objects or property rows were present when this migration was prepared.

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'property-images';

drop policy if exists "Public can view property images 107eh68_0" on storage.objects;
drop policy if exists "Public can view published property images" on storage.objects;
drop policy if exists "Owners can view own pending property images" on storage.objects;
drop policy if exists "Admins can view property images" on storage.objects;
drop policy if exists "Authenticated users upload property images 107eh68_0" on storage.objects;
drop policy if exists "Owners can upload images to own pending properties" on storage.objects;
drop policy if exists "Owners can delete images from own pending properties" on storage.objects;

create policy "Public can view published property images"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'property-images'
  and exists (
    select 1 from public.properties p
    where p.owner_id::text = (storage.foldername(name))[1]
      and p.status = 'published'
      and (
        p.id::text = (storage.foldername(name))[2]
        or p.image_url like '%/storage/v1/object/public/property-images/' || name
        or exists (
          select 1 from public.property_images pi
          where pi.property_id = p.id and pi.storage_path = name
        )
      )
  )
);

create policy "Owners can view own pending property images"
on storage.objects for select to authenticated
using (
  bucket_id = 'property-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.owner_id = (select auth.uid())
      and (
        p.id::text = (storage.foldername(name))[2]
        or p.image_url like '%/storage/v1/object/public/property-images/' || name
        or exists (
          select 1 from public.property_images pi
          where pi.property_id = p.id and pi.owner_id = (select auth.uid())
            and pi.storage_path = name
        )
      )
  )
);

create policy "Admins can view property images"
on storage.objects for select to authenticated
using (
  bucket_id = 'property-images'
  and exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid())
      and pr.account_type = 'admin'
  )
);

create policy "Owners can upload images to own pending properties"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'property-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
      and p.status = 'pending'
  )
);

create policy "Owners can delete images from own pending properties"
on storage.objects for delete to authenticated
using (
  bucket_id = 'property-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
      and p.status = 'pending'
  )
);
