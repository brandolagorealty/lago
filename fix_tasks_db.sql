-- 1. Eliminar la restricción de llave foránea que causa el error 409
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_assignor;

-- 2. Corregir las Políticas RLS para que los Asesores sí puedan ver sus tareas
-- Dado que los agentes están en `public.agents` y el login es `auth.users`, los vinculamos por su correo electrónico.

-- Borramos las políticas antiguas
DROP POLICY IF EXISTS "Asesores can view related tasks" ON public.tasks;
DROP POLICY IF EXISTS "Asesores can update assigned tasks" ON public.tasks;

-- Nueva política de Selección (Ver tareas)
CREATE POLICY "Asesores can view related tasks"
ON public.tasks
FOR SELECT
USING (
    assignor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.agents 
        WHERE agents.id = tasks.assignee_id 
        AND agents.email = auth.jwt()->>'email'
    )
);

-- Nueva política de Actualización (Editar/Mover tareas)
CREATE POLICY "Asesores can update assigned tasks"
ON public.tasks
FOR UPDATE
USING (
    assignor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.agents 
        WHERE agents.id = tasks.assignee_id 
        AND agents.email = auth.jwt()->>'email'
    )
);
