import { useLocation } from 'react-router-dom';
import { HiOutlineSearch, HiOutlineBell } from 'react-icons/hi';
import { useState } from 'react';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/vendors': 'Vendors',
  '/documents/upload': 'Upload Document',
  '/compliance': 'Compliance Rules',
};

export default function Header() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const getTitle = () => {
    const path = location.pathname;
    if (pageTitles[path]) return pageTitles[path];
    if (path.startsWith('/vendors/')) return 'Vendor Details';
    if (path.startsWith('/documents/')) return 'Document Details';
    return 'VendorGuard';
  };

  return (
    <header className="glass-header h-16 flex-shrink-0 flex items-center justify-between px-6 lg:px-8">
      <div>
        <h2 className="text-lg font-semibold text-white tracking-tight">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl
                       text-sm text-white placeholder-surface-500
                       focus:outline-none focus:ring-1 focus:ring-primary-500/30 focus:border-primary-500/30
                       transition-all duration-200
                       hover:bg-white/[0.06]"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-surface-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-surface-950"></span>
        </button>
      </div>
    </header>
  );
}
