// src/components/ui/product-skeleton.jsx
export function ProductSkeleton() {
  return (
    <div className="space-y-3 p-4 rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="h-48 w-full bg-slate-100 rounded-2xl animate-pulse" />
      <div className="h-5 w-2/3 bg-slate-100 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
    </div>
  );
}