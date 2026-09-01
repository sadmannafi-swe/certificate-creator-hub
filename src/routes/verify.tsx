import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/verify")({
  component: VerifyLayout,
});

function VerifyLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">
            Gen<span className="text-gold">Certificates</span>
          </Link>
          <Link to="/verify" className="text-sm text-muted-foreground hover:text-foreground">
            Verification portal
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
