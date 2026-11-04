// src/app/pages/BusinessPage.tsx

import React from 'react';
import { BusinessAnalyticsPage } from './business/BusinessAnalyticsPage.tsx';
import { BusinessReportsPage } from './business/BusinessReportsPage.tsx';
import { BusinessOverviewPage } from './business/BusinessOverviewPage.tsx';

export interface BusinessPageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function BusinessPage({ currentPath = '/business', onNavigate }: BusinessPageProps) {
  if (currentPath === '/business/reports' || currentPath.startsWith('/business/reports')) {
    return <BusinessReportsPage onNavigate={onNavigate} />;
  }

  if (currentPath === '/business/analytics' || currentPath.startsWith('/business/analytics')) {
    return <BusinessAnalyticsPage onNavigate={onNavigate} />;
  }

  return <BusinessOverviewPage onNavigate={onNavigate} />;
}
