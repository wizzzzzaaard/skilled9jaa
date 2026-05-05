"use client";

export function RadarLoading() {
  return (
    <div className="w-full aspect-square flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-text-secondary">Finding professionals...</p>
      </div>
    </div>
  );
}