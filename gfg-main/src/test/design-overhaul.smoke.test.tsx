import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityStream } from '@/components/ActivityStream';
import { CommandPalette } from '@/components/CommandPalette';
import { FeatureFlagWrapper } from '@/components/FeatureFlagWrapper';
import { LayoutSettings } from '@/components/LayoutSettings';
import { RuleBuilder } from '@/components/RuleBuilder';
import { SavedFiltersList } from '@/components/SavedFiltersList';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import { ThreePane } from '@/components/ThreePane';
import FolderTree from '@/components/ThreePane/FolderTree';
import CampaignListPane from '@/components/ThreePane/CampaignListPane';
import CampaignDetailPane from '@/components/ThreePane/CampaignDetailPane';

const folders = [
  {
    id: 'workspace',
    label: 'Workspace',
    count: 2,
    children: [
      { id: 'active', label: 'Active', count: 1 },
      { id: 'archived', label: 'Archived', count: 1 },
    ],
  },
];

const campaigns = [
  {
    id: 'camp-1',
    name: 'Spring nurture',
    subject: 'New campaign subject',
    owner: 'Ops team',
    status: 'Scheduled',
    updatedAt: 'Today',
    recipients: 2400,
    progress: 68,
    description: 'Welcome sequence for the current quarter.',
  },
];

describe('Design overhaul smoke tests', () => {
  it('renders the ThreePane layout stack without crashing', () => {
    render(
      <ThreePane
        folders={folders}
        campaigns={campaigns}
        selectedCampaignId="camp-1"
        onSelectCampaign={() => undefined}
        header={<div>Campaign hub</div>}
      />,
    );

    expect(screen.getByText('Campaign hub')).toBeInTheDocument();
    expect(screen.getByText('Spring nurture')).toBeInTheDocument();
  });

  it('renders individual design components without runtime errors', () => {
    const { rerender } = render(
      <>
        <FolderTree items={folders} selectedId="active" />
        <CampaignListPane campaigns={campaigns} selectedCampaignId="camp-1" onSelectCampaign={() => undefined} />
        <CampaignDetailPane campaign={campaigns[0]} />
        <LayoutSwitcher />
        <WorkspaceSwitcher value="growth" />
        <CommandPalette open items={[{ id: 'overview', title: 'Overview', category: 'Navigation' }]} />
        <LayoutSettings />
        <SavedFiltersList />
        <ActivityStream />
        <RuleBuilder />
      </>,
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Active queues')).toBeInTheDocument();
    expect(screen.getByText('Campaign summary')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Rule builder')).toBeInTheDocument();

    rerender(
      <FeatureFlagWrapper flagName="new-layout" fallback={<div>flag hidden</div>}>
        <div>flag visible</div>
      </FeatureFlagWrapper>,
    );

    expect(screen.getByText('flag visible')).toBeInTheDocument();
  });
});
