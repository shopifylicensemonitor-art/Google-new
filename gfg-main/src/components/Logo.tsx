import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
  subtitle = 'Outreach Console',
}) => {
  const sizeMap = {
    sm: { box: 'h-7 w-7 rounded-lg', icon: 'h-4 w-4', title: 'text-sm' },
    md: { box: 'h-9 w-9 rounded-xl', icon: 'h-5 w-5', title: 'text-base' },
    lg: { box: 'h-11 w-11 rounded-2xl', icon: 'h-6 w-6', title: 'text-lg' },
    xl: { box: 'h-14 w-14 rounded-2xl', icon: 'h-8 w-8', title: 'text-xl' },
  };

  const { box, title } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Brand Icon Badge */}
      <div className={`flex ${box} items-center justify-center shrink-0 bg-gradient-to-br from-[#635bff] via-indigo-600 to-emerald-500 text-white shadow-md shadow-[#635bff]/25 ring-1 ring-white/20 transition-transform hover:scale-105`}>
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-3/4 w-3/4 drop-shadow-sm"
        >
          <defs>
            <linearGradient id="peakLogoGrad" x1="20" y1="180" x2="180" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e0e7ff" />
            </linearGradient>
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Mountain / Peak geometry */}
          <polygon
            points="100,24 24,170 176,170"
            stroke="url(#peakLogoGrad)"
            strokeWidth="14"
            fill="none"
            strokeLinejoin="round"
            filter="url(#logoGlow)"
          />

          {/* X cross symbol */}
          <line
            x1="60"
            y1="70"
            x2="140"
            y2="150"
            stroke="url(#peakLogoGrad)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <line
            x1="140"
            y1="70"
            x2="60"
            y2="150"
            stroke="url(#peakLogoGrad)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Upward sending arrow tip on right peak */}
          <line
            x1="150"
            y1="95"
            x2="175"
            y2="32"
            stroke="#ffffff"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <polyline
            points="158,38 175,32 180,48"
            stroke="#ffffff"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex flex-col -space-y-0.5">
          <span className={`font-heading font-extrabold tracking-tight text-foreground ${title}`}>
            Peak Xender
          </span>
          {subtitle && (
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
