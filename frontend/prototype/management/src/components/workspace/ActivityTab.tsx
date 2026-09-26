import React from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, ShieldCheck, Lock, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

export const ActivityTab: React.FC = () => {
  const { auditLogs, selectedOrder } = useApp();

  const filteredLogs = auditLogs.filter(
    (log) => !log.orderId || log.orderId === selectedOrder.orderNumber
  );

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
      case 'lock':
        return <Lock className="w-3.5 h-3.5 text-indigo-600" />;
      case 'ai':
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      case 'comment':
        return <MessageSquare className="w-3.5 h-3.5 text-sky-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-orange-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
        <h3 className="text-sm font-bold text-slate-900">
          Hoạt động đơn hàng & Lịch sử lưu vết
        </h3>
        <p className="text-xs text-slate-500">
          Hiển thị các sự kiện lưu vết theo thứ tự thời gian cho Đơn hàng #{selectedOrder.orderNumber}.
        </p>
      </div>

      <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 ml-3 my-2">
        {filteredLogs.map((log) => (
          <div key={log.id} className="relative group">
            {/* Timeline dot */}
            <div className="absolute -left-[31px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-2xs group-hover:border-orange-400 transition-colors">
              {getBadgeIcon(log.badgeType)}
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={log.userAvatar}
                    alt={log.userName}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="text-xs font-bold text-slate-900">{log.userName}</span>
                  <span className="text-xs font-semibold text-slate-700">· {log.action}</span>
                </div>
                <span className="text-[11px] text-slate-400">{log.timestamp}</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pl-7">
                {log.details}
              </p>

              {log.relatedVersion && (
                <div className="pl-7 pt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    Phiên bản: {log.relatedVersion}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
