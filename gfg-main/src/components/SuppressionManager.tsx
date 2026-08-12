import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  ShieldAlert, ShieldCheck, Trash2, Plus, Search, Upload, 
  RefreshCw, FileText, Ban, AlertOctagon, CheckCircle2, UserX, Globe 
} from 'lucide-react';

interface SuppressionItem {
  id: number;
  type: string;
  value: string;
  reason: string;
  created_at: string;
}

export function SuppressionManager() {
  const [items, setItems] = useState<SuppressionItem[]>([]);
  const [stats, setStats] = useState({ total: 0, emails: 0, domains: 0 });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'email' | 'domain'>('all');

  // Single Add Modal / Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [addType, setAddType] = useState<'email' | 'domain'>('email');
  const [addReason, setAddReason] = useState('manual_block');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Bulk Import Modal / Form
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkReason, setBulkReason] = useState('bulk_import');
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.getSuppressionList(searchQuery, activeTypeFilter === 'all' ? undefined : activeTypeFilter),
        api.getSuppressionStats()
      ]);
      setItems(listRes.items || []);
      setStats(statsRes || { total: 0, emails: 0, domains: 0 });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load suppression list',
        description: err.message || 'Could not connect to server.'
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTypeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addValue.trim()) return;

    setSubmittingAdd(true);
    try {
      const res = await api.addSuppression({
        value: addValue,
        type: addType,
        reason: addReason
      });
      toast({
        title: 'Entry Blocked',
        description: res.message || `Added ${addValue} to suppression list.`
      });
      setAddValue('');
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to add suppression entry',
        description: err.message || 'Error saving blocklist entry.'
      });
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    setSubmittingBulk(true);
    try {
      const res = await api.bulkAddSuppression({
        entries: bulkText,
        defaultReason: bulkReason
      });
      toast({
        title: 'Bulk Import Completed',
        description: res.message
      });
      setBulkText('');
      setShowBulkModal(false);
      loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Bulk import failed',
        description: err.message || 'Error processing entries.'
      });
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleDelete = async (id: number, value: string) => {
    if (!confirm(`Are you sure you want to remove ${value} from the master suppression list?`)) return;

    try {
      await api.deleteSuppression(id);
      toast({
        title: 'Entry Unblocked',
        description: `Removed ${value} from suppression list.`
      });
      loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err.message
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#635bff]" />
            Master Suppression & Do-Not-Contact (DNC)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Global suppression list automatically blocking unsubscribed emails, competitor domains, and opt-outs across all campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkModal(true)}
            className="h-9 gap-1.5 rounded-xl border-border/60 hover:bg-muted/40 text-xs font-semibold"
          >
            <Upload className="h-3.5 w-3.5" />
            Bulk Import Blocklist
          </Button>

          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="h-9 gap-1.5 rounded-xl bg-[#635bff] text-white font-bold hover:bg-[#493ee5] text-xs shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Suppressed</span>
            <div className="text-2xl font-bold font-heading text-foreground mt-1">{stats.total}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#635bff]/10 flex items-center justify-between justify-center text-[#635bff]">
            <Ban className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Blocked Emails</span>
            <div className="text-2xl font-bold font-heading text-foreground mt-1">{stats.emails}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <UserX className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Blocked Domains</span>
            <div className="text-2xl font-bold font-heading text-foreground mt-1">{stats.domains}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <Globe className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search email, domain or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl border-border/60"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['all', 'email', 'domain'] as const).map((t) => (
              <Button
                key={t}
                variant={activeTypeFilter === t ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTypeFilter(t)}
                className={`h-8 px-3 rounded-xl text-xs font-bold uppercase tracking-wider ${
                  activeTypeFilter === t
                    ? 'bg-[#635bff] text-white'
                    : 'text-muted-foreground hover:bg-muted/40'
                }`}
              >
                {t === 'all' ? 'All Records' : t === 'email' ? 'Emails' : 'Domains'}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              disabled={loading}
              className="h-8 w-8 p-0 rounded-xl border-border/60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Suppression Items Table */}
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Blocked Email / Domain</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Added Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#635bff]" />
                    Loading suppression database...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-emerald-500/60" />
                    <p className="font-semibold text-foreground text-sm">No Suppressed Items Found</p>
                    <p className="text-xs text-muted-foreground mt-1">Your suppression list is clean or matches no active search query.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <Badge className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-lg ${
                        item.type === 'domain'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : 'bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20'
                      }`}>
                        {item.type}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {item.value}
                    </td>

                    <td className="py-3 px-4">
                      <span className="capitalize text-muted-foreground text-[11px] font-medium bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                        {item.reason.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id, item.value)}
                        className="h-7 w-7 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        title="Remove from suppression list"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Single Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/60 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                <Ban className="h-4 w-4 text-[#635bff]" />
                Add to Master Suppression List
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="h-7 w-7 p-0 rounded-lg text-muted-foreground"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleAddSingle} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={addType === 'email' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAddType('email')}
                    className={`h-9 rounded-xl text-xs font-bold ${addType === 'email' ? 'bg-[#635bff] text-white' : 'border-border/60'}`}
                  >
                    Specific Email
                  </Button>
                  <Button
                    type="button"
                    variant={addType === 'domain' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAddType('domain')}
                    className={`h-9 rounded-xl text-xs font-bold ${addType === 'domain' ? 'bg-[#635bff] text-white' : 'border-border/60'}`}
                  >
                    Entire Domain
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  {addType === 'email' ? 'Email Address' : 'Domain Name'}
                </label>
                <Input
                  type={addType === 'email' ? 'email' : 'text'}
                  placeholder={addType === 'email' ? 'optout@company.com' : 'competitor.com'}
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  required
                  className="h-10 text-xs rounded-xl border-border/60 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Suppression Reason
                </label>
                <select
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-border/60 bg-card text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                >
                  <option value="unsubscribed">Unsubscribed / Opted Out</option>
                  <option value="manual_block">Manual Admin Block</option>
                  <option value="competitor">Competitor / Internal Domain</option>
                  <option value="bounced">Hard Bounce / Invalid</option>
                  <option value="spam_complaint">Spam Complaint</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="h-9 px-4 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingAdd || !addValue.trim()}
                  className="h-9 px-5 rounded-xl bg-[#635bff] text-white font-bold hover:bg-[#493ee5] text-xs"
                >
                  {submittingAdd ? 'Saving...' : 'Add to Blocklist'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/60 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#635bff]" />
                Bulk Import Blocklist Entries
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBulkModal(false)}
                className="h-7 w-7 p-0 rounded-lg text-muted-foreground"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Paste Emails or Domains (One per line or comma-separated)
                </label>
                <textarea
                  rows={6}
                  placeholder={`user1@domain.com\nuser2@domain.com\ncompetitordomain.com\nspam-reporter.org`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  required
                  className="w-full p-3 text-xs font-mono rounded-xl border border-border/60 bg-muted/20 text-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Emails containing <code className="font-mono">@</code> will be blocked as specific accounts. Lines without <code className="font-mono">@</code> will be blocked as entire domain rules.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Default Reason
                </label>
                <select
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-border/60 bg-card text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                >
                  <option value="bulk_import">Bulk DNC Import</option>
                  <option value="unsubscribed">Historical Unsubscribes</option>
                  <option value="competitor">Competitor Domains</option>
                  <option value="bounced">Hard Bounce List</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBulkModal(false)}
                  className="h-9 px-4 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingBulk || !bulkText.trim()}
                  className="h-9 px-5 rounded-xl bg-[#635bff] text-white font-bold hover:bg-[#493ee5] text-xs"
                >
                  {submittingBulk ? 'Importing...' : 'Start Bulk Import'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
