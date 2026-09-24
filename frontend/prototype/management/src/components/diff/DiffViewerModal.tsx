import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { DiffViewerContent } from './DiffViewerContent';
import { Sparkles, GitBranch } from 'lucide-react';
import { resolveComparisonData } from '../../utils/versionComparison';

export const DiffViewerModal: React.FC = () => {
  const { isDiffModalOpen, closeDiffModal, selectedOrder, diffBaseVersion, diffTargetVersion } = useApp();

  const comparison = useMemo(() => {
    return resolveComparisonData(selectedOrder, diffBaseVersion, diffTargetVersion);
  }, [selectedOrder, diffBaseVersion, diffTargetVersion]);

  return (
    <Modal
      isOpen={isDiffModalOpen}
      onClose={closeDiffModal}
      maxWidth="5xl"
      title={
        <span className="flex items-center gap-2 truncate">
          <Sparkles className="w-5 h-5 text-orange-500 shrink-0" />
          <span className="truncate">
            {comparison.isSingleVersion
              ? `${selectedOrder.productName} · Phiên bản ${comparison.targetVersionNumber}`
              : `${selectedOrder.productName} · So sánh ${comparison.baseVersionNumber} → ${comparison.targetVersionNumber}`}
          </span>
        </span>
      }
      subtitle={
        comparison.isSingleVersion
          ? 'Kiểm tra thông số kỹ thuật khởi tạo cho phiên bản đầu tiên của sản phẩm'
          : `Kiểm tra thay đổi với giải thích từ AI, so sánh ${comparison.baseVersionNumber} → ${comparison.targetVersionNumber} và phê duyệt hoặc yêu cầu chỉnh sửa`
      }
    >
      <DiffViewerContent onClose={closeDiffModal} />
    </Modal>
  );
};
