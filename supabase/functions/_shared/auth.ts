import { createClient, type User } from "npm:@supabase/supabase-js@2";

type AuthSuccess = {
  ok: true;
  token: string;
  user: User;
};

type AuthFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type AuthResult = AuthSuccess | AuthFailure;

function formatAuthError(error: unknown): string {
  if (!error) return "none";
  if (typeof error !== "object") return String(error);
  const record = error as Record<string, unknown>;
  return JSON.stringify({
    name: record.name,
    status: record.status,
    code: record.code,
    message: record.message,
  });
}

export async function authenticateUserRequest(req: Request, functionName: string): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const hasAuthorizationHeader = authHeader.length > 0;
  const hasBearerToken = authHeader.startsWith("Bearer ");

  console.log(
    `[${functionName}] auth:start authorization_header=${hasAuthorizationHeader} bearer_token=${hasBearerToken}`,
  );

  if (!hasAuthorizationHeader) {
    console.warn(`[${functionName}] auth:fail stage=header reason=missing_authorization_header`);
    return { ok: false, status: 401, code: "missing_authorization_header", message: "Unauthorized" };
  }

  if (!hasBearerToken) {
    console.warn(`[${functionName}] auth:fail stage=header reason=missing_bearer_token`);
    return { ok: false, status: 401, code: "missing_bearer_token", message: "Unauthorized" };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    console.warn(`[${functionName}] auth:fail stage=token reason=empty_bearer_token`);
    return { ok: false, status: 401, code: "empty_bearer_token", message: "Unauthorized" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!supabaseUrl || !anonKey) {
    console.error(
      `[${functionName}] auth:fail stage=env supabase_url=${Boolean(supabaseUrl)} anon_key=${Boolean(anonKey)}`,
    );
    return { ok: false, status: 500, code: "auth_environment_missing", message: "Auth environment missing" };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const sub = claimsData?.claims?.sub;
    const exp = claimsData?.claims?.exp;
    if (claimsError || !sub) {
      console.warn(
        `[${functionName}] auth:claims_failed error=${formatAuthError(claimsError)} has_sub=${Boolean(sub)}`,
      );
    } else {
      console.log(`[${functionName}] auth:claims_ok user_id=${sub} exp=${exp ?? "unknown"}`);
    }
  } catch (claimsException) {
    console.warn(`[${functionName}] auth:claims_exception error=${formatAuthError(claimsException)}`);
  }

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    console.warn(
      `[${functionName}] auth:fail stage=getUser error=${formatAuthError(userError)} user_found=${Boolean(user)}`,
    );
    return { ok: false, status: 401, code: "invalid_or_expired_session", message: "Unauthorized" };
  }

  console.log(`[${functionName}] auth:ok user_id=${user.id}`);
  return { ok: true, token, user };
}