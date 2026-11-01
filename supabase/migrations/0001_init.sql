-- Zählwerk – Team-Backend (vorbereitet, noch nicht angeschlossen)
-- Ziel: Jeder VP pflegt seine eigenen Zahlen, Teamleiter sehen die Zahlen ihrer Teammitglieder.
-- Die Tabellen bilden 1:1 das lokale Datenmodell ab (app/src/lib/types.ts).

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

create type public.team_role as enum ('leader', 'member');

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.team_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Ein Tag im Eigenumsatz (Blatt „Eigenumsatz 2026“)
create table public.day_entries (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  hours numeric(5,2), klingeln int, entscheider int, abrechnungen int, kunden int, zaehler int,
  prov_d2d numeric(10,2), zaehler_extra int, prov_extra numeric(10,2),
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Ein Tag im Teamaufbau (Blatt „Teamumsatz 2026“)
create table public.team_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  gepitcht int, terminiert int, praesentiert int, registriert int, folgetermin int,
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Wochenwerte: Storno-Quote und abweichende Wochenziele. week = 'YYYY-Www' (ISO)
create table public.week_meta (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week text not null check (week ~ '^\d{4}-W\d{2}$'),
  storno numeric(5,2) check (storno between 0 and 100),
  targets jsonb not null default '{}',
  team_targets jsonb not null default '{}',
  primary key (user_id, week)
);

-- Ziele, Meilensteine, Standardziele, Monatswerte (VPs / Aufträge)
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  goal_text text not null default '',
  goal_netto_year numeric(12,2),
  milestones jsonb not null default '[]',
  default_storno numeric(5,2),
  default_targets jsonb not null default '{}',
  default_team_targets jsonb not null default '{}',
  months jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Hilfsfunktion: Ist der aktuelle Nutzer Leiter eines Teams, in dem `member` ist?
create or replace function public.leads(member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from team_members l
    join team_members m on m.team_id = l.team_id
    where l.user_id = auth.uid() and l.role = 'leader' and m.user_id = member
  )
$$;

create or replace function public.is_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where team_id = t and user_id = auth.uid())
$$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.day_entries enable row level security;
alter table public.team_days enable row level security;
alter table public.week_meta enable row level security;
alter table public.user_settings enable row level security;

-- Profile: selbst lesen/schreiben, Teamleiter lesen ihre Mitglieder
create policy "profil selbst" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "profil leiter" on public.profiles for select using (public.leads(id));

-- Teams: Mitglieder sehen ihr Team, jeder darf ein Team anlegen
create policy "team lesen" on public.teams for select using (public.is_member(id));
create policy "team anlegen" on public.teams for insert with check (created_by = auth.uid());

-- Mitgliedschaften: eigene sehen, Leiter sehen alle im Team. Beitritt läuft über die Funktion join_team.
create policy "mitglied lesen" on public.team_members for select using (user_id = auth.uid() or public.leads(user_id));

-- Eigene Zahlen: voller Zugriff. Teamleiter: nur lesen.
do $$
declare t text;
begin
  foreach t in array array['day_entries', 'team_days', 'week_meta', 'user_settings'] loop
    execute format('create policy "eigene daten" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "leiter liest" on public.%I for select using (public.leads(user_id))', t);
  end loop;
end $$;

-- Team gründen (Gründer wird Leiter) und per Einladungscode beitreten
create or replace function public.create_team(team_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  insert into teams (name, created_by) values (team_name, auth.uid()) returning id into tid;
  insert into team_members (team_id, user_id, role) values (tid, auth.uid(), 'leader');
  return tid;
end $$;

create or replace function public.join_team(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  select id into tid from teams where invite_code = code;
  if tid is null then raise exception 'Einladungscode ungültig'; end if;
  insert into team_members (team_id, user_id) values (tid, auth.uid()) on conflict do nothing;
  return tid;
end $$;

-- Neues Konto → Profil anlegen
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
