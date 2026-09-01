import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVerification } from "@/lib/verification.functions";

export const Route = createFileRoute("/verify/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify certificate ${params.code} — GenCertificates` },
      {
        name: "description",
        content:
          "Check whether a certificate issued through GenCertificates is authentic, who it was awarded to, and when it was issued.",
      },
      { property: "og:title", content: "Certificate verification — GenCertificates" },
      {
        property: "og:description",
        content: "Public verification page for certificates issued with GenCertificates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { code } = Route.useParams();
  const fetchVerification = useServerFn(getVerification);
  const { data, isLoading } = useQuery({
    queryKey: ["verify", code],
    queryFn: () => fetchVerification({ data: { code } }),
  });

  return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        {isLoading && <p className="text-muted-foreground">Checking certificate…</p>}

        {!isLoading && !data?.found && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-8">
            <h1 className="text-2xl font-semibold">Certificate not found</h1>
            <p className="mt-2 text-muted-foreground">
              No certificate matches the code <span className="font-mono">{code}</span>. Check the
              code printed on the certificate and try again.
            </p>
          </div>
        )}

        {!isLoading && data?.found && (
          <>
            <div
              className={`rounded-lg border p-8 ${
                data.certificate.revoked
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-gold bg-accent/20"
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {data.certificate.revoked ? "Revoked" : "Verified"}
              </span>
              <h1 className="mt-2 text-3xl font-semibold">
                {data.certificate.revoked
                  ? "This certificate has been revoked"
                  : (data.page["verify_headline"] ?? "Certificate verified")}
              </h1>
              <p className="mt-3 text-muted-foreground">
                {data.certificate.revoked
                  ? "The issuing organization has withdrawn this certificate. Contact them for details."
                  : data.page["verify_message"]}
              </p>
            </div>

            <dl className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
              <Row label="Awarded to" value={data.certificate.recipientName} />
              <Row label="Certificate" value={data.certificate.title} />
              <Row label="Issued by" value={data.page["organization"] ?? ""} />
              <Row label="Issue date" value={data.certificate.issueDate} />
              <Row label="Achievement" value={data.certificate.reason} />
              <Row
                label="Signed by"
                value={[data.certificate.signatoryName, data.certificate.signatoryRole]
                  .filter(Boolean)
                  .join(" — ")}
              />
              <Row label="Verification code" value={data.certificate.code} mono />
              <Row
                label="Recorded"
                value={new Date(data.certificate.createdAt).toLocaleDateString()}
              />
            </dl>

            {(data.page["contact_email"] || data.page["website"]) && (
              <div className="mt-8 rounded-lg border border-border bg-card p-6 text-sm">
                <h2 className="font-semibold">Questions about this certificate?</h2>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  {data.page["contact_email"] && (
                    <p>
                      Email:{" "}
                      <a
                        className="text-gold underline"
                        href={`mailto:${data.page["contact_email"]}`}
                      >
                        {data.page["contact_email"]}
                      </a>
                    </p>
                  )}
                  {data.page["website"] && (
                    <p>
                      Website:{" "}
                      <a
                        className="text-gold underline"
                        href={data.page["website"]}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        {data.page["website"]}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="bg-card p-5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-1 ${mono ? "font-mono text-sm" : "text-base"}`}>{value}</dd>
    </div>
  );
}
