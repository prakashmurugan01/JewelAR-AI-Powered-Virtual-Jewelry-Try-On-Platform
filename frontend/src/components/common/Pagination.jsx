import React from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
}) {
  const pageSizes = [10, 25, 50, 100];
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/10">
      <div className="text-sm text-white/50">
        Showing <span className="text-white/70 font-medium">{startItem}</span> to{' '}
        <span className="text-white/70 font-medium">{endItem}</span> of{' '}
        <span className="text-white/70 font-medium">{totalItems}</span> items
      </div>

      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <HiChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-3">
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const page = Math.max(1, currentPage - 2) + i;
            if (page > totalPages) return null;

            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-500/30 border border-blue-500/50 text-blue-200'
                    : 'bg-white/5 hover:bg-white/10 text-white/70'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <HiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
