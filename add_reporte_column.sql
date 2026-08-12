-- Agregar la columna 'reporte' a la tabla recorridos
-- Esto es necesario para guardar los datos del formulario de inteligencia (Bitácora)
ALTER TABLE public.recorridos 
ADD COLUMN IF NOT EXISTS reporte JSONB;
