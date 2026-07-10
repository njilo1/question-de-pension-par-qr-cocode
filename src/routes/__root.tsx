import { Outlet, createRootRoute, Link, useLocation, useRouter } from "@tanstack/react-router";
import "../styles.css";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-50 font-sans px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && location.pathname !== "/login") {
      router.navigate({ to: "/login" });
    }
  }, [user, loading, location.pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 font-sans">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-premium mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
            </svg>
          </div>
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Outlet />
      </AuthGuard>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
