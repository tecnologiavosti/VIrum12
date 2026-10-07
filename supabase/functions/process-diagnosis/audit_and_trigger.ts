import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mhvmjgyibehthmglnxge.supabase.co";
// The user provided this key in the initial zip config for the official project
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function run() {
  if (!SERVICE_ROLE) {
    console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrada no ambiente.");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const targetId = "6453a733-477c-471f-b6d3-3baec39b5be5";

  console.log(`Auditoria profunda do Diagnóstico #6453A733 no projeto mhvmjgyibehthmglnxge...`);

  const { data: diag, error } = await supabase
    .from("diagnoses")
    .select("*")
    .eq("id", targetId)
    .single();

  if (error || !diag) {
    console.log("Diagnóstico não encontrado. Listando últimos 10 registros para depuração:");
    const { data: all } = await supabase.from("diagnoses").select("id, status, created_at").order("created_at", { ascending: false }).limit(10);
    console.log(all);
    return;
  }

  console.log("Diagnóstico encontrado. Resetando e disparando processamento...");
  
  await supabase.from("diagnoses").update({ 
    status: "processing",
    processing_step: "body",
    body_analysis: null,
    color_analysis: null,
    style_analysis: null,
    modeling_analysis: null,
    wardrobe_essentials: null,
    capsule_wardrobe: null,
    final_diagnosis: null,
    dossier_content: null
  }).eq("id", targetId);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/process-diagnosis`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ diagnosisId: targetId })
  });

  console.log(`Status do Trigger: ${res.status}`);
  if (!res.ok) console.log("Erro no trigger:", await res.text());
  else console.log("Diagnóstico re-processado com sucesso.");
}

run();
