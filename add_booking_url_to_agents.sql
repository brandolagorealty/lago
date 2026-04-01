-- Agrega la columna booking_url a la tabla agents
-- Ejecuta esto en: https://supabase.com/dashboard → SQL Editor

ALTER TABLE agents ADD COLUMN IF NOT EXISTS booking_url TEXT;
