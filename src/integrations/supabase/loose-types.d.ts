// Relaxa `from()` e `rpc()` do supabase-js para aceitar os nomes reais de
// tabelas/funções do projeto oficial mhvmjgyibehthmglnxge, evitando ruído de
// tipos em compile-time quando o types.ts gerado estiver incompleto. Runtime
// não muda.

import "@supabase/supabase-js";

declare module "@supabase/supabase-js" {
  interface SupabaseClient<
    Database = any,
    SchemaName extends string & keyof Database = "public" extends keyof Database
      ? "public"
      : string & keyof Database,
    Schema = any,
  > {
    from(relation: string): any;
    rpc(fn: string, args?: any, options?: any): any;
  }
}
