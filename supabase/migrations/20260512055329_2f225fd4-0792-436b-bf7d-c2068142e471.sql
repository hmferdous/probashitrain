-- Extend students with personal/education info
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- Document type enum
DO $$ BEGIN
  CREATE TYPE public.document_type AS ENUM ('nid','education_certificate','cv','training_certificate','photo','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  doc_type public.document_type NOT NULL DEFAULT 'other',
  label text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view student documents"
ON public.student_documents FOR SELECT TO authenticated
USING (center_id = public.get_user_center(auth.uid()));

CREATE POLICY "admins manage student documents"
ON public.student_documents FOR ALL TO authenticated
USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

CREATE INDEX IF NOT EXISTS idx_student_documents_student ON public.student_documents(student_id);

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-docs','student-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path layout is "<center_id>/<student_id>/<filename>"
CREATE POLICY "center members read student docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-docs'
  AND (storage.foldername(name))[1]::uuid = public.get_user_center(auth.uid())
);

CREATE POLICY "admins upload student docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-docs'
  AND (storage.foldername(name))[1]::uuid = public.get_user_center(auth.uid())
  AND public.has_role(auth.uid(), 'center_admin')
);

CREATE POLICY "admins update student docs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'student-docs'
  AND (storage.foldername(name))[1]::uuid = public.get_user_center(auth.uid())
  AND public.has_role(auth.uid(), 'center_admin')
);

CREATE POLICY "admins delete student docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-docs'
  AND (storage.foldername(name))[1]::uuid = public.get_user_center(auth.uid())
  AND public.has_role(auth.uid(), 'center_admin')
);