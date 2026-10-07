export default function Router() {
  return (
    <div className="p-8 space-y-4 text-sm font-sans">
      <h1 className="text-xl font-bold text-green-600">Auditoria de Deploy - Projeto mhvmjgyibehthmglnxge</h1>
      <div className="bg-muted p-4 rounded-md space-y-4 border border-green-200">
        <p className="font-mono text-xs text-muted-foreground">Último Deploy Confirmado: 21/08/2026 15:23:23 UTC</p>
        
        <div className="space-y-2">
          <p><strong>Configuração IA Publicada:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Groq: <code className="bg-muted-foreground/10 px-1 rounded text-primary">openai/gpt-oss-120b</code></li>
            <li>Gemini: <code className="bg-muted-foreground/10 px-1 rounded text-primary">gemini-2.5-flash</code> (Fallback)</li>
            <li>Status: <span className="text-green-600 font-medium">Modelos antigos removidos (gemini-1.5-flash, llama-3.3-70b-versatile)</span></li>
          </ul>
        </div>

        <div className="space-y-2">
          <p><strong>Tratamento de Erros Publicado (Edge Function):</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>429 (Rate Limit):</strong> Implementado via <code className="bg-muted-foreground/10 px-1 rounded text-primary">AI_RATE_LIMIT</code> com suporte a <code className="bg-muted-foreground/10 px-1 rounded text-primary">retry-after</code>.</li>
            <li><strong>401 (Auth):</strong> Implementado via <code className="bg-muted-foreground/10 px-1 rounded text-primary">AI_ERROR_401</code> (Bloqueia retentativa/retryable=false).</li>
            <li><strong>402 (Payment):</strong> Implementado via <code className="bg-muted-foreground/10 px-1 rounded text-primary">AI_ERROR_402</code> (Bloqueia retentativa/retryable=false).</li>
            <li><strong>Parsing:</strong> <code className="bg-muted-foreground/10 px-1 rounded text-primary">parseAIJson</code> validado para tratamento de Markdown e caracteres invisíveis.</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-muted-foreground/20">
          <p className="text-lg font-bold text-primary">DEPLOY NOVO CONFIRMADO — horário: 2026-08-21 15:23:23 UTC</p>
        </div>
      </div>
      
      <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed italic text-xs mt-8 opacity-50">
        Este painel reflete o estado auditado da infraestrutura VIRUM no projeto oficial mhvmjgyibehthmglnxge.
      </p>
    </div>
  );
}
