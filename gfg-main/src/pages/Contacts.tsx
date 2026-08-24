import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api, type ContactListInfo, type Contact } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { RecentSearchInput } from '@/components/RecentSearchInput';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { 
  Users, Upload, Trash2, Plus, UserPlus, Search, ListFilter, 
  AlertTriangle, FileSpreadsheet, Info, History, Mail, MessageSquare, 
  CheckCircle2, X, Clock, RefreshCw, Building2, Phone, MapPin, 
  ChevronLeft, ChevronRight, MoreVertical, Edit, Send, PauseCircle, 
  Tag, Globe, User, SlidersHorizontal, ArrowLeft, Copy, ExternalLink,
  Check, Sparkles, Filter, ShieldCheck, Flame, HelpCircle, ShieldAlert, Ban
} from 'lucide-react';
import { SuppressionManager } from '@/components/SuppressionManager';

interface ContactsProps {
  requirePin?: (label: string, action: () => void) => void;
}

export default function Contacts({ requirePin }: ContactsProps) {
  const [activeMainTab, setActiveMainTab] = useState<'contacts' | 'suppression'>('contacts');
  const [lists, setLists] = useState<ContactListInfo[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingLists, setLoadingLists] = useState<boolean>(false);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  
  // Modals
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // CSV Import State
  const [newListName, setNewListName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Manual Contact Entry State
  const [manualEmail, setManualEmail] = useState<string>('');
  const [manualName, setManualName] = useState<string>('');
  const [manualCompany, setManualCompany] = useState<string>('');
  const [manualTitle, setManualTitle] = useState<string>('');
  const [addingManual, setAddingManual] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('a-z');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [syncingQueue, setSyncingQueue] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Contact 3-Pane Detail State
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [detailHistory, setDetailHistory] = useState<{
    sends: any[];
    logs: any[];
    replies: any[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'overview' | 'activity' | 'campaigns'>('overview');

  const loadLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const data = await api.getContactLists();
      setLists(data);
      if (data.length > 0 && !selectedList) {
        setSelectedList(data[0].list_name);
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading contact lists',
        description: e.message || 'Could not fetch list statistics.'
      });
    } finally {
      setLoadingLists(false);
    }
  }, [selectedList]);

  const loadContacts = async (listName: string) => {
    setLoadingContacts(true);
    try {
      const data = await api.getContacts(listName);
      setContacts(data);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: `Error loading contacts for "${listName}"`,
        description: e.message
      });
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (selectedList) {
      loadContacts(selectedList);
      setCurrentPage(1);
      setSelectedIds([]);
    } else {
      setContacts([]);
    }
  }, [selectedList]);

  const handleOpenDetail = async (contact: Contact) => {
    setDetailContact(contact);
    setLoadingDetail(true);
    try {
      const data = await api.getContactHistory(contact.email);
      setDetailHistory(data);
    } catch (err: any) {
      setDetailHistory({ sends: [], logs: [], replies: [] });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      if (!newListName) {
        const baseName = e.target.files[0].name.replace(/\.[^/.]+$/, "");
        setNewListName(baseName.replace(/[^a-zA-Z0-9_\-\s]/g, ''));
      }
    }
  };

  const handleUploadCSV = () => {
    const action = async () => {
      if (!selectedFile || !newListName.trim()) {
        toast({
          variant: 'destructive',
          title: 'Missing upload fields',
          description: 'Provide a list name and choose a CSV file.'
        });
        return;
      }

      setUploading(true);
      try {
        toast({
          title: 'Parsing and uploading CSV...',
          description: 'This may take a moment for larger spreadsheets.'
        });
        const res = await api.uploadContacts(newListName.trim(), selectedFile);
        toast({
          title: 'CSV uploaded successfully',
          description: `Added ${res.added} contacts. Skipped ${res.skipped} duplicates.`
        });
        
        setSelectedFile(null);
        setNewListName('');
        setShowImportModal(false);

        setSelectedList(newListName.trim());
        await loadLists();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'CSV upload failed',
          description: e.message || 'Check CSV layout is valid.'
        });
      } finally {
        setUploading(false);
      }
    };

    if (requirePin) {
      requirePin('import contact list', action);
    } else {
      action();
    }
  };

  const handleAddManual = async () => {
    if (!selectedList) {
      toast({
        variant: 'destructive',
        title: 'No list selected',
        description: 'Choose or upload a list before manually adding individual emails.'
      });
      return;
    }

    if (!manualEmail.trim() || !manualEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email Address',
        description: 'Enter a valid email address.'
      });
      return;
    }

    setAddingManual(true);
    try {
      await api.addContact(selectedList, manualEmail.trim());
      toast({
        title: 'Contact added',
        description: `Successfully added ${manualEmail} to "${selectedList}".`
      });
      setManualEmail('');
      setManualName('');
      setManualCompany('');
      setManualTitle('');
      setShowAddModal(false);
      loadContacts(selectedList);
      loadLists();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding contact',
        description: e.message
      });
    } finally {
      setAddingManual(false);
    }
  };

  const handleDeleteList = (listName: string) => {
    const action = async () => {
      if (!window.confirm(`Permanently delete the entire contact list "${listName}"? This action is irreversible.`)) return;
      try {
        await api.deleteContactList(listName);
        toast({
          title: 'List deleted',
          description: `"${listName}" and all its recipients were removed.`
        });
        
        if (selectedList === listName) {
          setSelectedList(null);
        }
        loadLists();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error deleting list',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('delete list of contacts', action);
    } else {
      action();
    }
  };

  const handleDeleteSingle = (id: number, email: string) => {
    const action = async () => {
      if (!selectedList) return;
      if (!window.confirm(`Remove email "${email}" from list "${selectedList}"?`)) return;
      try {
        await api.deleteContact(selectedList, id);
        toast({
          title: 'Contact removed',
          description: `${email} was deleted.`
        });
        loadContacts(selectedList);
        loadLists();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error deleting contact',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('delete individual contact', action);
    } else {
      action();
    }
  };

  const handleSyncQueue = async () => {
    setSyncingQueue(true);
    try {
      const res = await api.syncContacts();
      toast({
        title: 'Background Sync Complete',
        description: `Synced ${res.syncedCampaigns} campaign(s) and queued ${res.newlyQueuedContacts} contact(s).`,
      });
      if (selectedList) {
        loadContacts(selectedList);
      }
      loadLists();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: e.message || 'Could not execute background sync.'
      });
    } finally {
      setSyncingQueue(false);
    }
  };

  // Helper functions to get clean contact metadata
  const getContactName = (c: Contact) => {
    if (c.fields?.name) return c.fields.name;
    if (c.fields?.first_name || c.fields?.last_name) {
      return `${c.fields.first_name || ''} ${c.fields.last_name || ''}`.trim();
    }
    const namePart = c.email.split('@')[0];
    return namePart.split('.')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || c.email;
  };

  const getContactCompany = (c: Contact) => {
    if (c.fields?.company) return c.fields.company;
    if (c.fields?.store_name) return c.fields.store_name;
    const domain = c.email.split('@')[1] || '';
    const base = domain.split('.')[0];
    if (['gmail', 'yahoo', 'hotmail', 'outlook'].includes(base.toLowerCase())) {
      return 'Independent';
    }
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  const getInitials = (c: Contact) => {
    try {
      const name = String(getContactName(c) || c.email || 'CP').trim();
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      if (name.length >= 2) {
        return name.substring(0, 2).toUpperCase();
      }
      return (name[0] || 'C').toUpperCase();
    } catch {
      return 'CP';
    }
  };

  // Filter contacts by query, domain, industry, and status
  const filteredContacts = contacts.filter(c => {
    const name = getContactName(c).toLowerCase();
    const company = getContactCompany(c).toLowerCase();
    const email = c.email.toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      const matches = email.includes(q) || name.includes(q) || company.includes(q);
      if (!matches) return false;
    }

    if (statusFilter !== 'all') {
      const currentStatus = c.status || 'pending';
      if (statusFilter !== currentStatus) return false;
    }

    if (domainFilter !== 'all') {
      const domain = c.email.split('@')[1]?.toLowerCase() || '';
      if (domainFilter === 'gmail.com' && !domain.includes('gmail')) return false;
      if (domainFilter === 'yahoo.com' && !domain.includes('yahoo')) return false;
      if (domainFilter === 'outlook.com' && !domain.includes('outlook') && !domain.includes('hotmail')) return false;
      if (domainFilter === 'corporate' && (domain.includes('gmail') || domain.includes('yahoo') || domain.includes('outlook') || domain.includes('hotmail'))) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortOrder === 'a-z') return getContactName(a).localeCompare(getContactName(b));
    if (sortOrder === 'z-a') return getContactName(b).localeCompare(getContactName(a));
    if (sortOrder === 'newest') return b.id - a.id;
    return a.id - b.id;
  });

  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;
  const paginatedContacts = filteredContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0 || !selectedList) return;
    const action = async () => {
      if (!window.confirm(`Permanently remove ${selectedIds.length} selected contacts from "${selectedList}"?`)) return;
      try {
        await Promise.all(selectedIds.map(id => api.deleteContact(selectedList, id)));
        toast({
          title: 'Contacts removed',
          description: `Deleted ${selectedIds.length} contact(s).`
        });
        setSelectedIds([]);
        loadContacts(selectedList);
        loadLists();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error deleting contacts',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('bulk delete contacts', action);
    } else {
      action();
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'sent':
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Active
          </span>
        );
      case 'sending':
      case 'queued':
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-xs border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {status === 'sending' ? 'Sending' : status === 'queued' ? 'Queued' : 'Paused'}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium text-xs border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Failed
          </span>
        );
      case 'unsubscribed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium text-xs border border-border/60">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
            Unsubscribed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-xs border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            Pending
          </span>
        );
    }
  };

  return (
    <AppShell>
      <SEO
        title="Contacts | Outreach Marketing Workspace"
        description="Manage and organize your outreach prospects with enriched lead dossiers, campaign timelines, and CSV imports."
      />

      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header Area */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Contacts & List Hygiene
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-sans">
              Manage your prospect lists, lead dossiers, and master suppression blocklists.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/60 mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveMainTab('contacts')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 ${
                  activeMainTab === 'contacts'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-3.5 w-3.5 text-[#635bff]" />
                Contact Lists ({lists.reduce((acc, l) => acc + (l.count || 0), 0)})
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveMainTab('suppression')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 ${
                  activeMainTab === 'suppression'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                Master Suppression List
              </Button>
            </div>

            {activeMainTab === 'contacts' && (
              <>
                <Button
                  onClick={() => setShowImportModal(true)}
                  variant="outline"
                  className="h-9 px-3.5 text-xs font-semibold gap-2 border-border/80 bg-card hover:bg-muted rounded-xl"
                >
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  Import CSV
                </Button>

                <Button
                  onClick={() => setShowAddModal(true)}
                  className="h-9 px-3.5 text-xs font-bold gap-2 bg-[#635bff] hover:bg-[#493ee5] text-white shadow-sm rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Contact
                </Button>
              </>
            )}
          </div>
        </header>

        {activeMainTab === 'suppression' ? (
          <SuppressionManager />
        ) : (
          <>

        {/* Filters & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 shadow-xs">
          {/* Search Input */}
          <RecentSearchInput
            storageKey="contacts_search_history"
            placeholder="Search contacts by name, email, or company..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff] transition-all"
            containerClassName="relative w-full md:max-w-md"
            iconClassName="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />

          {/* Quick Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-[#635bff]"
            >
              <option value="all">Domain: All</option>
              <option value="gmail.com">Gmail</option>
              <option value="yahoo.com">Yahoo</option>
              <option value="outlook.com">Outlook / Hotmail</option>
              <option value="corporate">Corporate Domains</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-[#635bff]"
            >
              <option value="all">Status: All</option>
              <option value="sent">Active / Sent</option>
              <option value="queued">Queued / Sending</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-[#635bff]"
            >
              <option value="a-z">Sort: Name (A-Z)</option>
              <option value="z-a">Sort: Name (Z-A)</option>
              <option value="newest">Sort: Newly Added</option>
            </select>

            <Button
              onClick={handleSyncQueue}
              disabled={syncingQueue}
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-border/60 bg-background hover:bg-muted"
              title="Sync contacts with active queues"
            >
              <RefreshCw className={`h-4 w-4 ${syncingQueue ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Contact Lists Divisions Tabs */}
        <div className="bg-card p-3 rounded-xl border border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground px-1">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#635bff]" /> Target Contact Divisions
            </span>
            {lists.length > 0 && (
              <span className="text-muted-foreground text-[11px]">
                {lists.length} division(s) available
              </span>
            )}
          </div>

          {loadingLists ? (
            <p className="text-xs text-muted-foreground text-center py-2">Loading list divisions...</p>
          ) : lists.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              No contact lists found. Click <strong>Import CSV</strong> to create your first division.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {lists.map((list) => {
                const isSelected = selectedList === list.list_name;
                return (
                  <div
                    key={list.list_name}
                    onClick={() => setSelectedList(list.list_name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-[#635bff]/10 text-[#635bff] border-[#635bff]/40 font-bold shadow-2xs'
                        : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
                    }`}
                  >
                    <span>{list.list_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-[#635bff] text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {list.count}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteList(list.list_name);
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                      title="Delete list"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data Table Area */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-2xs">
          {selectedIds.length > 0 && (
            <div className="bg-[#635bff]/10 px-4 py-2 border-b border-[#635bff]/20 flex items-center justify-between text-xs">
              <span className="font-bold text-[#635bff]">
                {selectedIds.length} contact(s) selected
              </span>
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                size="sm"
                className="h-7 text-[11px] font-bold gap-1"
              >
                <Trash2 className="h-3 w-3" /> Delete Selected
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={filteredContacts.length > 0 && selectedIds.length === filteredContacts.length}
                      onChange={handleSelectAll}
                      className="rounded border-border/80 text-[#635bff] focus:ring-[#635bff] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-heading text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="py-3 px-4 font-heading text-xs font-semibold text-muted-foreground">Email</th>
                  <th className="py-3 px-4 font-heading text-xs font-semibold text-muted-foreground">Company</th>
                  <th className="py-3 px-4 font-heading text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="py-3 px-4 font-heading text-xs font-semibold text-muted-foreground">Tags</th>
                  <th className="py-3 px-4 font-heading text-xs font-semibold text-muted-foreground text-right">Last Activity</th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {loadingContacts ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#635bff]" />
                      Loading contact list data...
                    </td>
                  </tr>
                ) : paginatedContacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No contacts found matching your current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedContacts.map((c) => {
                    const name = getContactName(c);
                    const company = getContactCompany(c);
                    const initials = getInitials(c);
                    const isSelected = selectedIds.includes(c.id);

                    return (
                      <tr
                        key={c.id}
                        onClick={() => handleOpenDetail(c)}
                        className={`hover:bg-muted/40 transition-colors cursor-pointer group ${
                          isSelected ? 'bg-[#635bff]/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(c.id)}
                            className="rounded border-border/80 text-[#635bff] focus:ring-[#635bff] cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20 flex items-center justify-center font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <span className="font-semibold text-foreground group-hover:text-[#635bff] transition-colors">
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {c.email}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {company}
                        </td>
                        <td className="py-3 px-4">
                          {renderStatusBadge(c.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {c.fields && Object.keys(c.fields).length > 0 ? (
                              Object.entries(c.fields).slice(0, 2).map(([k, v]) => (
                                <span key={k} className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-sans text-[10px] font-medium border border-border/40 truncate max-w-[120px]">
                                  {k}: {String(v)}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-sans text-[10px] font-medium border border-border/40">
                                {c.list_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                          {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : 'Recent'}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenDetail(c)}
                            className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p className="text-muted-foreground">
              Showing {filteredContacts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredContacts.length)} of {filteredContacts.length} entries
            </p>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(page => (
                <Button
                  key={page}
                  size="sm"
                  variant={currentPage === page ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 p-0 font-semibold text-xs ${
                    currentPage === page ? 'bg-[#635bff] text-white' : ''
                  }`}
                >
                  {page}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </>
      )}
      </div>

      {/* 3-Pane Enriched Contact Dossier Modal / Drawer */}
      {detailContact && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-[9999] p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 bg-muted/30 border-b border-border/60 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20 flex items-center justify-center font-bold text-base shrink-0">
                  {getInitials(detailContact)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-heading text-sm sm:text-lg font-bold text-foreground truncate">
                      {getContactName(detailContact)}
                    </h2>
                    {renderStatusBadge(detailContact.status)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {detailContact.fields?.title || detailContact.fields?.role || 'Contact'} at <strong className="text-foreground">{getContactCompany(detailContact)}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailContact(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mobile Tabs Control */}
            <div className="flex sm:hidden border-b border-border/60 bg-muted/20 p-1">
              <button
                onClick={() => setMobileTab('overview')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md ${mobileTab === 'overview' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setMobileTab('activity')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md ${mobileTab === 'activity' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'}`}
              >
                Activity
              </button>
              <button
                onClick={() => setMobileTab('campaigns')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md ${mobileTab === 'campaigns' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'}`}
              >
                Campaigns
              </button>
            </div>

            {/* 3-Pane Container */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Pane 1: Contact Info & Tags (col-span-4) */}
              <div className={`lg:col-span-4 space-y-4 ${mobileTab !== 'overview' ? 'hidden sm:block' : 'block'}`}>
                <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-3">
                  <h3 className="font-heading text-xs font-bold text-foreground border-b border-border/40 pb-2 uppercase tracking-wider">
                    Contact Details
                  </h3>
                  
                  <div className="space-y-2.5 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Email Address</span>
                      <a href={`mailto:${detailContact.email}`} className="text-[#635bff] font-mono hover:underline break-all block">
                        {detailContact.email}
                      </a>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Phone</span>
                      <p className="font-medium text-foreground">
                        {detailContact.fields?.phone || detailContact.fields?.mobile || detailContact.fields?.telephone || 'Not provided'}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Location</span>
                      <p className="font-medium text-foreground">
                        {detailContact.fields?.location || detailContact.fields?.city || detailContact.fields?.country || 'Not specified'}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">List Division</span>
                      <p className="font-medium text-foreground">{detailContact.list_name}</p>
                    </div>

                    {detailContact.fields?.website && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Website</span>
                        <a href={detailContact.fields.website.startsWith('http') ? detailContact.fields.website : `https://${detailContact.fields.website}`} target="_blank" rel="noreferrer" className="text-[#635bff] hover:underline flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {detailContact.fields.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Fields & Tags */}
                <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-2">
                  <h3 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
                    Custom Properties &amp; Fields
                  </h3>
                  {detailContact.fields && Object.keys(detailContact.fields).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(detailContact.fields).map(([k, v]) => (
                        <div key={k} className="px-2 py-1 bg-card border border-border/60 rounded-md text-[11px] font-medium text-muted-foreground">
                          <strong className="text-foreground">{k}:</strong> {String(v)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No custom fields associated with this contact.</p>
                  )}
                </div>
              </div>

              {/* Pane 2: Activity Timeline (col-span-5) */}
              <div className={`lg:col-span-5 bg-card border border-border/60 rounded-xl p-4 flex flex-col ${mobileTab !== 'activity' ? 'hidden sm:block' : 'block'}`}>
                <h3 className="font-heading text-xs font-bold text-foreground border-b border-border/40 pb-2 mb-4 uppercase tracking-wider flex items-center justify-between">
                  <span>Outreach Activity Timeline</span>
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                </h3>

                {loadingDetail ? (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#635bff]" />
                    Loading activity history...
                  </div>
                ) : !detailHistory || (detailHistory.sends.length === 0 && detailHistory.logs.length === 0 && detailHistory.replies.length === 0) ? (
                  <div className="text-center py-12 text-muted-foreground text-xs space-y-1">
                    <Mail className="h-6 w-6 mx-auto opacity-30 text-[#635bff]" />
                    <p className="font-semibold text-foreground">No Outreach History</p>
                    <p className="text-[11px]">Sends, delivery events, and replies will appear here once this contact is enrolled in campaigns.</p>
                  </div>
                ) : (
                  <div className="space-y-4 relative pl-4 border-l-2 border-border/60 max-h-[380px] overflow-y-auto pr-1">
                    {/* Replies */}
                    {detailHistory.replies.map((reply: any) => (
                      <div key={`reply-${reply.id}`} className="relative">
                        <div className="absolute -left-[23px] top-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                          <MessageSquare className="h-3 w-3" />
                        </div>
                        <div className="p-3 bg-muted/30 border border-border/60 rounded-xl text-xs space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span className="font-bold text-emerald-600">Reply Received</span>
                            <span>{new Date(reply.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-xs font-semibold text-foreground">{reply.subject || 'Re: Outreach'}</p>
                          <p className="text-muted-foreground bg-card p-2 rounded border border-border/40 text-[11px] line-clamp-3">
                            {reply.body_plain || reply.body_html?.replace(/<[^>]*>/g, '') || 'Message content received.'}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Sends */}
                    {detailHistory.sends.map((send: any) => (
                      <div key={`send-${send.id}`} className="relative">
                        <div className="absolute -left-[23px] top-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                          <Send className="h-3 w-3" />
                        </div>
                        <div className="p-3 bg-muted/30 border border-border/60 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span className="font-bold text-foreground">Campaign Email ({send.status})</span>
                            <span>{send.scheduled_at ? new Date(send.scheduled_at).toLocaleString() : 'Queued'}</span>
                          </div>
                          <p className="text-foreground font-semibold text-[11px]">
                            {send.campaign_name || `Campaign #${send.campaign_id}`}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Logs */}
                    {detailHistory.logs.map((log: any) => (
                      <div key={`log-${log.id}`} className="relative">
                        <div className="absolute -left-[23px] top-0 w-6 h-6 rounded-full bg-muted border border-border/60 flex items-center justify-center text-muted-foreground">
                          <Info className="h-3 w-3" />
                        </div>
                        <div className="p-2.5 bg-muted/20 border border-border/40 rounded-xl text-xs space-y-0.5">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span className="font-medium text-foreground">{log.status}</span>
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{log.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pane 3: Campaign Context (col-span-3) */}
              <div className={`lg:col-span-3 space-y-4 ${mobileTab !== 'campaigns' ? 'hidden sm:block' : 'block'}`}>
                <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-3">
                  <h3 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">
                    Enrolled Campaigns
                  </h3>

                  {detailHistory?.sends && detailHistory.sends.length > 0 ? (
                    <div className="space-y-2">
                      {Array.from(new Set(detailHistory.sends.map((s: any) => s.campaign_id))).map((campId: any) => {
                        const campSend = detailHistory.sends.find((s: any) => s.campaign_id === campId);
                        return (
                          <div key={campId} className="p-3 bg-card border border-border/60 rounded-xl space-y-1">
                            <div className="flex justify-between items-start text-xs">
                              <h4 className="font-bold text-foreground truncate">{campSend?.campaign_name || `Campaign #${campId}`}</h4>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold capitalize bg-primary/10 text-primary">
                                {campSend?.status || 'Active'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Not enrolled in any campaigns yet.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Import CSV Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-[9999] p-4">
          <div className="bg-card border border-border/80 shadow-xl rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#635bff]" /> Import CSV Contact List
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Contact Division Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Enterprise Prospects"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-xs focus:ring-1 focus:ring-[#635bff]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">CSV Spreadsheet File</label>
                <div className="border-2 border-dashed border-border/80 rounded-xl p-6 text-center hover:bg-muted/30 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-[#635bff]" />
                  <span className="text-xs font-semibold text-foreground block truncate">
                    {selectedFile ? selectedFile.name : 'Click to select CSV file'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="ghost" onClick={() => setShowImportModal(false)} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button
                onClick={handleUploadCSV}
                disabled={uploading || !selectedFile || !newListName.trim()}
                className="text-xs font-bold bg-[#635bff] text-white hover:bg-[#493ee5]"
              >
                {uploading ? 'Uploading...' : 'Import Recipients'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Single Contact Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-[9999] p-4">
          <div className="bg-card border border-border/80 shadow-xl rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#635bff]" /> Add Contact Manually
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Email Address *</label>
                <input
                  type="email"
                  placeholder="eleanor@acmecorp.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-xs focus:ring-1 focus:ring-[#635bff]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Target Division</label>
                <select
                  value={selectedList || ''}
                  onChange={(e) => setSelectedList(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-xs focus:ring-1 focus:ring-[#635bff]"
                >
                  {lists.map(l => (
                    <option key={l.list_name} value={l.list_name}>{l.list_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="ghost" onClick={() => setShowAddModal(false)} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button
                onClick={handleAddManual}
                disabled={addingManual || !manualEmail.trim() || !selectedList}
                className="text-xs font-bold bg-[#635bff] text-white hover:bg-[#493ee5]"
              >
                {addingManual ? 'Adding...' : 'Add Contact'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppShell>
  );
}
