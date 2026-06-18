ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS sign_in_time time,
  ADD COLUMN IF NOT EXISTS sign_out_time time;