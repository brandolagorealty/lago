-- 1. Añadir nuevas columnas para control de visibilidad
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}'::UUID[];

-- 2. Eliminar políticas existentes para limpiar
DROP POLICY IF EXISTS "Permitir insercion publica de leads" ON public.leads;
DROP POLICY IF EXISTS "Permitir control total a administradores sobre leads" ON public.leads;
DROP POLICY IF EXISTS "Superadmin full access to leads" ON public.leads;
DROP POLICY IF EXISTS "Asesores read own or shared leads" ON public.leads;
DROP POLICY IF EXISTS "Asesores update own or shared leads" ON public.leads;

-- 3. Crear política para inserción pública (Formulario web)
CREATE POLICY "Permitir insercion publica de leads" 
ON public.leads FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 4. Crear política para SUPERADMINS (Acceso total)
CREATE POLICY "Superadmin full access to leads"
ON public.leads FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    )
);

-- 5. Crear políticas para ASESORES (Solo ver propios o compartidos)
CREATE POLICY "Asesores read own or shared leads"
ON public.leads FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'asesor'
    )
    AND (
        created_by = auth.uid() OR 
        auth.uid() = ANY(shared_with)
    )
);

CREATE POLICY "Asesores update own or shared leads"
ON public.leads FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'asesor'
    )
    AND (
        created_by = auth.uid() OR 
        auth.uid() = ANY(shared_with)
    )
);

-- 6. Permitir a todos los usuarios autenticados ver los usuarios (para poder compartir prospectos)
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "All authenticated users can view roles" ON public.user_roles;
CREATE POLICY "All authenticated users can view roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

-- 7. Refrescar caché de Supabase
NOTIFY pgrst, 'reload schema';
