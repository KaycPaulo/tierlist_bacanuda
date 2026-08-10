-- Permite o front (anon key) operar nas tabelas atuais do app.
-- Tabelas: tierlists, tiers, peoples, rankings
-- Rode no SQL Editor do Supabase.

alter table public.peoples enable row level security;
alter table public.tiers enable row level security;
alter table public.tierlists enable row level security;
alter table public.rankings enable row level security;

drop policy if exists "anon_select_peoples" on public.peoples;
drop policy if exists "anon_insert_peoples" on public.peoples;
drop policy if exists "anon_update_peoples" on public.peoples;
drop policy if exists "anon_delete_peoples" on public.peoples;

drop policy if exists "anon_select_tiers" on public.tiers;

drop policy if exists "anon_select_tierlists" on public.tierlists;
drop policy if exists "anon_insert_tierlists" on public.tierlists;
drop policy if exists "anon_update_tierlists" on public.tierlists;
drop policy if exists "anon_delete_tierlists" on public.tierlists;

drop policy if exists "anon_select_rankings" on public.rankings;
drop policy if exists "anon_insert_rankings" on public.rankings;
drop policy if exists "anon_update_rankings" on public.rankings;
drop policy if exists "anon_delete_rankings" on public.rankings;

create policy "anon_select_peoples"
  on public.peoples for select to anon, authenticated using (true);

create policy "anon_insert_peoples"
  on public.peoples for insert to anon, authenticated with check (true);

create policy "anon_update_peoples"
  on public.peoples for update to anon, authenticated
  using (true) with check (true);

create policy "anon_delete_peoples"
  on public.peoples for delete to anon, authenticated using (true);

create policy "anon_select_tiers"
  on public.tiers for select to anon, authenticated using (true);

create policy "anon_select_tierlists"
  on public.tierlists for select to anon, authenticated using (true);

create policy "anon_insert_tierlists"
  on public.tierlists for insert to anon, authenticated with check (true);

create policy "anon_update_tierlists"
  on public.tierlists for update to anon, authenticated
  using (true) with check (true);

create policy "anon_delete_tierlists"
  on public.tierlists for delete to anon, authenticated using (true);

create policy "anon_select_rankings"
  on public.rankings for select to anon, authenticated using (true);

create policy "anon_insert_rankings"
  on public.rankings for insert to anon, authenticated with check (true);

create policy "anon_update_rankings"
  on public.rankings for update to anon, authenticated
  using (true) with check (true);

create policy "anon_delete_rankings"
  on public.rankings for delete to anon, authenticated using (true);
