import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mhvmjgyibehthmglnxge.supabase.co";
// The key from the codebase, known to work in the frontend
const OFFICIAL_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odm1qZ3lpYmVodGhtZ2xueGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODA3MzMsImV4cCI6MjA5OTc1NjczM30.q7HPwRtPTz6_iljhaI-dmUBWygZSOvHgol6WNVnjSMs";

const supabase = createClient(SUPABASE_URL, OFFICIAL_ANON_KEY);

async function check() {
  console.log("Listing ALL diagnoses from official project using ANON KEY...");
  const { data, error } = await supabase.from("diagnoses").select("id, status, created_at").limit(100);
  
  if (error) {
    console.error("Query failed:", error);
    return;
  }
  
  console.log(`Found ${data.length} diagnoses.`);
  data.forEach(d => {
    console.log(`- ID: ${d.id} | Status: ${d.status} | Created: ${d.created_at}`);
  });
}

check();
