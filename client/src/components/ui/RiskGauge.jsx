import { motion } from 'framer-motion';

const getRiskConfig = (score) => {
  if (score <= 30) return { label: 'Low', color: '#22c55e', trackColor: 'rgba(34, 197, 94, 0.1)' };
  if (score <= 60) return { label: 'Medium', color: '#f59e0b', trackColor: 'rgba(245, 158, 11, 0.1)' };
  if (score <= 80) return { label: 'High', color: '#f97316', trackColor: 'rgba(249, 115, 22, 0.1)' };
  return { label: 'Critical', color: '#ef4444', trackColor: 'rgba(239, 68, 68, 0.1)' };
};

export default function RiskGauge({ score = 0, size = 120, strokeWidth = 8 }) {
  const config = getRiskConfig(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={config.trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Animated progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-bold text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {Math.round(score)}
          </motion.span>
          <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}
