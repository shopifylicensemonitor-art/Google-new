import React, { useMemo } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

export default function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
  const requirements: PasswordRequirement[] = useMemo(() => {
    return [
      {
        label: 'At least 8 characters',
        met: password.length >= 8,
      },
      {
        label: 'One uppercase letter (A-Z)',
        met: /[A-Z]/.test(password),
      },
      {
        label: 'One lowercase letter (a-z)',
        met: /[a-z]/.test(password),
      },
      {
        label: 'One number (0-9)',
        met: /[0-9]/.test(password),
      },
      {
        label: 'One special character (!@#$%^&*)',
        met: /[!@#$%^&*()_+\-={};':"\\|,.<>/?]/.test(password),
      },
    ];
  }, [password]);

  const metCount = requirements.filter((r) => r.met).length;
  const isAllMet = metCount === requirements.length;
  const strengthPercentage = (metCount / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage === 0) return 'bg-gray-300';
    if (strengthPercentage <= 40) return 'bg-red-500';
    if (strengthPercentage <= 60) return 'bg-yellow-500';
    if (strengthPercentage <= 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strengthPercentage === 0) return 'No requirements met';
    if (strengthPercentage <= 40) return 'Weak';
    if (strengthPercentage <= 60) return 'Fair';
    if (strengthPercentage <= 80) return 'Good';
    return 'Strong ✓';
  };

  const getStrengthTextColor = () => {
    if (strengthPercentage === 0) return 'text-gray-500';
    if (strengthPercentage <= 40) return 'text-red-500';
    if (strengthPercentage <= 60) return 'text-yellow-600';
    if (strengthPercentage <= 80) return 'text-blue-600';
    return 'text-green-500';
  };

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground">Password Strength</label>
          <span className={`text-[11px] font-bold ${getStrengthTextColor()}`}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${getStrengthColor()} transition-all duration-300`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements List - ONLY shown when requirements are NOT yet fully met */}
      {showRequirements && !isAllMet && (
        <div className="space-y-1.5 p-2.5 bg-muted/40 rounded-xl border border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[10px] uppercase font-mono font-bold text-muted-foreground">
            Password Requirements
          </p>
          <div className="space-y-1">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 text-[11px] transition-colors ${
                  req.met ? 'text-green-500 line-through opacity-70' : 'text-muted-foreground'
                }`}
              >
                {req.met ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                )}
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
