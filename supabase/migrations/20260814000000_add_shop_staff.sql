-- Migration: Add shop_staff table for Role-Based Access Control (RBAC)

CREATE TABLE IF NOT EXISTS public.shop_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'cashier',
    permissions TEXT[] NOT NULL DEFAULT ARRAY['orders', 'pos']::TEXT[],
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_shop_staff UNIQUE (shop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_staff_user_status ON public.shop_staff(user_id, status);
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop_id ON public.shop_staff(shop_id);

-- Enable RLS
ALTER TABLE public.shop_staff ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on shop_staff" ON public.shop_staff
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
