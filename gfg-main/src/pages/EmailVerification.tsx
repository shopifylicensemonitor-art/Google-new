import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { BASE_URL as API_BASE } from "../api";
import { CheckCircle2, AlertCircle, Mail, ArrowLeft, RefreshCw, Lock, Eye, EyeOff, Key, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordStrength from "@/components/PasswordStrength";

export default function EmailVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const tokenParam = searchParams.get('token') || '';
  const isResetPath = location.pathname === '/reset-password' || Boolean(tokenParam);
  const isForgotPath = location.pathname === '/forgot-password';

  const [mode, setMode] = useState<'verify' | 'forgot' | 'reset'>(
    isResetPath ? 'reset' : isForgotPath ? 'forgot' : 'verify'
  );

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (location.pathname === '/forgot-password') setMode('forgot');
    else if (location.pathname === '/reset-password' || searchParams.get('token')) setMode('reset');
    else setMode('verify');
  }, [location.pathname, searchParams]);

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
    const code = digits.join('');
    if (code.length === 6 && email.trim()) {
      executeVerification(email.trim(), code);
    } else {
      setError('Please enter the full 6-digit verification code.');
    }
  };

  const handleResendCode = async () => {
    if (!email.trim() || resendLoading) return;
    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Could not resend verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email');
      setSuccessMessage(data.message || 'If an account exists, a reset link has been dispatched.');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Could not process password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Reset token is required. Please check your reset link.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), email: email.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccessMessage('Password has been reset successfully! Redirecting to login...');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm mx-auto p-6 bg-card rounded-2xl border border-border/60 shadow-lg animate-in zoom-in-95 duration-200">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-foreground">
            {mode === 'verify' ? 'Email Verified!' : mode === 'forgot' ? 'Reset Link Sent' : 'Password Reset!'}
          </h2>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {successMessage || (mode === 'verify' ? 'Redirecting to your dashboard...' : 'Please check your email for the recovery link.')}
          </p>
          <Button
            onClick={() => navigate(mode === 'verify' ? '/dashboard' : '/login')}
            className="w-full h-10 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white"
          >
            {mode === 'verify' ? 'Go to Dashboard' : 'Proceed to Sign In'}
          </Button>
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
            {mode === 'verify' ? (
              <Mail className="h-7 w-7 text-[#635bff]" />
            ) : (
              <Lock className="h-7 w-7 text-[#635bff]" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === 'verify' ? 'Verify Your Email' : mode === 'forgot' ? 'Forgot Password' : 'Set New Password'}
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs">
            {mode === 'verify'
              ? `We sent a 6-digit verification code to ${email || 'your email'}`
              : mode === 'forgot'
              ? 'Enter your email address and we will send you a password recovery link.'
              : 'Enter your new strong password below to complete your reset.'}
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

          {mode === 'verify' && (
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
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#635bff]" /> Account Email Address
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-10 text-xs bg-background focus-visible:ring-[#635bff]/30 focus-visible:border-[#635bff]"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-10 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-1.5"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                {loading ? 'Sending Recovery Link...' : 'Send Password Reset Link'}
              </Button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-10 text-xs bg-background"
                />
              </div>

              {!tokenParam && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Reset Token / Code</label>
                  <Input
                    type="text"
                    placeholder="Paste reset token from email"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={loading}
                    required
                    className="h-10 text-xs bg-background font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#635bff]" /> New Password
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="h-10 text-xs bg-background pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <PasswordStrength password={newPassword} showRequirements={true} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#635bff]" /> Confirm New Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="h-10 text-xs bg-background pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
                className="w-full h-10 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-1.5"
              >
                {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
              </Button>
            </form>
          )}

          {mode === 'verify' && (
            <>
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
            </>
          )}
        </div>

        <div className="text-center flex items-center justify-center gap-4 text-xs font-semibold text-muted-foreground">
          <button 
            type="button"
            onClick={() => navigate('/login')}
            className="hover:text-[#635bff] inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </button>
          {mode === 'verify' && (
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="hover:text-[#635bff] transition-colors"
            >
              Forgot Password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

