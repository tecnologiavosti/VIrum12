import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, Link as LinkIcon, ImageIcon } from "lucide-react";

const BUCKET = "diagnostic-form-images";
const SIGNED_URL_EXPIRES = 60 * 60 * 24 * 365 * 10; // 10 years

const CATEGORIES: { key: string; label: string }[] = [
  { key: "ambiente", label: "Ambiente" },
  { key: "cafeteria", label: "Cafeteria" },
  { key: "look", label: "Looks" },
  { key: "sapato", label: "Sapatos" },
  { key: "relogio", label: "Relógios" },
  { key: "paleta", label: "Paleta de cores" },
  { key: "arquetipo", label: "Arquétipos masculinos" },
];

interface Row {
  id: string;
  category: string;
  position: number;
  image_url: string;
  storage_path: string | null;
  is_active: boolean;
}

async function urlLoads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    setTimeout(() => resolve(false), 8000);
  });
}

export default function AdminDiagnosticFormImages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("diagnostic_form_images")
      .select("id, category, position, image_url, storage_path, is_active");
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getRow = (category: string, position: number) =>
    rows.find((r) => r.category === category && r.position === position);

  const save = async (category: string, position: number, url: string, storagePath: string | null) => {
    const existing = getRow(category, position);
    const payload = {
      category, position, image_url: url,
      storage_path: storagePath, is_active: true,
      photographer: null, pexels_id: null, search_query: null,
      image_hd_url: null,
    };
    let error;
    if (existing) {
      ({ error } = await supabase.from("diagnostic_form_images")
        .update({ image_url: url, storage_path: storagePath, is_active: true })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("diagnostic_form_images").insert(payload));
    }
    if (error) { toast.error(error.message); return false; }
    toast.success("Imagem salva com sucesso");
    await load();
    return true;
  };

  const remove = async (category: string, position: number) => {
    const existing = getRow(category, position);
    if (!existing) return;
    if (existing.storage_path) {
      await supabase.storage.from(BUCKET).remove([existing.storage_path]);
    }
    const { error } = await supabase.from("diagnostic_form_images").delete().eq("id", existing.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Imagem removida");
    await load();
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Imagens do Formulário</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie manualmente as 4 imagens de cada categoria da Etapa 4 do formulário de diagnóstico.
          As alterações aparecem imediatamente no formulário.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {CATEGORIES.map((cat) => (
            <Card key={cat.key}>
              <CardHeader>
                <CardTitle>{cat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((pos) => (
                    <SlotEditor
                      key={pos}
                      category={cat.key}
                      position={pos}
                      row={getRow(cat.key, pos)}
                      onSave={save}
                      onRemove={remove}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface SlotProps {
  category: string;
  position: number;
  row?: Row;
  onSave: (c: string, p: number, url: string, sp: string | null) => Promise<boolean>;
  onRemove: (c: string, p: number) => Promise<void>;
}

function SlotEditor({ category, position, row, onSave, onRemove }: SlotProps) {
  const [url, setUrl] = useState(row?.image_url ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setUrl(row?.image_url ?? ""); }, [row?.image_url]);

  const handleSaveUrl = async () => {
    const trimmed = url.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      toast.error("URL inválida");
      return;
    }
    setBusy(true);
    const ok = await urlLoads(trimmed);
    if (!ok) { setBusy(false); toast.error("Não foi possível carregar a imagem desta URL"); return; }
    // If replacing an uploaded image, drop the previous file.
    if (row?.storage_path) {
      await supabase.storage.from("diagnostic-form-images").remove([row.storage_path]);
    }
    await onSave(category, position, trimmed, null);
    setBusy(false);
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem deve ter até 10MB"); return; }
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${category}/${position}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setBusy(false); toast.error(upErr.message); return; }
    const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRES);
    if (signErr || !signed?.signedUrl) { setBusy(false); toast.error(signErr?.message || "Falha ao gerar URL"); return; }
    if (row?.storage_path && row.storage_path !== path) {
      await supabase.storage.from(BUCKET).remove([row.storage_path]);
    }
    await onSave(category, position, signed.signedUrl, path);
    setBusy(false);
  };

  const handleRemove = async () => {
    setBusy(true);
    await onRemove(category, position);
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-3 space-y-3">
      <div className="text-xs text-muted-foreground">Opção {position}</div>
      <div className="aspect-[4/5] rounded-md bg-muted overflow-hidden flex items-center justify-center">
        {row?.image_url ? (
          <img src={row.image_url} alt={`${category} ${position}`} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
            <ImageIcon className="w-6 h-6" />
            Sem imagem
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="URL da imagem"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleSaveUrl} disabled={busy} className="h-8 text-xs gap-1">
            <LinkIcon className="w-3 h-3" /> Salvar URL
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy} className="h-8 text-xs gap-1">
            <Upload className="w-3 h-3" /> Upload
          </Button>
          {row && (
            <Button size="sm" variant="destructive" onClick={handleRemove} disabled={busy} className="h-8 text-xs gap-1">
              <Trash2 className="w-3 h-3" /> Remover
            </Button>
          )}
          {busy && <Loader2 className="w-4 h-4 animate-spin self-center" />}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}