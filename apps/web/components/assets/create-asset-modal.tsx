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
import { useAssets } from "@/hooks/useAssets";
import { Plus } from "lucide-react";
import { AssetCondition, AssetStatus, ICreateAssetDto } from "@/types/asset";

interface CreateAssetModalProps {
  userId: string;
}

export function CreateAssetModal({ userId }: CreateAssetModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ICreateAssetDto>({
    name: "",
    category: "",
    quantity: 1,
    condition: AssetCondition.WORKING,
    status: AssetStatus.AVAILABLE,
  });

  const { createAsset } = useAssets(userId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category.trim()) return;

    await createAsset(formData);
    setFormData({
      name: "",
      category: "",
      quantity: 1,
      condition: AssetCondition.WORKING,
      status: AssetStatus.AVAILABLE,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4" /> Add Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-purple-500/30 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tighter text-purple-400">
            Add New Asset
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">
              Asset Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter asset name..."
              className="bg-zinc-800 border-zinc-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-zinc-300">
              Category
            </Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g., Electronics, Tools, Furniture..."
              className="bg-zinc-800 border-zinc-700 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-zinc-300">
                Quantity
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
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku" className="text-zinc-300">
                SKU (Optional)
              </Label>
              <Input
                id="sku"
                value={formData.sku || ""}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="Stock keeping unit"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

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
                    {condition}
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
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-zinc-300">
              Location (Optional)
            </Label>
            <Input
              id="location"
              value={formData.location || ""}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Where is this asset located?"
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
              disabled={!formData.name.trim() || !formData.category.trim()}
            >
              Create Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
