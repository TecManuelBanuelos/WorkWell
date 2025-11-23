import { createClient } from '@supabase/supabase-js'

// ⚠️ INSERTA TU URL Y ANON KEY DE SUPABASE AQUÍ:
const supabaseUrl = 'https://mdhaybgsjcpolwpjwudt.supabase.co' // Ejemplo: 'https://xxxxx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaGF5YmdzamNwb2x3cGp3dWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NjQ0NDcsImV4cCI6MjA3OTM0MDQ0N30.1u-FeN0Je3qbke4YtqiZJ6xXX4_jEnnP-1Cbau10Y14' // Tu anon key de Supabase

export const supabase = createClient(supabaseUrl, supabaseKey)