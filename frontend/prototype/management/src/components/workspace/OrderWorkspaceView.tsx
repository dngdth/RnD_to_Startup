import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { OrderHeader } from './OrderHeader';
import { DocumentToolbar } from './DocumentToolbar';
import { SpecificationBlock } from './SpecificationBlock';
import { StickyApprovalBar } from './StickyApprovalBar';
import { FloatingDrawerTrigger } from './FloatingDrawerTrigger';
import { AICommentDrawer } from './AICommentDrawer';
import { CustomerChangeRequestDrawer } from './CustomerChangeRequestDrawer';
import {
  Sparkles,
  Printer,
  FileCheck2,
  ArrowRight,
  Plus,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { getDefaultComparisonVersions } from '../../utils/versionComparison';

export const OrderWorkspaceView: React.FC = () => {
  const {
    selectedOrder,
    selectedVersion,
    openDiffModal,
    openNewCRModal,
    showToast,
    currentUser,
  } = useApp();
  const [activeBlockKey, setActiveBlockKey] = useState<string>('logo');
  const [filterMode, setFilterMode] = useState<'all' | 'changed' | 'comments'>('all');

  const isCustomer = currentUser.role === 'customer';

  // Slide-over AI & Comment Drawer state (Designer)
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState<'ai' | 'comments'>('comments');

  // Customer Change Request Drawer state
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);

  const [isTriggerHovered, setIsTriggerHovered] = useState(false);
  const [isPanelHovered, setIsPanelHovered] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = (delay = 250) => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setIsAIDrawerOpen(false);
      setIsCustomerDrawerOpen(false);
      setIsTriggerHovered(false);
      setIsPanelHovered(false);
    }, delay);
  };

  const handleTriggerMouseEnter = () => {
    clearCloseTimeout();
    setIsTriggerHovered(true);
    if (isCustomer) {
      setIsCustomerDrawerOpen(true);
    } else {
      setDrawerInitialTab('comments');
      setIsAIDrawerOpen(true);
    }
  };

  const handleTriggerMouseLeave = () => {
    setIsTriggerHovered(false);
    scheduleClose(250);
  };

  const handlePanelMouseEnter = () => {
    clearCloseTimeout();
    setIsPanelHovered(true);
  };

  const handlePanelMouseLeave = () => {
    setIsPanelHovered(false);
    scheduleClose(250);
  };

  const handleDrawerClose = () => {
    clearCloseTimeout();
    setIsAIDrawerOpen(false);
    setIsCustomerDrawerOpen(false);
    setIsTriggerHovered(false);
    setIsPanelHovered(false);
  };

  const handleTriggerClick = () => {
    clearCloseTimeout();
    if (isCustomer) {
      if (isCustomerDrawerOpen) {
        handleDrawerClose();
      } else {
        setIsCustomerDrawerOpen(true);
      }
    } else {
      if (isAIDrawerOpen) {
        handleDrawerClose();
      } else {
        setDrawerInitialTab('comments');
        setIsAIDrawerOpen(true);
      }
    }
  };

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  const handleSelectBlock = (blockKey: string) => {
    setActiveBlockKey(blockKey);
    const element = document.getElementById(`spec-block-${blockKey}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const currentVerObj =
    selectedOrder.versions.find((v) => v.versionNumber === selectedVersion) ||
    selectedOrder.versions[0];

  const changedBlocksCount = (selectedOrder?.specBlocks || []).filter(
    (b) => b.modifiedInVersion === selectedOrder.currentVersion
  ).length;

  const commentedBlocksCount = (selectedOrder?.specBlocks || []).filter(
    (b) => b.comments && b.comments.length > 0
  ).length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-28 relative">
      {/* 1. Top Order Context Header (Clean, complete info strip) */}
      <OrderHeader />

      {/* 2. Floating On-Demand Trigger anchored to right edge */}
      <FloatingDrawerTrigger
        onClick={handleTriggerClick}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        onFocus={handleTriggerMouseEnter}
        onBlur={handleTriggerMouseLeave}
        isOpen={isCustomer ? isCustomerDrawerOpen : isAIDrawerOpen}
        isHovered={isTriggerHovered}
        pendingCount={
          isCustomer
            ? (selectedOrder.changeRequests || []).filter(
                (cr) => cr.status !== 'RESOLVED'
              ).length || 1
            : 2
        }
        isCustomer={isCustomer}
        currentVersion={selectedVersion}
      />

      {/* 3A. Customer Change Request Slide-over Drawer (Hover / Click for Customer) */}
      {isCustomer && (
        <CustomerChangeRequestDrawer
          isOpen={isCustomerDrawerOpen}
          onClose={handleDrawerClose}
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
        />
      )}

      {/* 3B. Designer AI & Comment Slide-over Drawer (Only for Designer workflow) */}
      {!isCustomer && (
        <AICommentDrawer
          isOpen={isAIDrawerOpen}
          onClose={handleDrawerClose}
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
          initialTab={drawerInitialTab}
          onSelectBlock={(blockKey) => {
            handleSelectBlock(blockKey);
          }}
        />
      )}

      {/* 4. MAIN FLUID WORKSPACE CANVAS: Fluid / full-width with balanced gutters (24-32px on desktop) */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Sticky Document Toolbar: [ Mục lục ▾ ] + Filter Pills + Quick Trigger */}
        <DocumentToolbar
          activeBlockKey={activeBlockKey}
          onSelectBlock={handleSelectBlock}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          onOpenAIDrawer={(tab) => {
            setDrawerInitialTab(tab || 'ai');
            setIsAIDrawerOpen(true);
          }}
        />

        {/* Fluid Wide Product Specification Document */}
        <main className="w-full">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_30px_rgba(15,23,42,0.03)] p-6 sm:p-8 lg:p-10 transition-all">
            {/* Document Header */}
            <div className="border-b border-slate-100 pb-7 mb-7">
              {/* Tiêu đề phân loại nhỏ phía trên tiêu đề chính */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-2.5">
                <span className="text-orange-600 font-bold uppercase tracking-wider text-[11px]">
                  Hồ sơ kỹ thuật sản xuất
                </span>
              </div>

              {/* Tiêu đề chính nổi bật */}
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {selectedOrder.productName}
                </h2>

                {/* Hàng ngang: Badge phiên bản v04 + Nút Xuất PDF + Nút Xem so sánh */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-100 text-orange-950 border border-orange-200/90 text-xs sm:text-sm font-black shadow-2xs shrink-0">
                    <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                    <span>Phiên bản {selectedVersion}</span>
                  </span>

                  <button
                    onClick={() =>
                      showToast('Đang xuất bản PDF hoàn chỉnh...', 'info')
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Xuất bản in PDF"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span>Xuất PDF</span>
                  </button>

                  {(() => {
                    const defaultComp = getDefaultComparisonVersions(selectedOrder);
                    return (
                      <button
                        onClick={() =>
                          openDiffModal(
                            selectedOrder.id,
                            defaultComp.baseVersion || undefined,
                            defaultComp.targetVersion || undefined
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold transition-all shadow-sm shadow-orange-600/20 active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-orange-200" />
                        <span>
                          {defaultComp.canCompare
                            ? `Xem so sánh ${defaultComp.baseVersion}→${defaultComp.targetVersion}`
                            : `Phiên bản ${defaultComp.targetVersion}`}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* 3. Tối ưu Callout Block: Card độ tương phản cao, chữ trắng rõ ràng, nút bấm góc phải */}
              <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-[#3b4b6d] text-white border border-[#4a5a7d] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Cần chú ý trong Phiên bản {selectedVersion}:</span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-normal max-w-4xl">
                    {selectedOrder.versions?.find((v) => v.versionNumber === selectedVersion)?.changeSummary?.join(' · ') ||
                      selectedOrder.latestActivity ||
                      `Hồ sơ kỹ thuật phiên bản ${selectedVersion} cho ${selectedOrder.productName}.`}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => {
                      setDrawerInitialTab('ai');
                      setIsAIDrawerOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Xem tóm tắt AI</span>
                  </button>
                  <button
                    onClick={() => openDiffModal()}
                    className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-xs shadow-orange-950/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>So sánh trực quan</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>

            {/* 9 Structured Document Blocks (Generous width, crisp reading) */}
            <div className="space-y-4">
              {selectedOrder.specBlocks.map((block, idx) => {
                const isChanged =
                  block.modifiedInVersion === selectedOrder.currentVersion;
                const hasComments = block.comments && block.comments.length > 0;

                if (filterMode === 'changed' && !isChanged) return null;
                if (filterMode === 'comments' && !hasComments) return null;

                return (
                  <SpecificationBlock
                    key={block.id}
                    block={block}
                    orderId={selectedOrder.id}
                    blockNumber={idx + 1}
                  />
                );
              })}
            </div>

            {/* Document End / Add Custom Block */}
            <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-600">
                  Tài liệu tiêu chuẩn sản xuất (Tech Pack Document) đã hoàn chỉnh 9/9 hạng mục.
                </span>
              </div>
              {!isCustomer && (
                <button
                  onClick={() =>
                    showToast(
                      'Tất cả 9 thông số chuẩn đã được thiết lập. Hãy chỉnh sửa trực tiếp từng mục nếu cần.',
                      'info'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm mục thông số mới</span>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 5. Bottom Sticky Approval Bar */}
      <StickyApprovalBar />
    </div>
  );
};
