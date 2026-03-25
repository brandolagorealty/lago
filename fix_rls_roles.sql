-- ==============================================================================
-- CORRECCIÓN: Función segura para verificar el rol del usuario actual
-- Esto evita el problema de recursividad en las políticas RLS
-- ==============================================================================

-- Crear función con SECURITY DEFINER para que se salte las políticas RLS
-- cuando la llamamos internamente para verificar el rol
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'asesor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar políticas anteriores que pueden tener recursividad
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins can manage all roles" ON public.user_roles;

-- Nueva política simple sin recursividad: cualquier usuario autenticado lee su propio rol
CREATE POLICY "Users can read their own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Solo los superadmins pueden gestionar los roles (usando la función segura)
CREATE POLICY "Superadmins can read all roles"
ON public.user_roles FOR SELECT
USING (public.get_my_role() = 'superadmin');

CREATE POLICY "Superadmins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.get_my_role() = 'superadmin');

CREATE POLICY "Superadmins can delete roles"
ON public.user_roles FOR DELETE
USING (public.get_my_role() = 'superadmin');
