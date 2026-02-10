'use client';

import { useState } from 'react';
import { useAssets } from '@/hooks/useAssets';
import { useAssetSocket } from '@/hooks/use-assets.socket';
import { authClient } from '@/lib/auth-client';
import { IAsset, IAssetFilters, IUpdateAssetDto, AssetCondition, AssetStatus } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Package, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateAssetModal } from '@/components/assets/create-asset-modal';
import { EditAssetModal } from '@/components/assets/edit-asset-modal';

export default function AssetsPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<IAssetFilters>({});

  const { assets, isLoading, deleteAsset, updateAsset } = useAssets(userId, filters, searchQuery);
  
  // WebSocket for real-time updates
  useAssetSocket(userId);

  // Edit modal state
  const [editingAsset, setEditingAsset] = useState<IAsset | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEdit = (asset: IAsset) => {
    setEditingAsset(asset);
    setIsEditModalOpen(true);
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    setEditingAsset(null);
  };

  const handleEditSave = async (id: string, data: IUpdateAssetDto) => {
    await updateAsset(id, data);
  };

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Assets</h1>
          <p className="text-zinc-400 mt-1">Manage equipment and resources</p>
        </div>
        <CreateAssetModal userId={userId} />
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black/40 border-zinc-700 text-white"
          />
        </div>
      </div>

      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Category</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-zinc-500 uppercase">Available</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    <div className="space-y-2">
                      <p>No assets found</p>
                      <p className="text-sm">Add your first asset to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} onDelete={() => deleteAsset(asset.id)} onEdit={() => handleEdit(asset)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditAssetModal
        asset={editingAsset}
        isOpen={isEditModalOpen}
        onClose={handleEditClose}
        onSave={handleEditSave}
      />
    </div>
  );
}

function AssetRow({ asset, onDelete, onEdit }: { asset: IAsset; onDelete: () => void; onEdit: () => void }) {
  const availability = asset.quantity > 0 ? Math.round((asset.available / asset.quantity) * 100) : 0;

  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Package className="h-5 w-5 text-zinc-500" />
          </div>
          <div>
            <p className="font-medium text-zinc-200">{asset.name}</p>
            {asset.sku && <p className="text-xs text-zinc-500">SKU: {asset.sku}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
          {asset.category}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className={cn(
            "font-semibold",
            availability > 50 ? "text-green-400" : availability > 0 ? "text-yellow-400" : "text-red-400"
          )}>
            {asset.available}
          </span>
          <span className="text-zinc-500">/ {asset.quantity}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
          getStatusStyles(asset.status)
        )}>
          {asset.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
            <Pencil className="h-4 w-4 text-zinc-500" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500/60 hover:text-red-500" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function getStatusStyles(status: AssetStatus) {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case AssetStatus.DEPLOYED:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case AssetStatus.RESERVED:
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case AssetStatus.IN_TRANSIT:
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case AssetStatus.UNAVAILABLE:
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}
