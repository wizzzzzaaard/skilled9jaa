import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:flex min-h-screen bg-surface -mt-11">
      <AdminSidebar />
      {/* The site layout already provides <main>. */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
