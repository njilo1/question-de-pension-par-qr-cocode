
-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  matricule TEXT NOT NULL UNIQUE,
  filiere TEXT NOT NULL,
  niveau TEXT NOT NULL,
  pension_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_normalized_name ON public.students(normalized_name);

-- Payments / verifications table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  qr_raw_text TEXT NOT NULL,
  client_name TEXT,
  account_number TEXT,
  amount NUMERIC(12,2),
  remettant TEXT NOT NULL,
  face_match BOOLEAN NOT NULL DEFAULT false,
  confidence_score NUMERIC(5,2),
  face_analysis TEXT,
  captured_photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | verified | rejected
  verified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_student ON public.payments(student_id);
CREATE INDEX idx_payments_created ON public.payments(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_students_updated
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update students" ON public.students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete students" ON public.students FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update payments" ON public.payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete payments" ON public.payments FOR DELETE TO authenticated USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read student photos" ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

CREATE POLICY "auth upload student photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "auth update student photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'student-photos');

CREATE POLICY "auth delete student photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'student-photos');
