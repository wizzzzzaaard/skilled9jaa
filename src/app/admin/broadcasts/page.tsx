"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";

export default function AdminBroadcastsPage() {
  const { addToast } = useUIStore();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [sending, setSending] = useState(false);

  async function sendBroadcast() {
    if (!title.trim() || !message.trim()) {
      addToast("Title and message are required", "error");
      return;
    }

    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from("broadcasts").insert([
      {
        title,
        message,
        target_role: targetRole,
        type: "announcement",
      },
    ]);

    if (error) {
      addToast("Failed to send broadcast", "error");
    } else {
      addToast("Broadcast sent", "success");
      setTitle("");
      setMessage("");
    }
    setSending(false);
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Broadcasts
      </h1>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <Input
          label="Title"
          placeholder="Announcement title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1.5">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-text-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Your message..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1.5">
            Target
          </label>
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">All Users</option>
            <option value="client">Clients</option>
            <option value="artisan">Artisans</option>
            <option value="home_service_provider">Home Service Providers</option>
            <option value="company">Companies</option>
          </select>
        </div>

        <Button
          variant="primary"
          onClick={sendBroadcast}
          isLoading={sending}
          className="w-full"
        >
          Send Broadcast
        </Button>
      </div>
    </div>
  );
}
