"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { NearProfile } from "@/types/find";

interface Props {
  title: string;
  icon: React.ElementType;
  items: NearProfile[];
  renderItem: (item: NearProfile) => React.ReactNode;
  seeAllHref: string;
  loading: boolean;
}

export function HorizontalSection({
  title,
  icon: Icon,
  items,
  renderItem,
  seeAllHref,
  loading,
}: Props) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-text-primary text-sm">{title}</span>
          <span className="text-xs text-text-secondary bg-gray-100 px-2 py-0.5 rounded-full">
            {items.length} nearest
          </span>
        </div>
        <Link
          href={seeAllHref}
          className="flex items-center gap-1 text-xs text-primary font-semibold"
        >
          See all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="overflow-x-auto pb-2 hide-scrollbar">
        <div className="flex gap-4 px-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 shrink-0 w-20">
                  <div className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" />
                  <div className="w-14 h-2 bg-gray-100 rounded animate-pulse" />
                  <div className="w-10 h-2 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            : items.length === 0
            ? (
                <p className="text-sm text-text-secondary px-2 py-4">
                  None found near you yet.
                </p>
              )
            : items.map((item) => renderItem(item))}
        </div>
      </div>
    </div>
  );
}