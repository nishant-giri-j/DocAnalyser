import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineShieldCheck, HiCheck, HiX } from 'react-icons/hi';
import api from '../lib/api';
import PageLoader from '../components/ui/PageLoader';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';

export default function ComplianceRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    field: '',
    operator: '',
    value: '',
    severity: 'Medium'
  });

  const fetchRules = async () => {
    try {
      const response = await api.get('/compliance/rules');
      setRules(response.data || []);
    } catch (error) {
      toast.error('Failed to load compliance rules.');
      console.error(error);
    }
  };

  const fetchCompanyId = async () => {
    try {
      const response = await api.get('/vendors');
      if (response.data && response.data.length > 0) {
        setCompanyId(response.data[0].companyId);
      }
    } catch (error) {
      console.error('Failed to fetch companyId from vendors:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRules(), fetchCompanyId()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await api.post('/compliance/rules', {
        ...formData,
        companyId: companyId || 'demo-company-id'
      });
      toast.success('Compliance rule created successfully.');
      setIsModalOpen(false);
      setFormData({
        name: '',
        category: '',
        field: '',
        operator: '',
        value: '',
        severity: 'Medium'
      });
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create rule.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRuleStatus = async (id, currentStatus) => {
    try {
      // Optimistic update
      setRules(rules.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));
      await api.patch(`/compliance/rules/${id}/toggle`);
      toast.success(`Rule ${currentStatus ? 'disabled' : 'enabled'}.`);
    } catch (error) {
      // Revert on error
      setRules(rules.map(r => r.id === id ? { ...r, isActive: currentStatus } : r));
      toast.error('Failed to toggle rule status.');
      console.error(error);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="section-fade space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <HiOutlineShieldCheck className="text-indigo-500" />
            Compliance Rules
          </h1>
          <p className="text-gray-500 mt-1">Manage automated validation rules for incoming documents.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <HiOutlinePlus size={18} />
          Add Rule
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {rules.length === 0 ? (
          <EmptyState
            title="No rules configured"
            description="Create your first compliance rule to start validating documents automatically."
            icon={<HiOutlineShieldCheck className="w-12 h-12 text-gray-300" />}
            action={
              <button onClick={() => setIsModalOpen(true)} className="btn-primary mt-4">
                Add Rule
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Category</th>
                  <th>Field</th>
                  <th>Condition</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="stagger-children">
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="font-medium text-gray-900">{rule.name}</td>
                    <td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {rule.category}
                      </span>
                    </td>
                    <td className="font-mono text-sm">{rule.field}</td>
                    <td>
                      <span className="text-gray-500">{rule.operator}</span>{' '}
                      <span className="font-medium">{rule.value}</span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.severity === 'High' ? 'bg-red-100 text-red-800' :
                        rule.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleRuleStatus(rule.id, rule.isActive)}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                          rule.isActive ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={rule.isActive}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            rule.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Compliance Rule"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input-premium w-full"
              placeholder="e.g., Minimum Invoice Amount"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="input-premium w-full"
                required
              >
                <option value="">Select Category</option>
                <option value="Financial">Financial</option>
                <option value="Legal">Legal</option>
                <option value="Operational">Operational</option>
                <option value="Security">Security</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                id="severity"
                name="severity"
                value={formData.severity}
                onChange={handleInputChange}
                className="input-premium w-full"
                required
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Condition</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="field" className="block text-xs font-medium text-gray-500 mb-1">Field</label>
                <input
                  type="text"
                  id="field"
                  name="field"
                  value={formData.field}
                  onChange={handleInputChange}
                  className="input-premium w-full text-sm"
                  placeholder="e.g., amount"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="operator" className="block text-xs font-medium text-gray-500 mb-1">Operator</label>
                <select
                  id="operator"
                  name="operator"
                  value={formData.operator}
                  onChange={handleInputChange}
                  className="input-premium w-full text-sm"
                  required
                >
                  <option value="">Select</option>
                  <option value="equals">Equals (==)</option>
                  <option value="not_equals">Not Equals (!=)</option>
                  <option value="greater_than">Greater Than (&gt;)</option>
                  <option value="less_than">Less Than (&lt;)</option>
                  <option value="contains">Contains</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="value" className="block text-xs font-medium text-gray-500 mb-1">Value</label>
                <input
                  type="text"
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleInputChange}
                  className="input-premium w-full text-sm"
                  placeholder="e.g., 1000"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
