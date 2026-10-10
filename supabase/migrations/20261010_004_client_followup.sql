-- Client follow-up email (portfolio + about Aangan) and caller-initiated reschedules.
alter table public.calls drop constraint if exists calls_classification_check;
alter table public.calls add constraint calls_classification_check
  check (classification in ('qualified','not_fit','pricing_ask','complaint','reschedule','unclear'));
alter table public.calls add column if not exists client_email text;
alter table public.calls add column if not exists client_email_sent_at timestamptz;
alter table public.calls add column if not exists client_message_id text;
alter table public.calls add column if not exists linked_call_id uuid references public.calls(id);
