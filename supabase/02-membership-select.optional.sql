-- OPSIONAL. Tidak dijalankan oleh aplikasi atau oleh implementasi ini.
-- Gunakan HANYA jika audit membuktikan akun admin belum dapat SELECT user_id
-- miliknya. Tinjau policy yang sudah ada terlebih dahulu; jangan tempel buta.
-- Tidak membuat ulang tabel/akun/bucket, tidak memberi hak tulis apa pun.
-- Policy restrictive lain tetap dapat menolak baca; periksa hasil audit.
begin;

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'admin_users' and c.relrowsecurity
  ) then
    raise exception 'RLS admin_users harus sudah aktif; hentikan dan audit konfigurasi.';
  end if;
end $$;

grant select (user_id) on table public.admin_users to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_users'
      and policyname = 'tumbuh_read_own_admin_membership'
  ) then
    create policy tumbuh_read_own_admin_membership on public.admin_users
      for select to authenticated
      using (user_id = (select auth.uid()));
  end if;
end $$;

commit;
