"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IAsset,
  IUpdateAssetDto,
  AssetCondition,
  AssetStatus,
} from "@/types/asset";

interface EditAssetModalProps {
  asset: IAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: IUpdateAssetDto) => Promise<void>;
}

export function EditAssetModal({
  asset,
  isOpen,
  onClose,
  onSave,
}: EditAssetModalProps) {
  const [formData, setFormData] = useState<IUpdateAssetDto>({
    name: "",
    description: "",
    sku: "",
    serialNumber: "",
    category: "",
    quantity: 1,
    condition: AssetCondition.WORKING,
    status: AssetStatus.AVAILABLE,
    location: "",
    notes: "",
  });

  // Sync state when asset changes
  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        description: asset.description || "",
        sku: asset.sku || "",
        serialNumber: asset.serialNumber || "",
        category: asset.category,
        quantity: asset.quantity,
        condition: asset.condition,
        status: asset.status,
        location: asset.location || "",
        notes: asset.notes || "",
      });
    }
  }, [asset]);

  const handleSave = async () => {
    if (!asset) return;
    await onSave(asset.id, formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-purple-500/30 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tighter text-purple-400">
            Edit Asset
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Modify the details of this asset.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Asset Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">
              Asset Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter asset name..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-zinc-300">
              Category *
            </Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g., Electronics, Tools, Furniture..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* SKU and Serial Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-zinc-300">
                SKU
              </Label>
              <Input
                id="sku"
                value={formData.sku || ""}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value || undefined })
                }
                placeholder="Stock keeping unit"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber" className="text-zinc-300">
                Serial Number
              </Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serialNumber: e.target.value || undefined,
                  })
                }
                placeholder="Serial number"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-zinc-300">
              Quantity *
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: parseInt(e.target.value) || 1,
                })
              }
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Condition and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition" className="text-zinc-300">
                Condition
              </Label>
              <select
                id="condition"
                value={formData.condition}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    condition: e.target.value as AssetCondition,
                  })
                }
                className="w-full h-10 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-white"
              >
                {Object.values(AssetCondition).map((condition) => (
                  <option key={condition} value={condition}>
                    {condition.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-zinc-300">
                Status
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as AssetStatus,
                  })
                }
                className="w-full h-10 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-white"
              >
                {Object.values(AssetStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-zinc-300">
              Location
            </Label>
            <Input
              id="location"
              value={formData.location || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location: e.target.value || undefined,
                })
              }
              placeholder="Where is this asset located?"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">
              Description
            </Label>
            <textarea
              id="description"
              rows={3}
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value || undefined,
                })
              }
              placeholder="Describe the asset..."
              className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-zinc-300">
              Notes
            </Label>
            <textarea
              id="notes"
              rows={2}
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value || undefined })
              }
              placeholder="Additional notes..."
              className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name?.trim() || !formData.category?.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
