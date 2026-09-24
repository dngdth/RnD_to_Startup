import React from 'react';
import { OrderStatus, ChangeRequestStatus, ChangeRequestPriority } from '../../types';
import { ShieldCheck, Lock, Clock, AlertCircle, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: OrderStatus | ChangeRequestStatus | ChangeRequestPriority | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-0.5 font-semibold',
    lg: 'text-xs px-3 py-1 font-bold',
  };

  switch (status) {
    case 'IN_REVIEW':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <Clock className="w-3 h-3 text-amber-600 animate-pulse shrink-0" />}
          Chờ phê duyệt
        </span>
      );

    case 'APPROVED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/90 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
          Đã phê duyệt
        </span>
      );

    case 'LOCKED_FOR_PRODUCTION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-amber-300 border border-slate-800 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
          Đã khóa để sản xuất
        </span>
      );

    case 'IN_PRODUCTION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-amber-300 border border-slate-800 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
          Đang sản xuất
        </span>
      );

    case 'CHANGE_REQUESTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-900 border border-rose-200/80 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />}
          Yêu cầu chỉnh sửa
        </span>
      );

    case 'DRAFT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <RotateCcw className="w-3 h-3 text-slate-500 shrink-0" />}
          Bản nháp
        </span>
      );

    // Change request statuses
    case 'OPEN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-900 border border-orange-200 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
          Chưa xử lí
        </span>
      );

    case 'IN_PROGRESS':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-900 border border-sky-200 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping shrink-0" />}
          Đang xử lý
        </span>
      );

    case 'RESOLVED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
          Đã xử lý
        </span>
      );

    case 'REJECTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <XCircle className="w-3 h-3 text-slate-400 shrink-0" />}
          Từ chối
        </span>
      );

    // Priorities
    case 'URGENT':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 font-bold whitespace-nowrap ${sizeClasses[size]} ${className}`}>
          Gấp
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200/80 font-semibold whitespace-nowrap ${sizeClasses[size]} ${className}`}>
          Cao
        </span>
      );
    case 'MEDIUM':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium whitespace-nowrap ${sizeClasses[size]} ${className}`}>
          Trung bình
        </span>
      );
    case 'LOW':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-normal whitespace-nowrap ${sizeClasses[size]} ${className}`}>
          Thấp
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap ${sizeClasses[size]} ${className}`}
        >
          {status}
        </span>
      );
  }
};
