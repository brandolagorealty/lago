
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Cargar variables manualmente ya que esto corre en node, no vite
const envPath = path.resolve(process.cwd(), '.env.local')
const envConfig = dotenv.parse(fs.readFileSync(envPath))

const supabaseUrl = envConfig.VITE_SUPABASE_URL
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY

console.log('Testing connection to:', supabaseUrl)

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Falta URL o Key en .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('count')
            .limit(1)

        if (error) {
            console.error('❌ Error conectando a Supabase:', error.message)
            if (error.code === '42P01') {
                console.error('   Pista: La tabla "properties" no existe. ¿Corriste el script SQL?')
            }
        } else {
            console.log('✅ ¡Conexión exitosa con Supabase!')
            console.log('✅ Tabla "properties" accesible.')
        }
    } catch (err) {
        console.error('❌ Error inesperado:', err)
    }
}

testConnection()
