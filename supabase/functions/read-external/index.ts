import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXT_URL = Deno.env.get("EXT_SUPABASE_URL");
const EXT_ANON = Deno.env.get("EXT_SUPABASE_ANON_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Allow-list of tables/columns readable from the external DB.
// Mirrors the current Lovable Cloud public schema. The external DB must
// expose these tables with the same column names for the query to succeed.
const MAX = 100;
const ALLOWED: Record<string, { columns: string; maxLimit: number }> = {
  affiliate_audit_log: { columns: "id,actor_id,action,target_type,target_id,details,created_at", maxLimit: MAX },
  affiliate_commissions: { columns: "id,affiliate_id,referred_user_id,payment_id,plan_id,plan_amount_cents,commission_percent,commission_cents,status,created_at,updated_at", maxLimit: MAX },
  affiliate_payment_info: { columns: "id,affiliate_id,user_id,pix_key_type,pix_key,holder_name,holder_cpf,created_at,updated_at", maxLimit: MAX },
  affiliate_payouts: { columns: "id,affiliate_id,amount_cents,status,paid_at,notes,created_by,created_at,updated_at,receipt_url,payment_date,period_start,period_end", maxLimit: MAX },
  affiliate_product_matches: { columns: "id,diagnosis_id,look_recommendation_id,normalized_key,platform,product_title,product_price,product_currency,product_image_url,product_url,affiliate_url,rank,created_at", maxLimit: MAX },
  affiliate_referrals: { columns: "id,affiliate_id,referred_user_id,code_used,created_at", maxLimit: MAX },
  affiliates: { columns: "id,user_id,code,status,created_at,updated_at", maxLimit: MAX },
  analysis_visual_assets: { columns: "id,category,value,image_url,created_at", maxLimit: MAX },
  blog_posts: { columns: "id,title,slug,excerpt,content,cover_image_url,cover_image_source,category,tags,status,author_id,published_at,views_count,created_at,updated_at", maxLimit: MAX },
  clothing_images: { columns: "id,piece_key,image_url,created_at,diagnosis_id,description,category,normalized_key,style,color,fabric,prompt_used,needs_regen", maxLimit: MAX },
  coupon_redemptions: { columns: "id,coupon_id,user_id,payment_id,discount_cents,created_at", maxLimit: MAX },
  coupons: { columns: "id,code,description,discount_type,discount_value,starts_at,ends_at,usage_limit,per_user_limit,uses_count,is_active,applies_to_plan_id,created_by,created_at,updated_at", maxLimit: MAX },
  diagnoses: { columns: "id,user_id,status,photo_front_url,photo_side_url,photo_back_url,photo_face_url,questionnaire,body_analysis,color_analysis,style_analysis,modeling_analysis,wardrobe_essentials,capsule_wardrobe,final_diagnosis,created_at,updated_at,processing_step,share_token,height_cm,weight_kg,top_size,bottom_size,shoe_size,body_notes,hair_color,eye_color,skin_tone,fit_preference,formality_level,style_intensity_score,body_balance_score,generated_images,deleted_at,dossier_content", maxLimit: MAX },
  diagnosis_images: { columns: "id,diagnosis_id,normalized_key,image_url,category,description,source,created_at", maxLimit: MAX },
  diagnostic_form_images: { columns: "id,category,position,image_url,image_hd_url,photographer,pexels_id,search_query,is_active,created_at,updated_at,storage_path", maxLimit: MAX },
  library_assets: { columns: "id,category,style,body_type,color_season,variant_index,tags,prompt,image_url,status,attempts,last_error,source,created_at,updated_at", maxLimit: MAX },
  look_images: { columns: "id,diagnosis_id,look_name,image_url,created_at", maxLimit: MAX },
  look_recommendations: { columns: "id,diagnosis_id,created_at,look_name,occasion,occasion_description,pieces,styling_tips,image_url,metadata", maxLimit: MAX },
  payment_events: { columns: "id,user_id,payment_id,subscription_id,event_type,provider,provider_event_id,payload,created_at", maxLimit: MAX },
  payments: { columns: "id,user_id,subscription_id,plan_id,provider,provider_payment_id,provider_preapproval_id,status,amount_cents,currency,payment_method,raw_payload,created_at,updated_at,external_reference,discount_cents,coupon_code", maxLimit: MAX },
  plans: { columns: "id,name,description,price_cents,currency,interval,features,is_active,is_popular,sort_order,created_at,updated_at,looks_per_month,can_download_pdf,can_share", maxLimit: MAX },
  profiles: { columns: "id,user_id,full_name,avatar_url,created_at,updated_at,preferences,height_cm,weight_kg,top_size,bottom_size,shoe_size,body_type,body_notes,hair_color,eye_color,skin_tone,fit_preference,formality_level,is_suspended,phone,terms_accepted_at", maxLimit: MAX },
  rate_limits: { columns: "id,user_id,action,created_at", maxLimit: MAX },
  site_settings: { columns: "id,key,value,updated_at", maxLimit: MAX },
  subscriptions: { columns: "id,user_id,status,plan,stripe_customer_id,stripe_subscription_id,current_period_start,current_period_end,created_at,updated_at,plan_id,mercadopago_id,next_billing_date,expires_at,cancel_at_period_end", maxLimit: MAX },
  user_roles: { columns: "id,user_id,role", maxLimit: MAX },
  webhook_logs: { columns: "id,provider,event_type,payload,status,error,created_at", maxLimit: MAX },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!EXT_URL || !EXT_ANON) {
      return json({ error: "External Supabase not configured" }, 500);
    }

    // Require an authenticated Lovable Cloud user before proxying reads.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const cloud = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await cloud.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const table = String(body?.table ?? "").trim();
    const limit = Math.min(Number(body?.limit ?? 50) || 50, 200);
    const filters = (body?.filters ?? {}) as Record<string, string | number | boolean>;

    const spec = ALLOWED[table];
    if (!spec) {
      return json({ error: `Table "${table}" not allowed` }, 400);
    }

    const ext = createClient(EXT_URL, EXT_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let q = ext.from(table).select(spec.columns).limit(Math.min(limit, spec.maxLimit));
    for (const [k, v] of Object.entries(filters)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        q = q.eq(k, v as never);
      }
    }

    const { data, error } = await q;
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}