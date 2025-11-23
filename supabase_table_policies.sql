-- Políticas de RLS para permitir actualizar el campo ref_pdf en la tabla leave_requests
-- ⚠️ Ejecuta este SQL en el SQL Editor de Supabase

-- 1. Habilitar RLS en la tabla (si no está habilitado)
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- 2. Política para permitir ACTUALIZAR el campo ref_pdf
-- Esta política permite que cualquiera pueda actualizar el campo ref_pdf
-- (Ajusta según tus necesidades de seguridad)
DROP POLICY IF EXISTS "Allow update ref_pdf" ON leave_requests;

CREATE POLICY "Allow update ref_pdf"
ON leave_requests
FOR UPDATE
USING (true)  -- Permite actualizar cualquier fila
WITH CHECK (true);  -- Permite actualizar con cualquier valor

-- Alternativa más restrictiva: Solo permitir actualizar ref_pdf si el usuario está autenticado
-- Descomenta si prefieres esta opción:
-- DROP POLICY IF EXISTS "Allow authenticated update ref_pdf" ON leave_requests;
-- CREATE POLICY "Allow authenticated update ref_pdf"
-- ON leave_requests
-- FOR UPDATE
-- USING (auth.role() = 'authenticated')
-- WITH CHECK (auth.role() = 'authenticated');

-- 3. (Opcional) Política para permitir SELECT (lectura)
-- Si ya tienes una política de SELECT, no necesitas esta
-- DROP POLICY IF EXISTS "Allow select leave_requests" ON leave_requests;
-- CREATE POLICY "Allow select leave_requests"
-- ON leave_requests
-- FOR SELECT
-- USING (true);

