import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.test("Trigger diagnosis regeneration", async () => {
  const diagnosisId = "c2b369ac-5591-477c-a4ec-a63e6398b671";
  
  // Reset diagnosis state
  const { error: resetError } = await supabase.from("diagnoses").update({ 
    status: "processing",
    processing_step: "body",
    body_analysis: null,
    color_analysis: null,
    style_analysis: null,
    modeling_analysis: null,
    wardrobe_essentials: null,
    capsule_wardrobe: null,
    final_diagnosis: null
  }).eq("id", diagnosisId);

  if (resetError) throw resetError;
  console.log("Diagnosis reset successfully.");

  // Call edge function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/process-diagnosis`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ diagnosisId })
  });

  console.log("Edge function status:", response.status);
  if (!response.ok) {
     const text = await response.text();
     console.error("Response error:", text);
  }
});
