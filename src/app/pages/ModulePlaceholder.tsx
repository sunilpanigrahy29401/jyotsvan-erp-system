import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Calendar, Layers, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { EmptyState } from '../../components/ui/empty-state';

export interface ModulePlaceholderProps {
  title: string;
  subtitle?: string;
  description?: string;
  plannedPhase: string;
  plannedDeliverables: string[];
  subsystems: string[];
  architecturalNotes?: string;
  icon?: React.ReactNode;
  parentPath?: string;
  parentTitle?: string;
  onNavigate?: (path: string) => void;
}

export function ModulePlaceholder({
  title,
  subtitle,
  description,
  plannedPhase,
  plannedDeliverables,
  subsystems,
  architecturalNotes,
  icon,
  parentPath,
  parentTitle,
  onNavigate,
}: ModulePlaceholderProps) {
  const displayDesc = description || subtitle || `Functional specifications for ${title}.`;

  return (
    <PageContainer
      title={title}
      description={displayDesc}
      phaseBadge={plannedPhase}
      actions={
        <div className="flex items-center gap-2">
          {parentPath && onNavigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(parentPath)}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              {parentTitle || 'Back'}
            </Button>
          )}
          <Badge variant="outline" className="text-slate-600 bg-white font-mono text-[11px]">
            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
            Coming in {plannedPhase}
          </Badge>
        </div>
      }
    >
      {/* Scope Status Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            {icon || <Layers className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Module Architectural Boundary</h2>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {plannedPhase}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              This module represents an isolated domain within Jyotsvan's modular monolith architecture. In Phase 2, the application shell, routing hierarchy, and navigational breadcrumbs are fully established, while domain business engines remain strictly isolated until their target development phase.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Planned Submodules & Capabilities */}
        <Card className="lg:col-span-1 shadow-xs border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              Planned Submodules
            </CardTitle>
            <CardDescription>Domain functional capabilities for this module</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {subsystems.map((sub, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-800"
              >
                <span className="font-medium">{sub}</span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  Scheduled
                  <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Phase Deliverables & Architecture */}
        <Card className="lg:col-span-2 shadow-xs border-slate-200 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              Phase Scope & Roadmap Deliverables
            </CardTitle>
            <CardDescription>Key milestones and requirements for this domain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {plannedDeliverables.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs text-slate-600 leading-relaxed"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="p-4 rounded-lg bg-slate-50/50 border border-dashed border-slate-200">
              <EmptyState
                title="Awaiting Backend Module Activation"
                description={`Operational ledger entries and user forms for ${title} will be activated in ${plannedPhase}.`}
                className="py-1"
              />
            </div>

            {architecturalNotes && (
              <div className="text-[11px] text-slate-500 font-mono leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <strong>Architectural Note:</strong> {architecturalNotes}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
