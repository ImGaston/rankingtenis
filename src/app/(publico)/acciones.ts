"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Inicia el login con Google (scopes openid, email y profile, los de serie). */
export async function iniciarSesionGoogle(formData: FormData) {
  const siguienteCrudo = String(formData.get("siguiente") ?? "/partidos");
  const siguiente = siguienteCrudo.startsWith("/") ? siguienteCrudo : "/partidos";
  const origen =
    process.env.NEXT_PUBLIC_SITE_URL ?? (await headers()).get("origin") ?? "http://localhost:3000";

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origen}/auth/callback?siguiente=${encodeURIComponent(siguiente)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/?error=login");
  redirect(data.url);
}
