import React, { useState } from 'react';
import {
  Palette,
  Ruler,
  ShieldCheck,
  Copy,
  Check,
  Info,
  Plus,
  Trash2,
  X,
  Pipette,
  ChevronDown,
  Edit3,
  RotateCcw,
  Shirt,
} from 'lucide-react';

interface QuickResourcesWidgetProps {
  onNotify?: (message: string, type?: 'success' | 'info') => void;
}

interface CustomColorItem {
  id: string;
  name: string;
  code: string;
  hex: string;
  usage: string;
  isCustom: boolean;
}

export interface SizeRowItem {
  id: string;
  size: string;
  val1: number; // in cm
  val2: number; // in cm
  val3: number; // in cm
  isSample: boolean;
}

interface ProductCategoryConfig {
  id: string;
  name: string;
  col1Label: string;
  col2Label: string;
  col3Label: string;
  note: string;
  defaultRows: SizeRowItem[];
}

const PRODUCT_CATEGORIES: ProductCategoryConfig[] = [
  {
    id: 'hoodie',
    name: 'Áo Hoodie (Oversized)',
    col1Label: 'Dài áo',
    col2Label: 'Rộng ngực',
    col3Label: 'Dài tay',
    note: '* Dáng áo Hoodie Oversized nỉ bông lót cào cao cấp 380 GSM',
    defaultRows: [
      { id: 'h-s', size: 'S', val1: 68, val2: 54, val3: 61, isSample: false },
      { id: 'h-m', size: 'M', val1: 70, val2: 57, val3: 62.5, isSample: false },
      { id: 'h-l', size: 'L', val1: 72, val2: 60, val3: 64, isSample: true },
      { id: 'h-xl', size: 'XL', val1: 74, val2: 63, val3: 65.5, isSample: false },
      { id: 'h-2xl', size: '2XL', val1: 76, val2: 66, val3: 67, isSample: false },
    ],
  },
  {
    id: 'tshirt',
    name: 'Áo Thun (T-Shirt Basic)',
    col1Label: 'Dài áo',
    col2Label: 'Rộng ngực',
    col3Label: 'Rộng vai',
    note: '* Áo thun cổ tròn 100% Cotton Compact chải kỹ 250 GSM',
    defaultRows: [
      { id: 't-s', size: 'S', val1: 66, val2: 48, val3: 44, isSample: false },
      { id: 't-m', size: 'M', val1: 69, val2: 51, val3: 46, isSample: false },
      { id: 't-l', size: 'L', val1: 72, val2: 54, val3: 48, isSample: true },
      { id: 't-xl', size: 'XL', val1: 75, val2: 57, val3: 50, isSample: false },
      { id: 't-2xl', size: '2XL', val1: 78, val2: 60, val3: 52, isSample: false },
    ],
  },
  {
    id: 'crewneck',
    name: 'Áo Nỉ Cổ Tròn (Crewneck)',
    col1Label: 'Dài áo',
    col2Label: 'Rộng ngực',
    col3Label: 'Dài tay',
    note: '* Áo nỉ chui đầu cổ tròn form thoải mái nỉ chân cua 400 GSM',
    defaultRows: [
      { id: 'c-s', size: 'S', val1: 67, val2: 55, val3: 60, isSample: false },
      { id: 'c-m', size: 'M', val1: 69, val2: 58, val3: 61.5, isSample: false },
      { id: 'c-l', size: 'L', val1: 71, val2: 61, val3: 63, isSample: true },
      { id: 'c-xl', size: 'XL', val1: 73, val2: 64, val3: 64.5, isSample: false },
      { id: 'c-2xl', size: '2XL', val1: 75, val2: 67, val3: 66, isSample: false },
    ],
  },
  {
    id: 'bomber',
    name: 'Áo Khoác Bomber',
    col1Label: 'Dài áo',
    col2Label: 'Rộng ngực',
    col3Label: 'Dài tay',
    note: '* Áo khoác Bomber vải dù cán màng chống thấm nước trần bông',
    defaultRows: [
      { id: 'b-s', size: 'S', val1: 65, val2: 56, val3: 60, isSample: false },
      { id: 'b-m', size: 'M', val1: 67, val2: 59, val3: 61.5, isSample: false },
      { id: 'b-l', size: 'L', val1: 69, val2: 62, val3: 63, isSample: true },
      { id: 'b-xl', size: 'XL', val1: 71, val2: 65, val3: 64.5, isSample: false },
      { id: 'b-2xl', size: '2XL', val1: 73, val2: 68, val3: 66, isSample: false },
    ],
  },
];

export const QuickResourcesWidget: React.FC<QuickResourcesWidgetProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'pantone' | 'sizes' | 'guide'>('sizes');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // =========================================================================
  // TAB 1: PANTONE & CUSTOM COLOR STATE
  // =========================================================================
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [customHex, setCustomHex] = useState('#2A9D8F');
  const [customName, setCustomName] = useState('');
  const [customUsage, setCustomUsage] = useState('');

  const trendPresets = [
    { name: 'Sage Teal', hex: '#2A9D8F' },
    { name: 'Terracotta', hex: '#E76F51' },
    { name: 'Deep Pine', hex: '#1E3F35' },
    { name: 'Warm Ochre', hex: '#E9C46A' },
    { name: 'Burgundy Wine', hex: '#7209B7' },
    { name: 'Crimson Ember', hex: '#D90429' },
  ];

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16) || 0;
      const g = parseInt(clean.substring(2, 4), 16) || 0;
      const b = parseInt(clean.substring(4, 6), 16) || 0;
      return `RGB(${r}, ${g}, ${b})`;
    }
    return 'RGB(42, 157, 143)';
  };

  const standardPantoneColors: CustomColorItem[] = [
    {
      id: 'std-1',
      name: 'Classic Navy',
      code: 'PANTONE 19-4052 TCX',
      hex: '#0F213A',
      usage: 'Màu vải chính',
      isCustom: false,
    },
    {
      id: 'std-2',
      name: 'Flame Orange',
      code: 'PANTONE 18-1662 TCX',
      hex: '#E24B26',
      usage: 'Viền mũ & Dây rút',
      isCustom: false,
    },
    {
      id: 'std-3',
      name: 'Marshmallow',
      code: 'PANTONE 11-0601 TCX',
      hex: '#F2EFEB',
      usage: 'Bo cổ & Phối tay',
      isCustom: false,
    },
    {
      id: 'std-4',
      name: 'Jet Black',
      code: 'PANTONE 19-0303 TCX',
      hex: '#1C1C1E',
      usage: 'Logo thêu & Tag',
      isCustom: false,
    },
  ];

  const [customColors, setCustomColors] = useState<CustomColorItem[]>([
    {
      id: 'custom-1',
      name: 'Dusty Sage',
      code: 'TỰ CHỌN · #6B8E7B',
      hex: '#6B8E7B',
      usage: 'Thử nghiệm viền túi',
      isCustom: true,
    },
  ]);

  const handleAddCustomColor = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedHex = customHex.startsWith('#') ? customHex.toUpperCase() : `#${customHex.toUpperCase()}`;
    const name = customName.trim() || `Màu tùy chọn ${customColors.length + 1}`;
    const usage = customUsage.trim() || 'Thử nghiệm thiết kế';

    const newColor: CustomColorItem = {
      id: `custom-${Date.now()}`,
      name,
      code: `TỰ CHỌN · ${formattedHex}`,
      hex: formattedHex,
      usage,
      isCustom: true,
    };

    setCustomColors([...customColors, newColor]);
    setIsColorPickerOpen(false);
    setCustomName('');
    setCustomUsage('');

    if (onNotify) {
      onNotify(`Đã lưu màu tùy chỉnh: ${name} (${formattedHex})`, 'success');
    }
  };

  const handleDeleteCustomColor = (id: string, colorName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomColors(customColors.filter((c) => c.id !== id));
    if (onNotify) {
      onNotify(`Đã xóa màu: ${colorName}`, 'info');
    }
  };

  // =========================================================================
  // TAB 2: ADVANCED SIZE CHART STATE & CATEGORY SELECTOR
  // =========================================================================
  const [selectedCategory, setSelectedCategory] = useState<string>('hoodie');
  const [sizeUnit, setSizeUnit] = useState<'cm' | 'inch'>('cm');
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [isAddSizeModalOpen, setIsAddSizeModalOpen] = useState(false);

  // Lưu trữ bảng kích thước cho từng loại sản phẩm
  const [sizeTables, setSizeTables] = useState<Record<string, SizeRowItem[]>>({
    hoodie: PRODUCT_CATEGORIES[0].defaultRows,
    tshirt: PRODUCT_CATEGORIES[1].defaultRows,
    jogger: PRODUCT_CATEGORIES[2].defaultRows,
    bomber: PRODUCT_CATEGORIES[3].defaultRows,
  });

  // State cho form thêm size mới
  const [newSizeName, setNewSizeName] = useState('3XL');
  const [newVal1, setNewVal1] = useState('78');
  const [newVal2, setNewVal2] = useState('69');
  const [newVal3, setNewVal3] = useState('68.5');
  const [newIsSample, setNewIsSample] = useState(false);

  // Lấy config hiện tại
  const currentCategoryConfig = PRODUCT_CATEGORIES.find((c) => c.id === selectedCategory) || PRODUCT_CATEGORIES[0];
  const currentRows = sizeTables[selectedCategory] || currentCategoryConfig.defaultRows;

  // Chuyển đổi cm sang inch
  const formatVal = (valCm: number) => {
    if (sizeUnit === 'cm') return valCm;
    return Math.round((valCm / 2.54) * 10) / 10;
  };

  // Cập nhật giá trị ô khi sửa inline
  const handleUpdateRowValue = (rowId: string, field: 'val1' | 'val2' | 'val3', valueStr: string) => {
    const num = parseFloat(valueStr) || 0;
    const cmValue = sizeUnit === 'cm' ? num : Math.round(num * 2.54 * 10) / 10;

    setSizeTables((prev) => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map((row) =>
        row.id === rowId ? { ...row, [field]: cmValue } : row
      ),
    }));
  };

  // Đổi size Fit mẫu
  const handleSetSample = (rowId: string) => {
    setSizeTables((prev) => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map((row) => ({
        ...row,
        isSample: row.id === rowId,
      })),
    }));
    const row = currentRows.find((r) => r.id === rowId);
    if (row && onNotify) {
      onNotify(`Đã đặt Size ${row.size} làm thông số Fit Mẫu chuẩn`, 'info');
    }
  };

  // Xóa một hàng size
  const handleDeleteRow = (rowId: string) => {
    if (currentRows.length <= 2) {
      if (onNotify) onNotify('Bảng cần giữ tối thiểu 2 kích thước!', 'info');
      return;
    }
    setSizeTables((prev) => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].filter((r) => r.id !== rowId),
    }));
    if (onNotify) onNotify('Đã xóa dòng kích thước khỏi bảng', 'info');
  };

  // Thêm size mới
  const handleAddNewSize = (e: React.FormEvent) => {
    e.preventDefault();
    const sizeName = newSizeName.trim().toUpperCase() || '3XL';
    const v1 = parseFloat(newVal1) || 0;
    const v2 = parseFloat(newVal2) || 0;
    const v3 = parseFloat(newVal3) || 0;

    const cm1 = sizeUnit === 'cm' ? v1 : Math.round(v1 * 2.54 * 10) / 10;
    const cm2 = sizeUnit === 'cm' ? v2 : Math.round(v2 * 2.54 * 10) / 10;
    const cm3 = sizeUnit === 'cm' ? v3 : Math.round(v3 * 2.54 * 10) / 10;

    const newRow: SizeRowItem = {
      id: `${selectedCategory}-${Date.now()}`,
      size: sizeName,
      val1: cm1,
      val2: cm2,
      val3: cm3,
      isSample: newIsSample,
    };

    setSizeTables((prev) => {
      let updated = [...(prev[selectedCategory] || [])];
      if (newIsSample) {
        updated = updated.map((r) => ({ ...r, isSample: false }));
      }
      return {
        ...prev,
        [selectedCategory]: [...updated, newRow],
      };
    });

    setIsAddSizeModalOpen(false);
    if (onNotify) {
      onNotify(`Đã thêm kích thước mới: Size ${sizeName} (${cm1} / ${cm2} / ${cm3} cm)`, 'success');
    }
  };

  // Đặt lại dữ liệu gốc
  const handleResetCategoryData = () => {
    setSizeTables((prev) => ({
      ...prev,
      [selectedCategory]: currentCategoryConfig.defaultRows,
    }));
    if (onNotify) onNotify(`Đã khôi phục thông số gốc của ${currentCategoryConfig.name}`, 'info');
  };

  // =========================================================================
  // TAB 3: BRAND GUIDE STATE
  // =========================================================================
  const brandGuideRules = [
    {
      label: 'Logo ngực trái',
      detail: 'Hạ cổ 12.5 cm · Cách mép nách 7.5 cm',
      size: '6.5 × 3.2 cm (Tối đa)',
      badge: 'Thêu vi tính 3D',
    },
    {
      label: 'Đồ họa sau lưng',
      detail: 'Cách chân mũ 6.0 cm · Căn giữa sống lưng',
      size: '30 × 38 cm (A3+)',
      badge: 'In lụa Plastisol',
    },
    {
      label: 'Khoảng cách an toàn',
      detail: 'Cách đường may chần & đường ráp nách',
      size: '≥ 3.0 cm',
      badge: 'Vùng đệm kỹ thuật',
    },
    {
      label: 'Chuẩn định dạng file',
      detail: 'Vector AI/PDF hoặc TIFF 300 DPI (CMYK)',
      size: 'FOGRA39 profile',
      badge: 'Chế bản in',
    },
  ];

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (onNotify) {
      onNotify(`Đã chép ${label}: ${code}`, 'success');
    }
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5 relative">
      {/* 1. Header: Tiêu đề + Icon nhận diện */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-200/70">
            <Palette className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
            Tài nguyên & Thông số nhanh
          </h3>
        </div>
      </div>

      {/* 2. Segmented Control Tabs (Pantone | Bảng Size | Quy chuẩn) */}
      <div className="bg-slate-100/90 p-1 rounded-xl grid grid-cols-3 gap-1 border border-slate-200/60">
        <button
          onClick={() => setActiveTab('pantone')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'pantone'
              ? 'bg-white text-orange-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Palette className="w-3 h-3" />
          <span className="truncate">Mã Pantone</span>
        </button>

        <button
          onClick={() => setActiveTab('sizes')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'sizes'
              ? 'bg-white text-orange-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Ruler className="w-3 h-3" />
          <span className="truncate">Bảng Size</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-white text-orange-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span className="truncate">Quy chuẩn</span>
        </button>
      </div>

      {/* 3. NỘI DUNG TỪNG TAB */}
      <div className="min-h-[250px]">
        {/* ========================================================================= */}
        {/* TAB 1: BẢNG MÀU PANTONE & TỰ CHỌN MÀU */}
        {/* ========================================================================= */}
        {activeTab === 'pantone' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] px-0.5">
              <span className="text-slate-500 font-medium">
                Bấm ô để chép mã:
              </span>
              <button
                onClick={() => setIsColorPickerOpen(true)}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="Mở bảng chọn màu tự do để lưu màu mới"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Thêm màu mới</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {standardPantoneColors.map((color) => {
                const isCopied = copiedCode === color.code;
                return (
                  <button
                    key={color.id}
                    onClick={() => handleCopy(color.code, color.name)}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-orange-300 hover:shadow-xs transition-all text-left group relative cursor-pointer"
                    title={`Sao chép ${color.code}`}
                  >
                    <div
                      className="w-full h-8 rounded-lg mb-2 shadow-inner border border-black/10 flex items-center justify-end p-1"
                      style={{ backgroundColor: color.hex }}
                    >
                      {isCopied ? (
                        <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Đã chép</span>
                        </span>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Copy className="w-2.5 h-2.5" />
                          <span>Chép</span>
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {color.name}
                      </div>
                      <div className="text-[10px] font-mono text-orange-700 font-bold truncate">
                        {color.code}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {color.usage}
                      </div>
                    </div>
                  </button>
                );
              })}

              {customColors.map((color) => {
                const isCopied = copiedCode === color.hex;
                return (
                  <div
                    key={color.id}
                    onClick={() => handleCopy(color.hex, color.name)}
                    className="p-2.5 rounded-xl border border-dashed border-orange-300/90 bg-orange-50/30 hover:border-orange-400 hover:bg-orange-50/60 hover:shadow-xs transition-all text-left group relative cursor-pointer"
                    title={`Sao chép mã ${color.hex}`}
                  >
                    <div
                      className="w-full h-8 rounded-lg mb-2 shadow-inner border border-black/10 flex items-center justify-between p-1"
                      style={{ backgroundColor: color.hex }}
                    >
                      <span className="bg-black/60 text-white text-[8px] font-bold px-1 py-0.2 rounded">
                        Tự chọn
                      </span>

                      <div className="flex items-center gap-1">
                        {isCopied ? (
                          <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>Đã chép</span>
                          </span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Copy className="w-2.5 h-2.5" />
                          </span>
                        )}

                        <button
                          onClick={(e) => handleDeleteCustomColor(color.id, color.name, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-rose-600 hover:bg-rose-700 text-white p-1 rounded cursor-pointer"
                          title="Xóa màu này"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {color.name}
                      </div>
                      <div className="text-[10px] font-mono text-orange-600 font-bold truncate">
                        {color.hex}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {color.usage}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setIsColorPickerOpen(true)}
                className="p-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/40 text-slate-400 hover:text-orange-600 transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer min-h-[95px] group"
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-orange-600 stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-bold">Thêm màu tùy chọn</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ADVANCED SIZE CHART + PRODUCT CATEGORY SELECTOR + EDIT/ADD */}
        {/* ========================================================================= */}
        {activeTab === 'sizes' && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            {/* 1. Thanh chọn loại sản phẩm (Product Category Dropdown) */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 hover:border-orange-300 transition-colors">
                  <Shirt className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setIsEditingSpecs(false);
                    }}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-5"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id} className="py-1">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Nút bật/tắt chế độ sửa nhanh */}
              <button
                onClick={() => setIsEditingSpecs(!isEditingSpecs)}
                className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                  isEditingSpecs
                    ? 'bg-orange-600 border-orange-600 text-white shadow-2xs'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title={isEditingSpecs ? 'Lưu và thoát chế độ sửa' : 'Bật chế độ sửa nhanh thông số'}
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingSpecs ? 'Xong' : 'Sửa'}</span>
              </button>

              {/* Nút thêm dòng size mới */}
              <button
                onClick={() => setIsAddSizeModalOpen(true)}
                className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Thêm size mới (ví dụ 3XL, 4XL...)"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Thêm size</span>
              </button>
            </div>

            {/* 2. Dòng điều khiển phụ: Dung sai, Nút Đặt lại & Chuyển đổi đơn vị (cm / inch) */}
            <div className="flex items-center justify-between text-[11px] px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">
                  Dung sai: <strong className="text-slate-700">±1.0 cm</strong>
                </span>
                {/* Nút reset nếu có thay đổi */}
                <button
                  onClick={handleResetCategoryData}
                  className="text-slate-400 hover:text-orange-600 p-0.5 rounded transition-colors"
                  title="Khôi phục thông số chuẩn ban đầu"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Switcher cm / inch */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/60">
                <button
                  onClick={() => setSizeUnit('cm')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    sizeUnit === 'cm'
                      ? 'bg-white text-orange-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  cm
                </button>
                <button
                  onClick={() => setSizeUnit('inch')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    sizeUnit === 'inch'
                      ? 'bg-white text-orange-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  inch
                </button>
              </div>
            </div>

            {/* 3. Bảng kích thước thông số phản ứng nhanh */}
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/50">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200/70">
                  <tr>
                    <th className="py-2 px-2.5">Size</th>
                    <th className="py-2 px-1 text-center">{currentCategoryConfig.col1Label}</th>
                    <th className="py-2 px-1 text-center">{currentCategoryConfig.col2Label}</th>
                    <th className="py-2 px-1 text-center">{currentCategoryConfig.col3Label}</th>
                    {isEditingSpecs && <th className="py-2 px-1.5 text-right w-10">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {currentRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        row.isSample
                          ? 'bg-orange-50/80 font-bold text-orange-950'
                          : 'hover:bg-white text-slate-700'
                      }`}
                    >
                      {/* Cột Tên Size + Badge Fit Mẫu */}
                      <td className="py-1.5 px-2.5 font-sans font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{row.size}</span>
                          {row.isSample ? (
                            <span className="text-[9px] font-sans font-extrabold uppercase px-1 py-0.2 rounded bg-orange-200 text-orange-800 shrink-0">
                              Fit mẫu
                            </span>
                          ) : (
                            isEditingSpecs && (
                              <button
                                onClick={() => handleSetSample(row.id)}
                                className="text-[9px] font-sans font-semibold text-slate-400 hover:text-orange-600 underline cursor-pointer shrink-0"
                              >
                                Đặt mẫu
                              </button>
                            )
                          )}
                        </div>
                      </td>

                      {/* Cột 1: Thông số 1 (Dài áo) */}
                      <td className="py-1 px-1 text-center">
                        {isEditingSpecs ? (
                          <input
                            type="number"
                            step="0.5"
                            value={formatVal(row.val1)}
                            onChange={(e) => handleUpdateRowValue(row.id, 'val1', e.target.value)}
                            className="w-12 text-center bg-white border border-orange-300 rounded px-1 py-0.5 text-xs font-mono font-bold text-orange-900 focus:outline-none"
                          />
                        ) : (
                          <span>{formatVal(row.val1)}</span>
                        )}
                      </td>

                      {/* Cột 2: Thông số 2 (Rộng ngực) */}
                      <td className="py-1 px-1 text-center">
                        {isEditingSpecs ? (
                          <input
                            type="number"
                            step="0.5"
                            value={formatVal(row.val2)}
                            onChange={(e) => handleUpdateRowValue(row.id, 'val2', e.target.value)}
                            className="w-12 text-center bg-white border border-orange-300 rounded px-1 py-0.5 text-xs font-mono font-bold text-orange-900 focus:outline-none"
                          />
                        ) : (
                          <span>{formatVal(row.val2)}</span>
                        )}
                      </td>

                      {/* Cột 3: Thông số 3 (Dài tay / Rộng vai) */}
                      <td className="py-1 px-1 text-center">
                        {isEditingSpecs ? (
                          <input
                            type="number"
                            step="0.5"
                            value={formatVal(row.val3)}
                            onChange={(e) => handleUpdateRowValue(row.id, 'val3', e.target.value)}
                            className="w-12 text-center bg-white border border-orange-300 rounded px-1 py-0.5 text-xs font-mono font-bold text-orange-900 focus:outline-none"
                          />
                        ) : (
                          <span>{formatVal(row.val3)}</span>
                        )}
                      </td>

                      {/* Cột Xóa khi ở chế độ Edit */}
                      {isEditingSpecs && (
                        <td className="py-1 px-1.5 text-right">
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                            title="Xóa kích thước này"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ghi chú mô tả dáng áo */}
            <p className="text-[10px] text-slate-400 italic text-center pt-0.5">
              {currentCategoryConfig.note}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: QUY CHUẨN BRAND GUIDE */}
        {/* ========================================================================= */}
        {activeTab === 'guide' && (
          <div className="space-y-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 gap-2">
              {brandGuideRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-orange-200 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800">
                      {rule.label}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100/70 text-orange-800 border border-orange-200/60 shrink-0">
                      {rule.badge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">{rule.detail}</span>
                    <span className="font-mono font-bold text-slate-700 shrink-0 ml-2">
                      {rule.size}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[10px] text-amber-800">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Lưu ý: Mọi điều chỉnh vị trí &gt; 1.5 cm phải tạo Change Request (CR).</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* POPOVER / MODAL: THÊM DÒNG SIZE MỚI (ADD SIZE MODAL) */}
      {/* ========================================================================= */}
      {isAddSizeModalOpen && (
        <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xs rounded-2xl p-4 flex flex-col justify-between border border-orange-200 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-3">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-orange-600" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Thêm Size Mới ({currentCategoryConfig.name})
                </h4>
              </div>
              <button
                onClick={() => setIsAddSizeModalOpen(false)}
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Size Preset Chips */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 block mb-1">Gợi ý size nhanh:</span>
              <div className="flex items-center gap-1.5">
                {['XS', '3XL', '4XL', '5XL', 'Free'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setNewSizeName(chip)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                      newSizeName === chip
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Tên Size Input */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tên kích thước</label>
              <input
                type="text"
                value={newSizeName}
                onChange={(e) => setNewSizeName(e.target.value.toUpperCase())}
                placeholder="Ví dụ: 3XL, 4XL, Oversize..."
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:bg-white uppercase"
              />
            </div>

            {/* 3 Thông số theo loại sản phẩm */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5 truncate">
                  {currentCategoryConfig.col1Label} ({sizeUnit})
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newVal1}
                  onChange={(e) => setNewVal1(e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:bg-white text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5 truncate">
                  {currentCategoryConfig.col2Label} ({sizeUnit})
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newVal2}
                  onChange={(e) => setNewVal2(e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:bg-white text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5 truncate">
                  {currentCategoryConfig.col3Label} ({sizeUnit})
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newVal3}
                  onChange={(e) => setNewVal3(e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:bg-white text-center"
                />
              </div>
            </div>

            {/* Checkbox Đặt làm Fit mẫu */}
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsSample}
                onChange={(e) => setNewIsSample(e.target.checked)}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-[11px] font-semibold text-slate-700">
                Đặt size này làm thông số Fit Mẫu chuẩn
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={() => setIsAddSizeModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAddNewSize}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs shadow-orange-600/20 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Thêm vào bảng</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM COLOR PICKER POPOVER / MODAL */}
      {/* ========================================================================= */}
      {isColorPickerOpen && (
        <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xs rounded-2xl p-4 flex flex-col justify-between border border-orange-200 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Pipette className="w-4 h-4 text-orange-600" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Bảng chọn màu tự do
                </h4>
              </div>
              <button
                onClick={() => setIsColorPickerOpen(false)}
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <div
                  className="w-14 h-14 rounded-xl border border-black/10 shadow-inner flex items-center justify-center cursor-pointer transition-transform group-hover:scale-105"
                  style={{ backgroundColor: customHex }}
                  title="Bấm để mở Color Spectrum hệ thống"
                  onClick={() => document.getElementById('native-color-input')?.click()}
                >
                  <Pipette className="w-4 h-4 text-white drop-shadow-md opacity-80 group-hover:opacity-100" />
                </div>
                <input
                  id="native-color-input"
                  type="color"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
                  className="sr-only"
                />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Mã HEX</span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">{hexToRgb(customHex)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono font-bold text-slate-400">#</span>
                  <input
                    type="text"
                    value={customHex.replace('#', '')}
                    onChange={(e) => setCustomHex(`#${e.target.value.toUpperCase()}`)}
                    maxLength={6}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white uppercase"
                    placeholder="2A9D8F"
                  />
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                Gợi ý màu thịnh hành:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {trendPresets.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => {
                      setCustomHex(preset.hex);
                      setCustomName(preset.name);
                    }}
                    className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 cursor-pointer ${
                      customHex === preset.hex ? 'ring-2 ring-orange-500 ring-offset-1 border-white' : 'border-black/10'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    title={`${preset.name} (${preset.hex})`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tên màu</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ví dụ: Xanh Rêu..."
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Vị trí dùng</label>
                <input
                  type="text"
                  value={customUsage}
                  onChange={(e) => setCustomUsage(e.target.value)}
                  placeholder="Ví dụ: Dây rút, Viền túi..."
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={() => setIsColorPickerOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleAddCustomColor}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs shadow-orange-600/20 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Lưu vào bảng màu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
