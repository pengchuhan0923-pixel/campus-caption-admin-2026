"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";

function idOf(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Invalid media id");
  return id;
}

function clean(formData: FormData, field: string, max: number) {
  return String(formData.get(field) ?? "").trim().slice(0, max);
}

export async function createMedia(formData: FormData) {
  const { supabase, user } = await requireSuperadmin();
  const text = clean(formData, "text", 500);
  const prompt = clean(formData, "prompt", 1000);
  if (text.length < 2 || prompt.length < 2) redirect("/admin/media?error=Caption+and+prompt+are+required.#new");
  const { error } = await supabase.from("captions").insert({
    text,
    prompt,
    context: "Admin-curated AI media",
    model: "admin-curated",
    created_by: user.id,
    is_ai_generated: true,
  });
  if (error) redirect(`/admin/media?error=${encodeURIComponent(error.message)}#new`);
  revalidatePath("/admin"); revalidatePath("/admin/media");
  redirect("/admin/media?success=AI+media+created.");
}

export async function updateMedia(formData: FormData) {
  const { supabase } = await requireSuperadmin();
  const id = idOf(formData);
  const text = clean(formData, "text", 500);
  const prompt = clean(formData, "prompt", 1000);
  if (!text || !prompt) redirect("/admin/media?error=Caption+and+prompt+cannot+be+empty.");
  const { error } = await supabase.from("captions").update({ text, prompt }).eq("id", id).eq("is_ai_generated", true);
  if (error) redirect(`/admin/media?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin"); revalidatePath("/admin/media");
  redirect("/admin/media?success=Changes+saved.");
}

export async function deleteMedia(formData: FormData) {
  const { supabase } = await requireSuperadmin();
  const id = idOf(formData);
  if (clean(formData, "confirmation", 20) !== "DELETE") redirect("/admin/media?error=Type+DELETE+to+confirm.");
  const { error } = await supabase.from("captions").delete().eq("id", id).eq("is_ai_generated", true);
  if (error) redirect(`/admin/media?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin"); revalidatePath("/admin/media");
  redirect("/admin/media?success=Disposable+AI+media+deleted.");
}
