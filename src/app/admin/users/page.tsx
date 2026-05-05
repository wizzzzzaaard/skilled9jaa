"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/types/profile";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .ilike("full_name", `%${search}%`)
        .limit(50);
      if (data) setUsers(data as Profile[]);
      setLoading(false);
    }
    fetchUsers();
  }, [search]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Users</h1>

      <div className="mb-6">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                  Role
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">
                  State
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user.profile_image_url}
                        name={user.full_name}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary capitalize">
                    {user.active_mode}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        user.account_status === "active"
                          ? "bg-green-100 text-success"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {user.account_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {user.state || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
