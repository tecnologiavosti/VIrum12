import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mhvmjgyibehthmglnxge.supabase.co";
// Chave pública confirmada do projeto oficial
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odm1qZ3lpYmVodGhtZ2xueGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODA3MzMsImV4cCI6MjA5OTc1NjczM30.q7HPwRtPTz6_iljhaI-dmUBWygZSOvHgol6WNVnjSMs";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function probe() {
  console.log("=== PROBE DE DADOS: PROJETO OFICIAL MHVMJGYIBEHTHMGLNXGE ===");
  
  // 1. Verificar se a tabela está acessível e se há ALGUM dado público
  const { data: publicDiags, error: publicErr } = await supabase.from("diagnoses").select("id").limit(1);
  console.log("Acesso público (diagnoses):", publicErr ? `ERRO: ${publicErr.message}` : `OK (Encontrados: ${publicDiags.length})`);

  // 2. Verificar se conseguimos ver o diagnóstico alvo usando a rota RPC de admin se disponível
  // O código sugere que admin_list_diagnoses existe.
  console.log("Tentando admin_list_diagnoses...");
  const { data: adminList, error: adminErr } = await supabase.rpc("admin_list_diagnoses");
  console.log("admin_list_diagnoses:", adminErr ? `ERRO: ${adminErr.message}` : `OK (Encontrados: ${adminList.length})`);
  
  if (adminList) {
    const target = adminList.find(d => d.id.toUpperCase().includes("6453A733"));
    if (target) {
      console.log("ACHEI! Diagnóstico encontrado via RPC Admin:", target);
    }
  }

  // 3. Se nada funcionar, listar os últimos diagnósticos criados para ver se o ID reportado é o correto
  console.log("Listando metadados básicos (se permitido):");
  const { data: all, error: allErr } = await supabase.from("diagnoses").select("id, status, created_at").limit(10);
  if (all) {
    all.forEach(d => console.log(`- ${d.id} (${d.status})` ));
  }
}

probe();
