"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";

interface ManualPayment {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  profiles: { full_name: string; account_status: string; email: string } | null;
}

interface Order {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  transaction_ref: string | null;
  order_type: string;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
}

async function callAdminPayments(action: string, body?: object) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-payments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ action, ...body }),
    }
  );
  return res.json();
}

export default function AdminPaymentsPage() {
  const [manualPayments, setManualPayments] = useState<ManualPayment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"manual" | "paystack">("manual");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [manualRes, ordersRes] = await Promise.all([
      callAdminPayments("fetch_manual"),
      callAdminPayments("fetch_orders"),
    ]);
    if (manualRes.data) setManualPayments(manualRes.data);
    if (ordersRes.data) setOrders(ordersRes.data);
    setLoading(false);
  }

  async function approveManualPayment(payment: ManualPayment) {
    setApprovingId(payment.id);
    const res = await callAdminPayments("approve_payment", {
      payment_id: payment.id,
      user_id: payment.user_id,
    });
    if (res.success) {
      setManualPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, status: "approved", approved_at: new Date().toISOString() }
            : p
        )
      );
    }
    setApprovingId(null);
  }

  const pendingCount = manualPayments.filter((p) => p.status === "pending").length;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Payments</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("manual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "manual" ? "bg-primary text-white" : "bg-white border border-gray-200 text-text-secondary"
          }`}
        >
          Manual Transfers
          {pendingCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("paystack")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "paystack" ? "bg-primary text-white" : "bg-white border border-gray-200 text-text-secondary"
          }`}
        >
          Paystack Orders
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : tab === "manual" ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {manualPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-text-primary">
                      {payment.profiles?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {payment.profiles?.email || payment.user_id.substring(0, 8)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 text-xs text-text-secondary">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={payment.status === "approved" ? "success" : "warning"}>
                      {payment.status === "approved" ? "Payment Confirmed" : "Pending"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {payment.status === "pending" && (
                      <Button
                        variant="primary"
                        className="text-xs py-1.5 px-3"
                        isLoading={approvingId === payment.id}
                        onClick={() => approveManualPayment(payment)}
                      >
                        Approve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {manualPayments.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No manual payments</div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">Ref</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-text-primary">
                      {order.profiles?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-text-secondary">{order.profiles?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    {formatCurrency(order.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary capitalize">
                    {order.order_type}
                  </td>
                  <td className="px-6 py-4 text-xs text-text-secondary font-mono">
                    {order.transaction_ref?.substring(0, 12) || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={order.status === "verified" ? "success" : "warning"}>
                      {order.status === "verified" ? "Payment Confirmed" : order.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No Paystack orders</div>
          )}
        </div>
      )}
    </div>
  );
}