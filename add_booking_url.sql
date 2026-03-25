-- Añadir columna booking_url a la tabla de agentes
ALTER TABLE agents ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- Comentario para verificar:
-- Esta columna almacenará links de Google Calendar, Calendly o Zoom para cada asesor.
