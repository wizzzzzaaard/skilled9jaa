"use client";

export function ViewToggle() {
  return (
    <div className="flex justify-center gap-2 px-4 py-3">
      <div className="flex items-center bg-gray-100 rounded-2xl p-1">
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-semibold text-text-primary">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          2D View
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-text-secondary">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
            />
          </svg>
          3D View
        </button>
      </div>
    </div>
  );
}