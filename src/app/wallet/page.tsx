"use client";

import { useSession } from "@/lib/hooks/useSession";
import { useWallet } from "@/lib/hooks/useWallet";
import { PageLoader } from "@/components/layout/PageLoader";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils/format";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export default function WalletPage() {
  const { user, isLoading } = useSession();
  const { data: wallet, isLoading: walletLoading } = useWallet(user?.id);

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">
          Wallet
        </h1>

        {/* Balance Card */}
        <div className="bg-primary rounded-2xl p-6 md:p-8 text-white mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <WalletIcon className="w-5 h-5" />
            </div>
            <span className="text-white/80 font-semibold">Total Balance</span>
          </div>
          {walletLoading ? (
            <Skeleton className="h-10 w-32 bg-white/20" />
          ) : (
            <p className="text-4xl font-semibold">
              {formatCurrency(wallet?.balance || 0)}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownLeft className="w-4 h-4 text-success" />
              <span className="text-xs text-text-secondary">Total Earned</span>
            </div>
            {walletLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="text-lg font-semibold text-text-primary">
                {formatCurrency(wallet?.total_earned || 0)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-error" />
              <span className="text-xs text-text-secondary">Withdrawn</span>
            </div>
            {walletLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="text-lg font-semibold text-text-primary">
                {formatCurrency(wallet?.total_withdrawn || 0)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <WalletIcon className="w-4 h-4 text-primary" />
              <span className="text-xs text-text-secondary">In Escrow</span>
            </div>
            {walletLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="text-lg font-semibold text-text-primary">
                {formatCurrency(wallet?.escrow_balance || 0)}
              </p>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Recent Transactions
          </h2>
          <div className="text-center py-8 text-text-secondary">
            No transactions yet
          </div>
        </div>
      </div>
    </div>
  );
}
