-- Execute este script en el Editor SQL de Supabase para activar la Línea de Tiempo de Notas

-- 1. Convertir la columna agent_notes a JSONB (formato de lista estructurada)
-- Usamos USING para intentar convertir el texto existente en un formato JSON si es posible,
-- pero para una limpieza segura, la inicializamos como una lista vacía [].
ALTER TABLE properties 
ALTER COLUMN agent_notes TYPE jsonb USING '[]'::jsonb;

-- 2. Asegurarse de que el valor por defecto sea una lista vacía
ALTER TABLE properties 
ALTER COLUMN agent_notes SET DEFAULT '[]'::jsonb;

-- Comentario para verificar:
-- Ahora esta columna puede guardar múltiples notas con fechas y IDs únicos.
