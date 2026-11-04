import { useState } from 'react';
import {
  Search,
  Filter,
  Package,
  Layers,
  Eye,
  Edit2,
  Trash2,
  Download,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import type { Product, Category, ProductType, ProductStatus } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useToast } from '../../../context/ToastContext';

interface ProductCatalogTabProps {
  products: Product[];
  categories: Category[];
  totalProducts: number;
  isLoading: boolean;
  searchQuery: string;
  selectedCategory: string;
  selectedType: string;
  selectedStatus: string;
  onSearchChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onTypeChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onOpenCreate: () => void;
  onViewProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onRefresh: () => void;
}

export function ProductCatalogTab({
  products,
  categories,
  totalProducts,
  isLoading,
  searchQuery,
  selectedCategory,
  selectedType,
  selectedStatus,
  onSearchChange,
  onCategoryChange,
  onTypeChange,
  onStatusChange,
  onOpenCreate,
  onViewProduct,
  onEditProduct,
  onRefresh,
}: ProductCatalogTabProps) {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete/archive product "${product.name}" (${product.product_code})?`)) {
      return;
    }
    try {
      const res = await productService.deleteProduct(product.id);
      showToast(res.message || 'Product deleted successfully', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const data = await productService.exportCatalog();
      if (!data || data.length === 0) {
        showToast('No product data available to export', 'info');
        return;
      }

      // Format CSV string
      const headers = [
        'Product Code',
        'Product Name',
        'Brand',
        'Category Code',
        'Category Name',
        'Product Type',
        'SKU Code',
        'Variant Name',
        'Barcode',
        'Unit',
        'Cost Price',
        'Selling Price',
        'MRP',
        'Tax Rate %',
        'HSN Code',
        'Status',
      ];

      const rows = data.map(item => [
        `"${item.product_code || ''}"`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${item.brand || ''}"`,
        `"${item.category_code || ''}"`,
        `"${item.category_name || ''}"`,
        `"${item.product_type || ''}"`,
        `"${item.sku || ''}"`,
        `"${item.variant_name || ''}"`,
        `"${item.barcode || ''}"`,
        `"${item.unit || ''}"`,
        item.cost_price || 0,
        item.selling_price || 0,
        item.mrp || 0,
        item.tax_rate || 0,
        `"${item.tax_code || ''}"`,
        `"${item.status || ''}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Jyotsvan_Master_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Exported ${data.length} records successfully`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product code, name, SKU, or brand..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => onCategoryChange(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Product Type Filter */}
          <select
            value={selectedType}
            onChange={e => onTypeChange(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium"
          >
            <option value="all">All Types</option>
            <option value="finished_good">Finished Goods (FG)</option>
            <option value="semi_finished_good">Semi-Finished Goods (SFG)</option>
            <option value="raw_material">Raw Materials (RM)</option>
            <option value="packaging_material">Packaging (PM)</option>
            <option value="consumable">Consumables</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => onStatusChange(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting...' : 'Export Catalog'}
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Product
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Code / Brand</th>
                <th className="px-4 py-3">Category & Type</th>
                <th className="px-4 py-3 text-center">Variants / SKUs</th>
                <th className="px-4 py-3 text-right">Cost Price (₹)</th>
                <th className="px-4 py-3 text-right">Selling Price (₹)</th>
                <th className="px-4 py-3 text-right">Gross Margin</th>
                <th className="px-4 py-3">Tax / HSN</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    Loading products from InsForge PostgreSQL...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No products found matching the selected filters.
                  </td>
                </tr>
              ) : (
                products.map(product => {
                  const primaryImg = product.images?.find(i => i.is_primary)?.public_url ||
                    product.images?.[0]?.public_url ||
                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=120&q=80';

                  const cost = Number(product.cost_price) || 0;
                  const sell = Number(product.selling_price) || 0;
                  const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : '0';
                  const skuCount = product.skus_count || product.skus?.length || 1;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product Thumbnail & Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={primaryImg}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 object-cover rounded-md border border-slate-200 bg-slate-100 shrink-0"
                          />
                          <div className="max-w-xs">
                            <div
                              onClick={() => onViewProduct(product)}
                              className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer truncate"
                            >
                              {product.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {product.short_name || product.packaging_type || 'Standard Packaging'} • {product.unit}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Code / Brand */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-slate-800 text-[11px]">{product.product_code}</div>
                        <div className="text-[11px] text-slate-500">{product.brand || 'Jyotsvan'}</div>
                      </td>

                      {/* Category & Type */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{product.category_name || 'Uncategorized'}</div>
                        <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded uppercase mt-0.5">
                          {product.product_type.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Variants / SKUs Count */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <Tag className="w-3 h-3 text-slate-500" />
                          {skuCount} SKU{skuCount > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Selling Price */}
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        ₹{sell.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Margin */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                          {margin}%
                        </span>
                      </td>

                      {/* Tax / HSN */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] text-slate-700">{product.tax_code || 'HSN-8413'}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold">{product.tax_rate}% GST</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                          product.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : product.status === 'draft'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {product.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewProduct(product)}
                            title="Inspect Details"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditProduct(product)}
                            title="Edit Product"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            title="Delete / Archive Product"
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

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{products.length}</strong> of{' '}
            <strong className="text-slate-800">{totalProducts}</strong> products in master catalog
          </div>
          <div className="flex items-center gap-2">
            <span>InsForge PostgreSQL Live Sync</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
