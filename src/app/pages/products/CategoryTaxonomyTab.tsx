import { useState } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Layers,
  Package,
  CheckCircle2,
} from 'lucide-react';
import type { Category } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useToast } from '../../../context/ToastContext';

interface CategoryTaxonomyTabProps {
  categories: Category[];
  isLoading: boolean;
  onOpenCreate: (parentCategory?: Category) => void;
  onEditCategory: (category: Category) => void;
  onRefresh: () => void;
}

export function CategoryTaxonomyTab({
  categories,
  isLoading,
  onOpenCreate,
  onEditCategory,
  onRefresh,
}: CategoryTaxonomyTabProps) {
  const { showToast } = useToast();
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'cat-01': true,
    'cat-02': true,
    'cat-03': true,
  });

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete or archive category "${category.name}" (${category.code})?`)) return;
    try {
      const res = await productService.deleteCategory(category.id);
      showToast(res.message || 'Category deleted successfully', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    }
  };

  // Build tree
  const rootCategories = categories.filter(c => !c.parent_category_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_category_id === parentId);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Enterprise Product Taxonomy Hierarchy</h3>
          <p className="text-xs text-slate-500">
            Organize multi-tier product families, sub-assemblies, and finished goods classifications
          </p>
        </div>
        <button
          onClick={() => onOpenCreate()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Root Category
        </button>
      </div>

      {/* Category Tree Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading taxonomy tree from InsForge PostgreSQL...
          </div>
        ) : rootCategories.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <FolderTree className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No categories defined yet. Click &quot;Add Root Category&quot; to begin.
          </div>
        ) : (
          <div className="space-y-3">
            {rootCategories.map(root => {
              const children = getChildren(root.id);
              const isExpanded = expandedNodes[root.id] ?? true;

              return (
                <div key={root.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {/* Root Node Row */}
                  <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      {children.length > 0 ? (
                        <button
                          onClick={() => toggleNode(root.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      ) : (
                        <div className="w-6" />
                      )}
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{root.name}</span>
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {root.code}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            root.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {root.status}
                          </span>
                        </div>
                        {root.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{root.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenCreate(root)}
                        title="Add Subcategory"
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-md border border-slate-200 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Subcategory
                      </button>
                      <button
                        onClick={() => onEditCategory(root)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(root)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Children Subcategories */}
                  {isExpanded && children.length > 0 && (
                    <div className="p-3 pl-12 space-y-2 bg-slate-50/70 border-t border-slate-100">
                      {children.map(child => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-xs">
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 text-xs">{child.name}</span>
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                  {child.code}
                                </span>
                              </div>
                              {child.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{child.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onEditCategory(child)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(child)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
