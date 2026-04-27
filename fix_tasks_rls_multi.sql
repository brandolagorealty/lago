-- Eliminar políticas defectuosas anteriores
DROP POLICY IF EXISTS "Asesores can view related tasks" ON public.tasks;
DROP POLICY IF EXISTS "Asesores can update assigned tasks" ON public.tasks;

-- Crear políticas seguras usando verificación por email como se hacía antes
CREATE POLICY "Asesores can view related tasks"
ON public.tasks
FOR SELECT
USING (
    assignor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.agents 
        WHERE id = ANY(tasks.assignee_ids)
        AND email = auth.jwt()->>'email'
    )
);

CREATE POLICY "Asesores can update assigned tasks"
ON public.tasks
FOR UPDATE
USING (
    assignor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.agents 
        WHERE id = ANY(tasks.assignee_ids)
        AND email = auth.jwt()->>'email'
    )
);
