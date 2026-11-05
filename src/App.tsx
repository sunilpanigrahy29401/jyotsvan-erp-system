import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './modules/auth/LoginPage';
import { ForcePasswordChange } from './modules/auth/ForcePasswordChange';
import { AppShell } from './components/layout/AppShell';
import { CommandCenterPage } from './app/pages/CommandCenterPage';
import { BusinessPage } from './app/pages/BusinessPage';
import { MarketingPage } from './app/pages/MarketingPage';
import { CommercePage } from './app/pages/CommercePage';
import { OperationsPage } from './app/pages/OperationsPage';
import { DistributionPage } from './app/pages/DistributionPage';
import { FinancePage } from './app/pages/FinancePage';
import { CrmPage } from './app/pages/CrmPage';
import { ConnectedModulesPage } from './app/pages/ConnectedModulesPage';
import { PeoplePage } from './app/pages/PeoplePage';
import { AiPage } from './app/pages/AiPage';
import { SettingsPage } from './app/pages/SettingsPage';
import { DesignSystemPage } from './app/pages/DesignSystemPage';
import { NotificationCenterPage } from './app/pages/NotificationCenterPage';
import { ProductsPage } from './app/pages/products/ProductsPage';
import { SuppliersPage } from './app/pages/suppliers/SuppliersPage';
import { InventoryPage } from './app/pages/inventory/InventoryPage';
import { WarehousesPage } from './app/pages/warehouses/WarehousesPage';
import { NotFoundPage } from './app/pages/NotFoundPage';
import { AccessDeniedPage } from './app/pages/AccessDeniedPage';
import { LoadingState } from './components/ui/loading-state';
import { getPageMetadata, getRequiredPermissionForPath } from './config/navigation';
import { accessControlService } from './services/accessControl';

function MainRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    return path && path !== '/' ? path : '/command-center';
  });

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path && path !== '/' ? path : '/command-center');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path === currentPath) return;
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <LoadingState
          message="Initializing Jyotsvan Platform"
          description="Establishing InsForge session & verifying enterprise tenant credentials..."
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Accounts that still use an administrator-issued temporary password must choose their own first.
  if ((user as unknown as { must_change_password?: boolean } | null)?.must_change_password) {
    return <ForcePasswordChange />;
  }

  // Determine active component and metadata
  const meta = getPageMetadata(currentPath);

  // Route-level permission authorization check
  const requiredPermission = getRequiredPermissionForPath(currentPath);
  const isAuthorized = !requiredPermission || (user && accessControlService.hasPermission(user, requiredPermission));

  const renderPageComponent = () => {
    if (!isAuthorized) {
      return (
        <AccessDeniedPage
          requiredPermission={requiredPermission}
          attemptedPath={currentPath}
          onNavigate={navigate}
        />
      );
    }

    if (currentPath === '/command-center') {
      return <CommandCenterPage onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/business')) {
      return <BusinessPage currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentPath === '/reports' || currentPath.startsWith('/reports')) {
      return <BusinessPage currentPath="/business/reports" onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/marketing') || currentPath.startsWith('/meta') || currentPath.startsWith('/ads')) {
      return <MarketingPage currentPath={currentPath.startsWith('/meta') ? '/marketing/meta' : currentPath} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/modules')) {
      return <ConnectedModulesPage />;
    }
    if (currentPath.startsWith('/crm')) {
      return <CrmPage currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/commerce') || currentPath.startsWith('/shopify')) {
      return <CommercePage currentPath={currentPath.startsWith('/shopify') ? '/commerce/shopify' : currentPath} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/integrations')) {
      return <SettingsPage currentPath="/settings/integrations" onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/products')) {
      return <ProductsPage onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/suppliers')) {
      return <SuppliersPage onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/inventory')) {
      return <InventoryPage onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/warehouses')) {
      return <WarehousesPage onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/operations')) {
      return <OperationsPage currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/batches') || currentPath.startsWith('/traceability')) {
      return <OperationsPage currentPath="/operations/batches" onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/cfs') || currentPath.startsWith('/cf')) {
      return <DistributionPage currentPath="/distribution/cf" onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/distributors') || currentPath.startsWith('/distributor')) {
      return <DistributionPage currentPath="/distribution/distributors" onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/field-sales')) {
      return <DistributionPage currentPath="/distribution/field-sales" onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/production') || currentPath.startsWith('/manufacturing')) {
      return <OperationsPage currentPath={`/operations${currentPath}`} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/distribution')) {
      return <DistributionPage currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/sales-orders') || currentPath.startsWith('/orders')) {
      return <FinancePage currentPath="/finance/orders" onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/finance')) {
      return <FinancePage currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/people')) {
      return <PeoplePage currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/notifications')) {
      return <NotificationCenterPage onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/ai')) {
      return <AiPage currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentPath === '/design-system') {
      return <DesignSystemPage />;
    }
    if (currentPath.startsWith('/settings')) {
      return <SettingsPage currentPath={currentPath} onNavigate={navigate} />;
    }

    return (
      <NotFoundPage
        currentPath={currentPath}
        onNavigate={navigate}
        onOpenSearch={() => {
          // Open search modal via simulated Cmd+K key event
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
        }}
      />
    );
  };

  return (
    <AppShell
      currentPath={currentPath}
      pageTitle={meta.title}
      breadcrumbs={meta.breadcrumbs}
      onNavigate={navigate}
    >
      {renderPageComponent()}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainRouter />
      </ToastProvider>
    </AuthProvider>
  );
}
