-- Usar la función get_my_role() directamente es mucho más seguro porque
-- salta cualquier bloqueo RLS de la tabla user_roles si funciona con SECURITY DEFINER.

DROP POLICY IF EXISTS "Superadmin_ALL" ON public.tasks;
DROP POLICY IF EXISTS "Asesor_DELETE" ON public.tasks;

-- Superadmin puede hacer todo
CREATE POLICY "Superadmin_ALL"
ON public.tasks
FOR ALL
USING (
    get_my_role() = 'superadmin'
);

-- Asesores solo pueden borrar las tareas que ellos MISMOS crearon
CREATE POLICY "Asesor_DELETE"
ON public.tasks
FOR DELETE
USING (
    assignor_id = auth.uid()
);
