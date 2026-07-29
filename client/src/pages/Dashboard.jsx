import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineDocumentText, HiOutlineClipboardList, HiOutlineShieldCheck, HiArrowRight } from 'react-icons/hi';
import api from '../lib/api';
import StatsCard from '../components/ui/StatsCard';
import { PageLoader } from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/dashboard');
        setData(response.data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <PageLoader message="Loading dashboard..." />;
  if (error) return <div className="p-8 text-red-500 glass-card">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="section-fade max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
        <StatsCard
          label="Total Vendors"
          value={data.summary?.totalVendors || 0}
          icon={HiOutlineUsers}
        />
        <StatsCard
          label="Total Documents"
          value={data.summary?.totalDocuments || 0}
          icon={HiOutlineDocumentText}
        />
        <StatsCard
          label="Active Rules"
          value={data.summary?.activeComplianceRules || 0}
          icon={HiOutlineClipboardList}
        />
        <StatsCard
          label="Avg Risk Score"
          value={Math.round(data.summary?.averageRiskScore || 0)}
          icon={HiOutlineShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stagger-children delay-200">
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Vendors</h2>
            <Link to="/vendors" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center gap-1">
              View all <HiArrowRight />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {data.recentVendors?.length > 0 ? (
              <table className="table-premium w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentVendors.map((vendor) => (
                    <tr key={vendor.id} onClick={() => navigate(`/vendors/${vendor.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="font-medium">{vendor.name}</td>
                      <td><StatusBadge type="vendor" status={vendor.status} /></td>
                      <td>
                        <span className={`font-semibold ${vendor.riskScore > 70 ? 'text-red-500' : vendor.riskScore > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {vendor.riskScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <EmptyState title="No vendors found" description="You haven't added any vendors yet." />
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Documents</h2>
            <Link to="/documents" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center gap-1">
              View all <HiArrowRight />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {data.recentDocuments?.length > 0 ? (
              <table className="table-premium w-full">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="font-medium">
                        <div className="flex flex-col">
                          <span>{doc.filename || doc.name}</span>
                          <span className="text-xs text-slate-500">{doc.vendorName}</span>
                        </div>
                      </td>
                      <td><StatusBadge type="document" status={doc.status} /></td>
                      <td className="text-sm text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <EmptyState title="No documents" description="Recent documents will appear here." />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
