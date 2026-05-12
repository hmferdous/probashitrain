
CREATE OR REPLACE FUNCTION public.generate_invoice_no()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0');
$$;
