// Admin user management: create, update auth, delete, suspend, reactivate
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  action: 'create' | 'update_auth' | 'delete' | 'suspend' | 'reactivate';
  user_id?: string;
  email?: string;
  password?: string;
  phone?: string;
  full_name?: string;
  plan_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    const body = await req.json() as Body;
    if (!body.action) {
      return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400, headers: corsHeaders });
    }

    if (body.action === 'create') {
      if (!body.email || !body.password) {
        return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios' }), { status: 400, headers: corsHeaders });
      }
      if (body.password.length < 6) {
        return new Response(JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }), { status: 400, headers: corsHeaders });
      }
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        phone: body.phone || undefined,
        user_metadata: { full_name: body.full_name || '' },
      });
      if (cErr) throw cErr;
      const newId = created.user!.id;
      // ensure profile row exists / updated
      await admin.from('profiles').upsert({
        user_id: newId,
        full_name: body.full_name || null,
        phone: body.phone || null,
      }, { onConflict: 'user_id' });
      if (body.plan_id) {
        await admin.rpc('admin_grant_plan', { _user_id: newId, _plan_id: body.plan_id });
      }
      return new Response(JSON.stringify({ ok: true, user_id: newId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!body.user_id) {
      return new Response(JSON.stringify({ error: 'user_id obrigatório' }), { status: 400, headers: corsHeaders });
    }

    if (body.action === 'update_auth') {
      const attrs: Record<string, unknown> = {};
      if (body.email) attrs.email = body.email;
      if (body.password) {
        if (body.password.length < 6) {
          return new Response(JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }), { status: 400, headers: corsHeaders });
        }
        attrs.password = body.password;
      }
      if (body.phone !== undefined) attrs.phone = body.phone;
      const { error } = await admin.auth.admin.updateUserById(body.user_id, attrs);
      if (error) throw error;
      if (body.phone !== undefined) {
        await admin.from('profiles').update({ phone: body.phone }).eq('user_id', body.user_id);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.action === 'delete') {
      await admin.from('profiles').delete().eq('user_id', body.user_id);
      const { error } = await admin.auth.admin.deleteUser(body.user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.action === 'suspend' || body.action === 'reactivate') {
      const suspend = body.action === 'suspend';
      await admin.rpc('admin_set_suspended', { _user_id: body.user_id, _suspended: suspend });
      const { error } = await admin.auth.admin.updateUserById(body.user_id, {
        ban_duration: suspend ? '8760h' : 'none',
      } as never);
      if (error) console.error('ban error', error);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'unknown_action' }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: corsHeaders });
  }
});
