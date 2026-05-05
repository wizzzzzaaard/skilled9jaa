"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { useUIStore } from "@/store/uiStore";

interface Category {
  id: string;
  name: string;
  description: string | null;
  booking_type: string;
  is_active: boolean;
  display_order: number;
}

export default function AdminCategoriesPage() {
  const { addToast } = useUIStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const supabase = createClient();
    const { data } = await supabase
      .from("home_service_categories")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) setCategories(data as Category[]);
    setLoading(false);
  }

  async function addCategory() {
    if (!newName.trim()) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("home_service_categories")
      .insert([
        {
          name: newName,
          description: newDesc,
          display_order: categories.length + 1,
        },
      ]);
    if (error) {
      addToast("Failed to add category", "error");
    } else {
      addToast("Category added", "success");
      setNewName("");
      setNewDesc("");
      fetchCategories();
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Categories
      </h1>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Add Category
        </h3>
        <div className="flex gap-3">
          <Input
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <Button variant="primary" onClick={addCategory}>
            Add
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-text-primary">
                      {cat.name}
                    </p>
                    {cat.description && (
                      <p className="text-xs text-text-secondary">
                        {cat.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary capitalize">
                    {cat.booking_type}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={cat.is_active ? "success" : "default"}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              No categories
            </div>
          )}
        </div>
      )}
    </div>
  );
}
