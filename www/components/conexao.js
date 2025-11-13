

// conexao.js
console.log("🔌 conexao.js carregado");

// === CONFIGURAÇÃO DO SUPABASE ===
const SUPABASE_URL = 'https://ujrypxtpdimeruobirhn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcnlweHRwZGltZXJ1b2JpcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NzAzMzUsImV4cCI6MjA3MjI0NjMzNX0.Gvl77sm4Fz17_Wo5yl_XKLj9M1TuKJvIepVwC_rpd20';
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("✅ Supabase inicializado:", typeof window.supabase);