import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageCircle,
  CheckCircle2,
  Send,
  Webhook,
  ShieldCheck,
  Bell,
  Sparkles,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export const ZaloIntegrationSettings: React.FC = () => {
  const { zaloConfig, toggleZaloEvent, sendTestZaloNotification, showToast } = useApp();
  const [webhookUrl, setWebhookUrl] = useState(zaloConfig.webhookUrl);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyWebhook = () => {
    navigator.clipboard?.writeText(zaloConfig.webhookUrl);
    setIsCopied(true);
    showToast('Đã sao chép liên kết Zalo Webhook vào khay nhớ tạm!', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleToggleEvent = (key: keyof typeof zaloConfig.events) => {
    toggleZaloEvent(key);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Tích hợp Zalo Official Account (OA)
          </h2>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Zalo ZNS / OA v3
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Kết nối tài khoản Zalo xưởng may và khách hàng để nhận thông báo đẩy tức thì về duyệt mẫu, phiên bản thiết kế và ảnh chụp sản xuất.
        </p>
      </div>

      {/* Main Connection Status Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              Zalo
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  {zaloConfig.oaName}
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã kết nối & Xác thực
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                OA ID: <strong>{zaloConfig.oaId}</strong> · Hạng: Doanh nghiệp đã xác thực
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast('Đang kiểm tra lại bắt tay Zalo OA webhook...', 'info')}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Làm mới kết nối"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={sendTestZaloNotification}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-98"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi thông báo đẩy thử nghiệm</span>
            </button>
          </div>
        </div>

        {/* Webhook Configuration Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase">
            Đường dẫn Webhook Chiều vào / Chiều ra
          </label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-700 select-all">
              <Webhook className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <span className="truncate">{zaloConfig.webhookUrl}</span>
            </div>
            <button
              onClick={handleCopyWebhook}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Dán liên kết này vào cấu hình Webhook trong Zalo for Developers để đồng bộ tin nhắn phản hồi và phê duyệt từ khách hàng.
          </p>
        </div>

        {/* Event Subscriptions Checkboxes */}
        <div className="pt-2 space-y-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Kích hoạt sự kiện tự động & Phát thông báo đẩy
            </h4>
            <p className="text-xs text-slate-500">
              Chọn các mốc sản xuất và phê duyệt để gửi tin nhắn ZNS tức thì tới điện thoại của khách hàng và nhà sản xuất.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Event 1 */}
            <label
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition-colors ${
                zaloConfig.events.changeRequestCreated
                  ? 'bg-blue-50/40 border-blue-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={zaloConfig.events.changeRequestCreated}
                onChange={() => handleToggleEvent('changeRequestCreated')}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  ✓ Tạo yêu cầu chỉnh sửa
                </span>
                <span className="text-[11px] text-slate-500">
                  Thông báo cho đội ngũ thiết kế khi khách hàng gửi yêu cầu sửa đổi hoặc chỉnh kích thước.
                </span>
              </div>
            </label>

            {/* Event 2 */}
            <label
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition-colors ${
                zaloConfig.events.newVersionPublished
                  ? 'bg-blue-50/40 border-blue-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={zaloConfig.events.newVersionPublished}
                onChange={() => handleToggleEvent('newVersionPublished')}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  ✓ Phát hành phiên bản mới
                </span>
                <span className="text-[11px] text-slate-500">
                  Báo cho khách hàng khi bản vẽ kỹ thuật / hồ sơ tech pack cập nhật được phát hành.
                </span>
              </div>
            </label>

            {/* Event 3 */}
            <label
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition-colors ${
                zaloConfig.events.aiSummaryReady
                  ? 'bg-blue-50/40 border-blue-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={zaloConfig.events.aiSummaryReady}
                onChange={() => handleToggleEvent('aiSummaryReady')}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  ✓ Tóm tắt AI đã sẵn sàng
                </span>
                <span className="text-[11px] text-slate-500">
                  Gửi danh sách tóm tắt điểm thay đổi làm nổi bật các thông số kích thước chính xác.
                </span>
              </div>
            </label>

            {/* Event 4 */}
            <label
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition-colors ${
                zaloConfig.events.approvalRequired
                  ? 'bg-blue-50/40 border-blue-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={zaloConfig.events.approvalRequired}
                onChange={() => handleToggleEvent('approvalRequired')}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  ✓ Cần phê duyệt
                </span>
                <span className="text-[11px] text-slate-500">
                  Đẩy thông báo ký duyệt khẩn cấp đến người quyết định của thương hiệu.
                </span>
              </div>
            </label>

            {/* Event 5 */}
            <label
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition-colors sm:col-span-2 ${
                zaloConfig.events.productionLocked
                  ? 'bg-blue-50/40 border-blue-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={zaloConfig.events.productionLocked}
                onChange={() => handleToggleEvent('productionLocked')}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  ✓ Đã khóa để sản xuất
                </span>
                <span className="text-[11px] text-slate-500">
                  Thông báo cho quản đốc xưởng & kho rằng thông số đã được chốt và có thể bắt đầu cắt vải.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Live Simulation Preview */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              Mẫu xem trước tin nhắn Zalo
            </span>
            <span className="text-[10px]">ZNS định dạng tự động</span>
          </div>
          <div className="font-mono text-xs bg-slate-800/90 p-3 rounded-xl border border-slate-700 text-slate-200 space-y-1">
            <div className="text-blue-400 font-bold">[ProofPrint Chính thức] Cập nhật đơn hàng #PP-1024</div>
            <div>Xin chào Emma Watson, ABC Studio đã phát hành Phiên bản 04.</div>
            <div className="text-orange-300">Thay đổi theo AI: Logo lưng thu nhỏ còn 20x15cm. Đã kiểm tra 100% không bị mũ áo che khuất.</div>
            <div className="text-emerald-400">👉 Nhấn để xem & duyệt: https://proofprint.app/orders/PP-1024</div>
          </div>
        </div>
      </div>
    </div>
  );
};
