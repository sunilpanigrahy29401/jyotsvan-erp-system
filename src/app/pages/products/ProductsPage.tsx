import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Layers,
  Tag,
  FolderTree,
  Globe,
  Plus,
  RefreshCw,
  TrendingUp,
  Boxes,
  CheckCircle2,
  Database,
  Building2,
} from 'lucide-react';
import type { Product, Category, SKU, ExternalSKUMapping, ProductType, ProductStatus } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

// Tabs & Modals
import { ProductCatalogTab } from './ProductCatalogTab';
import { SkuDirectoryTab } from './SkuDirectoryTab';
import { CategoryTaxonomyTab } from './CategoryTaxonomyTab';
import { MarketplaceMappingsTab } from './MarketplaceMappingsTab';
import { ProductFormModal } from './ProductFormModal';
import { ProductDetailsModal } from './ProductDetailsModal';
import { SkuFormModal } from './SkuFormModal';
import { CategoryFormModal } from './CategoryFormModal';
import { MappingFormModal } from './MappingFormModal';

export type ProductMasterTab = 'catalog' | 'skus' | 'categories' | 'mappings';

export interface ProductsPageProps {
  initialTab?: ProductMasterTab;
  onNavigate?: (path: string) => void;
}

export function ProductsPage({ initialTab = 'catalog', onNavigate }: ProductsPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ProductMasterTab>(initialTab);
  const [isLoading, setIsLoading] = useState(true);

  // Core Data Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [mappings, setMappings] = useState<ExternalSKUMapping[]>([]);

  // Filter States for Catalog Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals Management
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [inspectingProductId, setInspectingProductId] = useState<string | null>(null);

  const [isSkuFormOpen, setIsSkuFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [parentProductForSku, setParentProductForSku] = useState<Product | null>(null);

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [isMappingFormOpen, setIsMappingFormOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ExternalSKUMapping | null>(null);

  // Data Fetching
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsRes, catRes, skusRes, mapRes] = await Promise.all([
        productService.getProducts({
          query: searchQuery || undefined,
          categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
          productType: selectedType !== 'all' ? (selectedType as ProductType) : undefined,
          status: selectedStatus !== 'all' ? (selectedStatus as ProductStatus) : undefined,
          pageSize: 50,
        }),
        productService.getCategories(),
        productService.getSKUs(),
        productService.getExternalMappings(),
      ]);

      setProducts(productsRes.data || []);
      setTotalProducts(productsRes.total || 0);
      setCategories(catRes || []);
      setSkus(skusRes || []);
      setMappings(mapRes || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to sync with InsForge PostgreSQL', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedType, selectedStatus, showToast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Derived Summary Metrics
  const activeProductsCount = products.filter(p => p.status === 'active').length;
  const activeSkusCount = skus.filter(s => s.status === 'active').length;
  const avgMargin = products.length > 0
    ? (
        products.reduce((acc, p) => {
          const cost = Number(p.cost_price) || 0;
          const sell = Number(p.selling_price) || 0;
          const m = sell > 0 ? ((sell - cost) / sell) * 100 : 0;
          return acc + m;
        }, 0) / products.length
      ).toFixed(1)
    : '0';

  const channelsCount = new Set(mappings.map(m => m.platform)).size;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb / Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
            <Database className="w-3.5 h-3.5" />
            <span>Phase 6 • Canonical Master Data</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              InsForge PostgreSQL Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product & SKU Master</h1>
          <p className="text-xs text-slate-500 mt-1">
            Central canonical product identity, multi-variant 1:N SKU matrix, packaging specifications, and omni-channel mappings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAllData()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            Sync DB
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Master Product
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Master Products</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{totalProducts}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">{activeProductsCount} active items</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Canonical SKUs</span>
            <Tag className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{skus.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{activeSkusCount} active variants</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Taxonomy Classes</span>
            <FolderTree className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{categories.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Hierarchical tree</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Channel Mappings</span>
            <Globe className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{mappings.length}</div>
          <div className="text-[11px] text-sky-700 mt-0.5">{channelsCount} platforms linked</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Average Margin</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-700">{avgMargin}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Commercial markup</div>
        </div>
      </div>

      {/* Main Tab Navigation Header */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 shadow-2xs">
        {[
          { id: 'catalog', label: 'Master Catalog', count: totalProducts, icon: Package },
          { id: 'skus', label: 'SKU & Variant Matrix', count: skus.length, icon: Tag },
          { id: 'categories', label: 'Category Taxonomy', count: categories.length, icon: FolderTree },
          { id: 'mappings', label: 'Marketplace Mappings', count: mappings.length, icon: Globe },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProductMasterTab)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {activeTab === 'catalog' && (
        <ProductCatalogTab
          products={products}
          categories={categories}
          totalProducts={totalProducts}
          isLoading={isLoading}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          selectedStatus={selectedStatus}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
          onTypeChange={setSelectedType}
          onStatusChange={setSelectedStatus}
          onOpenCreate={() => {
            setEditingProduct(null);
            setIsProductFormOpen(true);
          }}
          onViewProduct={p => setInspectingProductId(p.id)}
          onEditProduct={p => {
            setEditingProduct(p);
            setIsProductFormOpen(true);
          }}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'skus' && (
        <SkuDirectoryTab
          skus={skus}
          products={products}
          isLoading={isLoading}
          onOpenCreateSku={parent => {
            setEditingSku(null);
            setParentProductForSku(parent || products[0] || null);
            setIsSkuFormOpen(true);
          }}
          onEditSku={(s, p) => {
            setEditingSku(s);
            setParentProductForSku(p || products.find(prod => prod.id === s.product_id) || null);
            setIsSkuFormOpen(true);
          }}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'categories' && (
        <CategoryTaxonomyTab
          categories={categories}
          isLoading={isLoading}
          onOpenCreate={parent => {
            setEditingCategory(parent ? ({ parent_category_id: parent.id } as any) : null);
            setIsCategoryFormOpen(true);
          }}
          onEditCategory={cat => {
            setEditingCategory(cat);
            setIsCategoryFormOpen(true);
          }}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'mappings' && (
        <MarketplaceMappingsTab
          mappings={mappings}
          skus={skus}
          isLoading={isLoading}
          onOpenCreate={() => {
            setEditingMapping(null);
            setIsMappingFormOpen(true);
          }}
          onEditMapping={map => {
            setEditingMapping(map);
            setIsMappingFormOpen(true);
          }}
          onRefresh={loadAllData}
        />
      )}

      {/* MODALS */}
      {/* 1. Full Product Creation / Edit Modal */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => {
          setIsProductFormOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={loadAllData}
      />

      {/* 2. Deep Product Inspection Modal */}
      <ProductDetailsModal
        isOpen={!!inspectingProductId}
        productId={inspectingProductId}
        onClose={() => setInspectingProductId(null)}
        onEditProduct={p => {
          setEditingProduct(p);
          setIsProductFormOpen(true);
        }}
        onAddSku={p => {
          setEditingSku(null);
          setParentProductForSku(p);
          setIsSkuFormOpen(true);
        }}
        onEditSku={(s, p) => {
          setEditingSku(s);
          setParentProductForSku(p);
          setIsSkuFormOpen(true);
        }}
        onRefreshParent={loadAllData}
      />

      {/* 3. Sku Form Modal */}
      <SkuFormModal
        isOpen={isSkuFormOpen}
        sku={editingSku}
        product={parentProductForSku}
        onClose={() => {
          setIsSkuFormOpen(false);
          setEditingSku(null);
          setParentProductForSku(null);
        }}
        onSuccess={loadAllData}
      />

      {/* 4. Category Form Modal */}
      <CategoryFormModal
        isOpen={isCategoryFormOpen}
        category={editingCategory}
        categories={categories}
        onClose={() => {
          setIsCategoryFormOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={loadAllData}
      />

      {/* 5. Channel Mapping Form Modal */}
      <MappingFormModal
        isOpen={isMappingFormOpen}
        mapping={editingMapping}
        skus={skus}
        onClose={() => {
          setIsMappingFormOpen(false);
          setEditingMapping(null);
        }}
        onSuccess={loadAllData}
      />
    </div>
  );
}
