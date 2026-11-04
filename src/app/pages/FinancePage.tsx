import React from 'react';
import { SalesOrderModule } from './sales-orders/SalesOrderModule';
import { FinanceModule } from './finance/FinanceModule';

export interface FinancePageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function FinancePage({ currentPath = '/finance', onNavigate }: FinancePageProps) {
  if (currentPath === '/finance/orders' || currentPath.startsWith('/finance/orders')) {
    return <SalesOrderModule />;
  }

  let tab = 'overview';
  if (currentPath === '/finance/invoices') {
    tab = 'invoices';
  } else if (currentPath === '/finance/payments') {
    tab = 'payments';
  } else if (currentPath === '/finance/collections') {
    tab = 'collections';
  } else if (currentPath === '/finance/outstanding') {
    tab = 'outstanding';
  } else if (currentPath === '/finance/expenses') {
    tab = 'expenses';
  } else if (currentPath === '/finance/notes') {
    tab = 'notes';
  }

  return <FinanceModule initialTab={tab} />;
}
