import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createSchema = z.object({
  organization: z.string().max(200),
  title: z.string().max(200),
  reason: z.string().max(500),
  issueDate: z.string().max(100),
  signatoryName: z.string().max(200),
  signatoryRole: z.string().max(200),
  names: z.array(z.string().min(1).max(200)).min(1).max(500),
});

const publicBatchFields = [
  "organization",
  "title",
  "verify_headline",
  "verify_message",
  "contact_email",
  "website",
] as const;

export const createCertificateBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: batch, error } = await supabaseAdmin
      .from("certificate_batches")
      .insert({
        organization: data.organization,
        title: data.title,
        verify_headline: "Certificate verified",
        verify_message: `This certificate was issued by ${data.organization || "the organizer"} and is authentic.`,
      })
      .select("id, edit_token")
      .single();
    if (error || !batch) throw new Error(error?.message ?? "Could not create batch");

    const { data: rows, error: rowsError } = await supabaseAdmin
      .from("certificates")
      .insert(
        data.names.map((recipient_name) => ({
          batch_id: batch.id,
          recipient_name,
          cert_title: data.title,
          reason: data.reason,
          issue_date: data.issueDate,
          signatory_name: data.signatoryName,
          signatory_role: data.signatoryRole,
        })),
      )
      .select("id, code, recipient_name");
    if (rowsError || !rows) throw new Error(rowsError?.message ?? "Could not create certificates");

    // Preserve the submitted order for the UI.
    const byName = new Map<string, { code: string }[]>();
    rows.forEach((r) => {
      const list = byName.get(r.recipient_name) ?? [];
      list.push({ code: r.code });
      byName.set(r.recipient_name, list);
    });
    const ordered = data.names.map((n) => ({
      name: n,
      code: byName.get(n)!.shift()!.code,
    }));

    return { batchId: batch.id, editToken: batch.edit_token, certificates: ordered };
  });

export const getVerification = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ code: z.string().max(64) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cert } = await supabaseAdmin
      .from("certificates")
      .select(
        "code, recipient_name, cert_title, reason, issue_date, signatory_name, signatory_role, revoked, created_at, batch_id",
      )
      .eq("code", data.code.toUpperCase())
      .maybeSingle();

    if (!cert) return { found: false as const };

    const { data: batch } = await supabaseAdmin
      .from("certificate_batches")
      .select(publicBatchFields.join(", "))
      .eq("id", cert.batch_id)
      .maybeSingle();

    return {
      found: true as const,
      certificate: {
        code: cert.code,
        recipientName: cert.recipient_name,
        title: cert.cert_title,
        reason: cert.reason,
        issueDate: cert.issue_date,
        signatoryName: cert.signatory_name,
        signatoryRole: cert.signatory_role,
        revoked: cert.revoked,
        createdAt: cert.created_at,
      },
      page: (batch ?? {}) as Record<string, string>,
    };
  });

const tokenSchema = z.object({ batchId: z.string().uuid(), editToken: z.string().min(10).max(200) });

export const getBatchForEdit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: batch } = await supabaseAdmin
      .from("certificate_batches")
      .select(
        "id, organization, title, verify_headline, verify_message, contact_email, website",
      )
      .eq("id", data.batchId)
      .eq("edit_token", data.editToken)
      .maybeSingle();

    if (!batch) return { ok: false as const };

    const { data: certs } = await supabaseAdmin
      .from("certificates")
      .select("id, code, recipient_name, revoked")
      .eq("batch_id", data.batchId)
      .order("created_at", { ascending: true });

    return { ok: true as const, batch, certificates: certs ?? [] };
  });

export const updateVerificationPage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    tokenSchema
      .extend({
        organization: z.string().max(200),
        verify_headline: z.string().max(200),
        verify_message: z.string().max(2000),
        contact_email: z.string().max(200),
        website: z.string().max(300),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { batchId, editToken, ...fields } = data;
    const { error } = await supabaseAdmin
      .from("certificate_batches")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", batchId)
      .eq("edit_token", editToken);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setCertificateRevoked = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    tokenSchema.extend({ certificateId: z.string().uuid(), revoked: z.boolean() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: batch } = await supabaseAdmin
      .from("certificate_batches")
      .select("id")
      .eq("id", data.batchId)
      .eq("edit_token", data.editToken)
      .maybeSingle();
    if (!batch) throw new Error("Not authorized");

    const { error } = await supabaseAdmin
      .from("certificates")
      .update({ revoked: data.revoked })
      .eq("id", data.certificateId)
      .eq("batch_id", data.batchId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
