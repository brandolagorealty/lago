-- 1. Crear la tabla principal de prospectos (leads)
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    message TEXT,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL, -- Si se borra la propiedad, el lead se mantiene
    agent_id TEXT, -- Para enlazar con el agente asignado a la propiedad
    status TEXT NOT NULL DEFAULT 'new', -- new, contacted, visiting, negotiating, closed, lost
    notes JSONB DEFAULT '[]'::jsonb, -- Historial de notas del administrador para este lead
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar la seguridad a nivel de fila (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para permitir la inserción pública (Cualquier usuario que envíe el formulario)
CREATE POLICY "Permitir insercion publica de leads" 
ON leads FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 4. Crear política para permitir lectura y edición completa solo a administradores (usuarios autenticados)
CREATE POLICY "Permitir control total a administradores sobre leads" 
ON leads FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
