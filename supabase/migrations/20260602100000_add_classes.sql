
-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  filiere TEXT NOT NULL,
  niveau TEXT NOT NULL,
  pension_amount NUMERIC(12,2) NOT NULL DEFAULT 50000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add class_id to students
ALTER TABLE public.students ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "auth read classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update classes" ON public.classes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete classes" ON public.classes FOR DELETE TO authenticated USING (true);

-- Index for performance
CREATE INDEX idx_students_class_id ON public.students(class_id);
