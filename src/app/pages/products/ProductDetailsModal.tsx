import { useState, useEffect } from 'react';
import {
  X,
  Package,
  Layers,
  Tag,
  DollarSign,
  FileText,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { Product, SKU } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useToast } from '../../../context/ToastContext';

interface ProductDetailsModalProps {
  isOpen: boolean;
  productId: string | null;
  onClose: () => void;
  onEditProduct: (product: Product) => void;
  onAddSku: (product: Product) => void;
  onEditSku: (sku: SKU, product: Product) => void;
  onRefreshParent: () => void;
}

export function ProductDetailsModal({
  isOpen,
  productId,
  onClose,
  onEditProduct,
  onAddSku,
  onEditSku,
  onRefreshParent,
}: ProductDetailsModalProps) {
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'skus' | 'documents' | 'channels'>('overview');

  const fetchDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await productService.getProductById(id);
      setProduct(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load product details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productId && isOpen) {
      fetchDetails(productId);
      setActiveTab('overview');
    } else {
      setProduct(null);
    }
  }, [productId, isOpen]);

  if (!isOpen || !productId) return null;

  const handleDeleteSku = async (skuId: string) => {
    if (!confirm('Are you sure you want to delete this variant SKU?')) return;
    try {
      await productService.deleteSKU(skuId);
      showToast('Variant SKU removed', 'success');
      fetchDetails(productId);
      onRefreshParent();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove SKU', 'error');
    }
  };

  const primaryImage = product?.images?.find(i => i.is_primary)?.public_url ||
    product?.images?.[0]?.public_url ||
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';

  const margin = product && product.selling_price > 0
    ? (((product.selling_price - product.cost_price) / product.selling_price) * 100).toFixed(1)
    : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {product ? product.name : 'Loading Product Details...'}
                </h3>
                {product && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                    product.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {product.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {product?.product_code} • {product?.category_name || 'Uncategorized'} • {product?.brand}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {product && (
              <button
                onClick={() => {
                  onEditProduct(product);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Product
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-2">
          {[
            { id: 'overview', label: 'Overview & Specs', icon: Layers },
            { id: 'skus', label: `Variant SKUs (${product?.skus?.length || 0})`, icon: Tag },
            { id: 'documents', label: `Compliance Docs (${product?.documents?.length || 0})`, icon: FileText },
            { id: 'channels', label: `Marketplace Channels (${product?.external_mappings?.length || 0})`, icon: Globe },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Fetching canonical product master from InsForge PostgreSQL...
            </div>
          ) : !product ? (
            <div className="text-center py-12 text-slate-500 text-sm">Product record not found.</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & SPECS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Hero Summary Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="md:col-span-1">
                      <img
                        src={primaryImage}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-44 object-cover rounded-lg border border-slate-200 shadow-xs"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                            {product.product_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-500">
                            Brand: <strong className="text-slate-700">{product.brand}</strong>
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mb-2">{product.name}</h4>
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {product.description || 'No detailed engineering description recorded for this product.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 mt-2">
                        <div>
                          <div className="text-[11px] text-slate-500">Cost Price</div>
                          <div className="text-sm font-bold text-slate-800">₹{Number(product.cost_price).toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Selling Price</div>
                          <div className="text-sm font-bold text-emerald-700">₹{Number(product.selling_price).toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Gross Margin</div>
                          <div className="text-sm font-bold text-indigo-700">{margin}%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deep Specs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Packaging & Logistics */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2.5 shadow-2xs">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" /> Packaging & Logistics
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block text-[11px]">Primary UOM:</span>
                          <strong className="text-slate-800 uppercase">{product.unit}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block text-[11px]">Packaging Type:</span>
                          <strong className="text-slate-800">{product.packaging_type || 'Box'}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block text-[11px]">Units / Case:</span>
                          <strong className="text-slate-800">{product.units_per_case || 1}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block text-[11px]">Case Weight:</span>
                          <strong className="text-slate-800">{product.case_weight ? `${product.case_weight} kg` : 'N/A'}</strong>
                        </div>
                      </div>

                      <div className="pt-2 flex gap-3 text-xs">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] ${
                          product.requires_batch_tracking ? 'bg-amber-50 text-amber-800 font-semibold' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {product.requires_batch_tracking ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                          Batch Tracking {product.requires_batch_tracking ? 'Mandatory' : 'Optional'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] ${
                          product.requires_expiry_tracking ? 'bg-amber-50 text-amber-800 font-semibold' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {product.requires_expiry_tracking ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                          Expiry Tracking {product.requires_expiry_tracking ? 'Enforced' : 'Not Required'}
                        </span>
                      </div>
                    </div>

                    {/* Tax & Taxation */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2.5 shadow-2xs">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-600" /> Taxation & Safety Thresholds
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block text-[11px]">HSN / SAC Code:</span>
                          <strong className="text-slate-800 font-mono">{product.tax_code || 'HSN-8413'}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block text-[11px]">GST Tax Rate:</span>
                          <strong className="text-emerald-700">{product.tax_rate}%</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block text-[11px]">Reorder Point (ROL):</span>
                          <strong className="text-slate-800">{product.reorder_level} units</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block text-[11px]">Reorder Qty (ROQ):</span>
                          <strong className="text-slate-800">{product.reorder_quantity} units</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VARIANT SKUs */}
              {activeTab === 'skus' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Configured Product Variants ({product.skus?.length || 0})
                    </span>
                    <button
                      onClick={() => onAddSku(product)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Variant SKU
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">SKU Code</th>
                          <th className="px-3 py-2.5">Variant</th>
                          <th className="px-3 py-2.5">Barcode</th>
                          <th className="px-3 py-2.5">Pack</th>
                          <th className="px-3 py-2.5">Cost (₹)</th>
                          <th className="px-3 py-2.5">Selling (₹)</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {product.skus?.map(sku => (
                          <tr key={sku.id} className="hover:bg-slate-50/80">
                            <td className="px-3 py-2.5 font-mono font-bold text-slate-800">{sku.sku}</td>
                            <td className="px-3 py-2.5 font-medium text-slate-900">{sku.variant_name}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-600">{sku.barcode || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-700">{sku.pack_size} {sku.pack_unit}</td>
                            <td className="px-3 py-2.5 text-slate-700">₹{Number(sku.cost_price).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2.5 font-bold text-emerald-700">₹{Number(sku.selling_price).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2.5">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                sku.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {sku.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right space-x-1">
                              <button
                                onClick={() => onEditSku(sku, product)}
                                className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSku(sku.id)}
                                className="p-1 text-slate-500 hover:text-rose-600 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-700">
                    Quality Spec Sheets, Certificates of Analysis (COA) & Compliance Attachments
                  </span>
                  {product.documents && product.documents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {product.documents.map(doc => (
                        <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center">
                              PDF
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-900">{doc.title}</div>
                              <div className="text-[11px] text-slate-500 uppercase">{doc.document_type} • {doc.file_name}</div>
                            </div>
                          </div>
                          {doc.public_url && (
                            <a
                              href={doc.public_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-indigo-600"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-xs">
                      No compliance documents attached to this product record.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CHANNELS */}
              {activeTab === 'channels' && (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-700">
                    External Channel SKU Mappings (Shopify, Amazon, Flipkart, Myntra)
                  </span>
                  {product.external_mappings && product.external_mappings.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {product.external_mappings.map(map => (
                        <div key={map.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {map.platform}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                              {map.status}
                            </span>
                          </div>
                          <div className="text-xs font-mono font-semibold text-slate-800">
                            Ext SKU: {map.external_sku}
                          </div>
                          {map.external_identifier && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              ASIN/FSN: {map.external_identifier}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-xs">
                      No marketplace channel mappings registered for this product variants.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-[11px] text-slate-500">
            Organization ID: {product?.organization_id || 'org-main-01'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200/80 rounded-lg border border-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
