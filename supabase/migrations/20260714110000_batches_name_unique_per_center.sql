-- Batch name must be unique within a training center.
CREATE UNIQUE INDEX IF NOT EXISTS batches_center_name_unique
  ON public.batches (center_id, name);
