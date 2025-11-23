-- Políticas de acceso para el bucket 'prescription' en Supabase Storage

-- 1. Política de LECTURA PÚBLICA (cualquiera puede ver los PDFs)
-- Esto permite que los usuarios vean los PDFs sin autenticación
CREATE POLICY "Public read access for prescriptions"
ON storage.objects
FOR SELECT
USING (bucket_id = 'prescription');

-- 2. Política de ESCRITURA AUTENTICADA (solo usuarios autenticados pueden subir)
-- Esto permite que usuarios autenticados suban archivos PDF
CREATE POLICY "Authenticated upload for prescriptions"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'prescription' 
  AND auth.role() = 'authenticated'
);

-- 3. Política de ACTUALIZACIÓN (opcional - si quieres permitir actualizar archivos)
-- CREATE POLICY "Authenticated update for prescriptions"
-- ON storage.objects
-- FOR UPDATE
-- USING (
--   bucket_id = 'prescription' 
--   AND auth.role() = 'authenticated'
-- );

-- 4. Política de ELIMINACIÓN (opcional - si quieres permitir eliminar archivos)
-- CREATE POLICY "Authenticated delete for prescriptions"
-- ON storage.objects
-- FOR DELETE
-- USING (
--   bucket_id = 'prescription' 
--   AND auth.role() = 'authenticated'
-- );

