import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar />
      {/* The site layout already provides <main>. */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
