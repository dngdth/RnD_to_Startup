import React, { useState } from 'react';
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
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface WorkspaceNavigationProps {
  activeBlockId?: string;
  onSelectBlock: (blockKey: string) => void;
  filterMode: 'all' | 'changed' | 'comments';
  setFilterMode: (mode: 'all' | 'changed' | 'comments') => void;
}

export const WorkspaceNavigation: React.FC<WorkspaceNavigationProps> = ({
  activeBlockId,
  onSelectBlock,
  filterMode,
  setFilterMode,
}) => {
  const { selectedOrder, selectedVersion } = useApp();

  const getBlockIcon = (key: string) => {
    switch (key) {
      case 'product':
        return <Package className="w-3.5 h-3.5 text-orange-600" />;
      case 'material':
        return <Layers className="w-3.5 h-3.5 text-emerald-600" />;
      case 'color':
        return <Palette className="w-3.5 h-3.5 text-indigo-600" />;
      case 'quantity':
        return <Tag className="w-3.5 h-3.5 text-amber-600" />;
      case 'dimensions':
        return <Maximize2 className="w-3.5 h-3.5 text-sky-600" />;
      case 'logo':
        return <Sparkles className="w-3.5 h-3.5 text-rose-600" />;
      case 'printing':
        return <Printer className="w-3.5 h-3.5 text-teal-600" />;
      case 'design_files':
        return <FileCode className="w-3.5 h-3.5 text-violet-600" />;
      case 'production_notes':
        return <FileText className="w-3.5 h-3.5 text-slate-700" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const changedBlocksCount = (selectedOrder?.specBlocks || []).filter(
    (b) => b.modifiedInVersion === selectedOrder.currentVersion
  ).length;

  const commentedBlocksCount = (selectedOrder?.specBlocks || []).filter(
    (b) => b.comments && b.comments.length > 0
  ).length;

  return (
    <aside className="w-full lg:w-60 xl:w-64 shrink-0 flex flex-col gap-4">
      {/* Document Outline Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.02)] p-4">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <span>Cấu trúc tài liệu</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {selectedOrder.specBlocks.length} mục
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 mb-3 p-1 rounded-xl bg-slate-100/80 text-[11px] font-medium">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1 rounded-lg transition-all text-center ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tất cả ({selectedOrder.specBlocks.length})
          </button>
          <button
            onClick={() => setFilterMode('changed')}
            className={`flex-1 py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
              filterMode === 'changed'
                ? 'bg-amber-100 text-amber-950 font-bold shadow-2xs border border-amber-300/60'
                : 'text-amber-800 hover:text-amber-950'
            }`}
            title="Chỉ hiển thị các mục thay đổi ở v04"
          >
            <span>Thay đổi</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          </button>
          <button
            onClick={() => setFilterMode('comments')}
            className={`flex-1 py-1 rounded-lg transition-all text-center ${
              filterMode === 'comments'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Ghi chú ({commentedBlocksCount})
          </button>
        </div>

        {/* Block Jump Links */}
        <nav className="space-y-1">
          {selectedOrder.specBlocks.map((block, idx) => {
            const isChanged = block.modifiedInVersion === selectedOrder.currentVersion;
            const hasComments = block.comments && block.comments.length > 0;
            const isSelected = activeBlockId === block.key;

            if (filterMode === 'changed' && !isChanged) return null;
            if (filterMode === 'comments' && !hasComments) return null;

            return (
              <button
                key={block.id}
                onClick={() => onSelectBlock(block.key)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-all ${
                  isSelected
                    ? 'bg-orange-50 text-orange-950 font-bold border border-orange-200/80 shadow-2xs'
                    : isChanged
                    ? 'hover:bg-amber-50/70 text-slate-800 font-medium'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0">{getBlockIcon(block.key)}</div>
                  <span className="truncate">{block.title}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {isChanged && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-200" title="Đã thay đổi ở v04" />
                  )}
                  {hasComments && (
                    <span className="text-[10px] font-mono px-1 rounded-full bg-slate-100 text-slate-500">
                      {block.comments.length}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Order Quick Metadata */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 text-xs space-y-2.5">
        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider pb-1 border-b border-slate-100">
          Thông tin đơn hàng
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <span className="text-slate-400">Mã đơn:</span>
          <span className="font-bold font-mono text-slate-900">
            #{selectedOrder.orderNumber}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <span className="text-slate-400">Khách hàng:</span>
          <span className="font-semibold text-slate-800 truncate max-w-[120px]">
            {selectedOrder.customerCompany}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <span className="text-slate-400">Xưởng sản xuất:</span>
          <span className="font-semibold text-slate-800 truncate max-w-[120px]">
            {selectedOrder.vendorName}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <span className="text-slate-400">Số lượng đặt:</span>
          <span className="font-bold text-slate-900">
            {selectedOrder.targetQuantity} cái
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <span className="text-slate-400">Hạn giao hàng:</span>
          <span className="font-medium text-slate-800">
            {selectedOrder.deliveryDate}
          </span>
        </div>
      </div>
    </aside>
  );
};
