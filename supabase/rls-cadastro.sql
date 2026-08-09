-- Permite o front (anon key) cadastrar e vincular peoples + character.
-- Rode no SQL Editor do Supabase.

alter table public.peoples enable row level security;
alter table public.character enable row level security;
alter table public.tierlists enable row level security;
alter table public.tierlist_people_characters enable row level security;

drop policy if exists "anon_select_peoples" on public.peoples;
drop policy if exists "anon_insert_peoples" on public.peoples;
drop policy if exists "anon_select_character" on public.character;
drop policy if exists "anon_insert_character" on public.character;
drop policy if exists "anon_select_tierlists" on public.tierlists;
drop policy if exists "anon_insert_tierlists" on public.tierlists;
drop policy if exists "anon_select_links" on public.tierlist_people_characters;
drop policy if exists "anon_insert_links" on public.tierlist_people_characters;
drop policy if exists "anon_update_links" on public.tierlist_people_characters;

create policy "anon_select_peoples"
  on public.peoples for select to anon, authenticated using (true);

create policy "anon_insert_peoples"
  on public.peoples for insert to anon, authenticated with check (true);

create policy "anon_select_character"
  on public.character for select to anon, authenticated using (true);

create policy "anon_insert_character"
  on public.character for insert to anon, authenticated with check (true);

create policy "anon_select_tierlists"
  on public.tierlists for select to anon, authenticated using (true);

create policy "anon_insert_tierlists"
  on public.tierlists for insert to anon, authenticated with check (true);

create policy "anon_select_links"
  on public.tierlist_people_characters for select to anon, authenticated using (true);

create policy "anon_insert_links"
  on public.tierlist_people_characters for insert to anon, authenticated with check (true);

create policy "anon_update_links"
  on public.tierlist_people_characters for update to anon, authenticated
  using (true) with check (true);
