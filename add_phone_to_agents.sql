-- Agregar columna phone a la tabla agents si no existe
-- Ejecuta esto en Supabase → SQL Editor

ALTER TABLE agents ADD COLUMN IF NOT EXISTS phone TEXT;

-- Verificar que se agregó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY ordinal_position;
