import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { navigateToRoute } from "../lib/router";
import { BASE_URL as API_BASE } from "../api";
import { Shield, Sparkles, Key, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordStrength from "@/components/PasswordStrength";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleHint, setShowGoogleHint] = useState(false);

  // Password strength validation helper
  const isPasswordStrong = (): boolean => {
    if (!isSignup) return true; // Only validate on signup
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    );
  };

  // Check if already logged in
  useEffect(() => {
    const localToken = localStorage.getItem("auth_token");
    if (localToken) {
      navigate("/dashboard");
    }

    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError === "unauthorized") {
      setError("Access denied. Your email is not authorized as admin.");
      navigateToRoute("/login", { replace: true });
    }
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setShowGoogleHint(false);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google-url`);
      if (!res.ok) throw new Error("Failed to get Google login URL");
      const data = await res.json();
      if (!data.url) throw new Error("Invalid login response from server");
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (isSignup && !trimmedName) {
      setError("Please enter your full name to create an account.");
      return;
    }

    setAuthLoading(true);
    setError(null);
    setShowGoogleHint(false);

    try {
      if (isSignup) {
        // Use custom backend signup ONLY (single source of truth)
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password, name: trimmedName }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Account creation failed.");
        }
        navigate(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
        return;
      } else {
        // Use custom backend signin ONLY (single source of truth)
        const res = await fetch(`${API_BASE}/api/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Show Google hint if backend says to use Google
          if (data?.useGoogle) {
            setShowGoogleHint(true);
          }
          throw new Error(data?.error || "Sign in failed.");
        }
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
        }
        if (data.refreshToken) {
          localStorage.setItem("refresh_token", data.refreshToken);
        }
        navigate("/dashboard");
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size="xl" subtitle="Campaign Console" />
          <p className="text-xs text-muted-foreground pt-1">
            {isSignup ? "Create an account to access your cold email campaign console." : "Sign in to access your cold email campaign console."}
          </p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {showGoogleHint && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-600 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              </svg>
              <span>Click the <strong>"Sign in with Google"</strong> button above to access your account.</span>
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-11 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white rounded-xl shadow-2xs gap-2 transition-all"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            {loading ? "Authenticating..." : isSignup ? "Sign up with Google" : "Sign in with Google"}
          </Button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-border/60 w-full" />
            <span className="bg-card px-3 text-[10px] uppercase font-mono font-bold text-muted-foreground absolute">
              Or continue with email
            </span>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4" autoComplete="off">
            {isSignup && (
              <div className="space-y-1.5">
                <label htmlFor="full-name" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#635bff]" /> Full name
                </label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={authLoading || loading}
                  autoComplete="name"
                  className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email-address" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-[#635bff]" /> Email address
              </label>
              <Input
                id="email-address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={authLoading || loading}
                autoComplete="off"
                className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#635bff]" /> Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignup ? "Create a strong password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading || loading}
                  autoComplete="off"
                  className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff] pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={authLoading || loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {isSignup && <PasswordStrength password={password} showRequirements={true} />}
              {!isSignup && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[10px] font-bold text-[#635bff] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={authLoading || loading || !email.trim() || !password.trim() || (isSignup && !name.trim()) || (isSignup && !isPasswordStrong())}
                className="w-full h-10 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-1.5 transition-all"
              >
                {authLoading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                {authLoading ? (isSignup ? "Creating account..." : "Signing in...") : isSignup ? "Create account" : "Sign in with email"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSignup((current) => !current);
                  setError(null);
                  setPassword("");
                  setShowGoogleHint(false);
                }}
                className="w-full h-10 text-xs font-bold border-border/60 hover:border-[#635bff] hover:text-[#635bff] transition-all"
              >
                {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-600" /> Secure 256-bit OAuth2 &amp; Encrypted Session
        </p>
      </div>
    </div>
  );
}
