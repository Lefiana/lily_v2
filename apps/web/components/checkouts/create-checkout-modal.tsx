"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCheckouts } from "@/hooks/useCheckouts";
import { useAvailableAssets } from "@/hooks/useAssets";
import { Plus, X } from "lucide-react";
import {
  ICreateCheckoutDto,
  ICheckoutItemDto,
  AssetCondition,
} from "@/types/asset";

interface CreateCheckoutModalProps {
  userId: string;
}

const getDefaultDueDate = (): string => {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Round to nearest hour for better UX
  date.setMinutes(0, 0, 0);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  return date.toISOString().substring(0, 16);
};

export function CreateCheckoutModal({ userId }: CreateCheckoutModalProps) {
  const [open, setOpen] = useState(false);
  const defaultDueDate = getDefaultDueDate();
  const [formData, setFormData] = useState<{
    borrowerName: string;
    borrowerEmail: string;
    borrowerPhone: string;
    borrowerDepartment: string;
    dueDate: string;
    remarks: string;
    items: ICheckoutItemDto[];
  }>({
    borrowerName: "",
    borrowerEmail: "",
    borrowerPhone: "",
    borrowerDepartment: "",
    dueDate: defaultDueDate,
    remarks: "",
    items: [],
  });

  const { createCheckout } = useCheckouts(userId);
  const { assets: availableAssets } = useAvailableAssets(userId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.borrowerName.trim() || formData.items.length === 0) return;

    await createCheckout({
      borrowerName: formData.borrowerName,
      borrowerEmail: formData.borrowerEmail || undefined,
      borrowerPhone: formData.borrowerPhone || undefined,
      borrowerDepartment: formData.borrowerDepartment || undefined,
      dueDate: new Date(formData.dueDate),
      remarks: formData.remarks || undefined,
      items: formData.items,
    });
    setFormData({
      borrowerName: "",
      borrowerEmail: "",
      borrowerPhone: "",
      borrowerDepartment: "",
      dueDate: defaultDueDate,
      remarks: "",
      items: [],
    });
    setOpen(false);
  };

  const addItem = (assetId: string, quantity: number) => {
    const existingItem = formData.items.find(
      (item) => item.assetId === assetId,
    );
    if (existingItem) {
      setFormData({
        ...formData,
        items: formData.items.map((item) =>
          item.assetId === assetId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        ),
      });
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, { assetId, quantity }],
      });
    }
  };

  const removeItem = (assetId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((item) => item.assetId !== assetId),
    });
  };

  const getAssetName = (assetId: string) => {
    return (
      availableAssets.find((a) => a.id === assetId)?.name || "Unknown Asset"
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4" /> New Checkout
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-purple-500/30 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tighter text-purple-400">
            New Checkout
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          {/* Borrower Information */}
          <div className="space-y-2">
            <Label htmlFor="borrowerName" className="text-zinc-300">
              Borrower Name *
            </Label>
            <Input
              id="borrowerName"
              value={formData.borrowerName}
              onChange={(e) =>
                setFormData({ ...formData, borrowerName: e.target.value })
              }
              placeholder="Who is borrowing these assets?"
              className="bg-zinc-800 border-zinc-700 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="borrowerEmail" className="text-zinc-300">
                Email
              </Label>
              <Input
                id="borrowerEmail"
                type="email"
                value={formData.borrowerEmail}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    borrowerEmail: e.target.value || "",
                  })
                }
                placeholder="borrower@example.com"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="borrowerPhone" className="text-zinc-300">
                Phone
              </Label>
              <Input
                id="borrowerPhone"
                value={formData.borrowerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, borrowerPhone: e.target.value })
                }
                placeholder="Contact number"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="borrowerDepartment" className="text-zinc-300">
              Department
            </Label>
            <Input
              id="borrowerDepartment"
              value={formData.borrowerDepartment}
              onChange={(e) =>
                setFormData({ ...formData, borrowerDepartment: e.target.value })
              }
              placeholder="e.g., IT, Marketing, Engineering..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-zinc-300">
              Due Date & Time *
            </Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700 text-white"
              required
            />
          </div>

          {/* Asset Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Add Assets *</Label>
            <div className="bg-zinc-800 border border-zinc-700 rounded-md p-3 max-h-40 overflow-y-auto">
              {availableAssets.length === 0 ? (
                <p className="text-zinc-500 text-sm">
                  No available assets to checkout
                </p>
              ) : (
                availableAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between py-2 border-b border-zinc-700 last:border-0"
                  >
                    <div>
                      <p className="text-white text-sm">{asset.name}</p>
                      <p className="text-zinc-500 text-xs">
                        {asset.available} available
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => addItem(asset.id, 1)}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Items */}
          {formData.items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Selected Items</Label>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-3">
                {formData.items.map((item) => (
                  <div
                    key={item.assetId}
                    className="flex items-center justify-between py-2 border-b border-zinc-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white text-sm">
                        {getAssetName(item.assetId)}
                      </span>
                      <span className="text-zinc-500 text-xs">
                        x{item.quantity}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.assetId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-zinc-300">
              Remarks
            </Label>
            <Input
              id="remarks"
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              placeholder="Any additional notes..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={
                !formData.borrowerName.trim() || formData.items.length === 0
              }
            >
              Create Checkout
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
