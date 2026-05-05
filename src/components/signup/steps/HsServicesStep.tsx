"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  categories: { id: string; name: string }[];
  loading: boolean;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function HsServicesStep({
  categories,
  loading,
  selectedIds,
  setSelectedIds,
  onSubmit,
  onBack,
}: Props) {
  const [search, setSearch] = useState("");

  function toggle(id: string) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    );
  }

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">
        What services do you offer?
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        Select all that apply. You can update these later.
      </p>

      <div className="mb-4">
        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          No results for "{search}"
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-4 max-h-64 overflow-y-auto">
          {filtered.map((cat) => {
            const selected = selectedIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.id)}
                className={`px-3 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 bg-white text-text-primary hover:border-primary/40"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="text-xs text-text-secondary mb-4">
          {selectedIds.length} service{selectedIds.length !== 1 ? "s" : ""} selected
          {" · "}₦{(selectedIds.length * 1000).toLocaleString()}/month base
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          className="flex-1"
          onClick={onSubmit}
          disabled={selectedIds.length === 0}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}