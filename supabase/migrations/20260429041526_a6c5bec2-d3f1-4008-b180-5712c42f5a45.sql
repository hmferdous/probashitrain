-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('center_admin', 'instructor');
CREATE TYPE public.batch_status AS ENUM ('draft', 'published', 'in_progress', 'completed', 'archived');
CREATE TYPE public.pipeline_status AS ENUM ('applied', 'shortlisted', 'training_started', 'ongoing', 'completed', 'certified');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE public.student_source AS ENUM ('ami_probashi', 'manual');

-- ============ TRAINING CENTERS ============
CREATE TABLE public.training_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  center_id UUID REFERENCES public.training_centers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  center_id UUID REFERENCES public.training_centers(id) ON DELETE CASCADE,
  UNIQUE (user_id, role, center_id)
);

-- has_role helper (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_center(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT center_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- ============ TRADES ============
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ COURSES ============
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_hours INT NOT NULL DEFAULT 40,
  price NUMERIC(10,2) DEFAULT 0,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ BATCHES ============
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  capacity INT NOT NULL DEFAULT 30,
  status public.batch_status NOT NULL DEFAULT 'draft',
  published_to_ami_probashi BOOLEAN NOT NULL DEFAULT false,
  schedule_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ STUDENTS ============
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  nid TEXT,
  address TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ ENROLLMENTS ============
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  source public.student_source NOT NULL DEFAULT 'manual',
  pipeline_status public.pipeline_status NOT NULL DEFAULT 'applied',
  performance_score NUMERIC(5,2),
  performance_notes TEXT,
  certificate_issued_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, student_id)
);

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, session_date)
);

-- ============ LIVE SESSIONS ============
CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  jitsi_room TEXT NOT NULL,
  is_live BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ ENABLE RLS ============
ALTER TABLE public.training_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
-- Centers: members can see their own center
CREATE POLICY "members view own center" ON public.training_centers
  FOR SELECT TO authenticated USING (id = public.get_user_center(auth.uid()));
CREATE POLICY "anyone can create a center" ON public.training_centers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admins update own center" ON public.training_centers
  FOR UPDATE TO authenticated USING (id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

-- Profiles
CREATE POLICY "users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR center_id = public.get_user_center(auth.uid()));
CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles
CREATE POLICY "users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR center_id = public.get_user_center(auth.uid()));
CREATE POLICY "users insert own roles on signup" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins manage center roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

-- Helper: same-center predicate macro via WHERE on each table
-- Trades
CREATE POLICY "center members view trades" ON public.trades
  FOR SELECT TO authenticated USING (center_id = public.get_user_center(auth.uid()));
CREATE POLICY "admins manage trades" ON public.trades
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

-- Courses
CREATE POLICY "center members view courses" ON public.courses
  FOR SELECT TO authenticated USING (center_id = public.get_user_center(auth.uid()));
CREATE POLICY "admins manage courses" ON public.courses
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

-- Batches
CREATE POLICY "center members view batches" ON public.batches
  FOR SELECT TO authenticated USING (center_id = public.get_user_center(auth.uid()));
CREATE POLICY "admins manage batches" ON public.batches
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

-- Students
CREATE POLICY "center members view students" ON public.students
  FOR SELECT TO authenticated USING (center_id = public.get_user_center(auth.uid()));
CREATE POLICY "admins manage students" ON public.students
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

-- Enrollments — view if batch is in user's center
CREATE POLICY "center members view enrollments" ON public.enrollments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_id AND b.center_id = public.get_user_center(auth.uid()))
  );
CREATE POLICY "admins manage enrollments" ON public.enrollments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_id AND b.center_id = public.get_user_center(auth.uid()))
    AND public.has_role(auth.uid(), 'center_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_id AND b.center_id = public.get_user_center(auth.uid()))
    AND public.has_role(auth.uid(), 'center_admin')
  );
CREATE POLICY "instructors update enrollments for their batches" ON public.enrollments
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_id AND b.instructor_id = auth.uid())
  );

-- Attendance
CREATE POLICY "center members view attendance" ON public.attendance
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.batches b ON b.id = e.batch_id
      WHERE e.id = enrollment_id AND b.center_id = public.get_user_center(auth.uid())
    )
  );
CREATE POLICY "admins and instructors manage attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.batches b ON b.id = e.batch_id
      WHERE e.id = enrollment_id
        AND (
          (b.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
          OR b.instructor_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.batches b ON b.id = e.batch_id
      WHERE e.id = enrollment_id
        AND (
          (b.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
          OR b.instructor_id = auth.uid()
        )
    )
  );

-- Live sessions
CREATE POLICY "center members view live sessions" ON public.live_sessions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_id AND b.center_id = public.get_user_center(auth.uid()))
  );
CREATE POLICY "admins and instructors manage live sessions" ON public.live_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.batches b WHERE b.id = batch_id
        AND (
          (b.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
          OR b.instructor_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.batches b WHERE b.id = batch_id
        AND (
          (b.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
          OR b.instructor_id = auth.uid()
        )
    )
  );

-- ============ TRIGGER: auto-create profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();