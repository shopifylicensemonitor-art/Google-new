import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BASE_URL as API_BASE } from "../api";
import { CheckCircle2, AlertCircle, Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EmailVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Parse code from URL if redirected from an email link
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const clean = code.replace(/\D/g, '').slice(0, 6);
      if (clean.length > 0) {
        const newDigits = clean.split('');
        while (newDigits.length < 6) newDigits.push('');
        setDigits(newDigits);
        if (clean.length === 6 && email) {
          executeVerification(email, clean);
        }
      }
    }
  }, [searchParams, email]);

  // Focus first empty digit input on load
  useEffect(() => {
    const firstEmptyIndex = digits.findIndex(d => !d);
    const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
    inputRefs.current[targetIndex]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric characters
    const char = value.replace(/[^0-9]/g, '').slice(-1);
    
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setError(null);

    // If character entered, move focus to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && email.trim()) {
      executeVerification(email.trim(), fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous box if current is empty
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasteData) return;

    const newDigits = pasteData.split('');
    while (newDigits.length < 6) newDigits.push('');
    setDigits(newDigits);

    // Focus last filled index
    const focusIdx = Math.min(pasteData.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (pasteData.length === 6 && email.trim()) {
      executeVerification(email.trim(), pasteData);
    }
  };

  const executeVerification = async (targetEmail: string, fullCode: string) => {
    if (loading || success) return;
    setLoading(true);
    setError(null);

    try {
      // Use ONLY custom backend verification (single source of truth)
      const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code: fullCode })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Verification code is invalid or has expired.');
      }

      // Store JWT if returned by backend
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      setSuccess(true);
      // Navigate to dashboard if token received, otherwise to login
      setTimeout(() => navigate(data.token ? '/dashboard' : '/login'), 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    executeVerification(email.trim(), fullCode);
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
      // Use ONLY custom backend resend (single source of truth)
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend code');

      setResendSuccess(true);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 animate-in zoom-in-95 duration-200">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto animate-bounce" />
          <h2 className="text-2xl font-bold text-foreground">Email Verified!</h2>
          <p className="text-muted-foreground text-sm">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  const fullCode = digits.join('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-14 w-14 bg-[#635bff]/10 rounded-2xl flex items-center justify-center shadow-inner">
            <Mail className="h-7 w-7 text-[#635bff]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verify Your Email</h1>
          <p className="text-xs text-muted-foreground max-w-xs">
            We sent a 6-digit verification code to <span className="font-semibold text-foreground">{email || "your email"}</span>
          </p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resendSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-600 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>New 6-digit verification code sent! Check your inbox.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
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
                autoComplete="off"
                className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff]"
              />
            </div>

            {/* 6 Individual Numeric Digit Boxes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block text-center">
                Enter 6-Digit Code
              </label>
              
              <div 
                className="flex items-center justify-between gap-2 max-w-[340px] mx-auto"
                onPaste={handlePaste}
              >
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading || resendLoading || success}
                    autoComplete="one-time-code"
                    className={`w-12 h-14 text-center text-2xl font-bold font-mono rounded-xl border bg-background text-foreground transition-all outline-none focus:scale-105 ${
                      digit 
                        ? 'border-[#635bff] bg-[#635bff]/5 ring-2 ring-[#635bff]/20' 
                        : 'border-border/80 focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/30'
                    }`}
                  />
                ))}
              </div>

              <p className="text-[11px] text-center text-muted-foreground pt-1">
                Code expires in 15 minutes
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || fullCode.length !== 6 || !email}
              className="w-full h-10 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
                  <span>Verifying...</span>
                </div>
              ) : (
                'Verify & Proceed to Dashboard'
              )}
            </Button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border/60 w-full" />
            <span className="bg-card px-3 text-[10px] uppercase font-mono font-bold text-muted-foreground absolute">
              Didn't receive code?
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleResendCode}
            disabled={resendLoading || loading || !email}
            className="w-full h-10 text-xs font-bold border-border/60 hover:border-[#635bff] hover:text-[#635bff] transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
            {resendLoading ? 'Sending New Code...' : 'Resend 6-Digit Code'}
          </Button>
        </div>

        <div className="text-center">
          <button 
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-muted-foreground hover:text-[#635bff] inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
