import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ChevronRight, CornerDownLeft, Sparkles, Layers } from 'lucide-react';
import { getSearchableNavItems, type SearchableItem } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import { accessControlService } from '../../services/accessControl';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function GlobalSearchModal({ isOpen, onClose, onNavigate }: GlobalSearchModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => {
    const raw = getSearchableNavItems();
    if (!user || user.status !== 'active') return [];
    if (user.is_super_admin) return raw;
    return raw.filter((item) => {
      if (!item.requiredPermission) return true;
      return accessControlService.hasPermission(user, item.requiredPermission);
    });
  }, [user]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Show default top recommendations/frequent sections
      return allItems.slice(0, 8);
    }
    const q = query.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        (item.parentTitle && item.parentTitle.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [query, allItems]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard events inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item: SearchableItem) => {
    onNavigate(item.path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search platform modules, operations, settings (e.g. 'inventory', 'amazon', 'procurement')..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px] text-slate-400">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-700">No matching modules found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try searching for 'Commerce', 'Operations', 'Finance', or 'Warehouse'.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {query ? 'Search Results' : 'Suggested Jump Locations'}
              </div>
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.path}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        {item.title.includes('AI') ? (
                          <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                        ) : (
                          <Layers className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.grandParentTitle && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {item.grandParentTitle} <ChevronRight className="w-2.5 h-2.5 inline text-slate-300" />
                            </span>
                          )}
                          {item.parentTitle && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {item.parentTitle} <ChevronRight className="w-2.5 h-2.5 inline text-slate-300" />
                            </span>
                          )}
                          <span className="font-semibold text-slate-900">{item.title}</span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {item.plannedPhase?.split('/')[0].trim()}
                      </span>
                      {isSelected && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Guide */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-[9px]">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-[9px]">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-[9px]">↵</kbd>
              open
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Global Search Shell • Phase 2
          </span>
        </div>
      </div>
    </div>
  );
}
