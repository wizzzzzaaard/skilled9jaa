"use client";

import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";

export default function BillClient() {
  // Placeholder bill data
  const bill = {
    title: "Service Invoice",
    description: "Professional home service",
    lineItems: [
      { item: "Service Fee", qty: 1, amount: 15000 },
      { item: "Materials", qty: 1, amount: 5000 },
    ],
    subtotal: 20000,
    transportFee: 1000,
    platformFee: 500,
    total: 21500,
    status: "sent",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  if (bill.status === "expired") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-text-primary mb-2">
            Expired
          </h1>
          <p className="text-text-secondary">
            This payment link has expired. Contact your provider for a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h1 className="text-xl font-semibold text-text-primary mb-1">
            {bill.title}
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            {bill.description}
          </p>

          {/* Line Items */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-text-secondary">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {bill.lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2">{item.item}</td>
                    <td className="py-2 text-center">{item.qty}</td>
                    <td className="py-2 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Subtotal</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Transport</span>
              <span>{formatCurrency(bill.transportFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Platform Fee</span>
              <span>{formatCurrency(bill.platformFee)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{formatCurrency(bill.total)}</span>
            </div>
          </div>

          {/* Expiry */}
          <p className="text-xs text-text-secondary mt-4">
            Expires on {bill.expiresAt.toLocaleDateString()}
          </p>

          {/* Pay Button */}
          <Button variant="primary" className="w-full mt-6">
            Pay Now
          </Button>
        </div>
      </div>
    </div>
  );
}
