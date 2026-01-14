'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function FileUpload({ taskId }: { taskId: string }) {
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    
    setUploading(true)
    const formData = new FormData()
    // Using 'files' to match your /bulk endpoint
    Array.from(e.target.files).forEach(file => {
      formData.append('files', file)
    })

    try {
      await api.post(`/tasks/${taskId}/attachments/bulk`, formData)
      console.log("Upload successful")
    } catch (err) {
      console.error("Upload failed", err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input 
        type="file" 
        multiple 
        onChange={handleFileChange} 
        disabled={uploading}
        className="cursor-pointer"
      />
      {uploading && <span className="text-xs animate-pulse">Uploading...</span>}
    </div>
  )
}