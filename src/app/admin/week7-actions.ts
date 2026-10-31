"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";

type Resource = "terms" | "examples" | "providers" | "models" | "domains" | "emails";
const paths: Record<Resource, string> = {
  terms: "/admin/prompting", examples: "/admin/generations", providers: "/admin/llm",
  models: "/admin/llm", domains: "/admin/access", emails: "/admin/access",
};
const tables: Record<Resource, string> = {
  terms: "terms", examples: "ai_generation_examples", providers: "llm_providers",
  models: "llm_models", domains: "allowed_signup_domains", emails: "whitelisted_emails",
};

function value(data: FormData, key: string, max = 2000) {
  return String(data.get(key) ?? "").trim().slice(0, max);
}
function resource(data: FormData): Resource {
  const result = value(data, "resource", 30) as Resource;
  if (!(result in tables)) throw new Error("Unsupported resource");
  return result;
}
function uuid(data: FormData, key = "id") {
  const result = value(data, key, 50);
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(result)) throw new Error("Invalid identifier");
  return result;
}
function go(path: string, message: string, type: "success" | "error" = "success"): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

function payload(kind: Resource, data: FormData) {
  if (kind === "terms") return { term: value(data, "term", 120), category: value(data, "category", 60) || "general", is_blocked: data.get("is_blocked") === "on" };
  if (kind === "examples") return { title: value(data, "title", 120), input: value(data, "input"), expected_output: value(data, "expected_output"), is_active: data.get("is_active") === "on" };
  if (kind === "providers") return { name: value(data, "name", 120), base_url: value(data, "base_url", 500) || null, is_active: data.get("is_active") === "on" };
  if (kind === "models") return { name: value(data, "name", 120), slug: value(data, "slug", 160), provider_id: uuid(data, "provider_id"), is_active: data.get("is_active") === "on" };
  if (kind === "domains") return { domain: value(data, "domain", 255).toLowerCase().replace(/^@/, ""), is_active: data.get("is_active") === "on" };
  return { email: value(data, "email", 255).toLowerCase(), note: value(data, "note", 500) || null };
}

export async function createResource(data: FormData) {
  const kind = resource(data); const { supabase } = await requireSuperadmin();
  const { error } = await supabase.from(tables[kind]).insert(payload(kind, data) as never);
  if (error) go(paths[kind], error.message, "error");
  revalidatePath(paths[kind]); go(paths[kind], "Created successfully.");
}
export async function updateResource(data: FormData) {
  const kind = resource(data); const id = uuid(data); const { supabase } = await requireSuperadmin();
  const { error } = await supabase.from(tables[kind]).update(payload(kind, data) as never).eq("id", id);
  if (error) go(paths[kind], error.message, "error");
  revalidatePath(paths[kind]); go(paths[kind], "Changes saved.");
}
export async function deleteResource(data: FormData) {
  const kind = resource(data); const id = uuid(data); const { supabase } = await requireSuperadmin();
  if (value(data, "confirmation", 20) !== "DELETE") go(paths[kind], "Type DELETE to confirm.", "error");
  const { error } = await supabase.from(tables[kind]).delete().eq("id", id);
  if (error) go(paths[kind], error.message, "error");
  revalidatePath(paths[kind]); go(paths[kind], "Deleted successfully.");
}

export async function updatePromptMix(data: FormData) {
  const id = uuid(data); const weight = Number(data.get("weight")); const { supabase } = await requireSuperadmin();
  if (!Number.isInteger(weight) || weight < 0 || weight > 100) go("/admin/prompting", "Weight must be 0–100.", "error");
  const { error } = await supabase.from("prompt_chain_mix").update({ weight, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) go("/admin/prompting", error.message, "error");
  revalidatePath("/admin/prompting"); go("/admin/prompting", "Prompt mix updated.");
}

export async function uploadImage(data: FormData) {
  const { supabase, user } = await requireSuperadmin();
  const file = data.get("image"); const altText = value(data, "alt_text", 300); const title = value(data, "title", 120);
  if (!(file instanceof File) || file.size === 0 || !file.type.startsWith("image/")) go("/admin/generations", "Choose a valid image.", "error");
  if (file.size > 5 * 1024 * 1024 || !altText) go("/admin/generations", "Image must be under 5 MB and include alt text.", "error");
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("admin-media").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) go("/admin/generations", uploadError.message, "error");
  const { error } = await supabase.from("admin_images").insert({ storage_path: storagePath, alt_text: altText, title: title || null, created_by: user.id });
  if (error) { await supabase.storage.from("admin-media").remove([storagePath]); go("/admin/generations", error.message, "error"); }
  revalidatePath("/admin/generations"); go("/admin/generations", "Image uploaded.");
}
export async function updateImage(data: FormData) {
  const { supabase } = await requireSuperadmin(); const id = uuid(data);
  const { error } = await supabase.from("admin_images").update({ title: value(data, "title", 120) || null, alt_text: value(data, "alt_text", 300) }).eq("id", id);
  if (error) go("/admin/generations", error.message, "error"); revalidatePath("/admin/generations"); go("/admin/generations", "Image updated.");
}
export async function deleteImage(data: FormData) {
  const { supabase } = await requireSuperadmin(); const id = uuid(data);
  if (value(data, "confirmation", 20) !== "DELETE") go("/admin/generations", "Type DELETE to confirm.", "error");
  const { data: image, error: readError } = await supabase.from("admin_images").select("storage_path").eq("id", id).single();
  if (readError) go("/admin/generations", readError.message, "error");
  const { error: storageError } = await supabase.storage.from("admin-media").remove([image.storage_path]);
  if (storageError) go("/admin/generations", storageError.message, "error");
  const { error } = await supabase.from("admin_images").delete().eq("id", id);
  if (error) go("/admin/generations", error.message, "error"); revalidatePath("/admin/generations"); go("/admin/generations", "Image and storage object deleted.");
}
