-- ==============================================================================
-- FARMING INMOBILIARIO: Tablas y Políticas de Seguridad
-- ==============================================================================

-- 1. Tabla de Recorridos (rutas GPS de los asesores)
CREATE TABLE IF NOT EXISTS public.recorridos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agente_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    agente_email TEXT,
    zona_nombre TEXT DEFAULT 'Sin nombre',
    coordenadas_ruta JSONB DEFAULT '[]'::JSONB,
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    distancia_metros FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Captaciones (inmuebles capturados en campo)
CREATE TABLE IF NOT EXISTS public.captaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recorrido_id UUID REFERENCES public.recorridos(id) ON DELETE CASCADE,
    agente_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    latitud FLOAT8 NOT NULL,
    longitud FLOAT8 NOT NULL,
    tipo_inmueble TEXT NOT NULL,
    estatus TEXT NOT NULL,
    telefono_contacto TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS en ambas tablas
ALTER TABLE public.recorridos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captaciones ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Recorridos (visibles para TODOS los autenticados)
DROP POLICY IF EXISTS "Authenticated users can view all recorridos" ON public.recorridos;
CREATE POLICY "Authenticated users can view all recorridos"
ON public.recorridos FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert recorridos" ON public.recorridos;
CREATE POLICY "Authenticated users can insert recorridos"
ON public.recorridos FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own recorridos" ON public.recorridos;
CREATE POLICY "Users can update own recorridos"
ON public.recorridos FOR UPDATE
TO authenticated
USING (agente_id = auth.uid());

DROP POLICY IF EXISTS "Superadmin can update all recorridos" ON public.recorridos;
CREATE POLICY "Superadmin can update all recorridos"
ON public.recorridos FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    )
);

DROP POLICY IF EXISTS "Users can delete own recorridos" ON public.recorridos;
CREATE POLICY "Users can delete own recorridos"
ON public.recorridos FOR DELETE
TO authenticated
USING (agente_id = auth.uid());

DROP POLICY IF EXISTS "Superadmin can delete all recorridos" ON public.recorridos;
CREATE POLICY "Superadmin can delete all recorridos"
ON public.recorridos FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    )
);

-- 5. Políticas de Captaciones (visibles para TODOS los autenticados)
DROP POLICY IF EXISTS "Authenticated users can view all captaciones" ON public.captaciones;
CREATE POLICY "Authenticated users can view all captaciones"
ON public.captaciones FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert captaciones" ON public.captaciones;
CREATE POLICY "Authenticated users can insert captaciones"
ON public.captaciones FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own captaciones" ON public.captaciones;
CREATE POLICY "Users can update own captaciones"
ON public.captaciones FOR UPDATE
TO authenticated
USING (agente_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own captaciones" ON public.captaciones;
CREATE POLICY "Users can delete own captaciones"
ON public.captaciones FOR DELETE
TO authenticated
USING (agente_id = auth.uid());

DROP POLICY IF EXISTS "Superadmin can manage all captaciones" ON public.captaciones;
CREATE POLICY "Superadmin can manage all captaciones"
ON public.captaciones FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    )
);

-- 6. Refrescar caché
NOTIFY pgrst, 'reload schema';
