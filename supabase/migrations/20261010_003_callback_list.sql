-- Callback list on the dashboard, and which engine classified each call.
alter table public.calls add column if not exists callback_done_at timestamptz;
alter table public.calls add column if not exists callback_done_by text;
alter table public.calls add column if not exists classified_by text;   -- gemini | gemini-fallback-model | rules
alter table public.calls add column if not exists ai_error text;
