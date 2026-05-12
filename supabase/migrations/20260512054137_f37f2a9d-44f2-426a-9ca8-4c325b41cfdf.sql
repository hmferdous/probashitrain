
-- Payment method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'ami_probashi', 'bank', 'mobile_banking', 'other');

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL,
  center_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  method public.payment_method NOT NULL DEFAULT 'cash',
  invoice_no text NOT NULL UNIQUE,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_enrollment ON public.payments(enrollment_id);
CREATE INDEX idx_payments_center ON public.payments(center_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view payments"
  ON public.payments FOR SELECT TO authenticated
  USING (center_id = public.get_user_center(auth.uid()));

CREATE POLICY "admins manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

-- Sequence for invoice numbers per center
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_invoice_no()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0');
$$;
