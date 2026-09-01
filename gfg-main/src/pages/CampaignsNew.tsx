import { useEffect, useMemo, useState } from 'react';
import { ThreePane } from '@/components/ThreePane';
import type { CampaignItem, FolderTreeItem } from '@/components/ThreePane/types';

const folders: FolderTreeItem[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    count: 3,
    children: [
      { id: 'active', label: 'Active campaigns', count: 2, isActive: true },
      { id: 'drafts', label: 'Drafts', count: 5 },
      { id: 'scheduled', label: 'Scheduled', count: 3 },
    ],
  },
  {
    id: 'teams',
    label: 'Teams',
    children: [
      { id: 'sales', label: 'Sales', count: 8 },
      { id: 'success', label: 'Customer success', count: 4 },
    ],
  },
  {
    id: 'archives',
    label: 'Archives',
    count: 12,
  },
];

const campaigns: CampaignItem[] = [
  {
    id: 'campaign-1',
    name: 'Spring launch sequence',
    subject: 'New feature rollout for product-led teams',
    owner: 'Maya Chen',
    status: 'Running',
    updatedAt: '2h ago',
    recipients: 18240,
    progress: 72,
    description: 'A product-focused outreach flow for early access invites and feature education across inbound-sourced accounts.',
  },
  {
    id: 'campaign-2',
    name: 'West coast SDR refresher',
    subject: 'Re-engage priority accounts with a lighter touch',
    owner: 'Jordan Cole',
    status: 'Scheduled',
    updatedAt: 'Today',
    recipients: 6400,
    progress: 36,
    description: 'Follow-up schedule tuned for decision-makers in account expansion and customer retention programs.',
  },
  {
    id: 'campaign-3',
    name: 'Partner nurture',
    subject: 'Warm introductions and channel growth loop',
    owner: 'Sofia Patel',
    status: 'Paused',
    updatedAt: 'Yesterday',
    recipients: 9100,
    progress: 58,
    description: 'Referral-driven campaign for marketing partners and reseller outreach with staging and review checkpoints.',
  },
  {
    id: 'campaign-4',
    name: 'Enterprise reactivation',
    subject: 'Win-back motion for dormant accounts',
    owner: 'Theo Harris',
    status: 'Draft',
    updatedAt: '3d ago',
    recipients: 14500,
    progress: 14,
    description: 'A reactivation funnel for large customer accounts with a stronger proof-and-ROI narrative.',
  },
];

export default function CampaignsNew() {
  const [selectedId, setSelectedId] = useState<string>('campaign-2');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('peak-xender-three-pane-enabled', 'true');
    }
  }, []);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0],
    [selectedId],
  );

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <ThreePane
        folders={folders}
        campaigns={campaigns}
        selectedCampaignId={selectedCampaign?.id}
        onSelectCampaign={(campaign) => setSelectedId(campaign.id)}
        header={
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Campaign operations
          </div>
        }
      />
    </div>
  );
}
