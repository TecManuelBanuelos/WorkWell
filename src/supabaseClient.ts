import { createClient } from '@supabase/supabase-js'

// Lo ideal es usar variables de entorno (.env), pero para probar puedes pegarlas aquí directas temporalmente
const supabaseUrl = 'https://mdhaybgsjcpolwpjwudt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaGF5YmdzamNwb2x3cGp3dWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NjQ0NDcsImV4cCI6MjA3OTM0MDQ0N30.1u-FeN0Je3qbke4YtqiZJ6xXX4_jEnnP-1Cbau10Y14'

export const supabase = createClient(supabaseUrl, supabaseKey)