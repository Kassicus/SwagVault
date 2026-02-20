"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export interface ExistingImage {
  path: string;
  signedUrl: string;
}

interface ImageUploadProps {
  existingImages?: ExistingImage[];
  onChange: (pendingFiles: File[], existingPaths: string[]) => void;
}

export function ImageUpload({ existingImages = [], onChange }: ImageUploadProps) {
  const [pending, setPending] = useState<File[]>([]);
  const [kept, setKept] = useState<string[]>(() => existingImages.map((img) => img.path));
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate object URLs for pending files
  useEffect(() => {
    const urls = pending.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pending]);

  // Notify parent of changes
  useEffect(() => {
    onChange(pending, kept);
  }, [pending, kept]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalCount = kept.length + pending.length;

  const validate = useCallback(
    (files: File[]): string | null => {
      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          return `"${file.name}" is not a supported format. Use JPEG, PNG, WebP, or SVG.`;
        }
        if (file.size > MAX_SIZE) {
          return `"${file.name}" exceeds 5MB limit.`;
        }
      }
      if (totalCount + files.length > MAX_FILES) {
        return `Maximum ${MAX_FILES} images allowed. You have ${totalCount}, tried to add ${files.length}.`;
      }
      return null;
    },
    [totalCount]
  );

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const err = validate(files);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setPending((prev) => [...prev, ...files]);
  }

  function removeExisting(path: string) {
    setKept((prev) => prev.filter((p) => p !== path));
    setError("");
  }

  function removePending(index: number) {
    setPending((prev) => prev.filter((_, i) => i !== index));
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  const keptImages = existingImages.filter((img) => kept.includes(img.path));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Images</label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <svg
          className="mb-2 h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 013.572 5.345A3.002 3.002 0 0118 19.5H6.75z"
          />
        </svg>
        <p className="text-sm text-muted-foreground">
          Drag &amp; drop images or <span className="font-medium text-primary">browse</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, WebP, SVG &middot; Max 5MB each &middot; Up to {MAX_FILES} images
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Preview grid */}
      {(keptImages.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-5 gap-3 pt-2">
          {keptImages.map((img) => (
            <div key={img.path} className="group relative aspect-square overflow-hidden rounded-lg border">
              <img
                src={img.signedUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); removeExisting(img.path); }}
              >
                &times;
              </Button>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border">
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); removePending(i); }}
              >
                &times;
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
