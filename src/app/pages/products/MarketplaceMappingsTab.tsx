import { useState } from 'react';
import {
  Search,
  Globe,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import type { ExternalSKUMapping, SKU, ExternalPlatform } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useToast } from '../../../context/ToastContext';

interface MarketplaceMappingsTabProps {
  mappings: ExternalSKUMapping[];
  skus: SKU[];
  isLoading: boolean;
  onOpenCreate: () => void;
  onEditMapping: (mapping: ExternalSKUMapping) => void;
  onRefresh: () => void;
}

export function MarketplaceMappingsTab({
  mappings,
  skus,
  isLoading,
  onOpenCreate,
  onEditMapping,
  onRefresh,
}: MarketplaceMappingsTabProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filtered = mappings.filter(m => {
    const matchSearch =
      !search ||
      m.external_sku.toLowerCase().includes(search.toLowerCase()) ||
      (m.sku_code && m.sku_code.toLowerCase().includes(search.toLowerCase())) ||
      (m.product_name && m.product_name.toLowerCase().includes(search.toLowerCase())) ||
      (m.external_identifier && m.external_identifier.toLowerCase().includes(search.toLowerCase()));

    const matchPlatform = selectedPlatform === 'all' || m.platform === selectedPlatform;
    const matchStatus = selectedStatus === 'all' || m.status === selectedStatus;
    return matchSearch && matchPlatform && matchStatus;
  });

  const handleDelete = async (mapping: ExternalSKUMapping) => {
    if (!confirm(`Are you sure you want to unlink external SKU "${mapping.external_sku}" on ${mapping.platform}?`)) return;
    try {
      await productService.deleteExternalMapping(mapping.id);
      showToast('Marketplace mapping unlinked', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete mapping', 'error');
    }
  };

  const getPlatformBadge = (platform: ExternalPlatform) => {
    switch (platform) {
      case 'shopify':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">Shopify D2C</span>;
      case 'amazon':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">Amazon SP-API</span>;
      case 'flipkart':
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[11px] font-bold">Flipkart</span>;
      case 'myntra':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-bold">Myntra</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold uppercase">{platform}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by external SKU, ERP SKU, ASIN, or product..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>

          <select
            value={selectedPlatform}
            onChange={e => setSelectedPlatform(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">All Channels</option>
            <option value="shopify">Shopify</option>
            <option value="amazon">Amazon</option>
            <option value="flipkart">Flipkart</option>
            <option value="myntra">Myntra</option>
            <option value="custom">Custom</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">All Sync Statuses</option>
            <option value="active">Active (Synced)</option>
            <option value="paused">Paused</option>
            <option value="sync_error">Sync Error</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Link Channel SKU
        </button>
      </div>

      {/* Mappings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">Sales Channel</th>
                <th className="px-4 py-3">External Channel SKU</th>
                <th className="px-4 py-3">Canonical ERP SKU</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">External ASIN / FSN</th>
                <th className="px-4 py-3">Sync Status</th>
                <th className="px-4 py-3">Last Synced</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Loading marketplace mappings from InsForge PostgreSQL...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Globe className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No external marketplace mappings found. Click &quot;Link Channel SKU&quot; to connect Shopify or Amazon.
                  </td>
                </tr>
              ) : (
                filtered.map(map => (
                  <tr key={map.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">{getPlatformBadge(map.platform)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-[12px]">{map.external_sku}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{map.sku_code || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{map.product_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{map.external_identifier || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        map.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : map.status === 'sync_error'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {map.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : null}
                        {map.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {map.last_synced_at ? new Date(map.last_synced_at).toLocaleDateString() : 'Real-Time Sync'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditMapping(map)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(map)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{filtered.length}</strong> linked marketplace channel mappings
          </div>
          <div className="text-[11px] text-slate-500">
            Bidirectional sync mapping table with InsForge PostgreSQL
          </div>
        </div>
      </div>
    </div>
  );
}
