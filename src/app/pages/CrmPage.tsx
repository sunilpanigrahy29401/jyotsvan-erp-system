import React from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  Building2, 
  TrendingUp, 
  CheckSquare, 
  Share2 
} from 'lucide-react';
import { CrmOverview } from './crm/CrmOverview';
import { LeadManagement } from './crm/LeadManagement';
import { AccountsAndContacts } from './crm/AccountsAndContacts';
import { DealsPipeline } from './crm/DealsPipeline';
import { ActivitiesAndEngagement } from './crm/ActivitiesAndEngagement';
import { LeadCaptureIntegrations } from './crm/LeadCaptureIntegrations';

interface CrmPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const CrmPage: React.FC<CrmPageProps> = ({ currentPath, onNavigate }) => {
  // Normalize sub-path
  // Supported routes:
  // /crm, /crm/overview -> CrmOverview
  // /crm/leads -> LeadManagement
  // /crm/accounts -> AccountsAndContacts
  // /crm/deals -> DealsPipeline
  // /crm/activities -> ActivitiesAndEngagement
  // /crm/integrations -> LeadCaptureIntegrations

  let activeSubTab = 'overview';
  if (currentPath.includes('/crm/leads')) {
    activeSubTab = 'leads';
  } else if (currentPath.includes('/crm/accounts')) {
    activeSubTab = 'accounts';
  } else if (currentPath.includes('/crm/deals')) {
    activeSubTab = 'deals';
  } else if (currentPath.includes('/crm/activities')) {
    activeSubTab = 'activities';
  } else if (currentPath.includes('/crm/integrations')) {
    activeSubTab = 'integrations';
  }

  const tabs = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard, path: '/crm/overview' },
    { id: 'leads', label: 'Lead Management', icon: UserCheck, path: '/crm/leads' },
    { id: 'accounts', label: 'Accounts & Contacts', icon: Building2, path: '/crm/accounts' },
    { id: 'deals', label: 'Deals & Pipeline', icon: TrendingUp, path: '/crm/deals' },
    { id: 'activities', label: 'Activities & Engagement', icon: CheckSquare, path: '/crm/activities' },
    { id: 'integrations', label: 'Lead Capture & APIs', icon: Share2, path: '/crm/integrations' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Secondary Sub-Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto py-2.5">
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onNavigate(tab.path)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main CRM Body Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeSubTab === 'overview' && <CrmOverview onNavigate={onNavigate} />}
        {activeSubTab === 'leads' && <LeadManagement onNavigate={onNavigate} />}
        {activeSubTab === 'accounts' && <AccountsAndContacts onNavigate={onNavigate} />}
        {activeSubTab === 'deals' && <DealsPipeline onNavigate={onNavigate} />}
        {activeSubTab === 'activities' && <ActivitiesAndEngagement onNavigate={onNavigate} />}
        {activeSubTab === 'integrations' && <LeadCaptureIntegrations onNavigate={onNavigate} />}
      </div>
    </div>
  );
};
export default CrmPage;
