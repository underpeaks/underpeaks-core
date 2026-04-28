'use client';

import { useState, useRef, useEffect } from 'react';
import {
  FiFolder, FiGrid, FiList, FiUpload, FiX,
  FiCheck, FiLink, FiTrash2, FiChevronRight, FiPlus,
} from 'react-icons/fi';
import * as Dialog from '@radix-ui/react-dialog';

// ── Types ─────────────────────────────────────────────────────────────────────
type ImageItem = {
  id: string;
  name: string;
  url: string;
  size: string;
  dimensions: string;
  type: string;
  uploaded: string;
  folderId: string;
  folderPath: string;
};

type Folder = {
  id: string;
  name: string;
  count: number;
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const initialFolders: Folder[] = [
  { id: 'avatars',   name: 'Avatars',   count: 4 },
  { id: 'banners',   name: 'Banners',   count: 3 },
  { id: 'products',  name: 'Products',  count: 5 },
  { id: 'documents', name: 'Documents', count: 2 },
];

const mockImages: ImageItem[] = [
  { id: '1',  name: 'avatar-1.png',    folderPath: 'avatars/avatar-1.png',    url: 'https://picsum.photos/seed/a1/400/400',  size: '42 KB',  dimensions: '400×400',  type: 'image/png',  uploaded: '12 Jan 2025', folderId: 'avatars'   },
  { id: '2',  name: 'avatar-2.png',    folderPath: 'avatars/avatar-2.png',    url: 'https://picsum.photos/seed/a2/400/400',  size: '38 KB',  dimensions: '400×400',  type: 'image/png',  uploaded: '14 Jan 2025', folderId: 'avatars'   },
  { id: '3',  name: 'avatar-3.jpg',    folderPath: 'avatars/avatar-3.jpg',    url: 'https://picsum.photos/seed/a3/400/400',  size: '55 KB',  dimensions: '400×400',  type: 'image/jpeg', uploaded: '20 Jan 2025', folderId: 'avatars'   },
  { id: '4',  name: 'avatar-4.jpg',    folderPath: 'avatars/avatar-4.jpg',    url: 'https://picsum.photos/seed/a4/400/400',  size: '61 KB',  dimensions: '400×400',  type: 'image/jpeg', uploaded: '22 Jan 2025', folderId: 'avatars'   },
  { id: '5',  name: 'banner-hero.jpg', folderPath: 'banners/banner-hero.jpg', url: 'https://picsum.photos/seed/b1/1200/400', size: '210 KB', dimensions: '1200×400', type: 'image/jpeg', uploaded: '1 Feb 2025',  folderId: 'banners'   },
  { id: '6',  name: 'banner-sale.jpg', folderPath: 'banners/banner-sale.jpg', url: 'https://picsum.photos/seed/b2/1200/400', size: '185 KB', dimensions: '1200×400', type: 'image/jpeg', uploaded: '3 Feb 2025',  folderId: 'banners'   },
  { id: '7',  name: 'banner-new.png',  folderPath: 'banners/banner-new.png',  url: 'https://picsum.photos/seed/b3/1200/400', size: '230 KB', dimensions: '1200×400', type: 'image/png',  uploaded: '5 Feb 2025',  folderId: 'banners'   },
  { id: '8',  name: 'product-1.jpg',   folderPath: 'products/product-1.jpg',  url: 'https://picsum.photos/seed/p1/600/600',  size: '95 KB',  dimensions: '600×600',  type: 'image/jpeg', uploaded: '10 Mar 2025', folderId: 'products'  },
  { id: '9',  name: 'product-2.jpg',   folderPath: 'products/product-2.jpg',  url: 'https://picsum.photos/seed/p2/600/600',  size: '88 KB',  dimensions: '600×600',  type: 'image/jpeg', uploaded: '11 Mar 2025', folderId: 'products'  },
  { id: '10', name: 'product-3.png',   folderPath: 'products/product-3.png',  url: 'https://picsum.photos/seed/p3/600/600',  size: '112 KB', dimensions: '600×600',  type: 'image/png',  uploaded: '12 Mar 2025', folderId: 'products'  },
  { id: '11', name: 'product-4.jpg',   folderPath: 'products/product-4.jpg',  url: 'https://picsum.photos/seed/p4/600/600',  size: '76 KB',  dimensions: '600×600',  type: 'image/jpeg', uploaded: '13 Mar 2025', folderId: 'products'  },
  { id: '12', name: 'product-5.png',   folderPath: 'products/product-5.png',  url: 'https://picsum.photos/seed/p5/600/600',  size: '99 KB',  dimensions: '600×600',  type: 'image/png',  uploaded: '14 Mar 2025', folderId: 'products'  },
  { id: '13', name: 'doc-cover.jpg',   folderPath: 'documents/doc-cover.jpg', url: 'https://picsum.photos/seed/d1/800/600',  size: '145 KB', dimensions: '800×600',  type: 'image/jpeg', uploaded: '2 Apr 2025',  folderId: 'documents' },
  { id: '14', name: 'doc-thumb.png',   folderPath: 'documents/doc-thumb.png', url: 'https://picsum.photos/seed/d2/800/600',  size: '130 KB', dimensions: '800×600',  type: 'image/png',  uploaded: '4 Apr 2025',  folderId: 'documents' },
];

// ── New folder popup ───────────────────────────────────────────────────────────
function NewFolderPopup({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) { onConfirm(trimmed); setValue(''); }
  };

  return (
    <div className="mx-3 mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col gap-2 shadow-sm">
      <p className="text-xs font-semibold text-gray-700">New Folder</p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        placeholder="Folder name"
        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="flex-1 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-100 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Upload dialog ─────────────────────────────────────────────────────────────
function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'url' | 'upload'>('upload');
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Dialog.Title className="text-sm font-semibold text-gray-900">Add Media</Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
          </div>

          <div className="flex border-b border-gray-100">
            {(['upload', 'url'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === t ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'upload' ? 'Upload File' : 'Add via URL'}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'upload' ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); }}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg py-10 transition-colors ${
                  dragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <FiUpload size={18} className="text-gray-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Drag & drop files here</p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, GIF, WEBP up to 10MB</p>
                </div>
                <label className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition cursor-pointer">
                  Browse Files
                  <input type="file" accept="image/*" className="hidden" multiple />
                </label>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-500">Paste a public image URL to import it directly.</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                    <FiLink size={14} className="text-gray-400 shrink-0" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                    />
                  </div>
                  <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition">
                    Import
                  </button>
                </div>
                {url && (
                  <img src={url} alt="preview" className="w-full h-40 object-cover rounded-md border border-gray-200 mt-1" />
                )}
              </div>
            )}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({
  image,
  folders,
  onClose,
}: {
  image: ImageItem;
  folders: Folder[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(image.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const folder = folders.find((f) => f.id === image.folderId);

  return (
    // Fixed width — never shrinks, never pushes siblings
    <div className="w-64 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">

      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-700 truncate">{image.name}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2">
          <FiX size={16} />
        </button>
      </div>

      <div className="p-4 border-b border-gray-100">
        <img src={image.url} alt={image.name} className="w-full aspect-square object-cover rounded-md border border-gray-200" />
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Image URL</p>
        <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-600 truncate flex-1 font-mono">{image.url}</p>
          <button onClick={copy} className="shrink-0 text-gray-400 hover:text-gray-700">
            {copied ? <FiCheck size={13} className="text-green-500" /> : <FiLink size={13} />}
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Metadata</p>
        <div className="flex flex-col gap-2.5">
          {[
            { label: 'File name',  value: image.name           },
            { label: 'Folder',     value: folder?.name ?? '—'  },
            { label: 'Path',       value: image.folderPath     },
            { label: 'Size',       value: image.size           },
            { label: 'Dimensions', value: image.dimensions     },
            { label: 'Type',       value: image.type           },
            { label: 'Uploaded',   value: image.uploaded       },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-start gap-3">
              <span className="text-xs text-gray-400 shrink-0">{row.label}</span>
              <span className="text-xs text-gray-700 font-medium text-right break-all">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MediaPage() {
  const [folders,         setFolders]         = useState<Folder[]>(initialFolders);
  const [selectedFolder,  setSelectedFolder]  = useState<Folder | null>(null);
  const [viewMode,        setViewMode]        = useState<'grid' | 'list'>('grid');
  const [selectedImages,  setSelectedImages]  = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [activeImage,     setActiveImage]     = useState<ImageItem | null>(null);
  const [uploadOpen,      setUploadOpen]      = useState(false);
  const [showNewFolder,   setShowNewFolder]   = useState(false);

  const folderImages = selectedFolder
    ? mockImages.filter((img) => img.folderId === selectedFolder.id)
    : [];

  const toggleImageSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImages((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFolderSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createFolder = (name: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    setFolders((prev) => [...prev, { id, name, count: 0 }]);
    setShowNewFolder(false);
  };

  const anySelected   = selectedImages.size > 0 || selectedFolders.size > 0;
  const totalSelected = selectedImages.size + selectedFolders.size;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">

      {/* ── Folder sidebar — fixed width, never squeezed ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">

        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Folders</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedFolder(null);
                setSelectedImages(new Set());
                setActiveImage(null);
              }}
              className="text-[10px] text-blue-500 hover:underline"
            >
              All
            </button>
            <button
              onClick={() => setShowNewFolder((v) => !v)}
              title="New folder"
              className="flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
            >
              <FiPlus size={12} />
            </button>
          </div>
        </div>

        {/* New folder inline popup */}
        {showNewFolder && (
          <div className="pt-2">
            <NewFolderPopup
              onConfirm={createFolder}
              onCancel={() => setShowNewFolder(false)}
            />
          </div>
        )}

        <nav className="flex-1 py-2">
          {folders.map((folder) => {
            const isActive   = selectedFolder?.id === folder.id;
            const isSelected = selectedFolders.has(folder.id);

            return (
              <div
                key={folder.id}
                onClick={() => {
                  setSelectedFolder(folder);
                  setSelectedImages(new Set());
                  setActiveImage(null);
                }}
                className={`group flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
                  isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  onClick={(e) => toggleFolderSelect(folder.id, e)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-opacity ${
                    isSelected
                      ? 'bg-gray-800 border-gray-800 opacity-100'
                      : 'border-gray-300 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isSelected && <FiCheck size={10} className="text-white" />}
                </div>

                <FiFolder size={15} className={`shrink-0 ${isActive ? 'text-gray-700' : 'text-gray-400'}`} />

                <span className={`text-sm flex-1 truncate min-w-0 ${isActive ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {folder.name}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">{folder.count}</span>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content — takes remaining space ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Toolbar */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-gray-400 shrink-0">Media</span>
            {selectedFolder && (
              <>
                <FiChevronRight size={14} className="text-gray-300 shrink-0" />
                <span className="text-sm font-semibold text-gray-800 truncate">{selectedFolder.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {anySelected && (
              <button
                onClick={() => { setSelectedImages(new Set()); setSelectedFolders(new Set()); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition"
              >
                <FiTrash2 size={13} />
                Delete ({totalSelected})
              </button>
            )}

            {selectedFolder && (
              <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <FiGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <FiList size={15} />
                </button>
              </div>
            )}

            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition"
            >
              <FiUpload size={13} />
              Upload
            </button>
          </div>
        </div>

        {/* Content + detail panel row — detail panel is INSIDE this flex row */}
        <div className="flex-1 flex overflow-hidden min-w-0">

          {/* Scrollable image area */}
          <div className="flex-1 overflow-y-auto p-5 min-w-0">

            {!selectedFolder ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder)}
                    className="group relative bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-gray-300 hover:shadow-sm transition"
                  >
                    <div
                      onClick={(e) => toggleFolderSelect(folder.id, e)}
                      className={`absolute top-2 left-2 w-4 h-4 rounded border flex items-center justify-center transition-opacity ${
                        selectedFolders.has(folder.id)
                          ? 'bg-gray-800 border-gray-800 opacity-100'
                          : 'border-gray-300 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {selectedFolders.has(folder.id) && <FiCheck size={10} className="text-white" />}
                    </div>
                    <FiFolder size={36} className="text-gray-300" />
                    <p className="text-sm font-medium text-gray-700">{folder.name}</p>
                    <p className="text-xs text-gray-400">{folder.count} files</p>
                  </div>
                ))}
              </div>

            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {folderImages.map((img) => {
                  const isSelected = selectedImages.has(img.id);
                  const isActive   = activeImage?.id === img.id;

                  return (
                    <div
                      key={img.id}
                      onClick={() => setActiveImage(img)}
                      className={`group relative bg-white border rounded-lg overflow-hidden cursor-pointer transition ${
                        isActive
                          ? 'border-gray-800 ring-2 ring-gray-800 ring-offset-1'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div
                        onClick={(e) => toggleImageSelect(img.id, e)}
                        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-opacity ${
                          isSelected
                            ? 'bg-gray-800 border-gray-800 opacity-100'
                            : 'bg-white border-gray-300 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isSelected && <FiCheck size={11} className="text-white" />}
                      </div>
                      <img src={img.url} alt={img.name} className="w-full aspect-square object-cover" />
                      <div className="px-2 py-1.5">
                        <p className="text-xs font-medium text-gray-700 truncate">{img.name}</p>
                        <p className="text-[10px] text-gray-400">{img.size}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 px-4 py-2 border-b border-gray-100 bg-gray-50">
                  <div />
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Name</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Size</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Dimensions</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Uploaded</p>
                </div>

                {folderImages.map((img) => {
                  const isSelected = selectedImages.has(img.id);
                  const isActive   = activeImage?.id === img.id;

                  return (
                    <div
                      key={img.id}
                      onClick={() => setActiveImage(img)}
                      className={`group grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 items-center px-4 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                        isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        onClick={(e) => toggleImageSelect(img.id, e)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-opacity ${
                          isSelected
                            ? 'bg-gray-800 border-gray-800 opacity-100'
                            : 'border-gray-300 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isSelected && <FiCheck size={10} className="text-white" />}
                      </div>

                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={img.url} alt={img.name} className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 font-medium truncate">{img.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono truncate">{img.folderPath}</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 whitespace-nowrap">{img.size}</p>
                      <p className="text-xs text-gray-400 whitespace-nowrap">{img.dimensions}</p>
                      <p className="text-xs text-gray-400 whitespace-nowrap">{img.uploaded}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel — fixed width, sits inside the content row, never affects sidebar */}
          {activeImage && (
            <DetailPanel
              image={activeImage}
              folders={folders}
              onClose={() => setActiveImage(null)}
            />
          )}
        </div>
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}