-- Crear la tabla de tareas (Jira clone / Lago Realty)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT,
    -- Estados: 'todo', 'in_progress', 'review', 'done'
    status TEXT NOT NULL DEFAULT 'todo',
    due_date TIMESTAMPTZ,
    assignee_id TEXT, -- Usamos TEXT porque los IDs de auth.users o agents pueden mapearse así en el frontend, pero lo ideal es mapearlo al ID del agente. Si los agentes usan UUID, cámbialo a UUID. En Lago Realty los agentes usan auth.uid() que es UUID.
    assignor_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurándonos de que assignee_id y assignor_id sean UUID si la tabla agents usa UUID
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='id' AND data_type='uuid') THEN
    ALTER TABLE public.tasks ALTER COLUMN assignee_id TYPE UUID USING assignee_id::UUID;
    ALTER TABLE public.tasks ALTER COLUMN assignor_id TYPE UUID USING assignor_id::UUID;
    
    -- Agregar llaves foráneas para mantener integridad referencial
    ALTER TABLE public.tasks ADD CONSTRAINT fk_assignee FOREIGN KEY (assignee_id) REFERENCES public.agents(id) ON DELETE SET NULL;
    ALTER TABLE public.tasks ADD CONSTRAINT fk_assignor FOREIGN KEY (assignor_id) REFERENCES public.agents(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 1. Política: Los Superadmins pueden hacer TODO (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Superadmins can do everything on tasks"
ON public.tasks
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.agents
        WHERE id = auth.uid() AND role = 'superadmin'
    )
);

-- 2. Política: Los Usuarios Autenticados (Asesores) pueden VER las tareas asignadas a ellos o creadas por ellos
CREATE POLICY "Asesores can view related tasks"
ON public.tasks
FOR SELECT
USING (
    assignee_id = auth.uid() OR assignor_id = auth.uid()
);

-- 3. Política: Los Usuarios Autenticados pueden CREAR tareas
CREATE POLICY "Asesores can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- 4. Política: Los Usuarios Autenticados pueden ACTUALIZAR tareas asignadas a ellos (mover de columna, cambiar estado)
CREATE POLICY "Asesores can update assigned tasks"
ON public.tasks
FOR UPDATE
USING (
    assignee_id = auth.uid() OR assignor_id = auth.uid()
);

-- Opcional: Trigger para actualizar `updated_at` automáticamente
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_modtime
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
