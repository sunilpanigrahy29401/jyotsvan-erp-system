import { useState, useEffect } from 'react';
import { X, FolderTree, AlertCircle, Save } from 'lucide-react';
import type { Category } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface CategoryFormModalProps {
  isOpen: boolean;
  category?: Category | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoryFormModal({
  isOpen,
  category,
  categories,
  onClose,
  onSuccess,
}: CategoryFormModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setCode(category.code);
      setDescription(category.description || '');
      setParentCategoryId(category.parent_category_id || '');
      setStatus(category.status === 'inactive' ? 'inactive' : 'active');
    } else {
      setName('');
      setCode('');
      setDescription('');
      setParentCategoryId('');
      setStatus('active');
    }
    setError(null);
  }, [category, isOpen]);

  // Auto-generate code from name if creating new
  const handleNameChange = (val: string) => {
    setName(val);
    if (!category) {
      const generated = val
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .substring(0, 20);
      setCode(generated ? `CAT-${generated}` : '');
    }
  };

  if (!isOpen) return null;

  const availableParents = categories.filter(c => !category || c.id !== category.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }
    if (!code.trim()) {
      setError('Category code is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (category) {
        await productService.updateCategory(
          category.id,
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || null,
            parent_category_id: parentCategoryId || null,
            status,
          },
          { id: user?.id, email: user?.email }
        );
        showToast('Category updated successfully', 'success');
      } else {
        await productService.createCategory(
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || null,
            parent_category_id: parentCategoryId || null,
            status,
          },
          { id: user?.id, email: user?.email }
        );
        showToast('Category created successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {category ? 'Edit Category' : 'Create Product Category'}
              </h3>
              <p className="text-xs text-slate-500">
                Define taxonomy classification and hierarchical parentage
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Industrial Hydraulic Systems"
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CAT-HYD-IND"
              required
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Unique identifier used in SKU generation and ERP ledger indexing
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Parent Category (Optional)
            </label>
            <select
              value={parentCategoryId}
              onChange={e => setParentCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">-- None (Top Level Root Category) --</option>
              {availableParents.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide context on product classes belonging to this taxonomy group..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="radio"
                  name="cat_status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Active
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="radio"
                  name="cat_status"
                  value="inactive"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Inactive
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
