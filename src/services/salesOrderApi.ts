// src/services/salesOrderApi.ts
// Frontend API Client for Phase 18 Sales Orders, Pricing & Fulfillment Operations

import type {
  SalesOrder,
  SalesOrderSummaryMetrics,
  PricingCalculationSummary,
  CreditEvaluationResult,
  SkuAvailabilityResult,
  SalesOrderReservation,
  SalesOrderDispatch,
  SalesReturn,
  InvoiceHandoffData,
  PricingResolutionItemInput,
  CustomerType,
  OrderType,
  ReturnReason,
  ReturnCondition,
} from '../types/sales-orders.ts';

class SalesOrderApiService {
  private async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-organization-id': 'org-jyotsvan-corp',
      'x-user-id': 'usr-super-admin',
      'x-user-email': 'admin@jyotsvan.enterprise',
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, { ...options, headers });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `HTTP error ${res.status}`);
    }
    return json;
  }

  // 1. Metrics & Statistics
  public async getStats(): Promise<SalesOrderSummaryMetrics> {
    return this.fetchJson<SalesOrderSummaryMetrics>('/api/sales-orders/stats');
  }

  // 2. Listing with Search & Filters
  public async listOrders(params: {
    search?: string;
    orderStatus?: string;
    customerType?: string;
    distributorId?: string;
    retailerId?: string;
    warehouseId?: string;
    fulfillmentStatus?: string;
    paymentStatus?: string;
    creditStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ data: SalesOrder[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.orderStatus && params.orderStatus !== 'all') searchParams.set('orderStatus', params.orderStatus);
    if (params.customerType && params.customerType !== 'all') searchParams.set('customerType', params.customerType);
    if (params.distributorId) searchParams.set('distributorId', params.distributorId);
    if (params.retailerId) searchParams.set('retailerId', params.retailerId);
    if (params.warehouseId && params.warehouseId !== 'all') searchParams.set('warehouseId', params.warehouseId);
    if (params.fulfillmentStatus && params.fulfillmentStatus !== 'all') searchParams.set('fulfillmentStatus', params.fulfillmentStatus);
    if (params.paymentStatus && params.paymentStatus !== 'all') searchParams.set('paymentStatus', params.paymentStatus);
    if (params.creditStatus && params.creditStatus !== 'all') searchParams.set('creditStatus', params.creditStatus);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return this.fetchJson<{ data: SalesOrder[]; total: number }>(`/api/sales-orders${query ? `?${query}` : ''}`);
  }

  // 3. Single Order Inspection
  public async getOrder(orderId: string): Promise<SalesOrder> {
    return this.fetchJson<SalesOrder>(`/api/sales-orders/${orderId}`);
  }

  // 4. Create Order
  public async createOrder(data: {
    orderType: OrderType;
    customerType: CustomerType;
    distributorId?: string | null;
    retailerId?: string | null;
    customerReference?: string;
    orderDate?: string;
    requestedDeliveryDate?: string | null;
    warehouseId: string;
    sourceCFId?: string | null;
    currency?: string;
    orderDiscountPct?: number;
    orderDiscountAmount?: number;
    notes?: string;
    internalNotes?: string;
    billingAddress?: any;
    shippingAddress?: any;
    items: PricingResolutionItemInput[];
    status?: 'draft' | 'submitted';
  }): Promise<SalesOrder> {
    return this.fetchJson<SalesOrder>('/api/sales-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 5. Update Draft / Amend Order
  public async updateOrder(
    orderId: string,
    data: {
      orderType?: OrderType;
      customerType?: CustomerType;
      distributorId?: string | null;
      retailerId?: string | null;
      customerReference?: string;
      orderDate?: string;
      requestedDeliveryDate?: string | null;
      warehouseId?: string;
      sourceCFId?: string | null;
      currency?: string;
      orderDiscountPct?: number;
      orderDiscountAmount?: number;
      notes?: string;
      internalNotes?: string;
      billingAddress?: any;
      shippingAddress?: any;
      items?: PricingResolutionItemInput[];
    }
  ): Promise<SalesOrder> {
    return this.fetchJson<SalesOrder>(`/api/sales-orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 6. Lifecycle Transitions
  public async submitOrder(orderId: string): Promise<SalesOrder> {
    return this.fetchJson<SalesOrder>(`/api/sales-orders/${orderId}/submit`, { method: 'POST' });
  }

  public async approveOrder(orderId: string, overrideReason?: string): Promise<SalesOrder> {
    return this.fetchJson<SalesOrder>(`/api/sales-orders/${orderId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ overrideReason }),
    });
  }

  public async rejectOrder(orderId: string, reason: string): Promise<SalesOrder> {
    return this.fetchJson<SalesOrder>(`/api/sales-orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async cancelOrder(orderId: string, reason: string): Promise<SalesOrder> {
    return this.fetchJson<SalesOrder>(`/api/sales-orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // 7. Pricing & Credit Previews
  public async calculatePricing(data: {
    customerType: CustomerType;
    customerId?: string | null;
    warehouseId: string;
    items: PricingResolutionItemInput[];
    orderDiscountPct?: number;
    orderDiscountAmount?: number;
  }): Promise<PricingCalculationSummary> {
    return this.fetchJson<PricingCalculationSummary>('/api/sales-orders/calculate-pricing', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async evaluateCredit(data: {
    customerType: CustomerType;
    customerId?: string | null;
    orderAmount: number;
    currentOrderId?: string;
  }): Promise<CreditEvaluationResult> {
    return this.fetchJson<CreditEvaluationResult>('/api/sales-orders/evaluate-credit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 8. Inventory Availability & Fulfillment Operations
  public async checkInventoryAvailability(orderId: string): Promise<{
    order_id: string;
    warehouse_id: string;
    warehouse_name: string;
    all_available: boolean;
    has_partial: boolean;
    items: SkuAvailabilityResult[];
  }> {
    return this.fetchJson(`/api/sales-orders/${orderId}/inventory-availability`);
  }

  public async reserveInventory(
    orderId: string,
    allocations?: {
      order_item_id: string;
      sku_id: string;
      quantity: number;
      batch_id?: string | null;
      location_id?: string | null;
    }[],
    notes?: string
  ): Promise<{
    reservations: SalesOrderReservation[];
    inventory_status: string;
    fulfillment_status: string;
  }> {
    return this.fetchJson(`/api/sales-orders/${orderId}/reserve`, {
      method: 'POST',
      body: JSON.stringify({ allocations, notes }),
    });
  }

  public async releaseReservations(orderId: string, reason?: string): Promise<{ released_count: number }> {
    return this.fetchJson(`/api/sales-orders/${orderId}/release-reservation`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async recordPicking(
    orderId: string,
    items: {
      order_item_id: string;
      sku_id: string;
      picked_quantity: number;
      batch_id?: string;
      location_id?: string;
    }[]
  ): Promise<{ picked_items_count: number }> {
    return this.fetchJson(`/api/sales-orders/${orderId}/pick`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  public async dispatchOrder(
    orderId: string,
    data: {
      transporterName?: string;
      trackingNumber?: string;
      vehicleNumber?: string;
      eWayBillNumber?: string;
      items?: {
        order_item_id: string;
        sku_id: string;
        dispatched_quantity: number;
        batch_id?: string;
        location_id?: string;
      }[];
      notes?: string;
    }
  ): Promise<{
    dispatch: SalesOrderDispatch;
    order_status: string;
    fulfillment_status: string;
  }> {
    return this.fetchJson(`/api/sales-orders/${orderId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 9. Invoice Preparation (Phase 19 Handoff)
  public async getInvoicePayload(orderId: string): Promise<InvoiceHandoffData> {
    return this.fetchJson<InvoiceHandoffData>(`/api/sales-orders/${orderId}/invoice-payload`);
  }

  // 10. Sales Returns (RMA)
  public async listReturns(params: {
    search?: string;
    status?: string;
    reason?: string;
    salesOrderId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: SalesReturn[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.reason && params.reason !== 'all') searchParams.set('reason', params.reason);
    if (params.salesOrderId) searchParams.set('salesOrderId', params.salesOrderId);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return this.fetchJson<{ data: SalesReturn[]; total: number }>(`/api/sales-returns${query ? `?${query}` : ''}`);
  }

  public async getReturn(returnId: string): Promise<SalesReturn> {
    return this.fetchJson<SalesReturn>(`/api/sales-returns/${returnId}`);
  }

  public async createReturn(data: {
    salesOrderId: string;
    reason: ReturnReason;
    condition: ReturnCondition;
    qcRequired?: boolean;
    notes?: string;
    items: {
      sales_order_item_id?: string;
      sku_id: string;
      batch_id?: string;
      returned_quantity: number;
      unit_price: number;
      disposition?: 'restock_available' | 'quarantine' | 'scrap' | 'return_to_vendor';
      notes?: string;
    }[];
  }): Promise<SalesReturn> {
    return this.fetchJson<SalesReturn>('/api/sales-returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async approveReturn(returnId: string): Promise<SalesReturn> {
    return this.fetchJson<SalesReturn>(`/api/sales-returns/${returnId}/approve`, { method: 'POST' });
  }

  public async receiveReturn(returnId: string): Promise<SalesReturn> {
    return this.fetchJson<SalesReturn>(`/api/sales-returns/${returnId}/receive`, { method: 'POST' });
  }
}

export const salesOrderApi = new SalesOrderApiService();
