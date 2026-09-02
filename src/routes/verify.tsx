import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/verify")({
  component: VerifyLayout,
});

function VerifyLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
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
