export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-[2px]',
    md: 'w-6 h-6 border-[2px]',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-[3px]',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full border-surface-700 border-t-primary-500 animate-spin ${className}`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" />
        <p className="text-sm text-surface-500 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 px-4 py-4">
          {Array.from({ length: cols }).map((_, col) => (
            <div
              key={col}
              className="skeleton h-4 flex-1 rounded"
              style={{ animationDelay: `${(row * cols + col) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
