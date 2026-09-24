import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DiffViewerContent } from './DiffViewerContent';
import { DiffProductSelector } from './DiffProductSelector';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { resolveComparisonData } from '../../utils/versionComparison';

export const DiffViewScreen: React.FC = () => {
  const {
    setCurrentView,
    selectedOrder,
    setSelectedOrderId,
    setSelectedVersion,
    diffBaseVersion,
    diffTargetVersion,
    diffViewStep,
    setDiffViewStep,
  } = useApp();

  const comparison = useMemo(() => {
    return resolveComparisonData(selectedOrder, diffBaseVersion, diffTargetVersion);
  }, [selectedOrder, diffBaseVersion, diffTargetVersion]);

  const handleBackToWorkspace = () => {
    // Return to the exact workspace of the product being compared
    setSelectedOrderId(selectedOrder.id);
    setSelectedVersion(selectedOrder.currentVersion || 'v01');
    setCurrentView('order_workspace');
  };

  // STEP 1: Product Selection Step
  if (diffViewStep === 'select_product') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <DiffProductSelector
          onSelectProduct={(order) => {
            setSelectedOrderId(order.id);
            setDiffViewStep('compare');
          }}
        />
      </div>
    );
  }

  // STEP 2: Detailed Version Comparison View for Selected Product
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Navigation breadcrumb & product switch bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
          <button
            onClick={() => setDiffViewStep('select_product')}
            className="inline-flex items-center gap-1.5 text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer border border-orange-200/80"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
            <span>Chọn sản phẩm khác</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

          <span className="text-slate-900 font-extrabold truncate max-w-[220px] sm:max-w-[340px]">
            {selectedOrder.productName} (#{selectedOrder.orderNumber})
          </span>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

          <span className="text-orange-600 font-black">
            {comparison.isSingleVersion
              ? `Phiên bản ${comparison.targetVersionNumber}`
              : `So sánh ${comparison.baseVersionNumber} → ${comparison.targetVersionNumber}`}
          </span>
        </div>

        <button
          onClick={handleBackToWorkspace}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors cursor-pointer group shrink-0"
        >
          <span>Quay lại Không gian làm việc</span>
        </button>
      </div>

      {/* Main Diff Content */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8">
        <DiffViewerContent onSelectAnotherProduct={() => setDiffViewStep('select_product')} />
      </div>
    </div>
  );
};
