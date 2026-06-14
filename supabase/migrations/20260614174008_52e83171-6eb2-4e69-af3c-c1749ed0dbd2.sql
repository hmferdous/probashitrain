ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.courses ALTER COLUMN trade_id DROP NOT NULL;