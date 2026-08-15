import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BASE_URL as API_BASE } from "../api";
import { CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EmailVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || !email.trim()) {
      setError('Please enter email and verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setResendLoading(true);
    setResendSuccess(false);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to resend code');

      setResendSuccess(true);
      setCode('');
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold">Email Verified!</h2>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 bg-[#635bff]/10 rounded-full flex items-center justify-center">
            <Mail className="h-6 w-6 text-[#635bff]" />
          </div>
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code sent to your email address
          </p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resendSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-600 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Code sent to your email</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || resendLoading || success}
                className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="code" className="text-xs font-bold text-foreground">
                Verification Code
              </label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\D/g, '').slice(0, 6))}
                disabled={loading || resendLoading || success}
                maxLength={6}
                className="h-10 text-center text-2xl font-mono bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff]"
              />
              <p className="text-[10px] text-muted-foreground">
                Enter the 6-digit code from your email. Code expires in 15 minutes.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !code || !email || code.length !== 6}
              className="w-full h-10 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white transition-all"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
              ) : (
                'Verify Email'
              )}
            </Button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border/60 w-full" />
            <span className="bg-card px-3 text-[10px] uppercase font-mono font-bold text-muted-foreground absolute">
              Or
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleResendCode}
            disabled={resendLoading || loading || !email}
            className="w-full h-10 text-xs font-bold border-border/60 hover:border-[#635bff] hover:text-[#635bff] transition-all"
          >
            {resendLoading ? 'Sending...' : 'Resend Code'}
          </Button>

          <p className="text-[11px] text-center text-muted-foreground">
            Check your spam folder if you don't see the email. 📧
          </p>
        </div>

        <p className="text-[11px] text-center text-muted-foreground space-y-1">
          <div>Need help? <a href="mailto:support@peakconix.com" className="text-[#635bff] font-bold hover:underline">Contact support</a></div>
          <div><a href="/login" className="text-[#635bff] font-bold hover:underline">Back to login</a></div>
        </p>
      </div>
    </div>
  );
}
