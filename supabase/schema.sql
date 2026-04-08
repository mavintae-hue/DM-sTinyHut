-- Enable PostgreSQL extensions
create extension if not exists "uuid-ossp";

-- Table: rooms
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: actions (presets and custom actions)
create table actions (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade, -- null for global presets
  owner_name text, -- null for global presets
  name text not null,
  attack_range text,
  hit_bonus integer not null default 0,
  damage_dice text not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: rolls_history
create table rolls_history (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  player_name text not null,
  action_name text not null,
  roll_type text not null, -- 'hit_normal', 'hit_adv', 'hit_disadv', 'damage_normal', 'damage_crit', 'custom'
  result_total integer not null,
  result_details jsonb not null, -- e.g., {"rolls": [15, 2], "modifier": 5, "formula": "1d20+5"}
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Realtime functionality
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table rolls_history;

-- Add RLS Policies (For a quick start, enable public access - adjust in production)
alter table rooms enable row level security;
alter table actions enable row level security;
alter table rolls_history enable row level security;

-- Allow public read/write (simplified for this tool, assuming anon key is used)
create policy "Public access to rooms" on rooms for all using (true) with check (true);
create policy "Public access to actions" on actions for all using (true) with check (true);
create policy "Public access to rolls" on rolls_history for all using (true) with check (true);
