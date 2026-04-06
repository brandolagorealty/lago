-- Solución definitiva a los permisos (Sin intentar consultar la tabla auth.users directamente que está bloqueada por seguridad)

-- Borramos las políticas que dieron error de permisos recientemente
DROP POLICY IF EXISTS "Superadmin_ALL" ON public.tasks;
DROP POLICY IF EXISTS "Asesor_SELECT" ON public.tasks;
DROP POLICY IF EXISTS "Asesor_INSERT" ON public.tasks;
DROP POLICY IF EXISTS "Asesor_UPDATE" ON public.tasks;
DROP POLICY IF EXISTS "Asesor_DELETE" ON public.tasks;

-- 1. Política Superadmin (TODOS LOS PERMISOS)
CREATE POLICY "Superadmin_ALL"
ON public.tasks
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.agents
        WHERE email = auth.jwt()->>'email' 
        AND role = 'superadmin'
    )
);

-- 2. Política Asesores (VER tareas asignadas o creadas por ellos)
CREATE POLICY "Asesor_SELECT"
ON public.tasks
FOR SELECT
USING (
    assignor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.agents 
        WHERE id = tasks.assignee_id 
        AND email = auth.jwt()->>'email'
    )
);

-- 3. Política Asesores (CREAR tareas)
CREATE POLICY "Asesor_INSERT"
ON public.tasks
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- 4. Política Asesores (ACTUALIZAR tareas asignadas a ellos)
CREATE POLICY "Asesor_UPDATE"
ON public.tasks
FOR UPDATE
USING (
    assignor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.agents 
        WHERE id = tasks.assignee_id 
        AND email = auth.jwt()->>'email'
    )
);

-- 5. Política Asesores (ELIMINAR tareas que ellos crearon)
CREATE POLICY "Asesor_DELETE"
ON public.tasks
FOR DELETE
USING (
    assignor_id = auth.uid()
);
