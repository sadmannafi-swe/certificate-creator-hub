import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchCertificates } from "@/lib/verification.functions";

export const Route = createFileRoute("/verify/")({
  head: () => ({
    meta: [
      { title: "Verify a certificate — GenCertificates" },
      {
        name: "description",
        content:
          "Public certificate verification portal. Enter the verification code from a certificate, or search by recipient name, to confirm it is authentic.",
      },
      { property: "og:title", content: "Certificate verification portal — GenCertificates" },
      {
        property: "og:description",
        content:
          "Confirm the authenticity of any certificate issued through GenCertificates using its QR code or verification code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPortal,
});

function VerifyPortal() {
  const navigate = useNavigate();
  const search = useServerFn(searchCertificates);
  const [code, setCode] = useState("");
  const [nameQuery, setNameQuery] = useState("");

  const searchMutation = useMutation({
    mutationFn: (query: string) => search({ data: { query } }),
  });

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    // Allow pasting a full verification URL from a QR scan.
    const match = trimmed.match(/\/verify\/([A-Za-z0-9]+)/);
    navigate({ to: "/verify/$code", params: { code: (match?.[1] ?? trimmed).toUpperCase() } });
  };

  const submitNameSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameQuery.trim().length >= 2) searchMutation.mutate(nameQuery.trim());
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          Public verification
        </span>
        <h1 className="mt-3 font-display text-4xl font-semibold">Verify a certificate</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Scanned a QR code? You are already in the right place. Otherwise enter the verification
          code printed on the certificate, or search by the recipient's name.
        </p>
      </div>

      <form onSubmit={submitCode} className="mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Verification code, e.g. A1B2C3D4E5"
          className="h-12 flex-1 rounded-md border border-input bg-card px-4 font-mono text-sm uppercase tracking-widest"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={!code.trim()}
          className="h-12 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Verify
        </button>
      </form>

      <div className="mt-12 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Search by recipient name</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Find certificates issued through GenCertificates by the name of the person who received
          them.
        </p>
        <form onSubmit={submitNameSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Recipient name"
            className="h-11 flex-1 rounded-md border border-input bg-background px-4 text-sm"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={nameQuery.trim().length < 2 || searchMutation.isPending}
            className="h-11 rounded-md border border-gold px-6 text-sm font-semibold text-gold disabled:opacity-40"
          >
            {searchMutation.isPending ? "Searching…" : "Search"}
          </button>
        </form>

        {searchMutation.data && (
          <ul className="mt-5 divide-y divide-border rounded-md border border-border">
            {searchMutation.data.results.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">
                No certificates found for “{nameQuery}”.
              </li>
            )}
            {searchMutation.data.results.map((r) => (
              <li key={r.code}>
                <Link
                  to="/verify/$code"
                  params={{ code: r.code }}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-accent/30"
                >
                  <div>
                    <p className="font-medium">{r.recipientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.title}
                      {r.issueDate ? ` · ${r.issueDate}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      r.revoked ? "bg-destructive/10 text-destructive" : "bg-accent text-foreground"
                    }`}
                  >
                    {r.revoked ? "Revoked" : "Verified"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
