import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Folder,
  FolderOpen,
  Boxes,
  Plus,
  Tag,
  Shield,
  AlertCircle,
  Truck,
  Archive,
  ArrowRight,
} from 'lucide-react';
import { WarehouseLocationHierarchy, LocationType } from '../../../types/warehouse';

interface LocationTreeViewerProps {
  tree: WarehouseLocationHierarchy[];
  onAddChild: (parentId: string) => void;
  onRefresh: () => void;
}

const getLocationTypeIcon = (type: LocationType) => {
  switch (type) {
    case 'receiving':
      return <Truck className="w-3.5 h-3.5 text-blue-500" />;
    case 'dispatch':
      return <Truck className="w-3.5 h-3.5 text-indigo-500" />;
    case 'picking':
      return <Boxes className="w-3.5 h-3.5 text-emerald-500" />;
    case 'packing':
      return <Archive className="w-3.5 h-3.5 text-teal-500" />;
    case 'quarantine':
      return <Shield className="w-3.5 h-3.5 text-amber-500" />;
    case 'damaged':
      return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
    default:
      return <Layers className="w-3.5 h-3.5 text-slate-500" />;
  }
};

const TreeNode: React.FC<{
  node: WarehouseLocationHierarchy;
  onAddChild: (parentId: string) => void;
}> = ({ node, onAddChild }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-100/80 transition-colors group">
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="p-1 rounded bg-slate-100 border border-slate-200">{getLocationTypeIcon(node.location_type)}</div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-900">{node.name}</span>
              <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-bold">
                {node.code}
              </span>
              <span className="capitalize text-2xs px-2 py-0.2 rounded-full font-medium bg-slate-100 text-slate-600">
                {node.location_type}
              </span>
            </div>
            {node.description && <p className="text-2xs text-slate-500">{node.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {node.current_stock_units !== undefined && node.current_stock_units > 0 && (
            <span className="font-semibold text-indigo-600 flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5" />
              {node.current_stock_units} units ({node.skus_count || 0} SKUs)
            </span>
          )}

          {node.capacity_quantity && (
            <span className="text-2xs text-slate-400">
              Cap: {node.capacity_quantity} {node.capacity_unit || 'pcs'}
            </span>
          )}

          <button
            onClick={() => onAddChild(node.id)}
            title="Add child rack or bin"
            className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 text-2xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Plus className="w-3 h-3" />
            Add Sub-Bin
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="pl-6 border-l border-slate-200 ml-4 mt-1 space-y-1">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  );
};

export const LocationTreeViewer: React.FC<LocationTreeViewerProps> = ({ tree, onAddChild, onRefresh }) => {
  if (tree.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-xs font-semibold text-slate-700">No hierarchical locations defined yet</p>
        <p className="text-2xs text-slate-400 mt-1">
          Add structural zones, aisles, racks, and pallet bins to optimize storage routing.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
      {tree.map((rootNode) => (
        <TreeNode key={rootNode.id} node={rootNode} onAddChild={onAddChild} />
      ))}
    </div>
  );
};
