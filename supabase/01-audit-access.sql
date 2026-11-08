-- BACA SAJA. Jalankan di SQL Editor sebagai pemilik proyek dan tinjau hasilnya.
-- Tidak membuat/mengubah tabel, akun, bucket, grant, atau policy.

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('articles', 'admin_users')
order by table_name, ordinal_position;

select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('articles', 'admin_users');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('articles', 'admin_users'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, cmd, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public' and table_name in ('articles', 'admin_users')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, grantee, privilege_type;

select table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name in ('articles', 'admin_users')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, column_name, grantee;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'articles-images';

-- Yang perlu dipastikan:
-- 1. RLS aktif pada articles dan admin_users.
-- 2. authenticated dapat SELECT baris admin_users miliknya (user_id = auth.uid()).
-- 3. Client anon/authenticated TIDAK dapat INSERT/UPDATE/DELETE admin_users.
-- 4. UPDATE articles memakai keanggotaan admin pada USING dan WITH CHECK.
-- 5. Tidak ada policy permissive lain yang meloloskan non-admin melalui OR.
-- 6. Jangan memberi UPDATE/DELETE articles ke anon. Batasi grant admin ke kolom
--    status bila tidak ada fitur lain yang membutuhkan UPDATE kolom berbeda.
-- 7. Tinjau fungsi RPC SECURITY DEFINER dan view yang mungkin melewati RLS juga.
-- 8. Public bucket berarti gambar dapat dibaca lewat URL, termasuk gambar pending.
