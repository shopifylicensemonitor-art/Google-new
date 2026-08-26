import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useCallback, useState } from "react";
import { api } from "./api";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import { initCapacitor, isNativePlatform } from "./lib/capacitor";
import { navigateToRoute } from "./lib/router";
import clarity from "@microsoft/clarity";
import { UIProvider } from "./context/UIContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/CommandPalette";

// Helper function to gracefully handle dynamic module import failures (e.g., stale bundle hashes after dev rebuilds)
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasBeenReloaded = sessionStorage.getItem("chunk_reload_attempted");
    try {
      const component = await componentImport();
      sessionStorage.removeItem("chunk_reload_attempted");
      return component;
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.name === "ChunkLoadError";

      if (isChunkError && !pageHasBeenReloaded) {
        sessionStorage.setItem("chunk_reload_attempted", "true");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

// Lazy-load non-critical routes with automatic retry handling
const Help = lazyWithRetry(() => import("./pages/Help"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Tracker = lazyWithRetry(() => import("./pages/Tracker"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const EmailVerification = lazyWithRetry(() => import("./pages/EmailVerification"));

// Peak Xender Integrated Pages
const Accounts = lazyWithRetry(() => import("./pages/Accounts"));
const Campaigns = lazyWithRetry(() => import("./pages/Campaigns"));
const Templates = lazyWithRetry(() => import("./pages/Templates"));
const Contacts = lazyWithRetry(() => import("./pages/Contacts"));
const Logs = lazyWithRetry(() => import("./pages/Logs"));
const AISettings = lazyWithRetry(() => import("./pages/AISettings"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Inbox = lazyWithRetry(() => import("./pages/Inbox"));
const Domains = lazyWithRetry(() => import("./pages/Domains"));

const Blog = lazyWithRetry(() => import("./pages/Blog"));
const BlogPost = lazyWithRetry(() => import("./pages/BlogPost"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const Features = lazyWithRetry(() => import("./pages/Features"));
const ManagedService = lazyWithRetry(() => import("./pages/ManagedService"));

// Use HashRouter in native apps (no server to handle URL paths),
// BrowserRouter on web where Netlify handles routing.
const Router = isNativePlatform() ? HashRouter : BrowserRouter;

const CLARITY_PROJECT_ID = "q6srfz9g0o";

// ---------------------------------------------------------------------------
// Security Protected Route Wrapper
// ---------------------------------------------------------------------------

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setIsVerifying(false);
        navigateToRoute("/login", { replace: true });
        return;
      }

      try {
        await api.getCurrentUser();
        setIsVerified(true);
      } catch (error) {
        console.error("Session verification failed:", error);
        localStorage.removeItem("auth_token");
        navigateToRoute("/login", { replace: true });
      } finally {
        setIsVerifying(false);
      }
    };

    verifySession();
  }, []);

  if (isVerifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isVerified) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};


// ---------------------------------------------------------------------------
// App Entry Component
// Route Preloaders for Instant < 50ms Page Transitions
const routePreloaders = {
  Dashboard: () => import("./pages/Dashboard"),
  Campaigns: () => import("./pages/Campaigns"),
  Templates: () => import("./pages/Templates"),
  AISettings: () => import("./pages/AISettings"),
  Domains: () => import("./pages/Domains"),
  Accounts: () => import("./pages/Accounts"),
  Contacts: () => import("./pages/Contacts"),
  Inbox: () => import("./pages/Inbox"),
  Tracker: () => import("./pages/Tracker"),
  Settings: () => import("./pages/Settings"),
  Logs: () => import("./pages/Logs"),
};

function preloadAllRoutesOnIdle() {
  const idleFn = typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as any).requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 1200);

  idleFn(() => {
    Object.values(routePreloaders).forEach(loader => {
      try {
        loader();
      } catch (_) {}
    });
  });
}

// ---------------------------------------------------------------------------
const App = () => {
  const requirePin = useCallback((label: string, action: () => void) => {
    action();
  }, []);

  useEffect(() => {
    initCapacitor();
    
    // Initialize Microsoft Clarity tracking in production environments
    if (import.meta.env.PROD) {
      clarity.init(CLARITY_PROJECT_ID);
    }

    // Capture token from query search params (Google OAuth callback redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || params.get("access_token");
    if (token) {
      localStorage.setItem("auth_token", token);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      navigateToRoute(window.location.pathname + window.location.hash, { replace: true });
    }

    // Preload all remaining route chunks in background for instant <50ms displays
    preloadAllRoutesOnIdle();
  }, []);

  return (
    <UIProvider>
      <TooltipProvider>
        <Toaster />

        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <CommandPalette />
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center h-screen text-muted-foreground bg-background">Loading...</div>}>
              <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify-email" element={<EmailVerification />} />
              <Route path="/forgot-password" element={<EmailVerification />} />
              <Route path="/reset-password" element={<EmailVerification />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/help" element={<Help />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/features" element={<Features />} />
              <Route path="/managed-service" element={<ManagedService />} />
              
              {/* Protected Peak Xender routes */}
              <Route 
                path="/send" 
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tracker" 
                element={
                  <ProtectedRoute>
                    <Tracker />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/accounts" 
                element={
                  <ProtectedRoute>
                    <Accounts requirePin={requirePin} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/campaigns" 
                element={
                  <ProtectedRoute>
                    <Campaigns requirePin={requirePin} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/templates" 
                element={
                  <ProtectedRoute>
                    <Templates requirePin={requirePin} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/contacts" 
                element={
                  <ProtectedRoute>
                    <Contacts requirePin={requirePin} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/logs" 
                element={
                  <ProtectedRoute>
                    <Logs />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/ai-settings" 
                element={
                  <ProtectedRoute>
                    <AISettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/inbox" 
                element={
                  <ProtectedRoute>
                    <Inbox />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/domains" 
                element={
                  <ProtectedRoute>
                    <Domains requirePin={requirePin} />
                  </ProtectedRoute>
                } 
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
      </TooltipProvider>
    </UIProvider>
  );
};

export default App;
