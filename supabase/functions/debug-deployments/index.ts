
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    
    // Lista as funções para ver os IDs de deployment/revision
    const { data: functions, error } = await supabase.rpc('admin_list_functions_metadata');

    return new Response(JSON.stringify({ 
      project_id: "mhvmjgyibehthmglnxge",
      timestamp: new Date().toISOString(),
      functions: functions || [],
      error: error ? error.message : null,
      note: "Este teste tenta listar metadados reais de deployment se a RPC existir."
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
