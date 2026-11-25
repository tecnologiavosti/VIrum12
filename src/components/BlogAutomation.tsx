import {useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {toast} from 'sonner';
const db=supabase as any;
export function BlogAutomation({onChange}:{onChange:()=>void}){
 const [settings,setSettings]=useState<any>(null),[runs,setRuns]=useState<any[]>([]),[topics,setTopics]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState<any>(null);
 const load=async()=>{
  const [s,r]=await Promise.all([db.from('blog_automation_settings').select('*').eq('id',true).single(),db.from('blog_automation_runs').select('day,state,attempts,error,post_id,research').order('day',{ascending:false}).limit(10)]);
  if(s.error||r.error){setError('A rotina diária precisa ser instalada no servidor do VIRUM. O blog existente continua disponível.');return;}
  setError('');setSettings(s.data);setTopics(s.data.topics.join('\n'));setRuns(r.data || []);
 };
 useEffect(()=>{load();},[]);
 const save=async()=>{setBusy(true);try{
  const list=[...new Set(topics.split('\n').map(s=>s.trim()).filter(Boolean))];if(!list.length)throw Error('Informe ao menos um tema.');
  const result=await db.from('blog_automation_settings').update({enabled:settings.enabled,local_hour:settings.local_hour,publish_mode:settings.publish_mode,keyword_source:settings.keyword_source,topics:list,updated_at:new Date().toISOString()}).eq('id',true).select('id').single();if(result.error)throw result.error;toast.success('Configuração diária salva.');await load();
 }catch(e:any){toast.error(e.message);}finally{setBusy(false);}};
 const invoke=async(action:string,post_id?:string)=>{setBusy(true);try{
  const {data,error}=await supabase.functions.invoke('daily-blog-post',{body:{action,post_id}});
  if(error){let message=error.message;try{message=(await (error as any).context.json()).error || message;}catch{}throw Error(message);}
  if(data.error)throw Error(data.error);
  if(action==='status')setStatus(data);else{toast.success(data.message || (data.skip==='already_done'?'O artigo de hoje já está publicado.':'Execução em andamento ou aguardando nova tentativa.'));onChange();}await load();
 }catch(e:any){toast.error(e.message || 'Não foi possível concluir.');await load();}finally{setBusy(false);}};
 return <section className="glass-card rounded-xl p-6 space-y-4 max-w-3xl" aria-label="Produção diária de artigos">
  <h3 className="font-serif text-xl">Produção diária de artigos</h3>
  <p className="text-sm text-muted-foreground">Um artigo por dia, com pesquisa, revisão e capa VIRUM. Horário de Brasília.</p>
  {error&&<p role="alert" className="text-sm text-amber-700">{error}</p>}
  {settings&&<>
   <div className="flex items-center gap-3"><Switch id="daily-enabled" checked={settings.enabled} onCheckedChange={enabled=>setSettings({...settings,enabled})}/><Label htmlFor="daily-enabled">Ativar rotina diária</Label></div>
   <div className="grid sm:grid-cols-3 gap-3">
    <div><Label htmlFor="daily-hour">Horário de Brasília</Label><Input id="daily-hour" type="time" step={3600} value={String(settings.local_hour).padStart(2,'0')+':00'} onChange={e=>setSettings({...settings,local_hour:Number(e.target.value.split(':')[0])})}/></div>
    <div><Label htmlFor="daily-mode">Destino do artigo</Label><select id="daily-mode" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={settings.publish_mode} onChange={e=>setSettings({...settings,publish_mode:e.target.value})}><option value="automatic">Publicar automaticamente</option><option value="draft">Salvar como rascunho</option></select></div>
    <div><Label htmlFor="daily-source">Pesquisa de temas</Label><select id="daily-source" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={settings.keyword_source} onChange={e=>setSettings({...settings,keyword_source:e.target.value})}><option value="google_trends">Google Trends — buscas</option><option value="editorial">Planejamento editorial</option></select></div>
   </div>
   <div><Label htmlFor="daily-topics">Áreas e temas (um por linha)</Label><Textarea id="daily-topics" rows={5} value={topics} onChange={e=>setTopics(e.target.value)}/></div>
   <p className="text-xs text-muted-foreground">No modo automático, artigos aprovados aparecem no blog e na home sem aprovação manual. Pendências são corrigidas e reavaliadas nas próximas tentativas; conteúdo sem evidências permanece em rascunho. Fontes são pesquisadas pelo Tavily. Google Trends é opcional e usa SerpApi; planejamento editorial funciona sem essa cota.</p>
   <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={save}>Salvar configuração</Button><Button variant="outline" disabled={busy} onClick={()=>invoke('generate')}>{busy?'Processando…':'Gerar artigo de hoje'}</Button><Button variant="outline" disabled={busy} onClick={()=>invoke('status')}>Verificar integrações</Button><Button variant="ghost" disabled={busy} onClick={load}>Atualizar histórico</Button></div>
  </>}
  {status&&<p className="text-xs text-muted-foreground">IA: {status.text?'configurada':'pendente'} · Tavily: {status.research?'configurada':'pendente'} · Google Trends: {status.trends?'configurado':'opcional, sem chave'} · Segredo do agendador: {status.cron?'configurado':'pendente'}. A presença de chaves não comprova cota nem a instalação do agendador.</p>}
  {runs.map(r=><details key={r.day} className="rounded-md border border-border p-3 text-sm"><summary className="cursor-pointer">{r.day.split('-').reverse().join('/')} · {r.state==='done'?(r.research?.published?'Publicado':'Gerado — confira status na lista'):r.state==='failed'?'Falha':'Em andamento'} · {r.attempts} tentativa(s)</summary><div className="mt-3 space-y-2">
   {r.error&&<p className="text-destructive">{r.error}</p>}<p>Fonte: {r.research?.provider || 'Pesquisa em andamento'}</p>
   {r.research?.selected&&<p>Palavra-chave: <strong>{r.research.selected.query}</strong>{r.research.selected.metric&&' · Interesse relativo: '+r.research.selected.metric}</p>}
   {r.research?.selection_reason&&<p>{r.research.selection_reason}</p>}
   {r.research?.final_audit&&<p>Revisão: {r.research.final_audit.approved?'aprovada':'com pendências'}</p>}
   {(r.research?.final_audit?.reasons || []).map((reason:string,i:number)=><p key={i}>{reason}</p>)}
   {(r.research?.sources || []).map((s:any)=><a className="block text-primary underline" key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>)}
   {r.post_id&&<Button variant="outline" disabled={busy} onClick={()=>invoke('review',r.post_id)}>Corrigir e reavaliar artigo</Button>}
  </div></details>)}
 </section>;
}
