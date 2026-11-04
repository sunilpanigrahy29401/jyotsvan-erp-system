import { useState, useEffect } from 'react';
import {
  X,
  Package,
  Layers,
  DollarSign,
  Tag,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Barcode,
  CheckCircle2,
} from 'lucide-react';
import type { Product, Category, ProductType, ProductStatus } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface ProductFormModalProps {
  isOpen: boolean;
  product?: Product | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = 'general' | 'packaging' | 'pricing' | 'sku' | 'media' | 'documents';

export function ProductFormModal({
  isOpen,
  product,
  categories,
  onClose,
  onSuccess,
}: ProductFormModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab 1: General Info
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [shortName, setShortName] = useState('');
  const [brand, setBrand] = useState('Jyotsvan');
  const [categoryId, setCategoryId] = useState('');
  const [productType, setProductType] = useState<ProductType>('finished_good');
  const [status, setStatus] = useState<ProductStatus>('active');
  const [description, setDescription] = useState('');

  // Tab 2: Packaging & Units
  const [unit, setUnit] = useState('pcs');
  const [packagingType, setPackagingType] = useState('Box');
  const [unitsPerCase, setUnitsPerCase] = useState<number>(1);
  const [caseWeight, setCaseWeight] = useState<string>('');
  const [requiresBatchTracking, setRequiresBatchTracking] = useState(false);
  const [requiresExpiryTracking, setRequiresExpiryTracking] = useState(false);

  // Tab 3: Pricing & Tax
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18.0);
  const [taxCode, setTaxCode] = useState('HSN-8413');
  const [taxCategory, setTaxCategory] = useState('GST_18');

  // Tab 4: SKU & Planning
  const [skuCode, setSkuCode] = useState('');
  const [initialVariantName, setInitialVariantName] = useState('Standard Pack');
  const [barcode, setBarcode] = useState('');
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [reorderQuantity, setReorderQuantity] = useState<number>(50);
  const [minStock, setMinStock] = useState<number>(5);
  const [maxStock, setMaxStock] = useState<number>(500);

  // Tab 5: Media Assets
  const [images, setImages] = useState<{ url: string; alt: string; isPrimary: boolean }[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Tab 6: Documents
  const [docs, setDocs] = useState<{ title: string; type: string; fileName: string; url: string }[]>([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('spec_sheet');
  const [newDocUrl, setNewDocUrl] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setProductCode(product.product_code);
      setShortName(product.short_name || '');
      setBrand(product.brand || 'Jyotsvan');
      setCategoryId(product.category_id || '');
      setProductType(product.product_type);
      setStatus(product.status);
      setDescription(product.description || '');

      setUnit(product.unit || 'pcs');
      setPackagingType(product.packaging_type || 'Box');
      setUnitsPerCase(product.units_per_case || 1);
      setCaseWeight(product.case_weight ? String(product.case_weight) : '');
      setRequiresBatchTracking(Boolean(product.requires_batch_tracking));
      setRequiresExpiryTracking(Boolean(product.requires_expiry_tracking));

      setCostPrice(Number(product.cost_price) || 0);
      setSellingPrice(Number(product.selling_price) || 0);
      setMrp(Number(product.mrp) || 0);
      setTaxRate(Number(product.tax_rate) || 18.0);
      setTaxCode(product.tax_code || 'HSN-8413');
      setTaxCategory(product.tax_category || 'GST_18');

      setSkuCode(product.sku || product.product_code);
      setInitialVariantName('Standard Pack');
      setBarcode('8901234567890');
      setReorderLevel(product.reorder_level || 10);
      setReorderQuantity(product.reorder_quantity || 50);
      setMinStock(product.minimum_stock_level || 5);
      setMaxStock(product.maximum_stock_level || 500);

      if (product.images && product.images.length > 0) {
        setImages(product.images.map(img => ({ url: img.public_url, alt: img.alt_text || '', isPrimary: img.is_primary })));
      } else {
        setImages([]);
      }

      if (product.documents && product.documents.length > 0) {
        setDocs(product.documents.map(d => ({ title: d.title, type: d.document_type, fileName: d.file_name, url: d.public_url || '' })));
      } else {
        setDocs([]);
      }
    } else {
      // Defaults for new product
      setName('');
      setProductCode('');
      setShortName('');
      setBrand('Jyotsvan');
      setCategoryId(categories[0]?.id || '');
      setProductType('finished_good');
      setStatus('active');
      setDescription('');

      setUnit('pcs');
      setPackagingType('Box');
      setUnitsPerCase(1);
      setCaseWeight('');
      setRequiresBatchTracking(false);
      setRequiresExpiryTracking(false);

      setCostPrice(0);
      setSellingPrice(0);
      setMrp(0);
      setTaxRate(18.0);
      setTaxCode('HSN-8413');
      setTaxCategory('GST_18');

      setSkuCode('');
      setInitialVariantName('Standard Pack');
      setBarcode('890' + Math.floor(1000000000 + Math.random() * 9000000000));
      setReorderLevel(10);
      setReorderQuantity(50);
      setMinStock(5);
      setMaxStock(500);

      setImages([
        {
          url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
          alt: 'Primary catalog visual',
          isPrimary: true,
        },
      ]);
      setDocs([]);
    }
    setError(null);
    setActiveTab('general');
  }, [product, categories, isOpen]);

  // Auto-fill Product Code & SKU Code from Name when creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (!product) {
      const slug = val
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .substring(0, 16);
      if (slug) {
        const code = `JYT-${slug}`;
        setProductCode(code);
        setSkuCode(code);
      }
    }
  };

  if (!isOpen) return null;

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setImages(prev => [...prev, { url: newImageUrl.trim(), alt: 'Product Image', isPrimary: prev.length === 0 }]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages(prev => prev.map((img, i) => ({ ...img, isPrimary: i === index })));
  };

  const handleAddDoc = () => {
    if (!newDocTitle.trim()) return;
    setDocs(prev => [
      ...prev,
      {
        title: newDocTitle.trim(),
        type: newDocType,
        fileName: `${newDocTitle.trim().replace(/\s+/g, '_')}.pdf`,
        url: newDocUrl.trim() || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      },
    ]);
    setNewDocTitle('');
    setNewDocUrl('');
  };

  const handleRemoveDoc = (index: number) => {
    setDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product Name is required');
      setActiveTab('general');
      return;
    }
    if (!productCode.trim()) {
      setError('Product Code is required');
      setActiveTab('general');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      product_code: productCode.trim().toUpperCase(),
      short_name: shortName.trim() || null,
      brand: brand.trim() || 'Jyotsvan',
      category_id: categoryId || null,
      product_type: productType,
      status,
      description: description.trim() || null,
      sku: skuCode.trim().toUpperCase() || productCode.trim().toUpperCase(),
      unit,
      packaging_type: packagingType,
      units_per_case: unitsPerCase,
      case_weight: caseWeight ? Number(caseWeight) : null,
      requires_batch_tracking: requiresBatchTracking,
      requires_expiry_tracking: requiresExpiryTracking,
      cost_price: Number(costPrice) || 0,
      selling_price: Number(sellingPrice) || 0,
      mrp: Number(mrp) || Number(sellingPrice) || 0,
      tax_rate: Number(taxRate) || 18.0,
      tax_code: taxCode.trim() || null,
      tax_category: taxCategory,
      reorder_level: Number(reorderLevel) || 10,
      reorder_quantity: Number(reorderQuantity) || 50,
      minimum_stock_level: Number(minStock) || 5,
      maximum_stock_level: Number(maxStock) || 500,
      initial_variant_name: initialVariantName.trim() || 'Standard Pack',
      barcode: barcode.trim() || null,
    };

    try {
      if (product) {
        await productService.updateProduct(product.id, payload, { id: user?.id, email: user?.email });

        // Sync new images
        for (const img of images) {
          if (!product.images?.some(existing => existing.public_url === img.url)) {
            await productService.addProductImage(
              product.id,
              { public_url: img.url, alt_text: img.alt, is_primary: img.isPrimary },
              { id: user?.id, email: user?.email }
            );
          }
        }

        // Sync new docs
        for (const doc of docs) {
          if (!product.documents?.some(existing => existing.title === doc.title)) {
            await productService.attachProductDocument(
              product.id,
              { title: doc.title, document_type: doc.type as any, file_name: doc.fileName, public_url: doc.url },
              { id: user?.id, email: user?.email }
            );
          }
        }

        showToast('Product updated successfully', 'success');
      } else {
        const created = await productService.createProduct(payload, { id: user?.id, email: user?.email });

        // Add initial images
        for (const img of images) {
          await productService.addProductImage(
            created.id,
            { public_url: img.url, alt_text: img.alt, is_primary: img.isPrimary },
            { id: user?.id, email: user?.email }
          );
        }

        // Add initial docs
        for (const doc of docs) {
          await productService.attachProductDocument(
            created.id,
            { title: doc.title, document_type: doc.type as any, file_name: doc.fileName, public_url: doc.url },
            { id: user?.id, email: user?.email }
          );
        }

        showToast('Product and primary SKU registered successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const margin = sellingPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : '0';

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'general', label: 'General Info', icon: Package },
    { id: 'packaging', label: 'Packaging & Units', icon: Layers },
    { id: 'pricing', label: 'Pricing & Tax', icon: DollarSign },
    { id: 'sku', label: 'Canonical SKU', icon: Tag },
    { id: 'media', label: 'Media Assets', icon: ImageIcon },
    { id: 'documents', label: 'Quality & Docs', icon: FileText },
  ];

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
              <h3 className="text-lg font-bold text-slate-900">
                {product ? `Edit Product: ${product.name}` : 'Register New Master Product'}
              </h3>
              <p className="text-xs text-slate-500">
                Canonical enterprise catalog record with multi-variant SKU & compliance specifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Product Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="e.g. High-Pressure Industrial Hydraulic Pump 400L"
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Product Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productCode}
                    onChange={e => setProductCode(e.target.value.toUpperCase())}
                    placeholder="e.g. JYT-PUMP-400"
                    required
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Short Name</label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={e => setShortName(e.target.value)}
                    placeholder="e.g. Pump 400L"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="e.g. Jyotsvan"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">-- Uncategorized --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Product Type</label>
                  <select
                    value={productType}
                    onChange={e => setProductType(e.target.value as ProductType)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="finished_good">Finished Good (FG)</option>
                    <option value="semi_finished_good">Semi-Finished Good (SFG)</option>
                    <option value="raw_material">Raw Material (RM)</option>
                    <option value="packaging_material">Packaging Material (PM)</option>
                    <option value="consumable">Consumable Store Item</option>
                    <option value="service">Service / Overhead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lifecycle Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as ProductStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="active">Active (Production & Sales Ready)</option>
                    <option value="draft">Draft (Under Review)</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description & Specifications</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Enter detailed technical description, engineering tolerances, or application guidelines..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PACKAGING & UNITS */}
          {activeTab === 'packaging' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Base Unit of Measure</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="units">Units</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="l">Liters (L)</option>
                    <option value="ml">Milliliters (mL)</option>
                    <option value="barrels">Barrels</option>
                    <option value="drums">Drums</option>
                    <option value="meters">Meters (m)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Packaging Type</label>
                  <select
                    value={packagingType}
                    onChange={e => setPackagingType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="Box">Corrugated Box</option>
                    <option value="Carton">Master Carton</option>
                    <option value="Drum">Sealed Drum</option>
                    <option value="Barrel">Metal/HDPE Barrel</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Pouch">Foil Pouch</option>
                    <option value="Pallet">Wooden Pallet</option>
                    <option value="Bag">Sack / Bag</option>
                    <option value="Bulk">Bulk Tanker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Units Per Case</label>
                  <input
                    type="number"
                    min="1"
                    value={unitsPerCase}
                    onChange={e => setUnitsPerCase(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Case Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 12.50"
                    value={caseWeight}
                    onChange={e => setCaseWeight(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Quality & Traceability Controls
                </h4>
                <div className="flex flex-col sm:flex-row gap-6 pt-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresBatchTracking}
                      onChange={e => setRequiresBatchTracking(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800">Requires Batch / Lot Number Tracking</span>
                      <p className="text-[11px] text-slate-500">Enforces unique batch identifiers during GRN and production issue</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresExpiryTracking}
                      onChange={e => setRequiresExpiryTracking(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800">Requires Expiry Date Tracking</span>
                      <p className="text-[11px] text-slate-500">Enforces FEFO (First-Expired-First-Out) dispatch rules</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING & TAX */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                <span className="text-xs font-semibold text-indigo-900">Commercial Margin Metric</span>
                <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded shadow-2xs border border-indigo-200">
                  Calculated Gross Margin: {margin}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Standard Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={e => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Base Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Maximum Retail Price / MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={mrp}
                    onChange={e => setMrp(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">GST Tax Rate (%)</label>
                  <select
                    value={taxRate}
                    onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% (GST 5)</option>
                    <option value={12}>12% (GST 12)</option>
                    <option value={18}>18% (GST 18 - Standard)</option>
                    <option value={28}>28% (GST 28 - Heavy)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">HSN / SAC Code</label>
                  <input
                    type="text"
                    value={taxCode}
                    onChange={e => setTaxCode(e.target.value)}
                    placeholder="e.g. HSN-8413"
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tax Category</label>
                  <select
                    value={taxCategory}
                    onChange={e => setTaxCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="GST_18">Standard Goods (18%)</option>
                    <option value="GST_12">Processed Goods (12%)</option>
                    <option value="GST_5">Essential Raw Materials (5%)</option>
                    <option value="GST_28">Special / Heavy Machinery (28%)</option>
                    <option value="GST_EXEMPT">Exempted</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CANONICAL SKU */}
          {activeTab === 'sku' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Primary Canonical SKU Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={skuCode}
                    onChange={e => setSkuCode(e.target.value.toUpperCase())}
                    placeholder="e.g. JYT-PUMP-400"
                    required
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Variant Name</label>
                  <input
                    type="text"
                    value={initialVariantName}
                    onChange={e => setInitialVariantName(e.target.value)}
                    placeholder="e.g. Standard Pack / Base Unit"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Barcode (EAN-13)</label>
                  <button
                    type="button"
                    onClick={() => setBarcode('890' + Math.floor(1000000000 + Math.random() * 9000000000))}
                    className="text-[11px] text-indigo-600 font-medium flex items-center gap-1"
                  >
                    <Barcode className="w-3.5 h-3.5" /> Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  placeholder="e.g. 8901234567890"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Inventory Threshold & Safety Stock Planning
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Reorder Level (ROL)</label>
                    <input
                      type="number"
                      min="0"
                      value={reorderLevel}
                      onChange={e => setReorderLevel(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Reorder Qty (ROQ)</label>
                    <input
                      type="number"
                      min="1"
                      value={reorderQuantity}
                      onChange={e => setReorderQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Min Stock Level</label>
                    <input
                      type="number"
                      min="0"
                      value={minStock}
                      onChange={e => setMinStock(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Max Stock Level</label>
                    <input
                      type="number"
                      min="1"
                      value={maxStock}
                      onChange={e => setMaxStock(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MEDIA ASSETS */}
          {activeTab === 'media' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste image public URL (e.g. https://images.unsplash.com/...)"
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Asset
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-lg border overflow-hidden bg-slate-50 p-2 flex flex-col gap-2 ${
                      img.isPrimary ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt}
                      referrerPolicy="no-referrer"
                      className="w-full h-32 object-cover rounded-md bg-slate-100"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1 ${
                          img.isPrimary
                            ? 'bg-indigo-100 text-indigo-700 font-semibold'
                            : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {img.isPrimary ? <CheckCircle2 className="w-3 h-3" /> : null}
                        {img.isPrimary ? 'Primary Cover' : 'Set as Cover'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Attach Compliance & Technical Document
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Document Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Technical Data Sheet (TDS)"
                      value={newDocTitle}
                      onChange={e => setNewDocTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Document Type</label>
                    <select
                      value={newDocType}
                      onChange={e => setNewDocType(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    >
                      <option value="spec_sheet">Technical Specification (TDS)</option>
                      <option value="coa">Certificate of Analysis (COA)</option>
                      <option value="certificate">ISO / Regulatory Certificate</option>
                      <option value="artwork">Packaging Artwork / CAD</option>
                      <option value="compliance">Safety Data Sheet (MSDS)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">File Source URL</label>
                    <input
                      type="url"
                      placeholder="https://.../doc.pdf"
                      value={newDocUrl}
                      onChange={e => setNewDocUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddDoc}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Attach Document
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                        PDF
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">{d.title}</div>
                        <div className="text-[11px] text-slate-500 uppercase">{d.type} • {d.fileName}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(i)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-200 mt-6">
            <div className="text-xs text-slate-500">
              {product ? `Editing: ${product.product_code}` : 'All inputs validated before database persistence'}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving Master Record...' : product ? 'Update Master Product' : 'Register Product & SKU'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
