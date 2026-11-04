import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { TableSkeleton } from './skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Pagination } from './pagination';
import { BulkActionBar } from './bulk-action-bar';
import type { TableColumn, SortState, SortDirection } from '../../types/common';

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T, index: number) => string;

  // Sorting
  sortState?: SortState;
  onSortChange?: (sort: SortState) => void;

  // Selection
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  selectable?: boolean;
  bulkActions?: (selectedKeys: string[], clearSelection: () => void) => React.ReactNode;

  // Row Interactions
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T, index: number) => string | undefined;

  // States
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;

  // Pagination
  page?: number;
  pageSize?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];

  // Layout & Styling
  title?: React.ReactNode;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  className?: string;
  dense?: boolean;
  striped?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  sortState,
  onSortChange,
  selectedKeys = [],
  onSelectionChange,
  selectable = false,
  bulkActions,
  onRowClick,
  rowClassName,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching the current filters or query.',
  emptyActionLabel,
  onEmptyAction,
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  title,
  headerSlot,
  footerSlot,
  className,
  dense = false,
  striped = false,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<SortState>({
    column: '',
    direction: null,
  });

  const activeSort = sortState || internalSort;

  const handleSortClick = (colKey: string, isSortable?: boolean) => {
    if (!isSortable) return;

    let nextDir: SortDirection = 'asc';
    if (activeSort.column === colKey) {
      if (activeSort.direction === 'asc') nextDir = 'desc';
      else if (activeSort.direction === 'desc') nextDir = null;
      else nextDir = 'asc';
    }

    const newSort: SortState = {
      column: nextDir ? colKey : '',
      direction: nextDir,
    };

    if (onSortChange) {
      onSortChange(newSort);
    } else {
      setInternalSort(newSort);
    }
  };

  // Client-side sorting fallback when onSortChange is not provided
  const processedData = useMemo(() => {
    if (onSortChange || !activeSort.column || !activeSort.direction) {
      return data;
    }

    const col = columns.find((c) => c.key === activeSort.column);
    if (!col) return data;

    return [...data].sort((a, b) => {
      let valA: unknown;
      let valB: unknown;

      if (typeof col.accessor === 'function') {
        valA = col.accessor(a);
        valB = col.accessor(b);
      } else if (col.accessor) {
        valA = a[col.accessor];
        valB = b[col.accessor];
      } else {
        valA = (a as Record<string, unknown>)[col.key];
        valB = (b as Record<string, unknown>)[col.key];
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const compareRes = valA < valB ? -1 : 1;
      return activeSort.direction === 'asc' ? compareRes : -compareRes;
    });
  }, [data, columns, activeSort, onSortChange]);

  // Selection handlers
  const allRowKeys = useMemo(() => {
    return processedData.map((item, idx) => keyExtractor(item, idx));
  }, [processedData, keyExtractor]);

  const isAllSelected = allRowKeys.length > 0 && allRowKeys.every((k) => selectedKeys.includes(k));
  const isSomeSelected = selectedKeys.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allRowKeys);
    }
  };

  const handleSelectRow = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedKeys.includes(key)) {
      onSelectionChange(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedKeys, key]);
    }
  };

  const clearSelection = () => {
    if (onSelectionChange) onSelectionChange([]);
  };

  // Render cell content
  const renderCell = (item: T, col: TableColumn<T>, index: number) => {
    if (col.render) {
      return col.render(item, index);
    }
    if (typeof col.accessor === 'function') {
      return col.accessor(item);
    }
    if (col.accessor) {
      return (item[col.accessor] as React.ReactNode) ?? '—';
    }
    return ((item as Record<string, unknown>)[col.key] as React.ReactNode) ?? '—';
  };

  const getPriorityClasses = (priority?: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'medium':
        return 'hidden md:table-cell';
      case 'low':
        return 'hidden lg:table-cell';
      default:
        return '';
    }
  };

  const totalPages =
    page && pageSize && totalRecords !== undefined
      ? Math.ceil(totalRecords / pageSize)
      : undefined;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header Slot / Search / Filter Bars */}
      {headerSlot && <div className="w-full">{headerSlot}</div>}

      {/* Floating or Top Bulk Action Bar */}
      {selectable && selectedKeys.length > 0 && bulkActions && (
        <BulkActionBar
          selectedCount={selectedKeys.length}
          totalCount={totalRecords || data.length}
          onClearSelection={clearSelection}
          onSelectAll={isAllSelected ? undefined : () => onSelectionChange?.(allRowKeys)}
        >
          {bulkActions(selectedKeys, clearSelection)}
        </BulkActionBar>
      )}

      {/* Table Container Card */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
        {title && (
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            {typeof title === 'string' ? (
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            ) : (
              title
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && <TableSkeleton rows={pageSize || 5} cols={columns.length + (selectable ? 1 : 0)} />}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-6">
            <ErrorState message={error} onRetry={onRetry} />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && processedData.length === 0 && (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            onAction={onEmptyAction}
            className="border-0 bg-white"
          />
        )}

        {/* Standard Data Table */}
        {!isLoading && !error && processedData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700">
                  {selectable && (
                    <th className="w-10 px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center justify-center"
                        title={isAllSelected ? 'Deselect all' : 'Select all'}
                        aria-label={isAllSelected ? 'Deselect all' : 'Select all'}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-slate-900" />
                        ) : isSomeSelected ? (
                          <MinusSquare className="w-4 h-4 text-slate-700" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </th>
                  )}

                  {columns.map((col) => {
                    const isSorted = activeSort.column === col.key;
                    const sortDir = isSorted ? activeSort.direction : null;

                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    return (
                      <th
                        key={col.key}
                        style={{ width: col.width, minWidth: col.minWidth }}
                        className={cn(
                          'px-4 py-3 font-semibold text-slate-700 text-xs select-none tracking-tight',
                          alignClass,
                          col.sortable && 'cursor-pointer hover:bg-slate-100/80 transition-colors',
                          getPriorityClasses(col.priority),
                          col.headerClassName
                        )}
                        onClick={() => handleSortClick(col.key, col.sortable)}
                      >
                        <div
                          className={cn(
                            'inline-flex items-center gap-1.5',
                            col.align === 'right' && 'justify-end w-full',
                            col.align === 'center' && 'justify-center w-full'
                          )}
                        >
                          <span>{col.header}</span>
                          {col.sortable && (
                            <span className="text-slate-400">
                              {sortDir === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-slate-900" />
                              ) : sortDir === 'desc' ? (
                                <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {processedData.map((item, index) => {
                  const rowKey = keyExtractor(item, index);
                  const isSelected = selectedKeys.includes(rowKey);
                  const isClickable = Boolean(onRowClick);

                  return (
                    <tr
                      key={rowKey}
                      onClick={() => onRowClick && onRowClick(item)}
                      className={cn(
                        'transition-colors text-slate-800',
                        striped && index % 2 === 1 && 'bg-slate-50/50',
                        isSelected && 'bg-slate-50 font-medium',
                        isClickable && 'cursor-pointer hover:bg-slate-50/80',
                        !isClickable && 'hover:bg-slate-50/50',
                        rowClassName?.(item, index)
                      )}
                    >
                      {selectable && (
                        <td className="w-10 px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleSelectRow(rowKey, e)}
                            className="text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center justify-center"
                            aria-label={`Select row ${index + 1}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-slate-900" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}

                      {columns.map((col) => {
                        const alignClass =
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left';

                        return (
                          <td
                            key={col.key}
                            className={cn(
                              'px-4 text-slate-700',
                              dense ? 'py-2' : 'py-3',
                              alignClass,
                              getPriorityClasses(col.priority),
                              col.className
                            )}
                          >
                            {renderCell(item, col, index)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Section */}
        {!isLoading && !error && processedData.length > 0 && page && pageSize && totalRecords !== undefined && totalPages !== undefined && onPageChange && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={pageSizeOptions}
          />
        )}

        {footerSlot && <div className="p-3 border-t border-slate-100">{footerSlot}</div>}
      </div>
    </div>
  );
}
