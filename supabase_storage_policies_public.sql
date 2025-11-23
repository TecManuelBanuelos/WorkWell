-- Políticas de acceso PÚBLICAS para el bucket 'prescription' en Supabase Storage
-- ⚠️ ADVERTENCIA: Estas políticas permiten que CUALQUIERA suba archivos sin autenticación
-- Solo usa esto para desarrollo o si realmente necesitas subidas públicas

-- 1. Política de LECTURA PÚBLICA (cualquiera puede ver los PDFs)
-- Esto permite que los usuarios vean los PDFs sin autenticación
DROP POLICY IF EXISTS "Public read access for prescriptions" ON storage.objects;

CREATE POLICY "Public read access for prescriptions"
ON storage.objects
FOR SELECT
USING (bucket_id = 'prescription');

-- 2. Política de ESCRITURA PÚBLICA (cualquiera puede subir)
-- ⚠️ ESTO PERMITE QUE CUALQUIERA SUBA ARCHIVOS SIN AUTENTICACIÓN
DROP POLICY IF EXISTS "Authenticated upload for prescriptions" ON storage.objects;
DROP POLICY IF EXISTS "Public upload for prescriptions" ON storage.objects;

CREATE POLICY "Public upload for prescriptions"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'prescription');

-- 3. (Opcional) Política de ACTUALIZACIÓN PÚBLICA
-- Descomenta si quieres permitir que cualquiera actualice archivos
-- DROP POLICY IF EXISTS "Public update for prescriptions" ON storage.objects;
-- CREATE POLICY "Public update for prescriptions"
-- ON storage.objects
-- FOR UPDATE
-- USING (bucket_id = 'prescription');

-- 4. (Opcional) Política de ELIMINACIÓN PÚBLICA
-- Descomenta si quieres permitir que cualquiera elimine archivos
-- ⚠️ MUY PELIGROSO - No recomendado
-- DROP POLICY IF EXISTS "Public delete for prescriptions" ON storage.objects;
-- CREATE POLICY "Public delete for prescriptions"
-- ON storage.objects
-- FOR DELETE
-- USING (bucket_id = 'prescription');

