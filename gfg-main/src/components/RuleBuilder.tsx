import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface RuleBuilderProps {
  title?: string;
  conditions?: RuleCondition[];
  onChange?: (conditions: RuleCondition[]) => void;
  className?: string;
}

const defaultConditions: RuleCondition[] = [
  { id: '1', field: 'Intent score', operator: '>=', value: '80' },
  { id: '2', field: 'Role', operator: 'is', value: 'Decision maker' },
];

const operators = ['is', 'contains', '>=', '<=', '!='];

export function RuleBuilder({ title = 'Rule builder', conditions = defaultConditions, onChange, className }: RuleBuilderProps) {
  const [localConditions, setLocalConditions] = useState<RuleCondition[]>(conditions);

  const conditionSummary = useMemo(
    () => localConditions.map((condition) => `${condition.field} ${condition.operator} ${condition.value}`).join(' • '),
    [localConditions],
  );

  const updateConditions = (next: RuleCondition[]) => {
    setLocalConditions(next);
    onChange?.(next);
  };

  const handleFieldChange = (id: string, field: string) => {
    updateConditions(localConditions.map((condition) => (condition.id === id ? { ...condition, field } : condition)));
  };

  const handleOperatorChange = (id: string, operator: string) => {
    updateConditions(localConditions.map((condition) => (condition.id === id ? { ...condition, operator } : condition)));
  };

  const handleValueChange = (id: string, value: string) => {
    updateConditions(localConditions.map((condition) => (condition.id === id ? { ...condition, value } : condition)));
  };

  const addCondition = () => {
    updateConditions([...localConditions, { id: crypto.randomUUID ? crypto.randomUUID() : `condition-${Date.now()}`, field: 'Tag', operator: 'contains', value: 'priority' }]);
  };

  const removeCondition = (id: string) => {
    if (localConditions.length <= 1) return;
    updateConditions(localConditions.filter((condition) => condition.id !== id));
  };

  return (
    <Card className={cn('border-border/70 bg-card/80 shadow-sm', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg" onClick={addCondition}>
            <Plus className="h-3.5 w-3.5" />
            Add condition
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {localConditions.map((condition) => (
          <div key={condition.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center gap-2">
              <select
                aria-label="Select field"
                value={condition.field}
                onChange={(event) => handleFieldChange(condition.id, event.target.value)}
                className="w-36 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Intent score">Intent score</option>
                <option value="Role">Role</option>
                <option value="Industry">Industry</option>
                <option value="Tag">Tag</option>
                <option value="Source">Source</option>
              </select>

              <select
                aria-label="Select operator"
                value={condition.operator}
                onChange={(event) => handleOperatorChange(condition.id, event.target.value)}
                className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {operators.map((operator) => (
                  <option key={operator} value={operator}>
                    {operator}
                  </option>
                ))}
              </select>

              <input
                aria-label="Condition value"
                value={condition.value}
                onChange={(event) => handleValueChange(condition.id, event.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {localConditions.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCondition(condition.id)}
                  aria-label="Remove condition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-2 py-1 text-[10px] font-medium">Match all</Badge>
          {localConditions.map((condition) => (
            <Badge key={condition.id} variant="outline" className="rounded-full px-2 py-1 text-[10px] font-medium text-muted-foreground">
              {condition.field}
            </Badge>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {conditionSummary}
        </div>
      </CardContent>
    </Card>
  );
}

export default RuleBuilder;
