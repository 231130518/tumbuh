-- UJI OTORISASI SQL, bukan migrasi. Jalankan sebagai pemilik melalui SQL Editor.
-- Ganti 3 placeholder dengan DUA akun UJI yang sudah ada dan satu artikel UJI.
-- Utamakan staging. Tidak membuat akun/tabel/bucket. UPDATE dibatalkan ROLLBACK.
-- Jika ada webhook/trigger dengan efek eksternal, rollback tidak membatalkan efek
-- eksternal tersebut: jangan gunakan artikel produksi untuk pengujian ini.
-- Script sengaja gagal sebelum UPDATE bila placeholder belum diisi.
begin;

do $$
declare
  admin_id uuid := 'GANTI_UUID_ADMIN_UJI';
  member_id uuid := 'GANTI_UUID_NON_ADMIN_UJI';
  article_id bigint := 'GANTI_ID_ARTIKEL_UJI';
  old_status text;
  affected bigint;
begin
  if admin_id = member_id then raise exception 'Gunakan dua akun berbeda'; end if;
  if not exists (select 1 from public.admin_users where user_id = admin_id) then
    raise exception 'Akun admin uji belum terdaftar';
  end if;
  if exists (select 1 from public.admin_users where user_id = member_id) or
     not exists (select 1 from auth.users where id = member_id) then
    raise exception 'Gunakan UUID akun non-admin yang sudah ada';
  end if;
  select status into strict old_status from public.articles where id = article_id;

  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  execute 'set local role authenticated';
  if not exists (select 1 from public.admin_users where user_id = admin_id) then
    raise exception 'Admin tidak dapat memverifikasi keanggotaannya';
  end if;
  update public.articles set status = 'published' where id = article_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Admin tidak dapat menerbitkan artikel uji'; end if;
  update public.articles set status = 'rejected' where id = article_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Admin tidak dapat menolak artikel uji'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', member_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', member_id::text, true);
  execute 'set local role authenticated';
  affected := 0;
  begin
    update public.articles set status = 'published' where id = article_id;
    get diagnostics affected = row_count;
  exception when insufficient_privilege then affected := 0;
  end;
  if affected <> 0 then raise exception 'KEBOCORAN AKSES: non-admin dapat mengubah artikel'; end if;
  if has_table_privilege(current_user, 'public.admin_users', 'INSERT') or
     has_table_privilege(current_user, 'public.admin_users', 'UPDATE') or
     has_table_privilege(current_user, 'public.admin_users', 'DELETE') or
     has_any_column_privilege(current_user, 'public.admin_users', 'INSERT') or
     has_any_column_privilege(current_user, 'public.admin_users', 'UPDATE') then
    raise warning 'Client punya grant tulis admin_users; audit RLS untuk mencegah pengguna menjadikan dirinya admin';
  end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  affected := 0;
  begin
    update public.articles set status = 'published' where id = article_id;
    get diagnostics affected = row_count;
  exception when insufficient_privilege then affected := 0;
  end;
  if affected <> 0 then raise exception 'KEBOCORAN AKSES: anon dapat mengubah artikel'; end if;
  execute 'reset role';
  raise notice 'PASS: admin dapat publish/reject; non-admin dan anon tidak dapat UPDATE artikel uji. Seluruh perubahan dibatalkan.';
end $$;

rollback;
