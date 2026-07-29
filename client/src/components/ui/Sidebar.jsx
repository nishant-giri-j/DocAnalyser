import { NavLink, useLocation } from 'react-router-dom';
import {
  HiOutlineViewGrid,
  HiOutlineUserGroup,
  HiOutlineCloudUpload,
  HiOutlineShieldCheck,
  HiOutlineCog,
  HiOutlineDocumentText,
} from 'react-icons/hi';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HiOutlineViewGrid },
  { name: 'Vendors', href: '/vendors', icon: HiOutlineUserGroup },
  { name: 'Upload Document', href: '/documents/upload', icon: HiOutlineCloudUpload },
  { name: 'Compliance Rules', href: '/compliance', icon: HiOutlineShieldCheck },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="glass-sidebar w-[260px] flex-shrink-0 flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg glow-primary">
            <HiOutlineShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">VendorGuard</h1>
            <p className="text-[10px] text-surface-500 font-medium tracking-widest uppercase">Compliance Suite</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        <div className="mb-4">
          <p className="px-3 text-[10px] font-semibold text-surface-600 uppercase tracking-widest mb-2">Main</p>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={isActive ? 'nav-item-active' : 'nav-item'}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${
                  isActive ? 'text-primary-400' : 'text-surface-500'
                }`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-xs font-bold text-white">
            AC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-200 truncate">Acme Corp</p>
            <p className="text-[10px] text-surface-500">Enterprise Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
