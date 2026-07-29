import { motion } from 'framer-motion';

export default function EmptyState({
  icon: Icon,
  title = 'No data found',
  description = 'There are no items to display.',
  action,
  actionLabel = 'Get Started',
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {Icon && (
        <div className="p-4 rounded-2xl bg-white/[0.04] mb-5">
          <Icon className="w-8 h-8 text-surface-500" />
        </div>
      )}
      <h3 className="text-base font-semibold text-surface-300 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 text-center max-w-sm mb-6">{description}</p>
      {action && (
        <button onClick={action} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
