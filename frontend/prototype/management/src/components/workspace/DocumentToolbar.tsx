import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers,
  Palette,
  Tag,
  Maximize2,
  Sparkles,
  Printer,
  FileCode,
  FileText,
  Package,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

interface DocumentToolbarProps {
  activeBlockKey: string;
  onSelectBlock: (blockKey: string) => void;
  filterMode?: 'all' | 'changed' | 'comments';
  setFilterMode?: (mode: 'all' | 'changed' | 'comments') => void;
  onOpenAIDrawer?: (tab?: 'ai' | 'comments') => void;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  activeBlockKey,
  onSelectBlock,
  filterMode = 'all',
  setFilterMode,
}) => {
  const {
    selectedOrder,
    openNewCRModal,
    currentUser,
  } = useApp();
  const [isTocOpen, setIsTocOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCustomer = currentUser.role === 'customer';

  // Count changed & commented blocks
  const changedCount = selectedOrder.specBlocks.filter(
    (b) => b.modifiedInVersion === selectedOrder.currentVersion
  ).length;
  const commentedCount = selectedOrder.specBlocks.filter(
    (b) => b.comments && b.comments.length > 0
  ).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTocOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBlockIcon = (key: string) => {
    switch (key) {
      case 'product':
        return <Package className="w-4 h-4 text-orange-600" />;
      case 'material':
        return <Layers className="w-4 h-4 text-emerald-600" />;
      case 'color':
        return <Palette className="w-4 h-4 text-indigo-600" />;
      case 'quantity':
        return <Tag className="w-4 h-4 text-amber-600" />;
      case 'dimensions':
        return <Maximize2 className="w-4 h-4 text-sky-600" />;
      case 'logo':
        return <Sparkles className="w-4 h-4 text-rose-600" />;
      case 'printing':
        return <Printer className="w-4 h-4 text-teal-600" />;
      case 'design_files':
        return <FileCode className="w-4 h-4 text-violet-600" />;
      case 'production_notes':
        return <FileText className="w-4 h-4 text-slate-700" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="sticky top-3 z-20 mb-6 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-3">
      {/* Left: Popover Mục lục */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Popover [ Mục lục ▾ ] */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsTocOpen(!isTocOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
              isTocOpen
                ? 'bg-slate-900 text-white border-slate-800 ring-2 ring-slate-900/10'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300'
            }`}
          >
            <span className="text-orange-500">📑</span>
            <span>Mục lục ({selectedOrder.specBlocks.length})</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isTocOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>

          {/* Table of Contents Popover Dropdown */}
          {isTocOpen && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Cấu trúc hồ sơ kỹ thuật
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto py-1 space-y-0.5">
                {selectedOrder.specBlocks.map((block, idx) => {
                  const hasComments = block.comments && block.comments.length > 0;
                  const isSelected = activeBlockKey === block.key;

                  return (
                    <button
                      key={block.id}
                      onClick={() => {
                        onSelectBlock(block.key);
                        setIsTocOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 text-orange-950 font-bold border border-orange-200/80 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[10px] text-slate-400 font-bold w-4 text-right">
                          0{idx + 1}
                        </span>
                        <div className="shrink-0">{getBlockIcon(block.key)}</div>
                        <span className="truncate font-semibold">{block.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {hasComments && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-bold">
                            💬 {block.comments.length}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        {setFilterMode && (
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({selectedOrder.specBlocks.length})
            </button>
            <button
              onClick={() => setFilterMode('changed')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'changed'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Thay đổi</span>
              {changedCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    filterMode === 'changed'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {changedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterMode('comments')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'comments'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Có thảo luận</span>
              {commentedCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    filterMode === 'comments'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {commentedCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right: Focused Action Buttons (chỉ hiển thị cho khách hàng nếu cần gửi yêu cầu chỉnh sửa) */}
      {isCustomer && (
        <div className="flex items-center gap-2">
          <button
            onClick={openNewCRModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Gửi yêu cầu chỉnh sửa trên phiên bản hiện tại"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Yêu cầu chỉnh sửa</span>
          </button>
        </div>
      )}
    </div>
  );
};
