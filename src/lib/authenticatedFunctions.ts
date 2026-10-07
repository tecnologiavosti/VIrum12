import { supabase } from '@/integrations/supabase/client';

const REFRESH_MARGIN_MS = 90_000;

function isAuthSessionError(message: string) {
  return message.startsWith('auth-session-');
}

export async function getFreshAccessTokenOrThrow(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.warn('[auth] getSession failed before edge invocation:', sessionError.message);
  }

  let session = sessionData.session;
  if (!session) throw new Error('auth-session-missing');

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  const shouldRefresh = !session.access_token || !expiresAtMs || expiresAtMs <= Date.now() + REFRESH_MARGIN_MS;

  const refreshSession = async () => {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn('[auth] refreshSession failed before edge invocation:', refreshError.message);
      throw new Error('auth-session-refresh-failed');
    }
    if (!refreshed.session?.access_token) throw new Error('auth-session-token-missing');
    return refreshed.session;
  };

  if (shouldRefresh) session = await refreshSession();

  if (!session?.access_token) throw new Error('auth-session-token-missing');

  const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
  if (userError || !userData.user) {
    console.warn('[auth] getUser failed before edge invocation:', userError?.message ?? 'user not found');
    session = await refreshSession();
    const { data: retryUserData, error: retryUserError } = await supabase.auth.getUser(session.access_token);
    if (retryUserError || !retryUserData.user) {
      console.warn('[auth] getUser retry failed before edge invocation:', retryUserError?.message ?? 'user not found');
      throw new Error('auth-session-invalid');
    }
  }

  return session.access_token;
}

export async function invokeAuthenticatedFunction<T = unknown>(
  functionName: string,
  body?: unknown,
) {
  try {
    const accessToken = await getFreshAccessTokenOrThrow();
    return await supabase.functions.invoke<T>(functionName, {
      body,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof Error && isAuthSessionError(error.message)) {
      throw new Error('Sua sessão expirou. Faça login novamente.');
    }
    throw error;
  }
}