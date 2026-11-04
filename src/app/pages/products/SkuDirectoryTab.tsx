import { useState } from 'react';
import {
  Search,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Barcode,
  ArrowUpDown,
  Filter,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import type { SKU, Product } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useToast } from '../../../context/ToastContext';

interface SkuDirectoryTabProps {
  skus: SKU[];
  products: Product[];
  isLoading: boolean;
  onOpenCreateSku: (product?: Product) => void;
  onEditSku: (sku: SKU, product?: Product) => void;
  onRefresh: () => void;
}

export function SkuDirectoryTab({
  skus,
  products,
  isLoading,
  onOpenCreateSku,
  onEditSku,
  onRefresh,
}: SkuDirectoryTabProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredSkus = skus.filter(s => {
    const matchSearch =
      !search ||
      s.sku.toLowerCase().includes(search.toLowerCase()) ||
      s.variant_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.product_name && s.product_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.barcode && s.barcode.includes(search));

    const matchStatus = selectedStatus === 'all' || s.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (sku: SKU) => {
    if (!confirm(`Are you sure you want to delete SKU variant "${sku.sku}"?`)) return;
    try {
      await productService.deleteSKU(sku.id);
      showToast('SKU deleted successfully', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete SKU', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU code, variant name, barcode, or product..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">All Variant Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button
          onClick={() => onOpenCreateSku()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Variant SKU
        </button>
      </div>

      {/* High Density Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">Canonical SKU</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Barcode (EAN-13)</th>
                <th className="px-4 py-3">Pack & Dimensions</th>
                <th className="px-4 py-3 text-right">Cost (₹)</th>
                <th className="px-4 py-3 text-right">Selling (₹)</th>
                <th className="px-4 py-3 text-right">MRP (₹)</th>
                <th className="px-4 py-3">Tax / HSN</th>
                <th className="px-4 py-3">Safety / ROL</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    Loading SKUs from InsForge PostgreSQL...
                  </td>
                </tr>
              ) : filteredSkus.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    <Tag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No variant SKUs found.
                  </td>
                </tr>
              ) : (
                filteredSkus.map(sku => {
                  const matchingProduct = products.find(p => p.id === sku.product_id);
                  const cost = Number(sku.cost_price) || 0;
                  const sell = Number(sku.selling_price) || 0;
                  const mrpVal = Number(sku.mrp) || sell;
                  const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : '0';

                  return (
                    <tr key={sku.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Canonical SKU & Variant */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900 text-[12px]">{sku.sku}</div>
                        <div className="text-[11px] font-medium text-slate-600">{sku.variant_name}</div>
                      </td>

                      {/* Parent Product */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 line-clamp-1">
                          {sku.product_name || matchingProduct?.name || 'Parent Product'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {sku.product_code || matchingProduct?.product_code || ''}
                        </div>
                      </td>

                      {/* Barcode & Visual */}
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {sku.barcode ? (
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Barcode className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{sku.barcode}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>

                      {/* Packaging & Weight */}
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">
                          {sku.pack_size} {sku.pack_unit}
                        </div>
                        {(sku.net_weight || sku.gross_weight) && (
                          <div className="text-[11px] text-slate-500">
                            {sku.net_weight ? `Net: ${sku.net_weight}kg` : ''}{' '}
                            {sku.gross_weight ? `Gross: ${sku.gross_weight}kg` : ''}
                          </div>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Selling */}
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        ₹{sell.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <div className="text-[10px] text-indigo-600 font-normal">Margin: {margin}%</div>
                      </td>

                      {/* MRP */}
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        ₹{mrpVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Tax */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] text-slate-700">{sku.tax_code || 'HSN-8413'}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold">{sku.tax_rate}% GST</div>
                      </td>

                      {/* Safety / ROL */}
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">ROL: {sku.reorder_level || 10}</div>
                        <div className="text-[11px] text-slate-500">ROQ: {sku.reorder_quantity || 50}</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                          sku.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {sku.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditSku(sku, matchingProduct)}
                            title="Edit SKU"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sku)}
                            title="Delete SKU"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{filteredSkus.length}</strong> of{' '}
            <strong className="text-slate-800">{skus.length}</strong> canonical SKU variants
          </div>
          <div className="text-[11px] text-slate-500">
            1:N Product to SKU variant model enforced
          </div>
        </div>
      </div>
    </div>
  );
}
