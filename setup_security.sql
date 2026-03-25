-- ==============================================================================
-- 1. ESTRUCTURAS DE TABLAS: ROLES Y AUDITORÍA
-- ==============================================================================

-- Tabla de Roles de Usuario
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'asesor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(email)
);

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Ver su propio rol
CREATE POLICY "Users can read their own role" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- Solo el superadmin puede leer/modificar todos los roles
CREATE POLICY "Superadmins can manage all roles" 
ON public.user_roles FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    )
);

-- Tabla de Auditoría (Historial de Cambios)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solo los superadmins pueden ver la auditoría
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view audit logs"
ON public.audit_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    )
);

-- ==============================================================================
-- 2. FUNCIÓN TRIGGER PARA AUDITORÍA AUTOMÁTICA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
BEGIN
    -- Obtener el usuario actual desde el JWT de Supabase Auth
    current_user_id := auth.uid();
    current_user_email := auth.jwt() ->> 'email';

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, old_data)
        VALUES (current_user_id, current_user_email, 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, old_data, new_data)
        VALUES (current_user_id, current_user_email, 'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, new_data)
        VALUES (current_user_id, current_user_email, 'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjuntar el Trigger a la tabla de propiedades
DROP TRIGGER IF EXISTS properties_audit_trigger ON public.properties;
CREATE TRIGGER properties_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- ==============================================================================
-- 3. AJUSTE DE RLS (ROW LEVEL SECURITY) EN PROPERTIES PARA ASESORES
-- ==============================================================================

-- Primero eliminamos cualquier política suelta de los asesores si existiera
DROP POLICY IF EXISTS "Asesores can update their own drafts" ON public.properties;

-- Políticas de SUPERADMIN para operaciones completas
CREATE POLICY "Superadmin update properties"
ON public.properties FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    )
);

CREATE POLICY "Superadmin delete properties"
ON public.properties FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    )
);

-- Políticas de ASESORES (Solo pueden insertar y editar borradores, no publicar)
-- Permiso para Insertar: Cualquiera logueado puede insertar, pero en el frontend bloquearemos la publicación
-- Asesores actualizando borradores
CREATE POLICY "Asesores can update drafts"
ON public.properties FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'asesor'
    )
    AND is_published = false -- Solo pueden tocar propiedades privadas
)
WITH CHECK (
    is_published = false -- Solo pueden guardar como borrador, nunca como publicado
);

-- NOTA IMPORTANTE PARA EL USUARIO (SUPERADMIN):
-- LUEGO DE EJECUTAR ESTO, DEBES INSERTARTE MANUALMENTE COMO SUPERADMIN:
-- INSERT INTO public.user_roles (user_id, email, role) VALUES ('TU_AUTH_USER_ID_AQUI', 'tucorreo@lagorealty.com.ve', 'superadmin');
