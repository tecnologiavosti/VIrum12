import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mhvmjgyibehthmglnxge.supabase.co";
// Fallback to anon key just to check if connection works at all, 
// though we need service role for the reset/trigger.
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odm1qZ3lpYmVodGhtZ2xueGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODA3MzMsImV4cCI6MjA5OTc1NjczM30.q7HPwRtPTz6_iljhaI-dmUBWygZSOvHgol6WNVnjSMs";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function check() {
  console.log("Checking connection to mhvmjgyibehthmglnxge...");
  const { data, error } = await supabase.from("diagnoses").select("count");
  if (error) {
    console.error("Connection failed:", error);
  } else {
    console.log("Connected! Count result:", data);
  }
}

check();
