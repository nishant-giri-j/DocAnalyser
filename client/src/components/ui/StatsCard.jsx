import { motion } from 'framer-motion';

export default function StatsCard({ label, value, icon: Icon, change, changeType, delay = 0 }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="p-2 rounded-xl bg-white/[0.04]">
            <Icon className="w-4 h-4 text-surface-400" />
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="stat-value">{value}</span>
        {change !== undefined && (
          <span className={`stat-change ${
            changeType === 'positive' ? 'text-emerald-400' :
            changeType === 'negative' ? 'text-red-400' : 'text-surface-500'
          }`}>
            {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '→'}
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}
