import React, { useMemo } from 'react';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

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
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      },
    ];
  }, [password]);

  const metCount = requirements.filter((r) => r.met).length;
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
    return 'Strong';
  };

  const getStrengthTextColor = () => {
    if (strengthPercentage === 0) return 'text-gray-500';
    if (strengthPercentage <= 40) return 'text-red-500';
    if (strengthPercentage <= 60) return 'text-yellow-600';
    if (strengthPercentage <= 80) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground">Password Strength</label>
          <span className={`text-xs font-bold ${getStrengthTextColor()}`}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getStrengthColor()} transition-all duration-300`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements */}
      {showRequirements && password && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-mono font-bold text-muted-foreground">
            Password Requirements
          </p>
          <div className="space-y-1">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 text-[11px] transition-colors ${
                  req.met ? 'text-green-600' : 'text-muted-foreground'
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

      {/* Validation Error */}
      {password && strengthPercentage < 100 && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">
            Your password must meet all requirements to ensure account security.
          </p>
        </div>
      )}

      {/* Success State */}
      {password && strengthPercentage === 100 && (
        <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-green-800">
            Great! Your password meets all security requirements.
          </p>
        </div>
      )}
    </div>
  );
}
