import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  MapPin,
  Phone,
  Mail,
  Building2,
  Users,
  Package,
  ShoppingBag,
  RotateCcw,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Edit2,
  Save,
} from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type {
  RetailerMaster,
  RetailerContact,
  RetailerAddress,
  RetailerDistributorMapping,
  RetailerSalespersonAssignment,
  RetailerAssortment,
  RetailerCommercialTerms,
  RetailerStockItem,
  RetailerOrderRequest,
  RetailerReturn,
  RetailerVisit,
  RetailerFollowUp,
  RetailerDocument,
  RetailerStatus,
} from '../../../types/retailers.ts';

interface RetailerDetailDrawerProps {
  retailer: RetailerMaster | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const RetailerDetailDrawer: React.FC<RetailerDetailDrawerProps> = ({
  retailer,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'distributors'
    | 'salespersons'
    | 'assortment'
    | 'inventory'
    | 'orders'
    | 'returns'
    | 'visits'
    | 'followups'
    | 'credit'
    | 'documents'
  >('overview');

  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<RetailerContact[]>([]);
  const [addresses, setAddresses] = useState<RetailerAddress[]>([]);
  const [distMappings, setDistMappings] = useState<RetailerDistributorMapping[]>([]);
  const [salesAssignments, setSalesAssignments] = useState<RetailerSalespersonAssignment[]>([]);
  const [assortment, setAssortment] = useState<RetailerAssortment[]>([]);
  const [commercialTerms, setCommercialTerms] = useState<RetailerCommercialTerms | null>(null);
  const [stockItems, setStockItems] = useState<RetailerStockItem[]>([]);
  const [orders, setOrders] = useState<RetailerOrderRequest[]>([]);
  const [returns, setReturns] = useState<RetailerReturn[]>([]);
  const [visits, setVisits] = useState<RetailerVisit[]>([]);
  const [followups, setFollowups] = useState<RetailerFollowUp[]>([]);
  const [documents, setDocuments] = useState<RetailerDocument[]>([]);

  // Sub-resource Add Modal/Form States
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactDesignation, setNewContactDesignation] = useState('Store Manager');

  const [newDistributorId, setNewDistributorId] = useState('');
  const [newDistributorPriority, setNewDistributorPriority] = useState(1);

  const [newSalesName, setNewSalesName] = useState('');
  const [newSalesRole, setNewSalesRole] = useState('Territory Sales Officer');

  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<any>('shop_registration');
  const [newDocUrl, setNewDocUrl] = useState('https://storage.jyotsvan.enterprise/docs/retailer_sample.pdf');

  // Edit Commercial Terms
  const [editCreditLimit, setEditCreditLimit] = useState<number>(0);
  const [editPaymentTerms, setEditPaymentTerms] = useState<number>(15);
  const [editDiscount, setEditDiscount] = useState<number>(3);
  const [editCreditHold, setEditCreditHold] = useState<boolean>(false);
  const [savingTerms, setSavingTerms] = useState(false);

  useEffect(() => {
    if (isOpen && retailer) {
      loadDetails(retailer.id);
      setEditCreditLimit(retailer.credit_limit || 200000);
      setEditPaymentTerms(retailer.payment_terms_days || 15);
      setEditDiscount(retailer.agreed_discount_percent || 3.0);
      setEditCreditHold(retailer.credit_hold || false);
    }
  }, [isOpen, retailer]);

  const loadDetails = async (id: string) => {
    setLoading(true);
    try {
      const [
        cRes,
        aRes,
        dRes,
        saRes,
        assRes,
        ctRes,
        stkRes,
        ordRes,
        retRes,
        visRes,
        fupRes,
        docRes,
      ] = await Promise.all([
        retailerApi.getContacts(id).catch(() => []),
        retailerApi.getAddresses(id).catch(() => []),
        retailerApi.getDistributorMappings(id).catch(() => []),
        retailerApi.getSalespersonAssignments(id).catch(() => []),
        retailerApi.getAssortment(id).catch(() => []),
        retailerApi.getCommercialTerms(id).catch(() => null),
        retailerApi.getStockItems({ retailer_id: id }).then((r) => r.data).catch(() => []),
        retailerApi.listOrders({ retailer_id: id }).then((r) => r.data).catch(() => []),
        retailerApi.listReturns({ retailer_id: id }).then((r) => r.data).catch(() => []),
        retailerApi.listVisits({ retailer_id: id }).then((r) => r.data).catch(() => []),
        retailerApi.listFollowups({ retailer_id: id }).then((r) => r.data).catch(() => []),
        retailerApi.listDocuments(id).catch(() => []),
      ]);

      setContacts(cRes);
      setAddresses(aRes);
      setDistMappings(dRes);
      setSalesAssignments(saRes);
      setAssortment(assRes);
      setCommercialTerms(ctRes);
      setStockItems(stkRes);
      setOrders(ordRes);
      setReturns(retRes);
      setVisits(visRes);
      setFollowups(fupRes);
      setDocuments(docRes);
    } catch (err) {
      console.error('Error loading retailer drill-down details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailer || !newContactName || !newContactPhone) return;
    try {
      await retailerApi.addContact(retailer.id, {
        name: newContactName,
        phone: newContactPhone,
        designation: newContactDesignation,
      });
      setNewContactName('');
      setNewContactPhone('');
      loadDetails(retailer.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteContact = async (cId: string) => {
    if (!retailer || !confirm('Delete contact?')) return;
    await retailerApi.deleteContact(retailer.id, cId);
    loadDetails(retailer.id);
  };

  const handleMapDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailer || !newDistributorId) return;
    try {
      await retailerApi.mapDistributor(retailer.id, {
        distributor_id: newDistributorId,
        priority_rank: Number(newDistributorPriority),
        is_preferred: Number(newDistributorPriority) === 1,
      });
      setNewDistributorId('');
      loadDetails(retailer.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUnmapDistributor = async (distId: string) => {
    if (!retailer || !confirm('Unmap distributor?')) return;
    await retailerApi.unmapDistributor(retailer.id, distId);
    loadDetails(retailer.id);
    onRefresh();
  };

  const handleAssignSalesperson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailer || !newSalesName) return;
    try {
      await retailerApi.assignSalesperson(retailer.id, {
        user_id: `usr-${Date.now().toString(36)}`,
        user_name: newSalesName,
        role: newSalesRole,
        is_primary: true,
      });
      setNewSalesName('');
      loadDetails(retailer.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUnassignSalesperson = async (saId: string) => {
    if (!retailer || !confirm('Unassign sales officer?')) return;
    await retailerApi.unassignSalesperson(retailer.id, saId);
    loadDetails(retailer.id);
    onRefresh();
  };

  const handleSaveTerms = async () => {
    if (!retailer) return;
    setSavingTerms(true);
    try {
      await retailerApi.updateRetailer(retailer.id, {
        credit_limit: editCreditLimit,
        payment_terms_days: editPaymentTerms,
        agreed_discount_percent: editDiscount,
        credit_hold: editCreditHold,
      });
      alert('Credit & Commercial terms updated successfully.');
      loadDetails(retailer.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTerms(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailer || !newDocTitle) return;
    try {
      await retailerApi.uploadDocument(retailer.id, {
        document_type: newDocType,
        title: newDocTitle,
        file_url: newDocUrl,
        file_name: `${newDocTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        file_size: 145200,
      });
      setNewDocTitle('');
      loadDetails(retailer.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!retailer || !confirm('Delete document?')) return;
    await retailerApi.deleteDocument(retailer.id, docId);
    loadDetails(retailer.id);
  };

  const handleToggleFollowup = async (fup: RetailerFollowUp) => {
    if (!retailer) return;
    const nextStatus = fup.status === 'completed' ? 'open' : 'completed';
    await retailerApi.updateFollowupStatus(fup.id, nextStatus);
    loadDetails(retailer.id);
    onRefresh();
  };

  if (!isOpen || !retailer) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">{retailer.display_name}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {retailer.retailer_code}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    retailer.status === 'active'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {retailer.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <MapPin className="w-3 h-3 text-slate-500" />
                {retailer.city}, {retailer.state} • Distributor: {retailer.primary_distributor_name || 'Direct'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('distributors')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'distributors'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Distributors ({distMappings.length})
          </button>
          <button
            onClick={() => setActiveTab('salespersons')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'salespersons'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Sales Officers ({salesAssignments.length})
          </button>
          <button
            onClick={() => setActiveTab('assortment')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'assortment'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Assortment ({assortment.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Stock ({stockItems.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'returns'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Returns ({returns.length})
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'visits'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Visits ({visits.length})
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'followups'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Tasks ({followups.length})
          </button>
          <button
            onClick={() => setActiveTab('credit')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'credit'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Credit & Terms
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Docs ({documents.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Stat Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 uppercase">Stock Valuation</span>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {formatCurrency(retailer.stock_valuation || 0)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{retailer.stock_units_on_hand || 0} units on hand</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 uppercase">Credit Limit</span>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {formatCurrency(retailer.credit_limit)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{retailer.payment_terms_days} days payment terms</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 uppercase">Authorized Assortment</span>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {assortment.length} SKUs
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{distMappings.length} mapped distributors</div>
                </div>
              </div>

              {/* Master Attributes */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Retail Merchant Identity</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                  <div>
                    <span className="text-slate-400">Legal Entity Name:</span>
                    <p className="font-medium text-slate-900 mt-0.5">{retailer.legal_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Display Store Name:</span>
                    <p className="font-medium text-slate-900 mt-0.5">{retailer.display_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Store Classification:</span>
                    <p className="font-medium text-slate-900 mt-0.5 capitalize">{retailer.retailer_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">GSTIN / Tax ID:</span>
                    <p className="font-mono text-slate-900 mt-0.5">{retailer.gstin || 'Unregistered'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Primary Contact Phone:</span>
                    <p className="font-medium text-slate-900 mt-0.5">{retailer.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Merchant Email:</span>
                    <p className="font-medium text-slate-900 mt-0.5">{retailer.email}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Registered Store Address:</span>
                    <p className="font-medium text-slate-900 mt-0.5">
                      {retailer.registered_address || retailer.city + ', ' + retailer.state + ' - ' + retailer.pincode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contacts List */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Store Contacts</h3>
                </div>

                <form onSubmit={handleAddContact} className="flex gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-32 px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Designation"
                    value={newContactDesignation}
                    onChange={(e) => setNewContactDesignation(e.target.value)}
                    className="w-32 px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">
                    Add
                  </button>
                </form>

                <div className="divide-y divide-slate-100">
                  {contacts.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900">{c.name}</span>
                        <span className="text-slate-500 ml-2">({c.designation})</span>
                        <div className="text-slate-400 text-[11px] mt-0.5">{c.phone} • {c.email || 'No email'}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISTRIBUTOR MAPPINGS */}
          {activeTab === 'distributors' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Distributor Fulfillment Hierarchy
                </h3>
                <p className="text-xs text-slate-500">
                  Authorized distributors mapped to fulfill this retailer's secondary order requests.
                </p>

                <form onSubmit={handleMapDistributor} className="flex gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    placeholder="Distributor ID (e.g. dist-mumbai-01)"
                    value={newDistributorId}
                    onChange={(e) => setNewDistributorId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded font-mono"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Priority Rank"
                    value={newDistributorPriority}
                    onChange={(e) => setNewDistributorPriority(Number(e.target.value))}
                    className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                    min={1}
                  />
                  <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">
                    Map Distributor
                  </button>
                </form>

                <div className="divide-y divide-slate-100">
                  {distMappings.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No distributors mapped yet.</div>
                  ) : (
                    distMappings.map((dm) => (
                      <div key={dm.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{dm.distributor_name}</span>
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {dm.distributor_code}
                            </span>
                            {dm.is_preferred && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                Preferred / Primary
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            Priority #{dm.priority_rank} • {dm.distributor_city}, {dm.distributor_state}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnmapDistributor(dm.distributor_id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Unmap Distributor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SALESPERSON ASSIGNMENTS */}
          {activeTab === 'salespersons' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned Field Sales Team
                </h3>

                <form onSubmit={handleAssignSalesperson} className="flex gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    placeholder="Sales Officer Name"
                    value={newSalesName}
                    onChange={(e) => setNewSalesName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Role (e.g. Territory Manager)"
                    value={newSalesRole}
                    onChange={(e) => setNewSalesRole(e.target.value)}
                    className="w-48 px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">
                    Assign Officer
                  </button>
                </form>

                <div className="divide-y divide-slate-100">
                  {salesAssignments.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No sales officers assigned.</div>
                  ) : (
                    salesAssignments.map((sa) => (
                      <div key={sa.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{sa.user_name}</span>
                            {sa.is_primary && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                                Primary Beat Lead
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">{sa.role}</div>
                        </div>
                        <button
                          onClick={() => handleUnassignSalesperson(sa.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ASSORTMENT */}
          {activeTab === 'assortment' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Authorized SKU Assortment</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Approved product catalog and order parameters for this counter.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">MOQ</th>
                        <th className="py-2.5 px-3">Target Stock</th>
                        <th className="py-2.5 px-3">Agreed Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assortment.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">No SKUs mapped in assortment.</td>
                        </tr>
                      ) : (
                        assortment.map((as) => (
                          <tr key={as.id}>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-900">{as.sku_name}</span>
                              <div className="text-[10px] text-slate-400 font-mono">{as.sku_code}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{as.category}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{as.minimum_order_quantity} {as.uom}</td>
                            <td className="py-2.5 px-3 text-slate-700">{as.target_stock} {as.uom}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {as.agreed_price_basis ? formatCurrency(as.agreed_price_basis) : 'Standard List'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CHANNEL INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Channel On-Hand Stock & Batches</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 px-3">Product SKU</th>
                        <th className="py-2.5 px-3">Batch</th>
                        <th className="py-2.5 px-3">Available Qty</th>
                        <th className="py-2.5 px-3">Valuation</th>
                        <th className="py-2.5 px-3">Shelf Life</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">No stock records logged for this retailer.</td>
                        </tr>
                      ) : (
                        stockItems.map((stk) => (
                          <tr key={stk.id}>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-900">{stk.sku_name}</span>
                              <div className="text-[10px] text-slate-400 font-mono">{stk.sku_code}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">{stk.batch_number}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{stk.quantity_available}</td>
                            <td className="py-2.5 px-3 text-slate-800">{formatCurrency(stk.total_valuation || 0)}</td>
                            <td className="py-2.5 px-3">
                              {stk.shelf_life_days_remaining !== undefined ? (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    stk.shelf_life_days_remaining <= 0
                                      ? 'bg-rose-100 text-rose-800'
                                      : stk.shelf_life_days_remaining <= 60
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {stk.shelf_life_days_remaining} days left
                                </span>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Secondary Replenishment Orders</h3>
                <div className="divide-y divide-slate-100">
                  {orders.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No orders on record.</div>
                  ) : (
                    orders.map((o) => (
                      <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{o.order_number}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                o.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {o.status}
                            </span>
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            Fulfillment: {o.distributor_name} • Requested: {new Date(o.requested_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{formatCurrency(o.total_estimated_amount)}</div>
                          <div className="text-slate-400 text-[11px]">{o.total_quantity} units</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: RETURNS */}
          {activeTab === 'returns' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Return Requests & Quality Claims</h3>
                <div className="divide-y divide-slate-100">
                  {returns.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No return claims logged.</div>
                  ) : (
                    returns.map((rt) => (
                      <div key={rt.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{rt.return_number}</span>
                            <span className="capitalize text-slate-600 font-medium">({rt.reason.replace(/_/g, ' ')})</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{rt.status}</span>
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            Product: {rt.sku_name} • Batch: {rt.batch_number || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-rose-600">{rt.quantity} units</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: VISITS */}
          {activeTab === 'visits' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Field Visit Log</h3>
                <div className="divide-y divide-slate-100">
                  {visits.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No visit history recorded.</div>
                  ) : (
                    visits.map((v) => (
                      <div key={v.id} className="py-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 capitalize">{v.purpose.replace(/_/g, ' ')}</span>
                          <span className="text-slate-400">{new Date(v.visit_date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600">{v.notes || v.outcome || 'Routine beat visit.'}</p>
                        <div className="text-[11px] text-slate-400">Officer: {v.salesperson_name}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: FOLLOWUPS */}
          {activeTab === 'followups' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Follow-up Tasks</h3>
                <div className="space-y-2">
                  {followups.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No open tasks.</div>
                  ) : (
                    followups.map((f) => (
                      <div
                        key={f.id}
                        className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                          f.status === 'completed'
                            ? 'bg-slate-50/50 border-slate-200 text-slate-400'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleFollowup(f)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-600"
                          >
                            <CheckCircle className={`w-4 h-4 ${f.status === 'completed' ? 'text-emerald-600' : ''}`} />
                          </button>
                          <div>
                            <span className={`font-semibold ${f.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {f.subject}
                            </span>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Due: {new Date(f.due_date).toLocaleDateString()} • Assignee: {f.assigned_user_name}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {f.priority}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: CREDIT & COMMERCIAL TERMS */}
          {activeTab === 'credit' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Credit Terms & Financial Controls
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 font-medium">Credit Limit (INR)</label>
                    <input
                      type="number"
                      value={editCreditLimit}
                      onChange={(e) => setEditCreditLimit(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 font-medium">Payment Terms (Days)</label>
                    <input
                      type="number"
                      value={editPaymentTerms}
                      onChange={(e) => setEditPaymentTerms(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 font-medium">Agreed Trade Discount (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <input
                      type="checkbox"
                      id="credit_hold"
                      checked={editCreditHold}
                      onChange={(e) => setEditCreditHold(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="credit_hold" className="text-slate-800 font-medium cursor-pointer">
                      Place Account on Credit Hold
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={handleSaveTerms}
                    disabled={savingTerms}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <Save className="w-4 h-4" />
                    {savingTerms ? 'Saving...' : 'Save Commercial Terms'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Retailer Compliance & Documents</h3>

                <form onSubmit={handleUploadDocument} className="flex gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    placeholder="Document Title (e.g. Shop Act License)"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                    required
                  />
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                  >
                    <option value="shop_registration">Shop Registration</option>
                    <option value="gst_certificate">GST Certificate</option>
                    <option value="pan">PAN Card</option>
                    <option value="agreement">Channel Agreement</option>
                    <option value="kyc">KYC Proof</option>
                  </select>
                  <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">
                    Upload
                  </button>
                </form>

                <div className="divide-y divide-slate-100">
                  {documents.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No documents uploaded.</div>
                  ) : (
                    documents.map((d) => (
                      <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="font-semibold text-slate-900">{d.title}</span>
                            <span className="text-[10px] text-slate-400 ml-2 uppercase">({d.document_type})</span>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Uploaded by: {d.uploaded_by || 'System'} • {new Date(d.uploaded_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 rounded"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(d.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
