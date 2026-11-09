-- Tinjau audit 01 dahulu, lalu jalankan melalui SQL Editor.
-- Tidak menghapus artikel saat dijalankan, tidak membuat ulang tabel/bucket/akun.
-- Membuka DELETE hanya untuk pengguna terdaftar di admin_users.user_id.
begin;

do $$
begin
  if (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in ('articles', 'admin_users')
        and c.relrowsecurity) <> 2 then
    raise exception 'RLS articles dan admin_users harus aktif. Audit sebelum melanjutkan.';
  end if;
end $$;

grant delete on public.articles to authenticated;
-- SELECT artikel dan membership admin tetap memakai policy yang sudah ada.
-- Restrictive menahan policy DELETE/ALL lain yang terlalu longgar untuk client.
drop policy if exists tumbuh_admin_delete on public.articles;
create policy tumbuh_admin_delete on public.articles
  for delete to authenticated
  using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

drop policy if exists tumbuh_admin_delete_guard on public.articles;
create policy tumbuh_admin_delete_guard on public.articles
  as restrictive for delete to authenticated
  using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

drop policy if exists tumbuh_anon_delete_guard on public.articles;
create policy tumbuh_anon_delete_guard on public.articles
  as restrictive for delete to anon using (false);

commit;
