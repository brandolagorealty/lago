-- Script para asegurar que el panel de administración puede actualizar las propiedades
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Habilitar RLS (ya debería estarlo, pero por si acaso)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 2. Crear política para permitir que usuarios autenticados actualicen cualquier propiedad
-- (Esto es necesario si no tienes una columna 'user_id')
DROP POLICY IF EXISTS "Permitir actualización a autenticados" ON properties;
CREATE POLICY "Permitir actualización a autenticados" 
ON properties FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 3. Crear política para permitir que usuarios autenticados inserten nuevas propiedades
DROP POLICY IF EXISTS "Permitir inserción a autenticados" ON properties;
CREATE POLICY "Permitir inserción a autenticados" 
ON properties FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. Asegurar que las imágenes son visibles públicamente
DROP POLICY IF EXISTS "Permitir lectura pública" ON properties;
CREATE POLICY "Permitir lectura pública" 
ON properties FOR SELECT 
TO public 
USING (true);
