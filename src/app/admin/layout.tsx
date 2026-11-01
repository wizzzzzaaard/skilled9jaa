import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminNotices } from "@/components/layout/AdminNotices";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:flex min-h-screen bg-surface -mt-11">
      <AdminSidebar />
      {/* The site layout already provides <main>. */}
      <div className="flex-1 min-w-0">
        <AdminNotices />
        {children}
      </div>
    </div>
  );
}
