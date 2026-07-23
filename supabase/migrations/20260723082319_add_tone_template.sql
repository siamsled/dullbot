-- Add tone_template column to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS tone_template text;
