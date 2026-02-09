-- Create the search_results_fran table for the new client profile
-- Based on the existing search_results table structure

create table public.search_results_fran (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  
  session_id text, -- To group results by "Search Session"
  platform text, -- 'instagram', 'gmaps', 'linkedin'
  query text,
  
  lead_data jsonb, -- Stores the full object
  status text default 'new', -- 'new', 'contacted', 'replied'
  
  created_at timestamptz default now()
);

-- RLS: Users can only see their own search results in this table
alter table public.search_results_fran enable row level security;

create policy "Users can view own results fran" on public.search_results_fran
  for select using (auth.uid() = user_id);

create policy "Users can insert own results fran" on public.search_results_fran
  for insert with check (auth.uid() = user_id);
  
-- Indexes for performance
create index idx_search_results_fran_user on public.search_results_fran(user_id);
create index idx_search_results_fran_session on public.search_results_fran(session_id);

-- Notify completion
SELECT 'Table search_results_fran created successfully' as status;
