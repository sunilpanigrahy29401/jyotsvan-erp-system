// src/app/pages/people/OrgHierarchyView.tsx
// Visual Organizational Structure & Reporting Hierarchy

import { useState } from 'react';
import { 
  Users, ChevronDown, ChevronRight, Mail, Phone, Building2, MapPin, 
  ExternalLink, UserCheck
} from 'lucide-react';
import type { OrgNode } from '../../../types/people.ts';

interface OrgHierarchyViewProps {
  nodes: OrgNode[];
  onSelectEmployee?: (employeeId: string) => void;
}

function OrgTreeNode({
  node,
  level = 0,
  onSelectEmployee,
}: {
  node: OrgNode;
  level?: number;
  onSelectEmployee?: (employeeId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div 
        className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 ${
          level === 0 
            ? 'bg-slate-900 border-slate-800 text-white shadow-md' 
            : level === 1 
            ? 'bg-white border-slate-200 text-slate-900 shadow-sm hover:border-slate-300' 
            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={!hasChildren}
          className={`mt-1 p-1 rounded-md transition-colors ${
            !hasChildren 
              ? 'opacity-20 cursor-default' 
              : level === 0 
              ? 'hover:bg-slate-800 text-slate-300' 
              : 'hover:bg-slate-200 text-slate-600'
          }`}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-sm">
          {node.display_name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{node.display_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
              level === 0 ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {node.employee_code}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              node.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {node.status}
            </span>
          </div>

          <p className={`text-xs font-medium mt-0.5 ${level === 0 ? 'text-slate-300' : 'text-slate-600'}`}>
            {node.designation}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs opacity-80 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {node.department}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {node.branch}
            </span>
            {node.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {node.email}
              </span>
            )}
            {node.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {node.phone}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasChildren && (
            <span className={`text-xs px-2 py-1 rounded-md font-medium ${
              level === 0 ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {node.direct_reports_count} {node.direct_reports_count === 1 ? 'Report' : 'Reports'}
            </span>
          )}
          {onSelectEmployee && (
            <button
              type="button"
              onClick={() => onSelectEmployee(node.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                level === 0 
                  ? 'hover:bg-slate-800 text-slate-300 hover:text-white' 
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
              title="View Full Profile"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="pl-6 md:pl-10 mt-3 space-y-3 border-l-2 border-dashed border-slate-200 ml-5">
          {node.children.map((child) => (
            <OrgTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelectEmployee={onSelectEmployee}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgHierarchyView({ nodes, onSelectEmployee }: OrgHierarchyViewProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        <Users className="w-10 h-10 mx-auto mb-2 text-slate-400" />
        <p className="font-medium text-slate-700">No organizational tree nodes available</p>
        <p className="text-xs text-slate-500 mt-1">Make sure active employees are created and reporting managers are assigned.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Organizational reporting structure derived dynamically from active personnel records. Click arrows to collapse/expand departments.</span>
        </div>
        <span className="font-semibold shrink-0 ml-2">{nodes.length} Executive Division{nodes.length > 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-4">
        {nodes.map((rootNode) => (
          <OrgTreeNode
            key={rootNode.id}
            node={rootNode}
            level={0}
            onSelectEmployee={onSelectEmployee}
          />
        ))}
      </div>
    </div>
  );
}
