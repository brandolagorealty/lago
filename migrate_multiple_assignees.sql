-- 1. Agregar nueva columna assignee_ids
ALTER TABLE public.tasks ADD COLUMN assignee_ids UUID[] DEFAULT '{}';

-- 2. Migrar datos existentes
UPDATE public.tasks 
SET assignee_ids = ARRAY[assignee_id::uuid]
WHERE assignee_id IS NOT NULL;

-- 3. Eliminar la llave foránea antigua
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_assignee;

-- 4. Eliminar la columna antigua
ALTER TABLE public.tasks DROP COLUMN assignee_id;

-- 5. Actualizar Políticas RLS

-- Borrar políticas viejas
DROP POLICY IF EXISTS "Asesores can view related tasks" ON public.tasks;
DROP POLICY IF EXISTS "Asesores can update assigned tasks" ON public.tasks;

-- Crear nuevas políticas
CREATE POLICY "Asesores can view related tasks"
ON public.tasks
FOR SELECT
USING (
    (auth.uid() = ANY(assignee_ids)) OR assignor_id = auth.uid()
);

CREATE POLICY "Asesores can update assigned tasks"
ON public.tasks
FOR UPDATE
USING (
    (auth.uid() = ANY(assignee_ids)) OR assignor_id = auth.uid()
);
