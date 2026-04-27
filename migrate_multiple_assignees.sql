-- 1. Agregar nueva columna assignee_ids si no existe
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_ids UUID[] DEFAULT '{}';

-- 2. Migrar datos existentes solo si assignee_id existe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assignee_id') THEN
        UPDATE public.tasks 
        SET assignee_ids = ARRAY[assignee_id::uuid]
        WHERE assignee_id IS NOT NULL AND (assignee_ids IS NULL OR array_length(assignee_ids, 1) IS NULL);
    END IF;
END $$;

-- 3. Eliminar la llave foránea antigua
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_assignee;

-- 4. Borrar CUALQUIER política vieja que dependa de la columna assignee_id
DROP POLICY IF EXISTS "Asesores can view related tasks" ON public.tasks;
DROP POLICY IF EXISTS "Asesores can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Asesor_SELECT" ON public.tasks;
DROP POLICY IF EXISTS "Asesor_UPDATE" ON public.tasks;

-- 5. Eliminar la columna antigua AHORA SÍ de forma segura (con CASCADE por si quedan otras políticas)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assignee_id CASCADE;

-- 6. Crear nuevas políticas
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
