import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FormImage {
  id: string;
  category: string;
  position: number;
  image_url: string;
  image_hd_url: string | null;
  photographer: string | null;
}

async function fetchGrouped(): Promise<Record<string, FormImage[]>> {
  const { data, error } = await supabase
    .from("diagnostic_form_images")
    .select("id, category, position, image_url, image_hd_url, photographer")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("position", { ascending: true });
  if (error) throw error;
  const grouped: Record<string, FormImage[]> = {};
  for (const row of (data || []) as FormImage[]) {
    (grouped[row.category] ||= []).push(row);
  }
  return grouped;
}

export function useDiagnosticFormImages() {
  const [images, setImages] = useState<Record<string, FormImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchGrouped()
        .then((g) => { if (alive) { setImages(g); setLoading(false); } })
        .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    };
    load();

    const channel = supabase
      .channel("diagnostic_form_images_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "diagnostic_form_images" },
        () => load(),
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { images, loading, error };
}