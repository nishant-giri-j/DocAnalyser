import {
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiOutlineIdentification,
  HiOutlineOfficeBuilding,
  HiOutlineLockClosed,
  HiOutlineClipboardList,
  HiOutlineDocument,
} from 'react-icons/hi';

const typeConfig = {
  INSURANCE_CERTIFICATE: {
    icon: HiOutlineShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  TAX_FORM_W9: {
    icon: HiOutlineDocumentText,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  TAX_FORM_W8: {
    icon: HiOutlineIdentification,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  BUSINESS_LICENSE: {
    icon: HiOutlineOfficeBuilding,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  NDA: {
    icon: HiOutlineLockClosed,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
  CONTRACT: {
    icon: HiOutlineClipboardList,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  OTHER: {
    icon: HiOutlineDocument,
    color: 'text-surface-400',
    bg: 'bg-surface-500/10',
  },
};

export default function DocumentTypeIcon({ type, size = 'md' }) {
  const config = typeConfig[type] || typeConfig.OTHER;
  const Icon = config.icon;
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  const containerSizes = { sm: 'p-1.5', md: 'p-2', lg: 'p-2.5' };

  return (
    <div className={`${config.bg} ${containerSizes[size]} rounded-xl`}>
      <Icon className={`${iconSizes[size]} ${config.color}`} />
    </div>
  );
}
