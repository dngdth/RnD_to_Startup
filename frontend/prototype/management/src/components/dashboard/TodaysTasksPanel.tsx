import React from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  UploadCloud,
  FileCheck2,
  Ruler,
  Share2,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export interface TodayTaskItem {
  id: string;
  title: string;
  category: string;
  orderId: string;
  orderNumber: string;
  actionType: 'upload' | 'review_cr' | 'update_dim' | 'publish_ver';
  completed: boolean;
  dueTime: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM';
}

interface TodaysTasksPanelProps {
  tasks: TodayTaskItem[];
  onToggleTask: (taskId: string) => void;
  onExecuteAction: (task: TodayTaskItem) => void;
}

export const TodaysTasksPanel: React.FC<TodaysTasksPanelProps> = ({
  tasks,
  onToggleTask,
  onExecuteAction,
}) => {
  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100) || 0;

  const getTaskIcon = (type: TodayTaskItem['actionType']) => {
    switch (type) {
      case 'upload':
        return <UploadCloud className="w-4 h-4 text-orange-500" />;
      case 'review_cr':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'update_dim':
        return <Ruler className="w-4 h-4 text-indigo-500" />;
      case 'publish_ver':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  const getActionLabel = (type: TodayTaskItem['actionType']) => {
    switch (type) {
      case 'upload':
        return 'Tải lên';
      case 'review_cr':
        return 'Xử lý';
      case 'update_dim':
        return 'Cập nhật';
      case 'publish_ver':
        return 'Phát hành';
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
      {/* Header: Title on left, Badge on right (1 row, no subtitle) */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
            Nhiệm vụ hôm nay
          </h3>
        </div>

        {/* Counter Badge on the right */}
        <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/80 shrink-0">
          {completedCount}/{tasks.length} hoàn thành
        </span>
      </div>

      {/* Progress mini bar (Single row label + percent, followed by bar) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span>Tiến độ hôm nay</span>
          <span className="font-mono font-bold text-orange-600">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 4 Tasks List */}
      <div className="space-y-2 pt-0.5">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
              task.completed
                ? 'bg-slate-50/70 border-slate-200/50 opacity-60'
                : task.priority === 'URGENT'
                ? 'bg-white border-rose-200/80 shadow-2xs hover:border-rose-300'
                : 'bg-white border-slate-200/80 shadow-2xs hover:border-orange-300 hover:shadow-xs'
            }`}
          >
            {/* Left: Checkbox + Title + Meta */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                onClick={() => onToggleTask(task.id)}
                className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                  task.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 hover:border-orange-400 bg-white'
                }`}
                title={task.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu đã hoàn thành'}
              >
                {task.completed && <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />}
              </button>

              <div className="min-w-0 flex-1">
                {/* Row 1: Task Title & Priority tag */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold truncate ${
                      task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}
                    title={task.title}
                  >
                    {task.title}
                  </span>
                  {task.priority === 'URGENT' && !task.completed && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0 uppercase tracking-tight">
                      Gấp
                    </span>
                  )}
                </div>

                {/* Row 2: Metadata (Category + Due time) */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-medium">
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">{task.category}</span>
                  <span className="text-slate-300">·</span>
                  <span className="whitespace-nowrap shrink-0 text-slate-500">{task.dueTime}</span>
                </div>
              </div>
            </div>

            {/* Right: Aligned CTA Action Button */}
            <div className="shrink-0 flex items-center justify-end w-[86px]">
              {!task.completed ? (
                <button
                  onClick={() => onExecuteAction(task)}
                  className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                    task.priority === 'URGENT'
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/80'
                  }`}
                  title={`Thực hiện ngay: ${task.title}`}
                >
                  {getTaskIcon(task.actionType)}
                  <span>{getActionLabel(task.actionType)}</span>
                </button>
              ) : (
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 px-2 py-1 justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Đã xong</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
