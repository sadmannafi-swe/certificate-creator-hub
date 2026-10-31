import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeConfig, type CustomTemplateConfig } from "@/lib/custom-template";

export interface CustomTemplateDto {
  id: string;
  name: string;
  backgroundUrl: string | null;
  config: CustomTemplateConfig;
  updatedAt: string;
}

const ownerSchema = z.object({ ownerToken: z.string().min(8).max(120) });

const fieldStyleSchema = z.object({
  x: z.number().min(-100).max(1100),
  y: z.number().min(-100).max(800),
  size: z.number().min(6).max(220),
  font: z.string().max(120),
  color: z.string().max(40),
  align: z.enum(["left", "center", "right"]),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  uppercase: z.boolean().optional(),
  spacing: z.number().min(-5).max(24).optional(),
});

const configSchema = z.object({
  fields: z.record(z.string(), fieldStyleSchema),
  logo: z.object({ x: z.number(), y: z.number(), width: z.number() }).nullable(),
  logoSrc: z.string().max(1_700_000).nullable(),
  qr: z.object({ x: z.number(), y: z.number(), width: z.number() }).nullable(),
  seal: z.object({ x: z.number(), y: z.number(), width: z.number() }).nullable(),
  ink: z.string().max(40),
  accent: z.string().max(40),
  ornaments: z.object({ border: z.boolean(), corners: z.boolean() }),
  showTexture: z.boolean(),
});

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  ownerToken: z.string().min(8).max(120),
  name: z.string().min(1).max(120),
  // Uploaded design as a data URL (~2.5 MB binary worst case after client-side downscale).
  backgroundUrl: z.string().max(4_200_000).nullable(),
  config: configSchema,
});

export const listCustomTemplates = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ownerSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; templates: CustomTemplateDto[] }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      void supabaseAdmin.from("custom_templates");
      const { data: rows, error } = await supabaseAdmin
        .from("custom_templates")
        .select("id, name, background_url, config, updated_at")
        .eq("owner_token", data.ownerToken)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return {
        ok: true,
        templates: (rows ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          backgroundUrl: row.background_url,
          config: normalizeConfig(row.config),
          updatedAt: row.updated_at,
        })),
      };
    } catch (err) {
      console.error("[custom-templates] backend unavailable", err);
      return { ok: false, templates: [] };
    }
  });

export const saveCustomTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      background_url: data.backgroundUrl,
      config: data.config,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      // Ownership check: the row must belong to this private library token.
      const { data: owned } = await supabaseAdmin
        .from("custom_templates")
        .select("id")
        .eq("id", data.id)
        .eq("owner_token", data.ownerToken)
        .maybeSingle();
      if (!owned) throw new Error("TEMPLATE_NOT_FOUND");
      const { error } = await supabaseAdmin
        .from("custom_templates")
        .update(payload)
        .eq("id", data.id)
        .eq("owner_token", data.ownerToken);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: row, error } = await supabaseAdmin
      .from("custom_templates")
      .insert({ owner_token: data.ownerToken, ...payload })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not save template");
    return { id: row.id };
  });

export const deleteCustomTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    ownerSchema.extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("custom_templates")
      .delete()
      .eq("id", data.id)
      .eq("owner_token", data.ownerToken);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
