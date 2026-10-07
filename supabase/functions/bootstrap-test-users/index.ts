// Bootstrap test users (admin + normal). Idempotent.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USERS = [
  { email: 'admin@virum.test', password: 'Admin@123456', full_name: 'Administrador Teste', role: 'admin' as const },
  { email: 'usuario@virum.test', password: 'Usuario@123456', full_name: 'Usuário Teste', role: 'user' as const },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const results: unknown[] = [];

    for (const u of USERS) {
      let userId: string | null = null;
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (created?.user?.id) {
        userId = created.user.id;
      } else {
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = list?.users.find((x) => x.email?.toLowerCase() === u.email);
        if (found) {
          userId = found.id;
          await supabase.auth.admin.updateUserById(found.id, {
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.full_name },
          });
        } else if (createErr) {
          throw createErr;
        }
      }

      if (!userId) throw new Error(`Failed to obtain user id for ${u.email}`);

      await supabase.from('profiles').upsert(
        { user_id: userId, full_name: u.full_name },
        { onConflict: 'user_id' },
      );

      if (u.role === 'admin') {
        const { data: existing } = await supabase
          .from('user_roles').select('id')
          .eq('user_id', userId).eq('role', 'admin').maybeSingle();
        if (!existing) {
          await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
        }
      } else {
        // ensure no admin role
        await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
      }

      results.push({ email: u.email, password: u.password, role: u.role, user_id: userId });
    }

    return new Response(
      JSON.stringify({ success: true, users: results, login_url: '/auth', admin_url: '/admin' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
