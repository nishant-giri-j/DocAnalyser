import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiPlus, HiOutlineSearch } from 'react-icons/hi';
import api from '../lib/api';
import { PageLoader } from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

const VendorList = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/vendors');
        setVendors(response.data);
      } catch (err) {
        setError(err.message || 'Failed to load vendors');
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  const filteredVendors = vendors.filter(vendor => 
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <PageLoader message="Loading vendors..." />;
  if (error) return <div className="p-8 text-red-500 glass-card">Error: {error}</div>;

  return (
    <div className="section-fade max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Vendors</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your vendors and monitor their compliance.</p>
        </div>
        <button 
          onClick={() => navigate('/vendors/new')}
          className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <HiPlus className="w-5 h-5" />
          <span>Add Vendor</span>
        </button>
      </div>

      <div className="glass-card p-4 rounded-2xl flex items-center gap-3 border border-slate-200 dark:border-slate-700/50">
        <HiOutlineSearch className="w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search vendors by name or company..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 outline-none"
        />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 stagger-children delay-100">
        <div className="overflow-x-auto">
          {filteredVendors.length > 0 ? (
            <table className="table-premium w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Risk Score</th>
                  <th>Documents</th>
                  <th>Added Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr 
                    key={vendor.id} 
                    onClick={() => navigate(`/vendors/${vendor.id}`)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="font-medium text-slate-900 dark:text-white">
                      {vendor.name}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {vendor.company || 'N/A'}
                    </td>
                    <td>
                      <StatusBadge type="vendor" status={vendor.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${
                          vendor.riskScore > 70 ? 'text-red-500' : 
                          vendor.riskScore > 30 ? 'text-amber-500' : 
                          'text-emerald-500'
                        }`}>
                          {vendor.riskScore || 0}
                        </span>
                      </div>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {vendor.documentsCount || 0}
                    </td>
                    <td className="text-slate-500 text-sm">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12">
              <EmptyState 
                title={searchTerm ? "No matching vendors" : "No vendors yet"}
                description={searchTerm ? `No vendors found matching "${searchTerm}".` : "Get started by adding your first vendor to the system."}
                actionLabel={searchTerm ? "Clear Search" : "Add Vendor"}
                action={() => searchTerm ? setSearchTerm('') : navigate('/vendors/new')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorList;
