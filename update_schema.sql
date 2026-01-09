-- Execute este script en el Editor SQL de Supabase para añadir las columnas faltantes del CRM

-- 1. Añadir columna de estatus
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'available';

-- 2. Añadir columna de ID de agente
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS agent_id text;

-- 3. Añadir columna de notas internas del agente
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS agent_notes text;

-- Comentario para verificar:
-- Estas columnas son necesarias para que el nuevo CRM pueda gestionar 
-- el estado de las ventas y la asignación del equipo.
