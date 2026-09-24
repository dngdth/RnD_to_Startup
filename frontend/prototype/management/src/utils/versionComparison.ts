import { Order, OrderVersion, DesignFile, ChangeRequest } from '../types';

export interface KeyDifferenceItem {
  id: string;
  title: string;
  oldValue: string;
  newValue: string;
  description: string;
  isImportant?: boolean;
}

export interface SpecComparisonItem {
  key: string;
  title: string;
  oldValue: string;
  oldBadge?: string;
  oldDescription?: string;
  newValue: string;
  newBadge?: string;
  newDescription?: string;
  isChanged: boolean;
}

export interface ComparisonData {
  order: Order;
  sortedVersions: OrderVersion[];
  canCompare: boolean;
  isSingleVersion: boolean;
  baseVersion: OrderVersion | null;
  targetVersion: OrderVersion | null;
  baseVersionNumber: string;
  targetVersionNumber: string;
  headerTitle: string;
  headerSubtitle: string;
  availablePairs: Array<{ base: string; target: string; label: string }>;
  aiSummary: string;
  changesList: string[];
  keyDifferences: KeyDifferenceItem[];
  specComparison: SpecComparisonItem[];
  baseDesignFiles: DesignFile[];
  targetDesignFiles: DesignFile[];
  relatedChangeRequests: ChangeRequest[];
  mockupData: {
    oldTitle: string;
    newTitle: string;
    oldBadge: string;
    newBadge: string;
    oldDescription: string;
    newDescription: string;
    oldImage: string;
    newImage: string;
  };
}

/**
 * Sorts versions of an order in ascending order: v01, v02, v03, ...
 */
export function getSortedVersions(order: Order): OrderVersion[] {
  if (!order || !order.versions || order.versions.length === 0) {
    return [];
  }
  return [...order.versions].sort((a, b) => {
    const numA = parseInt(a.versionNumber.replace(/\D/g, '') || '0', 10);
    const numB = parseInt(b.versionNumber.replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });
}

/**
 * Gets default base and target versions for an order.
 * Follows the user rule:
 * - Automatically takes the current version of the product as the target (newest).
 * - Takes the immediate preceding version as the base (old).
 * - If only 1 version (e.g. v01), canCompare is false, base is null.
 */
export function getDefaultComparisonVersions(order: Order): {
  baseVersion: string | null;
  targetVersion: string | null;
  canCompare: boolean;
} {
  const sorted = getSortedVersions(order);

  if (sorted.length === 0) {
    const ver = order?.currentVersion || 'v01';
    return { baseVersion: null, targetVersion: ver, canCompare: false };
  }

  if (sorted.length === 1) {
    return {
      baseVersion: null,
      targetVersion: sorted[0].versionNumber,
      canCompare: false,
    };
  }

  // Find index of currentVersion in sorted versions
  let targetIndex = sorted.findIndex((v) => v.versionNumber === order.currentVersion);
  if (targetIndex === -1 || targetIndex === 0) {
    // If not found or if current is the very first, use the latest version as target
    targetIndex = sorted.length - 1;
  }

  const targetVer = sorted[targetIndex].versionNumber;
  const baseVer = sorted[targetIndex - 1].versionNumber;

  return {
    baseVersion: baseVer,
    targetVersion: targetVer,
    canCompare: true,
  };
}

/**
 * Returns all valid adjacent pairs that actually exist for this order
 * e.g. [{ base: 'v01', target: 'v02', label: 'v01 → v02' }, { base: 'v02', target: 'v03', label: 'v02 → v03' }]
 */
export function getAvailablePairs(order: Order): Array<{ base: string; target: string; label: string }> {
  const sorted = getSortedVersions(order);
  if (sorted.length < 2) return [];

  const pairs: Array<{ base: string; target: string; label: string }> = [];
  for (let i = 1; i < sorted.length; i++) {
    pairs.push({
      base: sorted[i - 1].versionNumber,
      target: sorted[i].versionNumber,
      label: `${sorted[i - 1].versionNumber} → ${sorted[i].versionNumber}`,
    });
  }
  return pairs;
}

/**
 * Resolves complete comparison dataset dynamically based on selected order and 2 version strings
 */
export function resolveComparisonData(
  order: Order,
  requestedBaseVersion?: string | null,
  requestedTargetVersion?: string | null
): ComparisonData {
  const sorted = getSortedVersions(order);
  const availablePairs = getAvailablePairs(order);

  // Single version check
  if (sorted.length < 2) {
    const onlyVersion = sorted[0] || null;
    const vNum = onlyVersion?.versionNumber || order?.currentVersion || 'v01';

    return {
      order,
      sortedVersions: sorted,
      canCompare: false,
      isSingleVersion: true,
      baseVersion: null,
      targetVersion: onlyVersion,
      baseVersionNumber: '',
      targetVersionNumber: vNum,
      headerTitle: `${order.productName} · Phiên bản ${vNum}`,
      headerSubtitle: `Sản phẩm hiện đang ở phiên bản đầu tiên (${vNum}), chưa có phiên bản trước đó để so sánh.`,
      availablePairs: [],
      aiSummary:
        onlyVersion?.aiNotes ||
        `Hồ sơ kỹ thuật phiên bản đầu tiên (${vNum}) được tạo với đầy đủ thông số tiêu chuẩn sản xuất.`,
      changesList: onlyVersion?.changeSummary || ['Khởi tạo hồ sơ kỹ thuật ban đầu'],
      keyDifferences: [],
      specComparison: (order.specBlocks || []).map((b) => ({
        key: b.key,
        title: b.title,
        oldValue: '—',
        oldDescription: 'Chưa có phiên bản trước',
        newValue: b.value || Object.entries(b.details || {}).map(([k, v]) => `${k}: ${v}`).join(' · '),
        newDescription: 'Thông số khởi tạo',
        isChanged: false,
      })),
      baseDesignFiles: [],
      targetDesignFiles: (order.designFiles || []).filter((f) => f.version === vNum || !f.version),
      relatedChangeRequests: order.changeRequests || [],
      mockupData: {
        oldTitle: 'Không có bản trước',
        newTitle: `Phiên bản ${vNum} (Khởi tạo)`,
        oldBadge: 'Chưa có',
        newBadge: 'Hiện tại',
        oldDescription: 'Không có phiên bản trước để so sánh.',
        newDescription: 'Bản thiết kế kỹ thuật tiêu chuẩn đầu tiên.',
        oldImage: order.thumbnail,
        newImage: order.thumbnail,
      },
    };
  }

  // Multi-version: determine active pair
  let baseNum = requestedBaseVersion;
  let targetNum = requestedTargetVersion;

  // Validate or fallback to default
  const targetExists = sorted.some((v) => v.versionNumber === targetNum);
  const baseExists = sorted.some((v) => v.versionNumber === baseNum);

  if (!targetExists || !baseExists || baseNum === targetNum) {
    const defaults = getDefaultComparisonVersions(order);
    baseNum = defaults.baseVersion!;
    targetNum = defaults.targetVersion!;
  }

  const baseVersion = sorted.find((v) => v.versionNumber === baseNum) || sorted[0];
  const targetVersion = sorted.find((v) => v.versionNumber === targetNum) || sorted[sorted.length - 1];

  // Header texts per requirement: [Tên sản phẩm] · So sánh [vA] → [vB]
  const headerTitle = `${order.productName} · So sánh ${baseVersion.versionNumber} → ${targetVersion.versionNumber}`;
  const baseStatusText =
    baseVersion.status === 'APPROVED'
      ? 'Đã duyệt'
      : baseVersion.status === 'LOCKED_FOR_PRODUCTION'
      ? 'Đã khóa'
      : 'Bản trước';
  const targetStatusText =
    targetVersion.status === 'IN_REVIEW'
      ? 'Đang xem xét'
      : targetVersion.status === 'APPROVED'
      ? 'Đã duyệt'
      : targetVersion.status === 'LOCKED_FOR_PRODUCTION'
      ? 'Đã khóa sản xuất'
      : 'Bản sửa đổi';
  const headerSubtitle = `So sánh ${baseVersion.versionNumber} (${baseStatusText}) với ${targetVersion.versionNumber} (${targetStatusText})`;

  // AI Summary & Changes list
  const changesList =
    targetVersion.changeSummary && targetVersion.changeSummary.length > 0
      ? targetVersion.changeSummary
      : [`Cập nhật thông số kỹ thuật từ ${baseVersion.versionNumber} lên ${targetVersion.versionNumber}`];

  const aiSummary =
    targetVersion.aiNotes ||
    `AI đã phân tích và tổng hợp các điểm hiệu chỉnh giữa ${baseVersion.versionNumber} và ${targetVersion.versionNumber}.`;

  // Key differences derivation
  const keyDifferences: KeyDifferenceItem[] = [];

  // 1. Quantity comparison
  if (baseVersion.snapshotData?.quantity && targetVersion.snapshotData?.quantity) {
    if (baseVersion.snapshotData.quantity !== targetVersion.snapshotData.quantity) {
      const diff = targetVersion.snapshotData.quantity - baseVersion.snapshotData.quantity;
      keyDifferences.push({
        id: 'diff-qty',
        title: 'Số lượng đơn hàng',
        oldValue: `${baseVersion.snapshotData.quantity} sản phẩm`,
        newValue: `${targetVersion.snapshotData.quantity} sản phẩm (${diff > 0 ? '+' : ''}${diff})`,
        description: `Tổng số lượng sản xuất được điều chỉnh từ ${baseVersion.snapshotData.quantity} thành ${targetVersion.snapshotData.quantity} chiếc.`,
        isImportant: true,
      });
    }
  }

  // 2. Back logo size comparison
  if (
    baseVersion.snapshotData?.backLogoSize &&
    targetVersion.snapshotData?.backLogoSize &&
    baseVersion.snapshotData.backLogoSize !== 'N/A' &&
    targetVersion.snapshotData.backLogoSize !== 'N/A' &&
    baseVersion.snapshotData.backLogoSize !== targetVersion.snapshotData.backLogoSize
  ) {
    keyDifferences.push({
      id: 'diff-logo',
      title: 'Kích thước & Vị trí logo lưng',
      oldValue: baseVersion.snapshotData.backLogoSize,
      newValue: targetVersion.snapshotData.backLogoSize,
      description: `Kích thước logo lưng thay đổi từ ${baseVersion.snapshotData.backLogoSize} sang ${targetVersion.snapshotData.backLogoSize} để tối ưu bố cục.`,
      isImportant: true,
    });
  }

  // 3. Design file name
  if (
    baseVersion.snapshotData?.designFileName &&
    targetVersion.snapshotData?.designFileName &&
    baseVersion.snapshotData.designFileName !== targetVersion.snapshotData.designFileName
  ) {
    keyDifferences.push({
      id: 'diff-file',
      title: 'Tệp thiết kế đính kèm',
      oldValue: baseVersion.snapshotData.designFileName,
      newValue: targetVersion.snapshotData.designFileName,
      description: `Đã cập nhật tệp thiết kế từ ${baseVersion.snapshotData.designFileName} sang ${targetVersion.snapshotData.designFileName} chuẩn in ấn.`,
    });
  }

  // 4. Material
  if (
    baseVersion.snapshotData?.material &&
    targetVersion.snapshotData?.material &&
    baseVersion.snapshotData.material !== targetVersion.snapshotData.material
  ) {
    keyDifferences.push({
      id: 'diff-material',
      title: 'Chất liệu vải / Định lượng',
      oldValue: baseVersion.snapshotData.material,
      newValue: targetVersion.snapshotData.material,
      description: `Điều chỉnh kết cấu vải từ ${baseVersion.snapshotData.material} sang ${targetVersion.snapshotData.material}.`,
    });
  }

  // 5. SpecBlocks check
  (order.specBlocks || []).forEach((block) => {
    if (
      block.modifiedInVersion === targetVersion.versionNumber &&
      block.changeDelta &&
      !keyDifferences.some((d) => d.title.toLowerCase().includes(block.changeDelta!.label.toLowerCase()))
    ) {
      keyDifferences.push({
        id: `diff-${block.id}`,
        title: block.changeDelta.label || block.title,
        oldValue: block.changeDelta.from || block.previousValue || 'Bản cũ',
        newValue: block.changeDelta.to || block.value || 'Bản mới',
        description: `Thông số ${block.title} được cập nhật trong phiên bản ${targetVersion.versionNumber}.`,
      });
    }
  });

  // If no automatic differences found, provide sensible highlights from changesList
  if (keyDifferences.length === 0) {
    changesList.forEach((c, idx) => {
      keyDifferences.push({
        id: `diff-custom-${idx}`,
        title: `Điểm hiệu chỉnh ${idx + 1}`,
        oldValue: `Phiên bản ${baseVersion.versionNumber}`,
        newValue: `Phiên bản ${targetVersion.versionNumber}`,
        description: c,
      });
    });
  }

  // Spec comparison construction
  const specComparison: SpecComparisonItem[] = [];

  // 1. Quantity spec
  specComparison.push({
    key: 'quantity',
    title: 'Số lượng đơn hàng',
    oldValue: baseVersion.snapshotData?.quantity ? `${baseVersion.snapshotData.quantity} sản phẩm` : '—',
    oldBadge: 'Cũ',
    oldDescription: 'Kế hoạch sản xuất đợt trước',
    newValue: targetVersion.snapshotData?.quantity ? `${targetVersion.snapshotData.quantity} sản phẩm` : '—',
    newBadge:
      baseVersion.snapshotData?.quantity !== targetVersion.snapshotData?.quantity ? 'Đã điều chỉnh' : 'Giữ nguyên',
    newDescription: 'Kế hoạch sản xuất hiện tại',
    isChanged: baseVersion.snapshotData?.quantity !== targetVersion.snapshotData?.quantity,
  });

  // 2. Material spec
  specComparison.push({
    key: 'material',
    title: 'Chất liệu vải & Định lượng',
    oldValue: baseVersion.snapshotData?.material || 'Vải tiêu chuẩn ban đầu',
    oldDescription: 'Định lượng và xử lý bề mặt trước',
    newValue: targetVersion.snapshotData?.material || 'Vải tiêu chuẩn bản mới',
    newBadge: baseVersion.snapshotData?.material !== targetVersion.snapshotData?.material ? 'Nâng cấp' : 'Giữ nguyên',
    newDescription: 'Định lượng và xử lý bề mặt mới nhất',
    isChanged: baseVersion.snapshotData?.material !== targetVersion.snapshotData?.material,
  });

  // 3. Color spec
  specComparison.push({
    key: 'color',
    title: 'Màu sắc & Chuẩn nhuộm',
    oldValue: baseVersion.snapshotData?.pantoneColor || 'Màu mẫu cũ',
    oldDescription: 'Mã màu chuẩn chiếu',
    newValue: targetVersion.snapshotData?.pantoneColor || 'Màu mẫu mới',
    newBadge:
      baseVersion.snapshotData?.pantoneColor !== targetVersion.snapshotData?.pantoneColor
        ? 'Thay đổi mã màu'
        : 'Đồng nhất',
    newDescription: 'Mã màu sản xuất chính thức',
    isChanged: baseVersion.snapshotData?.pantoneColor !== targetVersion.snapshotData?.pantoneColor,
  });

  // 4. Logo / Graphic spec if present
  if (
    (baseVersion.snapshotData?.backLogoSize && baseVersion.snapshotData.backLogoSize !== 'N/A') ||
    (targetVersion.snapshotData?.backLogoSize && targetVersion.snapshotData.backLogoSize !== 'N/A')
  ) {
    specComparison.push({
      key: 'logo',
      title: 'Kích thước & Vị trí in lưng',
      oldValue: baseVersion.snapshotData?.backLogoSize || '25 × 18 cm',
      oldBadge: 'Bị nón che',
      oldDescription: 'Vị trí cao, bị nón áo buông che khuất',
      newValue: targetVersion.snapshotData?.backLogoSize || '20 × 15 cm',
      newBadge: 'Tối ưu 100%',
      newDescription: 'Hạ thấp 2cm, hiển thị trọn vẹn',
      isChanged: baseVersion.snapshotData?.backLogoSize !== targetVersion.snapshotData?.backLogoSize,
    });
  }

  // 5. Design File spec
  specComparison.push({
    key: 'designFile',
    title: 'Tệp thiết kế đồ họa',
    oldValue: baseVersion.snapshotData?.designFileName || 'Tệp đồ họa v1',
    oldDescription: 'Tệp ảnh xem trước / phác thảo',
    newValue: targetVersion.snapshotData?.designFileName || 'Tệp đồ họa v2',
    newBadge: 'Vector CMYK',
    newDescription: 'Tệp vector chuẩn in chế bản xưởng',
    isChanged: baseVersion.snapshotData?.designFileName !== targetVersion.snapshotData?.designFileName,
  });

  // Design files for each version
  const baseDesignFiles = (order.designFiles || []).filter(
    (f) => f.version === baseVersion.versionNumber || (!f.version && baseVersion.versionNumber === 'v01')
  );
  const targetDesignFiles = (order.designFiles || []).filter(
    (f) => f.version === targetVersion.versionNumber || (!f.version && targetVersion.versionNumber === 'v01')
  );

  // If specific files not found in order.designFiles, construct a virtual entry from snapshot
  if (baseDesignFiles.length === 0 && baseVersion.snapshotData?.designFileName) {
    baseDesignFiles.push({
      id: `virtual-base-${baseVersion.id}`,
      name: baseVersion.snapshotData.designFileName,
      size: '8.4 MB',
      type: 'raster',
      version: baseVersion.versionNumber,
      uploadedAt: baseVersion.createdAt,
      uploadedBy: baseVersion.createdBy,
      previewUrl: order.thumbnail,
      cmykReady: false,
      resolutionDpi: 150,
    });
  }

  if (targetDesignFiles.length === 0 && targetVersion.snapshotData?.designFileName) {
    targetDesignFiles.push({
      id: `virtual-target-${targetVersion.id}`,
      name: targetVersion.snapshotData.designFileName,
      size: '14.2 MB',
      type: 'vector',
      version: targetVersion.versionNumber,
      uploadedAt: targetVersion.createdAt,
      uploadedBy: targetVersion.createdBy,
      previewUrl: order.thumbnail,
      cmykReady: true,
      resolutionDpi: 300,
    });
  }

  // Change requests related to these versions
  const relatedChangeRequests = (order.changeRequests || []).filter(
    (cr) =>
      cr.relatedVersion === baseVersion.versionNumber ||
      cr.relatedVersion === targetVersion.versionNumber ||
      cr.resolvedInVersion === targetVersion.versionNumber
  );

  // Mockup data
  const isHoodieWithBackLogo = order.productName.toLowerCase().includes('hoodie');
  const mockupData = {
    oldTitle: `CŨ: Phiên bản ${baseVersion.versionNumber}`,
    newTitle: `MỚI: Phiên bản ${targetVersion.versionNumber}`,
    oldBadge: baseVersion.snapshotData?.backLogoSize && baseVersion.snapshotData.backLogoSize !== 'N/A' ? 'Bị che' : 'Bản cũ',
    newBadge:
      targetVersion.snapshotData?.backLogoSize && targetVersion.snapshotData.backLogoSize !== 'N/A'
        ? 'Tối ưu 100%'
        : 'Đã hoàn thiện',
    oldDescription: isHoodieWithBackLogo
      ? 'Kích thước lớn hơn, vị trí đặt cao hơn gần đường may cổ.'
      : 'Thông số và chi tiết phác thảo ở phiên bản trước.',
    newDescription: isHoodieWithBackLogo
      ? 'Kích thước tinh chỉnh gọn gàng, dịch chuyển thấp hơn đảm bảo không bị nón che.'
      : 'Thông số đã tinh chỉnh hoàn thiện sẵn sàng cho sản xuất.',
    oldImage: order.thumbnail,
    newImage: order.thumbnail,
  };

  return {
    order,
    sortedVersions: sorted,
    canCompare: true,
    isSingleVersion: false,
    baseVersion,
    targetVersion,
    baseVersionNumber: baseVersion.versionNumber,
    targetVersionNumber: targetVersion.versionNumber,
    headerTitle,
    headerSubtitle,
    availablePairs,
    aiSummary,
    changesList,
    keyDifferences,
    specComparison,
    baseDesignFiles,
    targetDesignFiles,
    relatedChangeRequests,
    mockupData,
  };
}
