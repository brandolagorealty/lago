-- ============================================================
-- FIX: Política RLS para que el panel Admin vea los Borradores
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================================

-- 1. Eliminar todas las políticas de SELECT existentes en properties
-- (puede haber políticas conflictivas de sesiones anteriores)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'properties' AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON properties', pol.policyname);
    END LOOP;
END;
$$;

-- 2. Política para el SITIO PÚBLICO: solo ver propiedades publicadas (anon)
CREATE POLICY "public_can_read_published"
ON properties FOR SELECT
TO anon
USING (is_published = true);

-- 3. Política para el PANEL ADMIN: ver todas las propiedades incluyendo borradores (authenticated)
CREATE POLICY "authenticated_can_read_all"
ON properties FOR SELECT
TO authenticated
USING (true);

-- 4. Asegurarse de que RLS está activo
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Verificación: corre esto para ver cuántos borradores tienes
-- ============================================================
-- SELECT id, title, is_published FROM properties ORDER BY created_at DESC;
