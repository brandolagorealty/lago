-- Solucionar el bloqueo de seguridad (RLS) al eliminar y en permisos de superadmin

-- 1. Arreglar el permiso del Superadmin (El ID de auth no coincide con el de agent, usamos email para validar superadmin en la tabla agents)
DROP POLICY IF EXISTS "Superadmins can do everything on tasks" ON public.tasks;
CREATE POLICY "Superadmins can do everything on tasks"
ON public.tasks
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.agents
        WHERE email = auth.jwt()->>'email' AND role = 'superadmin'
    )
);

-- 2. Permitir a los creadores de las tareas eliminarlas
CREATE POLICY "Creators can delete their tasks"
ON public.tasks
FOR DELETE
USING (
    assignor_id = auth.uid()
);
