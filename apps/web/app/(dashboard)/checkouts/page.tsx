'use client';

import { useMemo } from 'react';
import { useCheckouts } from '@/hooks/useCheckouts';
import { useCheckoutSocket } from '@/hooks/use-assets.socket';
import { authClient } from '@/lib/auth-client';
import { IAssetCheckout, CheckoutStatus } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CreateCheckoutModal } from '@/components/checkouts/create-checkout-modal';

export default function CheckoutsPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || '';

  const { checkouts, isLoading, overdueCount, processReturn, cancelCheckout } = useCheckouts(userId);
  
  // WebSocket for real-time updates
  useCheckoutSocket(userId);

  // Compute overdue status
  const computedCheckouts = useMemo(() => {
    const now = new Date();
    return checkouts.map(checkout => {
      const dueDate = new Date(checkout.dueDate);
      const isOverdue = !checkout.returnedAt && now > dueDate;
      return {
        ...checkout,
        isOverdue,
        daysOverdue: isOverdue ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        computedStatus: isOverdue ? CheckoutStatus.OVERDUE : checkout.status,
      };
    }).sort((a, b) => {
      // Sort: overdue first, then by due date
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [checkouts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Checkouts</h1>
            <p className="text-zinc-400 mt-1">Track borrowed assets and returns</p>
          </div>
          {overdueCount > 0 && (
            <Badge className="gap-1 bg-red-500/20 text-red-400 border-red-500/30">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} Overdue
            </Badge>
          )}
        </div>
        <CreateCheckoutModal userId={userId} />
      </div>

      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Borrower</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-zinc-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {computedCheckouts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    <div className="space-y-2">
                      <p>No checkouts found</p>
                      <p className="text-sm">Create a new checkout to track borrowed assets</p>
                    </div>
                  </td>
                </tr>
              ) : (
                computedCheckouts.map((checkout) => (
                  <CheckoutRow 
                    key={checkout.id} 
                    checkout={checkout} 
                    onReturn={() => processReturn(checkout.id, { 
                      condition: checkout.items[0]?.asset.condition || 'WORKING' as any, 
                      damageFlag: false 
                    })}
                    onCancel={() => cancelCheckout(checkout.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CheckoutRow({ 
  checkout, 
  onReturn, 
  onCancel 
}: { 
  checkout: IAssetCheckout & { isOverdue?: boolean; daysOverdue?: number; computedStatus?: CheckoutStatus };
  onReturn: () => void;
  onCancel: () => void;
}) {
  const status = checkout.computedStatus || checkout.status;
  const totalItems = checkout.items.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <tr className={cn(
      "hover:bg-white/[0.02] transition-colors",
      checkout.isOverdue && "bg-red-500/5"
    )}>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-zinc-200">{checkout.borrowerName}</p>
          {checkout.borrowerDepartment && (
            <p className="text-xs text-zinc-500">{checkout.borrowerDepartment}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-zinc-300">{totalItems} item(s)</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className={cn(
            "text-sm",
            checkout.isOverdue ? "text-red-400 font-semibold" : "text-zinc-400"
          )}>
            {new Date(checkout.dueDate).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </span>
          {checkout.isOverdue && (
            <span className="text-xs text-red-500">
              {checkout.daysOverdue} day{checkout.daysOverdue !== 1 ? 's' : ''} overdue
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
          getStatusStyles(status)
        )}>
          {getStatusIcon(status)}
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {checkout.status === CheckoutStatus.BORROWED && (
          <div className="flex gap-2 justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onReturn} 
              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
            >
              Return
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onCancel} 
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Cancel
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

function getStatusStyles(status: CheckoutStatus) {
  switch (status) {
    case CheckoutStatus.BORROWED:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case CheckoutStatus.RETURNED:
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case CheckoutStatus.OVERDUE:
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case CheckoutStatus.DAMAGED:
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case CheckoutStatus.LOST:
      return 'bg-red-900/20 text-red-500 border-red-900/30';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}

function getStatusIcon(status: CheckoutStatus) {
  switch (status) {
    case CheckoutStatus.BORROWED:
      return <Clock className="h-3 w-3" />;
    case CheckoutStatus.RETURNED:
      return <CheckCircle className="h-3 w-3" />;
    case CheckoutStatus.OVERDUE:
      return <AlertTriangle className="h-3 w-3" />;
    default:
      return null;
  }
}
