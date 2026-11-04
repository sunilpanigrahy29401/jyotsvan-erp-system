import {
  Supplier,
  SupplierFilterParams,
  SupplierListResponse,
  SupplierContact,
  SupplierAddress,
  SupplierSKU,
  SupplierPrice,
  SupplierDocument,
  SupplierPerformanceSummary
} from '../types/suppliers';

const API_BASE = '/api';

export const supplierService = {
  // 1. List Suppliers with Search & Filters
  async getSuppliers(params: SupplierFilterParams = {}): Promise<SupplierListResponse> {
    const query = new URLSearchParams();
    if (params.query) query.append('query', params.query);
    if (params.supplierType) query.append('supplierType', params.supplierType);
    if (params.status) query.append('status', params.status);
    if (params.ratingStatus) query.append('ratingStatus', params.ratingStatus);
    if (params.city) query.append('city', params.city);
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.organizationId) query.append('organizationId', params.organizationId);
    if (params.showSensitive) query.append('showSensitive', 'true');

    const res = await fetch(`${API_BASE}/suppliers?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch suppliers');
    }
    return res.json();
  },

  // 2. Export Suppliers to CSV dataset
  async exportSuppliers(organizationId: string = 'org-jyotsvan-corp'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/suppliers/export?organizationId=${encodeURIComponent(organizationId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to export suppliers');
    }
    const data = await res.json();
    return data.data || [];
  },

  // 3. Get Deep Supplier Details by ID
  async getSupplierById(id: string, organizationId: string = 'org-jyotsvan-corp', showSensitive: boolean = false): Promise<Supplier> {
    const query = new URLSearchParams({
      organizationId,
      ...(showSensitive ? { showSensitive: 'true' } : {})
    });
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(id)}?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch supplier details');
    }
    const data = await res.json();
    return data.supplier;
  },

  // 4. Register / Create Supplier
  async createSupplier(data: Partial<Supplier> & { actor_id?: string; actor_email?: string }): Promise<{ supplier_id: string; supplier_code: string; message: string }> {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create supplier');
    }
    return res.json();
  },

  // 5. Update Supplier
  async updateSupplier(id: string, data: Partial<Supplier> & { actor_id?: string; actor_email?: string }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update supplier');
    }
    return res.json();
  },

  // 6. Update Supplier Status (Active, Inactive, Blocked, Archived)
  async updateStatus(
    id: string,
    status: string,
    reason?: string,
    organizationId: string = 'org-jyotsvan-corp',
    actorId?: string,
    actorEmail?: string
  ): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        reason,
        organization_id: organizationId,
        actor_id: actorId,
        actor_email: actorEmail
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update supplier status');
    }
    return res.json();
  },

  // 7. Delete / Archive Supplier
  async deleteSupplier(id: string, organizationId: string = 'org-jyotsvan-corp', actorId?: string, actorEmail?: string): Promise<{ message: string }> {
    const query = new URLSearchParams({
      organizationId,
      ...(actorId ? { actorId } : {}),
      ...(actorEmail ? { actorEmail } : {})
    });
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(id)}?${query.toString()}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete supplier');
    }
    return res.json();
  },

  // 8. Contact Management
  async addContact(supplierId: string, contactData: Partial<SupplierContact> & { actor_id?: string; actor_email?: string }): Promise<{ message: string; contact_id: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add contact');
    }
    return res.json();
  },

  async updateContact(supplierId: string, contactId: string, contactData: Partial<SupplierContact> & { actor_id?: string; actor_email?: string }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/contacts/${encodeURIComponent(contactId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update contact');
    }
    return res.json();
  },

  async deleteContact(supplierId: string, contactId: string, organizationId: string = 'org-jyotsvan-corp'): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/contacts/${encodeURIComponent(contactId)}?organizationId=${encodeURIComponent(organizationId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete contact');
    }
    return res.json();
  },

  // 9. Address Management
  async addAddress(supplierId: string, addressData: Partial<SupplierAddress>): Promise<{ message: string; address_id: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add address');
    }
    return res.json();
  },

  async deleteAddress(supplierId: string, addressId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/addresses/${encodeURIComponent(addressId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete address');
    }
    return res.json();
  },

  // 10. SKU Association & Mapping
  async linkSku(supplierId: string, skuData: any): Promise<{ message: string; supplier_sku_id: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/skus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skuData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to link SKU to supplier');
    }
    return res.json();
  },

  async updateSkuMapping(supplierId: string, supplierSkuId: string, skuData: any): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/skus/${encodeURIComponent(supplierSkuId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skuData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update SKU mapping');
    }
    return res.json();
  },

  async unlinkSku(supplierId: string, supplierSkuId: string, organizationId: string = 'org-jyotsvan-corp'): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/skus/${encodeURIComponent(supplierSkuId)}?organizationId=${encodeURIComponent(organizationId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to unlink SKU');
    }
    return res.json();
  },

  // 11. Supplier Pricing Management
  async addPriceQuote(supplierId: string, priceData: any): Promise<{ message: string; price_id: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(priceData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add pricing quote');
    }
    return res.json();
  },

  async deletePriceQuote(supplierId: string, priceId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/pricing/${encodeURIComponent(priceId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete pricing quote');
    }
    return res.json();
  },

  // 12. Documents & Compliance
  async addDocument(supplierId: string, docData: any): Promise<{ message: string; document_id: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to attach document');
    }
    return res.json();
  },

  async deleteDocument(supplierId: string, docId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete document');
    }
    return res.json();
  },

  // 13. Performance Foundation
  async getPerformance(supplierId: string, organizationId: string = 'org-jyotsvan-corp'): Promise<SupplierPerformanceSummary> {
    const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplierId)}/performance?organizationId=${encodeURIComponent(organizationId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch supplier performance');
    }
    return res.json();
  }
};
