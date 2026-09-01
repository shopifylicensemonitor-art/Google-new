import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { navigateToRoute } from "../lib/router";
import { BASE_URL as API_BASE } from "../api";
import { Shield, Sparkles, Key, Lock, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2, UserPlus, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordStrength from "@/components/PasswordStrength";

export default function Login() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showGoogleHint, setShowGoogleHint] = useState(false);

  const isSignup = activeTab === 'signup';

  // Password strength validation helper
  const isPasswordStrong = (): boolean => {
    if (!isSignup) return true; // Only validate on signup
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()_+\-={};':"\\|,.<>/?]/.test(password)
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
    const mode = params.get("mode");
    if (mode === "signup") {
      setActiveTab("signup");
    }
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
      const redirectUri = `${window.location.origin}/api/auth/callback`;
      const res = await fetch(`${API_BASE}/api/auth/google-url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();
      
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }

      // Direct fallback if client_id is available
      const clientId = data?.client_id || import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (clientId) {
        const directUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}&access_type=offline&prompt=consent`;
        window.location.href = directUrl;
        return;
      }

      throw new Error(data?.error || "Google sign in is currently unavailable. Please sign in with email and password.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setShowGoogleHint(false);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (isSignup) {
      if (!trimmedName) {
        setError("Please enter your full name to create an account.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify your confirmation password.");
        return;
      }
      if (!isPasswordStrong()) {
        setError("Password does not meet the security strength requirements.");
        return;
      }
    }

    setAuthLoading(true);

    try {
      if (isSignup) {
        // Sign up — requires 6-digit OTP email verification
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password, name: trimmedName }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data?.error || "Account creation failed.");
        }

        // Redirect directly to 6-digit OTP verification screen
        setSuccessMsg("Account created! Redirecting to email verification...");
        setTimeout(() => {
          navigate(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
        }, 800);
        return;
      } else {
        // Sign in
        const res = await fetch(`${API_BASE}/api/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          if (data?.requiresVerification) {
            // Unverified user — redirect to OTP verification screen
            setError(data.error || "Please verify your email address.");
            setTimeout(() => {
              navigate(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
            }, 1200);
            return;
          }

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
      <div className="w-full max-w-md space-y-5">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size="xl" subtitle="Campaign Console" />
          <p className="text-xs text-muted-foreground pt-1">
            {isSignup 
              ? "Create your account with email OTP verification." 
              : "Sign in to access your cold outreach campaign console."}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-xs space-y-5">
          {/* Sign In vs Sign Up Tabs Switcher */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-[#635bff] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> Create Account
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {showGoogleHint && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-600 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              </svg>
              <span>Click <strong>"Sign in with Google"</strong> below to access your account.</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || authLoading}
            className="w-full h-11 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white rounded-xl shadow-2xs gap-2 transition-all cursor-pointer"
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
            {loading ? "Connecting Google..." : isSignup ? "Sign up with Google (Instant)" : "Sign in with Google"}
          </Button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-border/60 w-full" />
            <span className="bg-card px-3 text-[10px] uppercase font-mono font-bold text-muted-foreground absolute">
              Or with email &amp; password
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5" autoComplete="off">
            {/* Full Name for Signup */}
            {isSignup && (
              <div className="space-y-1">
                <label htmlFor="full-name" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#635bff]" /> Full Name*
                </label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={authLoading || loading}
                  autoComplete="name"
                  className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff]"
                />
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1">
              <label htmlFor="email-address" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#635bff]" /> Work Email Address*
              </label>
              <Input
                id="email-address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={authLoading || loading}
                autoComplete="off"
                className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff]"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#635bff]" /> Password*
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignup ? "Create a secure password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading || loading}
                  autoComplete="off"
                  className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff] pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={authLoading || loading}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {isSignup && <PasswordStrength password={password} showRequirements={true} />}
              {!isSignup && (
                <div className="pt-0.5 text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[11px] font-bold text-[#635bff] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {/* Confirm Password for Signup */}
            {isSignup && (
              <div className="space-y-1">
                <label htmlFor="confirm-password" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#635bff]" /> Confirm Password*
                </label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={authLoading || loading}
                    autoComplete="off"
                    className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff] pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    disabled={authLoading || loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-rose-500 font-medium">Passwords do not match.</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={
                  authLoading ||
                  loading ||
                  !email.trim() ||
                  !password.trim() ||
                  (isSignup && (!name.trim() || !confirmPassword || password !== confirmPassword || !isPasswordStrong()))
                }
                className="w-full h-11 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                {authLoading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                {authLoading
                  ? isSignup
                    ? "Sending 6-Digit OTP..."
                    : "Signing In..."
                  : isSignup
                    ? "Create Account & Verify OTP"
                    : "Sign In"}
              </Button>
            </div>
          </form>
        </div>

        {/* Security Trust Note */}
        <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-600" /> Mandatory 6-digit OTP verification &amp; AES-256 encrypted session
        </p>
      </div>
    </div>
  );
}
