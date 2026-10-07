import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, CreditCard, Eye, EyeOff, ShieldCheck, Wallet, ShoppingBag, PlugZap } from 'lucide-react';
import { formatPhoneBR } from '@/lib/formatPhone';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFunctions';

function validateStripePublishableKey(key: string): boolean {
  return !key || /^pk_(test|live)_[a-zA-Z0-9]+$/.test(key);
}

function validateStripeSecretKey(key: string): boolean {
  return !key || /^sk_(test|live)_[a-zA-Z0-9]+$/.test(key);
}

function validateWebhookSecret(key: string): boolean {
  return !key || /^whsec_[a-zA-Z0-9]+$/.test(key);
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showMpToken, setShowMpToken] = useState(false);
  const [affStatus, setAffStatus] = useState<{ shopee: boolean; shein: boolean } | null>(null);
  const [payStatus, setPayStatus] = useState<{ mercadopago: boolean; stripe: boolean; stripe_webhook: boolean } | null>(null);
  const [affTesting, setAffTesting] = useState<null | 'shopee' | 'shein'>(null);
  const [affTestResult, setAffTestResult] = useState<Record<string, string>>({});

  // Credential inputs (write-only: never pre-populated from server for security).
  const [creds, setCreds] = useState<Record<string, string>>({});
  const setCred = (name: string, v: string) => setCreds((p) => ({ ...p, [name]: v }));
  const [showCred, setShowCred] = useState<Record<string, boolean>>({});
  const toggleShow = (n: string) => setShowCred((p) => ({ ...p, [n]: !p[n] }));

  const refreshStatus = () => {
    supabase.functions.invoke('affiliate-providers-status').then(({ data }) => {
      if (data?.providers) setAffStatus(data.providers);
      if (data?.payments) setPayStatus(data.payments);
    }).catch(() => {});
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*');
      if (data) {
        const map: Record<string, any> = {};
        data.forEach(s => {
          // Do NOT surface encrypted credential blobs (cred_*) to the client.
          if (!s.key.startsWith('cred_')) map[s.key] = s.value;
        });
        setSettings(map);
      }
      setLoading(false);
    };
    fetchSettings();
    refreshStatus();
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getStringValue = (val: any) => {
    if (typeof val === 'string') return val.replace(/^"|"$/g, '');
    return val || '';
  };

  const handleSave = async () => {
    setSaving(true);

    // 1) Persist non-credential settings as before (site_settings jsonb).
    const CREDENTIAL_KEYS = new Set([
      'stripe_publishable_key','stripe_secret_key','stripe_webhook_secret',
      'mercado_pago_public_key','mercado_pago_access_token',
    ]);
    for (const [key, value] of Object.entries(settings)) {
      if (CREDENTIAL_KEYS.has(key)) continue;
      await supabase
        .from('site_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }

    // 2) Persist secure credentials via save-credentials (AES-GCM encrypted at rest).
    // Only send fields that were actually touched (non-empty strings) so admin
    // never clears a live key by accident.
    const credPayload: Record<string, string> = {};
    const pushCred = (name: string) => {
      const v = creds[name];
      if (typeof v === 'string' && v.length > 0) credPayload[name] = v;
    };
    ['STRIPE_PUBLISHABLE_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET',
     'MERCADO_PAGO_PUBLIC_KEY','MERCADO_PAGO_ACCESS_TOKEN',
     'SHOPEE_APP_ID','SHOPEE_APP_SECRET','SHOPEE_AFFILIATE_ID',
     'SHEIN_AFFILIATE_NETWORK','SHEIN_AFFILIATE_API_KEY','SHEIN_AFFILIATE_PUBLISHER_ID',
    ].forEach(pushCred);

    if (Object.keys(credPayload).length > 0) {
      // Light format validation (mirrors old client-side checks).
      const pk = credPayload.STRIPE_PUBLISHABLE_KEY;
      const sk = credPayload.STRIPE_SECRET_KEY;
      const wh = credPayload.STRIPE_WEBHOOK_SECRET;
      if (pk && !validateStripePublishableKey(pk)) { toast.error('Stripe publishable inválida (pk_...).'); setSaving(false); return; }
      if (sk && !validateStripeSecretKey(sk)) { toast.error('Stripe secret inválida (sk_...).'); setSaving(false); return; }
      if (wh && !validateWebhookSecret(wh)) { toast.error('Webhook secret inválido (whsec_...).'); setSaving(false); return; }

      const { data, error } = await supabase.functions.invoke('save-credentials', {
        body: { credentials: credPayload },
      });
      if (error) { toast.error(`Erro ao salvar credenciais: ${error.message}`); setSaving(false); return; }
      const results = (data?.results || {}) as Record<string, string>;
      const bad = Object.entries(results).filter(([, s]) => s === 'invalid' || s === 'forbidden');
      if (bad.length) { toast.error(`Falha em: ${bad.map(([k]) => k).join(', ')}`); }
      setCreds({}); // clear inputs after save
    }

    toast.success('Configurações salvas!');
    setSaving(false);
    refreshStatus();
  };

  if (loading) {
    return <div className="animate-pulse text-primary">Carregando configurações...</div>;
  }

  const stripeConfigured = !!payStatus?.stripe;
  const stripeWhConfigured = !!payStatus?.stripe_webhook;
  const mpConfigured = !!payStatus?.mercadopago;

  return (
    <div className="space-y-8">
      <h2 className="font-serif text-3xl text-gradient-gold">Configurações</h2>

      {/* Configurações Gerais */}
      <div className="glass-card rounded-xl p-6 space-y-6 max-w-xl">
        <h3 className="font-serif text-xl text-foreground">Geral</h3>

        <div>
          <Label>Nome do Site</Label>
          <Input
            value={getStringValue(settings.site_name)}
            onChange={e => updateSetting('site_name', `"${e.target.value}"`)}
          />
        </div>

        <div>
          <Label>E-mail de Contato</Label>
          <Input
            value={getStringValue(settings.contact_email)}
            onChange={e => updateSetting('contact_email', `"${e.target.value}"`)}
          />
        </div>

        <div>
          <Label>Telefone de Contato</Label>
          <Input
            value={formatPhoneBR(getStringValue(settings.contact_phone))}
            onChange={e => updateSetting('contact_phone', `"${formatPhoneBR(e.target.value)}"`)}
            placeholder="(11) 91234-5678"
            inputMode="tel"
          />
        </div>

        <div>
          <Label>Instagram da Marca</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              instagram.com/
            </span>
            <Input
              className="pl-[110px]"
              value={getStringValue(settings.contact_instagram).replace(/^@/, '')}
              onChange={e => updateSetting('contact_instagram', `"${e.target.value.replace(/^@/, '').trim()}"`)}
              placeholder="suamarca"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={settings.demo_mode === true || settings.demo_mode === 'true'}
            onCheckedChange={v => updateSetting('demo_mode', v)}
          />
          <div>
            <Label>Modo Demonstração</Label>
            <p className="text-xs text-muted-foreground">Quando ativo, o botão "Assinar" mostra apenas uma demo sem cobrar.</p>
          </div>
        </div>
      </div>

      {/* Configurações Stripe */}
      <div className="glass-card rounded-xl p-6 space-y-6 max-w-xl">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-serif text-xl text-foreground">Stripe (Pagamentos)</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Cole suas chaves do Stripe abaixo. Elas são criptografadas antes de serem armazenadas
          e nunca são exibidas de volta — o campo fica em branco depois de salvar.
          Deixe em branco para manter o valor atual.
        </p>

        <div>
          <Label>Chave Publicável (Publishable Key)</Label>
          <Input
            value={creds.STRIPE_PUBLISHABLE_KEY ?? ''}
            onChange={e => setCred('STRIPE_PUBLISHABLE_KEY', e.target.value)}
            placeholder="pk_live_... ou pk_test_..."
          />
          {creds.STRIPE_PUBLISHABLE_KEY && !validateStripePublishableKey(creds.STRIPE_PUBLISHABLE_KEY) && (
            <p className="text-xs text-destructive mt-1">Formato inválido. Deve começar com pk_test_ ou pk_live_</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Começa com pk_live_ ou pk_test_</p>
        </div>

        <div>
          <Label>Chave Secreta (Secret Key)</Label>
          <div className="relative">
            <Input
              type={showSecretKey ? 'text' : 'password'}
              value={creds.STRIPE_SECRET_KEY ?? ''}
              onChange={e => setCred('STRIPE_SECRET_KEY', e.target.value)}
              placeholder="sk_live_... ou sk_test_..."
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {creds.STRIPE_SECRET_KEY && !validateStripeSecretKey(creds.STRIPE_SECRET_KEY) && (
            <p className="text-xs text-destructive mt-1">Formato inválido. Deve começar com sk_test_ ou sk_live_</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Começa com sk_live_ ou sk_test_. Usada apenas no servidor.</p>
        </div>

        <div>
          <Label>Webhook Signing Secret</Label>
          <div className="relative">
            <Input
              type={showWebhookSecret ? 'text' : 'password'}
              value={creds.STRIPE_WEBHOOK_SECRET ?? ''}
              onChange={e => setCred('STRIPE_WEBHOOK_SECRET', e.target.value)}
              placeholder="whsec_..."
            />
            <button
              type="button"
              onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {creds.STRIPE_WEBHOOK_SECRET && !validateWebhookSecret(creds.STRIPE_WEBHOOK_SECRET) && (
            <p className="text-xs text-destructive mt-1">Formato inválido. Deve começar com whsec_</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Encontrado no Stripe Dashboard → Webhooks → Signing secret. Obrigatório para segurança em produção.
          </p>
        </div>

        {/* Status indicators */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Status de Segurança</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${stripeConfigured ? 'bg-primary' : 'bg-muted-foreground'}`} />
            <span className={stripeConfigured ? 'text-primary' : 'text-muted-foreground'}>
              {stripeConfigured ? 'Chaves configuradas' : 'Chaves não configuradas'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${stripeWhConfigured ? 'bg-primary' : 'bg-destructive'}`} />
            <span className={stripeWhConfigured ? 'text-primary' : 'text-destructive'}>
              {stripeWhConfigured ? 'Webhook protegido por assinatura' : 'Webhook sem proteção — configure para produção'}
            </span>
          </div>
        </div>
      </div>

      {/* Configurações Mercado Pago */}
      <div className="glass-card rounded-xl p-6 space-y-6 max-w-xl">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="font-serif text-xl text-foreground">Mercado Pago (Pagamentos)</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Cole suas chaves do Mercado Pago abaixo. Elas são criptografadas antes de serem armazenadas
          e nunca são exibidas de volta. Deixe em branco para manter o valor atual.
        </p>

        <div>
          <Label>Chave Pública (Public Key)</Label>
          <Input
            value={creds.MERCADO_PAGO_PUBLIC_KEY ?? ''}
            onChange={e => setCred('MERCADO_PAGO_PUBLIC_KEY', e.target.value)}
            placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <p className="text-xs text-muted-foreground mt-1">Disponível em Mercado Pago → Suas integrações → Credenciais.</p>
        </div>

        <div>
          <Label>Token de Acesso (Access Token)</Label>
          <div className="relative">
            <Input
              type={showMpToken ? 'text' : 'password'}
              value={creds.MERCADO_PAGO_ACCESS_TOKEN ?? ''}
              onChange={e => setCred('MERCADO_PAGO_ACCESS_TOKEN', e.target.value)}
              placeholder="APP_USR-xxxxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxx"
            />
            <button
              type="button"
              onClick={() => setShowMpToken(!showMpToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showMpToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Usado apenas no servidor para autenticar cobranças.</p>
        </div>

        <div className="flex items-center gap-2 text-sm pt-2 border-t border-border">
          <div className={`w-2 h-2 rounded-full ${mpConfigured ? 'bg-primary' : 'bg-muted-foreground'}`} />
          <span className={mpConfigured ? 'text-primary' : 'text-muted-foreground'}>
            {mpConfigured ? 'Mercado Pago configurado' : 'Mercado Pago não configurado'}
          </span>
        </div>
      </div>



      <Button variant="premium" onClick={handleSave} disabled={saving} className="max-w-xl w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Salvando...' : 'Salvar Todas as Configurações'}
      </Button>

      {/* Afiliados (Shopee / Shein) */}
      <div className="glass-card rounded-xl p-6 space-y-6 max-w-xl">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h3 className="font-serif text-xl text-foreground">Produtos de Afiliado</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Sugere peças reais à venda (com link de afiliado) na página de resultado do diagnóstico.
          A seção só aparece quando o switch abaixo está ligado <strong>e</strong> pelo menos um provedor
          tem as credenciais configuradas.
        </p>

        <div className="flex items-center gap-3">
          <Switch
            checked={settings.affiliate_products_enabled === true || settings.affiliate_products_enabled === 'true'}
            onCheckedChange={v => updateSetting('affiliate_products_enabled', v)}
          />
          <div>
            <Label>Exibir sugestões de afiliado</Label>
            <p className="text-xs text-muted-foreground">Feature flag global. Salve as configurações para aplicar.</p>
          </div>
        </div>

        <div>
          <Label>Máximo de produtos por peça (1–5)</Label>
          <Input
            type="number" min={1} max={5}
            value={String(settings.affiliate_max_matches_per_piece ?? 3).replace(/"/g,'')}
            onChange={e => updateSetting('affiliate_max_matches_per_piece', Number(e.target.value) || 3)}
          />
        </div>

        {/* Credenciais Shopee / Shein — mesmo padrão dos campos MP/Stripe */}
        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-sm font-medium text-foreground">Credenciais dos provedores</p>
          <p className="text-xs text-muted-foreground">
            Cole abaixo e clique em "Salvar Todas as Configurações". As credenciais são criptografadas
            antes de serem armazenadas e nunca são exibidas de volta. Deixe em branco para manter o valor atual.
          </p>

          {([
            { name: 'SHOPEE_APP_ID', label: 'Shopee · App ID', secret: false, placeholder: 'app id' },
            { name: 'SHOPEE_APP_SECRET', label: 'Shopee · App Secret', secret: true, placeholder: 'app secret' },
            { name: 'SHOPEE_AFFILIATE_ID', label: 'Shopee · Affiliate ID', secret: false, placeholder: 'affiliate id' },
            { name: 'SHEIN_AFFILIATE_NETWORK', label: 'Shein · Rede (awin | cj | admitad)', secret: false, placeholder: 'awin' },
            { name: 'SHEIN_AFFILIATE_API_KEY', label: 'Shein · API Key', secret: true, placeholder: 'api key' },
            { name: 'SHEIN_AFFILIATE_PUBLISHER_ID', label: 'Shein · Publisher ID', secret: false, placeholder: 'publisher id' },
          ] as const).map((f) => (
            <div key={f.name}>
              <Label>{f.label}</Label>
              <div className="relative">
                <Input
                  type={f.secret && !showCred[f.name] ? 'password' : 'text'}
                  value={creds[f.name] ?? ''}
                  onChange={e => setCred(f.name, e.target.value)}
                  placeholder={f.placeholder}
                />
                {f.secret && (
                  <button
                    type="button"
                    onClick={() => toggleShow(f.name)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCred[f.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Status dos provedores</span>
          </div>

          {(['shopee','shein'] as const).map((p) => {
            const ok = !!affStatus?.[p];
            const label = p === 'shopee' ? 'Shopee Affiliate' : 'Shein (rede de afiliados)';
            const secrets = p === 'shopee'
              ? 'SHOPEE_APP_ID · SHOPEE_APP_SECRET · SHOPEE_AFFILIATE_ID'
              : 'SHEIN_AFFILIATE_NETWORK · SHEIN_AFFILIATE_API_KEY · SHEIN_AFFILIATE_PUBLISHER_ID';
            return (
              <div key={p} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${ok ? 'bg-primary' : 'bg-muted-foreground'}`} />
                    <span className={ok ? 'text-primary font-medium' : 'text-muted-foreground'}>
                      {label} — {ok ? 'configurado' : 'sem credenciais'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">Secrets: {secrets}</p>
                  {affTestResult[p] && (
                    <p className="text-[11px] mt-1 text-muted-foreground">{affTestResult[p]}</p>
                  )}
                </div>
                <Button
                  size="sm" variant="outline" disabled={!ok || affTesting === p}
                  onClick={async () => {
                    setAffTesting(p);
                    setAffTestResult(prev => ({ ...prev, [p]: 'Testando…' }));
                    try {
                      const { data } = await invokeAuthenticatedFunction<{
                        enabled?: boolean;
                        results?: Array<{ platform: 'shopee' | 'shein'; ok?: boolean; sample?: { product_title?: string } }>;
                      }>('find-affiliate-products', {
                        dryRun: true,
                        description: 'camisa branca masculina',
                      });
                      const r = (data?.results || []).find((x: any) => x.platform === p);
                      if (!data?.enabled) {
                        setAffTestResult(prev => ({ ...prev, [p]: 'Feature desligada ou sem credenciais.' }));
                      } else if (r?.ok) {
                        setAffTestResult(prev => ({ ...prev, [p]: `OK · ${r.sample?.product_title ?? 'produto retornado'}` }));
                      } else {
                        setAffTestResult(prev => ({ ...prev, [p]: 'Nenhum produto retornado.' }));
                      }
                    } catch (e: any) {
                      setAffTestResult(prev => ({ ...prev, [p]: `Erro: ${e.message}` }));
                    } finally {
                      setAffTesting(null);
                    }
                  }}
                >
                  Testar
                </Button>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground/70 pt-2">
            As credenciais ficam criptografadas em repouso. Um valor definido nos Secrets do projeto
            (variável de ambiente da Edge Function) sempre tem precedência sobre o valor salvo aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
