import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getBatchForEdit,
  setCertificateRevoked,
  updateVerificationPage,
} from "@/lib/verification.functions";

export const Route = createFileRoute("/manage/$batchId")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Edit your verification page — GenCertificates" },
      {
        name: "description",
        content:
          "Customize the public verification page shown when someone scans the QR code on your certificates, and revoke certificates you no longer stand behind.",
      },
      { property: "og:title", content: "Edit your verification page — GenCertificates" },
      {
        property: "og:description",
        content: "Control the wording, contact details, and validity of your issued certificates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManagePage,
});

interface Fields {
  organization: string;
  verify_headline: string;
  verify_message: string;
  contact_email: string;
  website: string;
}

interface CertRow {
  id: string;
  code: string;
  recipient_name: string;
  revoked: boolean;
}

function ManagePage() {
  const { batchId } = Route.useParams();
  const { token } = Route.useSearch();
  const load = useServerFn(getBatchForEdit);
  const save = useServerFn(updateVerificationPage);
  const revoke = useServerFn(setCertificateRevoked);

  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");
  const [fields, setFields] = useState<Fields>({
    organization: "",
    verify_headline: "",
    verify_message: "",
    contact_email: "",
    website: "",
  });
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setStatus("denied");
        return;
      }
      const res = await load({ data: { batchId, editToken: token } });
      if (!active) return;
      if (!res.ok) {
        setStatus("denied");
        return;
      }
      setFields({
        organization: res.batch.organization ?? "",
        verify_headline: res.batch.verify_headline ?? "",
        verify_message: res.batch.verify_message ?? "",
        contact_email: res.batch.contact_email ?? "",
        website: res.batch.website ?? "",
      });
      setCerts(res.certificates as CertRow[]);
      setStatus("ok");
    })();
    return () => {
      active = false;
    };
  }, [batchId, token, load]);

  async function onSave() {
    setSaving(true);
    try {
      await save({ data: { batchId, editToken: token, ...fields } });
      toast.success("Verification page updated");
    } catch {
      toast.error("Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRevoke(cert: CertRow) {
    try {
      await revoke({
        data: { batchId, editToken: token, certificateId: cert.id, revoked: !cert.revoked },
      });
      setCerts((prev) =>
        prev.map((c) => (c.id === cert.id ? { ...c, revoked: !c.revoked } : c)),
      );
    } catch {
      toast.error("Could not update that certificate");
    }
  }

  const set = (key: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">
            Gen<span className="text-gold">Certificates</span>
          </Link>
          <span className="text-sm text-muted-foreground">Verification page editor</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        {status === "loading" && <p className="text-muted-foreground">Loading…</p>}

        {status === "denied" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-8">
            <h1 className="text-2xl font-semibold">Editor link is invalid</h1>
            <p className="mt-2 text-muted-foreground">
              This page can only be opened with the private editor link you received right after
              generating your certificates.
            </p>
          </div>
        )}

        {status === "ok" && (
          <>
            <h1 className="text-3xl font-semibold">Your verification page</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              This is what people see when they scan the QR code on your certificates. Keep this
              link private — anyone with it can edit the page.
            </p>

            <div className="mt-6 grid gap-3 rounded-lg border border-border bg-card p-6">
              <Field label="Organization" value={fields.organization} onChange={set("organization")} />
              <Field label="Headline" value={fields.verify_headline} onChange={set("verify_headline")} />
              <Field
                label="Message"
                value={fields.verify_message}
                onChange={set("verify_message")}
                textarea
              />
              <Field label="Contact email" value={fields.contact_email} onChange={set("contact_email")} />
              <Field label="Website" value={fields.website} onChange={set("website")} />
              <div>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="mt-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>

            <h2 className="mt-10 text-lg font-semibold">Issued certificates ({certs.length})</h2>
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {certs.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="flex-1 truncate text-sm font-medium">{c.recipient_name}</span>
                  <Link
                    to="/verify/$code"
                    params={{ code: c.code }}
                    className="font-mono text-xs text-gold underline"
                  >
                    {c.code}
                  </Link>
                  <button
                    onClick={() => toggleRevoke(c)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                      c.revoked
                        ? "border-gold bg-accent/40"
                        : "border-input hover:bg-secondary"
                    }`}
                  >
                    {c.revoked ? "Restore" : "Revoke"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-border py-6 text-center text-sm text-muted-foreground">
        Developed by{" "}
        <a
          href="https://www.linkedin.com/in/sadman-nahial-nafi/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gold underline underline-offset-2 hover:text-foreground"
        >
          Sadman Nahial Nafi
        </a>
      </footer>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  textarea?: boolean;
}) {
  const cls =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30";
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {textarea ? (
        <textarea value={value} onChange={onChange} rows={3} className={cls} />
      ) : (
        <input value={value} onChange={onChange} className={cls} />
      )}
    </label>
  );
}
