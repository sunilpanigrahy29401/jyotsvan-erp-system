import { Home, Search } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/button';

export interface NotFoundPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
}

export function NotFoundPage({ currentPath, onNavigate, onOpenSearch }: NotFoundPageProps) {
  return (
    <PageContainer
      title="404 — Route Not Found"
      description="The requested enterprise URL does not correspond to an active module or registered route."
      phaseBadge="System Router"
    >
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-slate-200 bg-white shadow-xs space-y-4 max-w-xl mx-auto my-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-mono text-xl font-bold border border-slate-200">
          404
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-900">
            Unregistered Route: <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{currentPath}</code>
          </h2>
          <p className="text-xs text-slate-500 max-w-md">
            This path is not mapped to any active domain module in the Jyotsvan Navigation Architecture. Please verify the URL or use the global navigation.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/command-center')}
            leftIcon={<Home className="w-3.5 h-3.5" />}
          >
            Return to Command Center
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSearch}
            leftIcon={<Search className="w-3.5 h-3.5" />}
          >
            Search Modules (⌘K)
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
