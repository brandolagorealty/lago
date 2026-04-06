-- Corrección definitiva para el RLS de Superadmin al borrar (DELETE) y modificar tareas
-- El problema anterior era que buscábamos el 'role' en la tabla 'agents', cuando en este sistema los roles se manejan en 'user_roles'.

DROP POLICY IF EXISTS "Superadmin_ALL" ON public.tasks;

CREATE POLICY "Superadmin_ALL"
ON public.tasks
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'superadmin'
    )
);
