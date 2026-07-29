import { VENDOR_STATUS, DOCUMENT_STATUS } from '../../lib/constants';
import {
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineXCircle,
  HiOutlineArchive,
} from 'react-icons/hi';

const iconMap = {
  clock: HiOutlineClock,
  'check-circle': HiOutlineCheckCircle,
  'alert-triangle': HiOutlineExclamation,
  'x-circle': HiOutlineXCircle,
  archive: HiOutlineArchive,
};

const colorMap = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  primary: 'badge-primary',
  surface: 'badge-surface',
};

export default function StatusBadge({ status, type = 'vendor' }) {
  const statusMap = type === 'vendor' ? VENDOR_STATUS : DOCUMENT_STATUS;
  const config = statusMap[status];

  if (!config) return <span className="badge-surface">{status}</span>;

  const IconComponent = config.icon ? iconMap[config.icon] : null;
  const badgeClass = colorMap[config.color] || 'badge-surface';

  return (
    <span className={badgeClass}>
      {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
      {config.label}
    </span>
  );
}
