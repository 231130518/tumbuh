-- Pengiriman tanpa login + bacaan publik, setelah audit 01-audit-access.sql.
-- Tinjau sebelum dijalankan. File ini TIDAK dijalankan otomatis dari frontend.
-- Tidak membuat ulang tabel/akun/bucket. Tidak membuka SELECT email/pending,
-- UPDATE, DELETE, atau akses admin untuk pengunjung.
-- INSERT/upload publik dapat disalahgunakan untuk spam; sebelum trafik besar,
-- gunakan gateway dengan CAPTCHA yang diverifikasi server dan rate limiting.
begin;

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'articles' and c.relrowsecurity
  ) then
    raise exception 'RLS articles harus aktif. Audit konfigurasi sebelum melanjutkan.';
  end if;
  if not exists (
    select 1 from storage.buckets where id = 'articles-images' and public
      and file_size_limit between 1 and 5242880
      and allowed_mime_types is not null
      and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]
      and allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp']::text[]
  ) then
    raise exception 'Bucket yang sudah ada harus public, maksimal 5 MB, hanya JPG/PNG/WebP. Sesuaikan lewat Storage terlebih dahulu.';
  end if;
end $$;

-- Mencegah retry request yang responsnya terputus membuat artikel ganda.
-- Nama index dipakai oleh client untuk mengenali pengiriman yang sudah diterima.
create unique index if not exists tumbuh_submission_cover_unique
  on public.articles (cover_image_path)
  where cover_image_path like 'submissions/%';

-- Helper baca-saja. Tidak mengekspos daftar objek atau isi artikel.
-- SECURITY DEFINER diperlukan agar anon tidak memperoleh SELECT storage.objects.
create or replace function public.tumbuh_submission_cover_exists(object_path text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from storage.objects o
    where o.bucket_id = 'articles-images'
      and o.name = object_path
      and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
      and (o.metadata->>'size')::bigint between 1 and 5242880
  );
$$;
revoke all on function public.tumbuh_submission_cover_exists(text) from public;
grant execute on function public.tumbuh_submission_cover_exists(text) to anon;

-- Tidak memberikan hak mengatur id/created_at dan tidak meminta RETURNING rows.
grant insert (author_name, author_email, title, subtitle, content, cover_image_path, status)
  on public.articles to anon;
do $$
declare sequence_name text;
begin
  sequence_name := pg_get_serial_sequence('public.articles', 'id');
  if sequence_name is not null then execute format('grant usage on sequence %s to anon', sequence_name); end if;
end $$;

-- Hanya policy milik integrasi ini yang diganti, bukan policy admin yang ada.
drop policy if exists tumbuh_public_submit_pending on public.articles;
create policy tumbuh_public_submit_pending on public.articles
for insert to anon
with check (status = 'pending');

-- Restrictive tetap berlaku meskipun ada policy INSERT permissive lain.
drop policy if exists tumbuh_public_submission_limits on public.articles;
create policy tumbuh_public_submission_limits on public.articles
as restrictive for insert to anon
with check (
  status = 'pending'
  and char_length(btrim(author_name)) between 2 and 100
  and (author_email is null or (
    char_length(author_email) between 3 and 254
    and author_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ))
  and char_length(btrim(title)) between 5 and 150
  and char_length(btrim(subtitle)) between 12 and 500
  and char_length(content) between 25 and 100000
  and char_length(btrim(regexp_replace(content, '<[^>]*>', '', 'g'))) between 25 and 50000
  and cover_image_path ~ '^submissions/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/cover[.](jpg|png|webp)$'
  and public.tumbuh_submission_cover_exists(cover_image_path)
);

drop policy if exists tumbuh_public_no_article_update on public.articles;
create policy tumbuh_public_no_article_update on public.articles
as restrictive for update to anon using (false) with check (false);
drop policy if exists tumbuh_public_no_article_delete on public.articles;
create policy tumbuh_public_no_article_delete on public.articles
as restrictive for delete to anon using (false);

-- Public bucket memberi akses download URL; unggah tetap perlu policy INSERT.
-- Bucket sendiri menegakkan maksimum ukuran dan daftar MIME.
drop policy if exists tumbuh_public_cover_insert on storage.objects;
create policy tumbuh_public_cover_insert on storage.objects
for insert to anon
with check (
  bucket_id = 'articles-images'
  and name ~ '^submissions/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/cover[.](jpg|png|webp)$'
);
drop policy if exists tumbuh_public_cover_scope on storage.objects;
create policy tumbuh_public_cover_scope on storage.objects
as restrictive for insert to anon
with check (
  bucket_id <> 'articles-images'
  or name ~ '^submissions/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/cover[.](jpg|png|webp)$'
);
drop policy if exists tumbuh_public_no_cover_update on storage.objects;
create policy tumbuh_public_no_cover_update on storage.objects
as restrictive for update to anon
using (bucket_id <> 'articles-images') with check (bucket_id <> 'articles-images');
drop policy if exists tumbuh_public_no_cover_delete on storage.objects;
create policy tumbuh_public_no_cover_delete on storage.objects
as restrictive for delete to anon using (bucket_id <> 'articles-images');

-- Bacaan publik hanya published, dengan akses kolom eksplisit tanpa email.
-- Menghapus grant SELECT tingkat tabel diperlukan agar larangan kolom efektif.
revoke select on table public.articles from anon;
revoke select (author_email) on public.articles from anon;
grant select (id, created_at, author_name, title, subtitle, content, cover_image_path, status)
  on public.articles to anon;

drop policy if exists tumbuh_public_read_published on public.articles;
create policy tumbuh_public_read_published on public.articles
for select to anon using (status = 'published');
drop policy if exists tumbuh_public_read_published_only on public.articles;
create policy tumbuh_public_read_published_only on public.articles
as restrictive for select to anon using (status = 'published');

-- Grant dari PUBLIC atau role turunan juga dapat membuka email. Jangan lanjut
-- jika masih ada akses itu; rollback dan tinjau hasil audit terlebih dahulu.
do $$
begin
  if has_column_privilege('anon', 'public.articles', 'author_email', 'SELECT') then
    raise exception 'anon masih mewarisi SELECT author_email dari role lain. Audit dan batasi grant tersebut sebelum publikasi.';
  end if;
end $$;

commit;
