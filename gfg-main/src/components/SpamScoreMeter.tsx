import React, { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Check } from 'lucide-react';

interface SpamScoreMeterProps {
  subject: string;
  body: string;
  className?: string;
}

const SPAM_TRIGGER_WORDS = [
  '100% free', '100% satisfied', 'act now', 'apply now', 'as seen on', 'bargain',
  'be your own boss', 'best price', 'big bucks', 'billion dollars', 'bonus',
  'buy direct', 'buy now', 'cancel at any time', 'cash bonus', 'cash prize',
  'certified', 'cheap', 'claims', 'clearance', 'click below', 'click here',
  'compare rates', 'congratulations', 'credit card', 'cure', 'dear friend',
  'direct email', 'direct marketing', 'discount', 'double your income', 'earn extra cash',
  'earn money', 'eliminate debt', 'exclusive deal', 'expect to earn', 'extra income',
  'fast cash', 'financial freedom', 'free consultation', 'free gift', 'free info',
  'free membership', 'free money', 'free sample', 'free trial', 'full refund',
  'get out of debt', 'get paid', 'giveaway', 'guaranteed', 'hidden assets',
  'increase sales', 'instant', 'investment', 'join millions', 'limited time',
  'lowest price', 'make money', 'million dollars', 'miracle', 'money back',
  'mortgage rates', 'no catch', 'no cost', 'no credit check', 'no experience',
  'no fees', 'no gimmick', 'no hidden costs', 'no obligation', 'no purchase necessary',
  'no risk', 'no strings attached', 'not spam', 'off shore', 'once in a lifetime',
  'one time', 'online marketing', 'open immediately', 'opportunity', 'order now',
  'passwords', 'pennies a day', 'potential earnings', 'prize', 'promise',
  'pure profit', 'refund', 'remove', 'reverse aging', 'risk free',
  'save big', 'save money', 'satisfaction guaranteed', 'score', 'secret',
  'see for yourself', 'send $', 'special promotion', 'supplies are limited',
  'take action', 'terms and conditions', 'this isn\'t spam', 'unlimited',
  'unsolicited', 'urgent', 'valuable', 'viagra', 'vicodin', 'warranty',
  'while supplies last', 'win', 'winner', 'winning', 'work from home', 'you have been selected'
];

export function SpamScoreMeter({ subject, body, className = '' }: SpamScoreMeterProps) {
  const analysis = useMemo(() => {
    const combinedText = `${subject || ''} ${body || ''}`.toLowerCase();
    const plainText = combinedText.replace(/<[^>]*>?/gm, ' ');

    const detectedTriggers: string[] = [];

    for (const trigger of SPAM_TRIGGER_WORDS) {
      const regex = new RegExp(`\\b${trigger}\\b`, 'i');
      if (regex.test(plainText)) {
        detectedTriggers.push(trigger);
      }
    }

    // Check for excessive ALL CAPS words in subject
    const subjectWords = (subject || '').split(/\s+/).filter(w => w.length > 3);
    const allCapsCount = subjectWords.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w)).length;

    // Check for excessive exclamation marks
    const exclamationCount = (combinedText.match(/!/g) || []).length;

    // Calculate score (starts at 100)
    let deductions = 0;
    deductions += detectedTriggers.length * 8;
    if (allCapsCount > 0) deductions += allCapsCount * 10;
    if (exclamationCount > 2) deductions += (exclamationCount - 2) * 5;

    const score = Math.max(10, Math.min(100, 100 - deductions));

    let status: 'healthy' | 'caution' | 'critical' = 'healthy';
    if (score < 65) status = 'critical';
    else if (score < 85) status = 'caution';

    return {
      score,
      status,
      detectedTriggers,
      allCapsCount,
      exclamationCount
    };
  }, [subject, body]);

  return (
    <div className={`rounded-xl border p-3.5 bg-card/60 backdrop-blur-xs transition-all ${
      analysis.status === 'healthy' 
        ? 'border-emerald-500/20 bg-emerald-500/5' 
        : analysis.status === 'caution' 
          ? 'border-amber-500/20 bg-amber-500/5' 
          : 'border-destructive/20 bg-destructive/5'
    } ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {analysis.status === 'healthy' ? (
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : analysis.status === 'caution' ? (
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Deliverability Health</span>
              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                analysis.status === 'healthy'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : analysis.status === 'caution'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-destructive/20 text-destructive'
              }`}>
                {analysis.status === 'healthy' ? 'Optimal (Primary Inbox)' : analysis.status === 'caution' ? 'Caution (Spam Risk)' : 'High Risk (Spam Filter)'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={`text-base font-extrabold font-mono ${
            analysis.status === 'healthy'
              ? 'text-emerald-500'
              : analysis.status === 'caution'
                ? 'text-amber-500'
                : 'text-destructive'
          }`}>
            {analysis.score}/100
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mb-2.5">
        <div 
          className={`h-full transition-all duration-500 ${
            analysis.status === 'healthy'
              ? 'bg-emerald-500'
              : analysis.status === 'caution'
                ? 'bg-amber-500'
                : 'bg-destructive'
          }`}
          style={{ width: `${analysis.score}%` }}
        />
      </div>

      {/* Trigger Words Pills */}
      {analysis.detectedTriggers.length > 0 ? (
        <div className="space-y-1 pt-1">
          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            Detected {analysis.detectedTriggers.length} spam trigger {analysis.detectedTriggers.length === 1 ? 'phrase' : 'phrases'}:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {analysis.detectedTriggers.map((word) => (
              <span 
                key={word}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 font-medium"
              >
                "{word}"
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
          <Check className="h-3 w-3 text-emerald-500" />
          No spam trigger keywords found. Email copy is clean.
        </p>
      )}
    </div>
  );
}
