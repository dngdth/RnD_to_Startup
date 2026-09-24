import React from 'react';
import { Order } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Calendar, ArrowRight } from 'lucide-react';

interface DesignerOrderCardProps {
  order: Order;
  onOpenWorkspace: (orderId: string) => void;
  onEditSpec?: (order: Order) => void;
  onUploadDesign?: (order: Order) => void;
  onRespondCR?: (order: Order) => void;
  onCreateVersion?: (order: Order) => void;
  onCompareVersions?: (order: Order) => void;
  onSendForReview?: (order: Order) => void;
}

export const DesignerOrderCard: React.FC<DesignerOrderCardProps> = ({
  order,
  onOpenWorkspace,
}) => {
  return (
    <div className="group relative rounded-2xl bg-white border border-slate-200/90 hover:border-orange-300 shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(251,146,60,0.08)] transition-all duration-200 p-3.5 sm:p-5 flex flex-row items-stretch gap-3.5 sm:gap-5 md:gap-6">
      {/* Cột trái: Ảnh sản phẩm rõ nét, kích thước cân đối, không chiếm quá nhiều diện tích */}
      <div
        onClick={() => onOpenWorkspace(order.id)}
        className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 cursor-pointer relative group/img shadow-2xs"
      >
        <img
          src={order.thumbnail}
          alt={order.productName}
          className="w-full h-full object-cover group-hover/img:scale-[1.03] transition-transform duration-300"
        />
      </div>

      {/* Cột phải: Thông tin theo thứ tự phân cấp thị giác rõ ràng, thẳng hàng, loại bỏ khoảng trắng dư thừa */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        {/* Nhóm trên: Badge trạng thái & Mức độ ưu tiên & Tên sản phẩm */}
        <div className="flex flex-col items-start">
          {/* 1. Hàng Badge: Trạng thái & Mức độ ưu tiên */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={order.status} size="sm" />
            {order.priority && (
              <span
                className={`inline-flex items-center rounded-full text-[10.5px] font-bold px-2.5 py-0.5 whitespace-nowrap shadow-2xs border ${
                  order.priority === 'URGENT'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : order.priority === 'HIGH'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : order.priority === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {order.priority === 'URGENT'
                  ? 'Cấp bách'
                  : order.priority === 'HIGH'
                  ? 'Ưu tiên cao'
                  : order.priority === 'MEDIUM'
                  ? 'Bình thường'
                  : 'Ưu tiên thấp'}
              </span>
            )}
          </div>

          {/* 2. Tên sản phẩm in đậm, dễ đọc, khoảng cách vừa phải */}
          <h3
            onClick={() => onOpenWorkspace(order.id)}
            className="mt-1.5 sm:mt-2 text-sm sm:text-base md:text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors cursor-pointer leading-snug tracking-tight line-clamp-2"
            title={order.productName}
          >
            {order.productName}
          </h3>
        </div>

        {/* Nhóm dưới: Hạn sản phẩm & Nút Mở Workspace đặt gần nhau */}
        <div className="mt-2.5 sm:mt-3 flex flex-col items-start gap-2">
          {/* 3. Dòng Hạn: 28/10/2026 (Tuyệt đối không dùng chữ Hạn giao) */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Hạn: {order.dueDate || order.deliveryDate}</span>
          </div>

          {/* 4. Nút hành động Mở Workspace kích thước vừa phải, CTA màu cam */}
          <button
            onClick={() => onOpenWorkspace(order.id)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold shadow-xs shadow-orange-600/20 transition-all active:scale-[0.98] cursor-pointer w-fit"
          >
            <span>Mở Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
