-- ==============================================================================
-- EXPANSIÓN DE LA AUDITORÍA PARA LEADS, TAREAS Y EVENTOS MANUALES
-- ==============================================================================

-- 1. Adjuntar el Trigger de Auditoría a la tabla de Leads (Prospectos)
DROP TRIGGER IF EXISTS leads_audit_trigger ON public.leads;
CREATE TRIGGER leads_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 2. Adjuntar el Trigger a la tabla de Tareas
DROP TRIGGER IF EXISTS tasks_audit_trigger ON public.tasks;
CREATE TRIGGER tasks_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 3. Adjuntar el Trigger a la tabla de Roles (para saber si se cambia un rol)
DROP TRIGGER IF EXISTS roles_audit_trigger ON public.user_roles;
CREATE TRIGGER roles_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 4. Permitir a los usuarios insertar logs manualmente (ej. Eventos de Inicio de Sesión)
-- La política actual solo permite a los superadmins hacer SELECT.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_logs' 
        AND policyname = 'Authenticated users can insert audit logs'
    ) THEN
        CREATE POLICY "Authenticated users can insert audit logs"
        ON public.audit_logs FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END
$$;
