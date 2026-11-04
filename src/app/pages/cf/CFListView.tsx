import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Building2,
  MapPin,
  Phone,
  ArrowRightLeft,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Warehouse,
  ChevronRight,
} from 'lucide-react';
import type { CFMaster, CFStatus, CFType } from '../../../types/cfs';

interface CFListViewProps {
  cfs: CFMaster[];
  loading: boolean;
  onSelectCF: (cf: CFMaster) => void;
  onOpenCreateModal: () => void;
  onNewTransfer: (cfId?: string) => void;
  onNewDispatch: (cfId?: string) => void;
  onRefresh: () => void;
}

export const CFListView: React.FC<CFListViewProps> = ({
  cfs,
  loading,
  onSelectCF,
  onOpenCreateModal,
  onNewTransfer,
  onNewDispatch,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  const filteredCFs = cfs.filter((cf) => {
    const matchesSearch =
      cf.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cf.cf_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cf.city && cf.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cf.state && cf.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cf.contact_person && cf.contact_person.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = selectedStatus === 'all' || cf.status === selectedStatus;
    const matchesType = selectedType === 'all' || cf.cf_type === selectedType;
    const matchesRegion = selectedRegion === 'all' || cf.region === selectedRegion;

    return matchesSearch && matchesStatus && matchesType && matchesRegion;
  });

  const regions = Array.from(new Set(cfs.map((c) => c.region).filter(Boolean)));

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 flex items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by agency name, code, contact or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Agencies</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
            <option value="under_audit">Under Audit</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="all">All Classifications</option>
            <option value="super_cf">Super C&F</option>
            <option value="regional">Regional C&F Hub</option>
            <option value="state">State C&F Agency</option>
            <option value="third_party">3PL Logistics Partner</option>
            <option value="company_owned">Company Owned Depot</option>
          </select>

          {regions.length > 0 && (
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
            >
              <option value="all">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r} Region
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard C&F Agency</span>
          </button>
        </div>
      </div>

      {/* Grid of C&F Cards */}
      {loading ? (
        <div className="py-16 text-center text-neutral-400">Loading C&F Registry...</div>
      ) : filteredCFs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-neutral-300">
          <Building2 className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-800">No C&F Agencies Found</h3>
          <p className="text-xs text-neutral-500 mt-1">Try adjusting filters or onboard a new regional agency.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCFs.map((cf) => {
            const whCount = cf.warehouses?.length || 0;
            return (
              <div
                key={cf.id}
                className="bg-white rounded-xl border border-neutral-200 hover:border-indigo-400 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded">
                          {cf.cf_code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            cf.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : cf.status === 'suspended'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {cf.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-neutral-900 mt-1.5 group-hover:text-indigo-600 transition-colors">
                        {cf.legal_name}
                      </h3>
                      <p className="text-xs text-neutral-500">{cf.display_name || cf.cf_type?.replace('_', ' ')}</p>
                    </div>

                    <button
                      onClick={() => onSelectCF(cf)}
                      className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Inspect 360° Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 space-y-1.5 text-xs text-neutral-600">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{cf.city}, {cf.state} &bull; {cf.region || 'National'}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span>{cf.contact_person} ({cf.phone})</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Warehouse className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span>{whCount} Mapped Depot Warehouse{whCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-neutral-50 p-2 rounded-lg">
                      <span className="text-[10px] text-neutral-400 block">Commission</span>
                      <strong className="text-neutral-800 font-semibold">{cf.commission_rate || 0}%</strong>
                    </div>
                    <div className="bg-neutral-50 p-2 rounded-lg">
                      <span className="text-[10px] text-neutral-400 block">Security Deposit</span>
                      <strong className="text-neutral-800 font-semibold">
                        ₹{((cf.security_deposit_amount || 0) / 100000).toFixed(1)}L
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSelectCF(cf)}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    <span>View 360° Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onNewTransfer(cf.id)}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                      title="Create Inward Transfer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onNewDispatch(cf.id)}
                      className="p-1.5 text-amber-600 hover:bg-amber-100 rounded"
                      title="Create Outbound Dispatch"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
