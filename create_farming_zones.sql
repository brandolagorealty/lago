-- ==============================================================================
-- FARMING ZONAS: Tabla de zonas asignables a asesores
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.zonas_farming (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    poligono JSONB NOT NULL,
    color TEXT DEFAULT '#10b981',
    asignado_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    asignado_email TEXT,
    meta_km FLOAT DEFAULT 25,
    km_recorridos FLOAT DEFAULT 0,
    estado TEXT DEFAULT 'pendiente',
    prioridad INT DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.zonas_farming ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view zones
DROP POLICY IF EXISTS "All users can view zonas" ON public.zonas_farming;
CREATE POLICY "All users can view zonas"
ON public.zonas_farming FOR SELECT TO authenticated USING (true);

-- Only superadmins can create/update/delete zones
DROP POLICY IF EXISTS "Superadmin manage zonas" ON public.zonas_farming;
CREATE POLICY "Superadmin manage zonas"
ON public.zonas_farming FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

NOTIFY pgrst, 'reload schema';
