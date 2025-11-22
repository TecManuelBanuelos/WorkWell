import { createClient } from '@supabase/supabase-js'

// Lo ideal es usar variables de entorno (.env), pero para probar puedes pegarlas aquí directas temporalmente
const supabaseUrl = 'https://muwmisrpldcdwhwkyowr.supabase.co'
const supabaseKey = 'sb_publishable_CXcvp4PJ_rGeBMvt6ieKJQ_2MSM6SbP'

export const supabase = createClient(supabaseUrl, supabaseKey)