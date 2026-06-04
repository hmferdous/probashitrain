
CREATE POLICY "center members read course materials" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1]::uuid = public.get_user_center(auth.uid())
  );

CREATE POLICY "admins upload course materials" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1]::uuid = public.get_user_center(auth.uid())
    AND public.has_role(auth.uid(), 'center_admin')
  );

CREATE POLICY "admins update course materials" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1]::uuid = public.get_user_center(auth.uid())
    AND public.has_role(auth.uid(), 'center_admin')
  );

CREATE POLICY "admins delete course materials" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1]::uuid = public.get_user_center(auth.uid())
    AND public.has_role(auth.uid(), 'center_admin')
  );
