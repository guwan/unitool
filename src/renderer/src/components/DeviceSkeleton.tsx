// 骨架屏组件
export const DeviceSkeleton: React.FC = () => (
  <div className="backdrop-blur-xl bg-white/10 rounded-xl lg:rounded-2xl border border-white/20 p-4 lg:p-6 animate-pulse">
    <div className="flex items-start justify-between gap-3 flex-wrap lg:flex-nowrap">
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-6 bg-white/20 rounded-lg"></div>
          <div className="h-6 bg-white/20 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-4 bg-white/10 rounded w-3/4"></div>
          <div className="h-4 bg-white/10 rounded w-2/3"></div>
          <div className="h-4 bg-white/10 rounded w-4/5"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>
      <div className="w-24 h-10 bg-white/20 rounded-lg"></div>
    </div>
  </div>
);
