import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mhvmjgyibehthmglnxge.supabase.co";
// Chave pública (anon) extraída do cliente frontend do usuário
const OFFICIAL_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odm1qZ3lpYmVodGhtZ2xueGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODA3MzMsImV4cCI6MjA5OTc1NjczM30.q7HPwRtPTz6_iljhaI-dmUBWygZSOvHgol6WNVnjSMs";

const supabase = createClient(SUPABASE_URL, OFFICIAL_ANON_KEY);

async function check() {
  console.log("Auditoria de Diagnósticos no Banco Oficial (ANON)...");
  
  // 1. Verificar diagnósticos do usuário atual (simulando autenticação se necessário via RLS)
  // Como é anon, se as políticas de RLS estiverem corretas, só veremos o que é público.
  // Porém, a auditoria precisa saber se o registro EXISTE.
  
  const { data, error } = await supabase
    .from("diagnoses")
    .select("id, status, created_at")
    .limit(100);
  
  if (error) {
    console.error("Erro na consulta:", error);
    return;
  }
  
  console.log(`Registros visíveis para a chave ANON: ${data?.length || 0}`);
  data?.forEach(d => {
    console.log(`- ID: ${d.id} | Status: ${d.status} | Criado em: ${d.created_at}`);
  });

  const targetId = "6453a733-477c-471f-b6d3-3baec39b5be5";
  const found = data?.find(d => d.id.toLowerCase() === targetId.toLowerCase());
  
  if (found) {
    console.log(`\nOK: Diagnóstico ${targetId} encontrado via RLS.`);
  } else {
    console.log(`\nAVISO: Diagnóstico ${targetId} NÃO está visível para a chave ANON.`);
    console.log("Isso sugere que o registro pertence a outro UID ou as políticas de RLS estão restringindo o acesso.");
  }
}

check();
