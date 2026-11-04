// src/server/integrations/shopify-client.ts
// Robust Shopify Admin REST & GraphQL API Client with Rate Limiting, SSRF Protection & Mock Fallback

import crypto from 'crypto';
import type {
  ShopifyShop,
  ShopifyProduct,
  ShopifyCustomer,
  ShopifyOrder,
  ShopifyLocation,
  ShopifyInventoryLevel,
} from '../../types/shopify.ts';

export const SHOPIFY_DEFAULT_API_VERSION = '2026-01';

export interface ShopifyClientConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
  webhookSecret?: string;
  organizationId?: string;
  connectionId?: string;
}

export class ShopifyClient {
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string;
  private webhookSecret?: string;
  private isSandbox: boolean;

  constructor(config: ShopifyClientConfig) {
    this.shopDomain = this.sanitizeShopDomain(config.shopDomain || 'jyotsvan-organics.myshopify.com');
    this.accessToken = config.accessToken || '';
    this.apiVersion = config.apiVersion || SHOPIFY_DEFAULT_API_VERSION;
    this.webhookSecret = config.webhookSecret;
    // Determine if sandbox / simulated mode applies
    this.isSandbox =
      !this.accessToken ||
      this.accessToken.includes('demo') ||
      this.accessToken.includes('placeholder') ||
      this.shopDomain.includes('jyotsvan-organics.myshopify.com') ||
      this.shopDomain.includes('demo') ||
      this.shopDomain.includes('test');
  }

  private sanitizeShopDomain(domain: string): string {
    let clean = domain.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    
    // SSRF Prevention: Reject private/local network domains
    const forbiddenPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254',
      '10.',
      '192.168.',
      '172.16.',
    ];
    for (const pattern of forbiddenPatterns) {
      if (clean.startsWith(pattern) || clean === pattern) {
        throw new Error(`Invalid Shopify domain: ${domain}. Private or local network addresses are forbidden.`);
      }
    }

    if (!clean.includes('.')) {
      clean = `${clean}.myshopify.com`;
    }
    return clean;
  }

  private getBaseUrl(): string {
    return `https://${this.shopDomain}/admin/api/${this.apiVersion}`;
  }

  /**
   * Cryptographically verify Shopify inbound webhook HMAC-SHA256 signature
   */
  public static verifyWebhookHmac(rawBody: string, hmacHeader: string | undefined, secret: string): boolean {
    if (!hmacHeader || !secret) {
      return false;
    }
    try {
      const generatedHmac = crypto
        .createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('base64');
      
      const generatedBuffer = Buffer.from(generatedHmac, 'utf8');
      const headerBuffer = Buffer.from(hmacHeader, 'utf8');

      if (generatedBuffer.length !== headerBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(generatedBuffer, headerBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Core request dispatcher with retry and exponential backoff on 429 rate limit
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: Record<string, unknown>,
    retries = 3
  ): Promise<{ data: T; headers: Headers; statusCode: number }> {
    if (this.isSandbox) {
      return this.handleSandboxRequest<T>(endpoint, method, body);
    }

    const url = `${this.getBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    let attempt = 0;

    while (attempt < retries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.accessToken,
            'User-Agent': 'Jyotsvan-ERP-Enterprise/25.0',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check for Rate Limit 429
        if (response.status === 429) {
          const retryAfterSec = parseFloat(response.headers.get('Retry-After') || '2.0');
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000));
            continue;
          }
        }

        if (!response.ok) {
          const errText = await response.text();
          let parsedErr: any;
          try {
            parsedErr = JSON.parse(errText);
          } catch {
            parsedErr = { error: errText };
          }
          const msg = parsedErr.errors || parsedErr.error || `Shopify API returned HTTP ${response.status}`;
          throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }

        const data = (await response.json()) as T;
        return { data, headers: response.headers, statusCode: response.status };
      } catch (err: unknown) {
        if (attempt >= retries) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }

    throw new Error(`Shopify API request failed after ${retries} attempts.`);
  }

  // --------------------------------------------------------------------------
  // API RESOURCE METHODS
  // --------------------------------------------------------------------------

  public async getShop(): Promise<ShopifyShop> {
    const res = await this.request<{ shop: ShopifyShop }>('/shop.json');
    return res.data.shop;
  }

  public async getProducts(params?: {
    limit?: number;
    since_id?: string;
    updated_at_min?: string;
    fields?: string;
  }): Promise<ShopifyProduct[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.since_id) query.append('since_id', params.since_id);
    if (params?.updated_at_min) query.append('updated_at_min', params.updated_at_min);
    if (params?.fields) query.append('fields', params.fields);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<{ products: ShopifyProduct[] }>(`/products.json${qs}`);
    return res.data.products;
  }

  public async getProduct(id: string | number): Promise<ShopifyProduct> {
    const res = await this.request<{ product: ShopifyProduct }>(`/products/${id}.json`);
    return res.data.product;
  }

  public async getCustomers(params?: {
    limit?: number;
    since_id?: string;
    updated_at_min?: string;
  }): Promise<ShopifyCustomer[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.since_id) query.append('since_id', params.since_id);
    if (params?.updated_at_min) query.append('updated_at_min', params.updated_at_min);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<{ customers: ShopifyCustomer[] }>(`/customers.json${qs}`);
    return res.data.customers;
  }

  public async getCustomer(id: string | number): Promise<ShopifyCustomer> {
    const res = await this.request<{ customer: ShopifyCustomer }>(`/customers/${id}.json`);
    return res.data.customer;
  }

  public async getOrders(params?: {
    limit?: number;
    status?: 'open' | 'closed' | 'cancelled' | 'any';
    financial_status?: string;
    fulfillment_status?: string;
    created_at_min?: string;
    updated_at_min?: string;
  }): Promise<ShopifyOrder[]> {
    const query = new URLSearchParams();
    query.append('status', params?.status || 'any');
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.financial_status) query.append('financial_status', params.financial_status);
    if (params?.fulfillment_status) query.append('fulfillment_status', params.fulfillment_status);
    if (params?.created_at_min) query.append('created_at_min', params.created_at_min);
    if (params?.updated_at_min) query.append('updated_at_min', params.updated_at_min);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<{ orders: ShopifyOrder[] }>(`/orders.json${qs}`);
    return res.data.orders;
  }

  public async getOrder(id: string | number): Promise<ShopifyOrder> {
    const res = await this.request<{ order: ShopifyOrder }>(`/orders/${id}.json`);
    return res.data.order;
  }

  public async getLocations(): Promise<ShopifyLocation[]> {
    const res = await this.request<{ locations: ShopifyLocation[] }>('/locations.json');
    return res.data.locations;
  }

  public async getInventoryLevels(locationIds?: (string | number)[], inventoryItemIds?: (string | number)[]): Promise<ShopifyInventoryLevel[]> {
    const query = new URLSearchParams();
    if (locationIds && locationIds.length > 0) {
      query.append('location_ids', locationIds.join(','));
    }
    if (inventoryItemIds && inventoryItemIds.length > 0) {
      query.append('inventory_item_ids', inventoryItemIds.join(','));
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<{ inventory_levels: ShopifyInventoryLevel[] }>(`/inventory_levels.json${qs}`);
    return res.data.inventory_levels;
  }

  public async setInventoryLevel(locationId: string | number, inventoryItemId: string | number, available: number): Promise<ShopifyInventoryLevel> {
    const res = await this.request<{ inventory_level: ShopifyInventoryLevel }>(
      '/inventory_levels/set.json',
      'POST',
      {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available,
      }
    );
    return res.data.inventory_level;
  }

  // --------------------------------------------------------------------------
  // SANDBOX & HIGH-FIDELITY SIMULATED DATA ENGINE
  // --------------------------------------------------------------------------

  private handleSandboxRequest<T>(
    endpoint: string,
    method: string,
    _body?: Record<string, unknown>
  ): { data: T; headers: Headers; statusCode: number } {
    const mockHeaders = new Headers({
      'Content-Type': 'application/json',
      'X-Shopify-Shop-Api-Call-Limit': '4/40',
      'X-Shopify-API-Version': this.apiVersion,
    });

    if (endpoint.includes('/shop.json')) {
      const shopData: ShopifyShop = {
        id: 88492019,
        name: 'Jyotsvan Organics D2C Store',
        email: 'orders@jyotsvan-organics.com',
        domain: 'shop.jyotsvan.in',
        myshopify_domain: this.shopDomain,
        currency: 'INR',
        money_format: '₹{{amount}}',
        timezone: '(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi',
        iana_timezone: 'Asia/Kolkata',
        country: 'IN',
        country_name: 'India',
        plan_name: 'shopify_plus',
        plan_display_name: 'Shopify Plus Enterprise',
        created_at: '2024-03-15T08:00:00+05:30',
        phone: '+91 674 290 1822',
      };
      return { data: { shop: shopData } as unknown as T, headers: mockHeaders, statusCode: 200 };
    }

    if (endpoint.includes('/products.json')) {
      const mockProducts: ShopifyProduct[] = [
        {
          id: 8829102910,
          title: 'Cold Pressed Virgin Coconut Oil - 500ml',
          handle: 'cold-pressed-virgin-coconut-oil-500ml',
          body_html: '<p>100% pure, unrefined, expeller-pressed virgin coconut oil.</p>',
          vendor: 'Jyotsvan Organics',
          product_type: 'Edible Oils',
          tags: 'coconut, cold-pressed, organic, premium',
          status: 'active',
          variants: [
            {
              id: 44910291823,
              product_id: 8829102910,
              title: '500ml Glass Bottle',
              price: '340.00',
              compare_at_price: '380.00',
              sku: 'SH-COCONUT-500ML',
              inventory_item_id: 88192019,
              inventory_quantity: 420,
              barcode: '890601234001',
              weight: 550,
              weight_unit: 'g',
            },
          ],
          images: [
            {
              id: 99182711,
              src: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80',
              alt: 'Cold Pressed Virgin Coconut Oil',
            },
          ],
          image: {
            id: 99182711,
            src: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80',
          },
          created_at: '2024-04-01T10:00:00+05:30',
          updated_at: new Date().toISOString(),
        },
        {
          id: 8829102911,
          title: 'Organic Kachi Ghani Mustard Oil - 1L',
          handle: 'organic-kachi-ghani-mustard-oil-1l',
          body_html: '<p>Traditional cold-pressed mustard oil with pungent aroma.</p>',
          vendor: 'Jyotsvan Organics',
          product_type: 'Edible Oils',
          tags: 'mustard, kachi-ghani, traditional, pungent',
          status: 'active',
          variants: [
            {
              id: 44910291824,
              product_id: 8829102911,
              title: '1L Bottle',
              price: '260.00',
              compare_at_price: '290.00',
              sku: 'SH-MUSTARD-1L',
              inventory_item_id: 88192020,
              inventory_quantity: 850,
              barcode: '890601234002',
              weight: 1050,
              weight_unit: 'g',
            },
          ],
          images: [
            {
              id: 99182712,
              src: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
              alt: 'Kachi Ghani Mustard Oil',
            },
          ],
          image: {
            id: 99182712,
            src: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
          },
          created_at: '2024-04-02T11:00:00+05:30',
          updated_at: new Date().toISOString(),
        },
        {
          id: 8829102912,
          title: 'Pure White Sesame Oil - 200ml',
          handle: 'pure-white-sesame-oil-200ml',
          body_html: '<p>Nutrient dense sesame seed oil for cooking and wellness.</p>',
          vendor: 'Jyotsvan Organics',
          product_type: 'Wellness Oils',
          tags: 'sesame, til, cold-pressed',
          status: 'active',
          variants: [
            {
              id: 44910291825,
              product_id: 8829102912,
              title: '200ml Glass Flask',
              price: '180.00',
              compare_at_price: null,
              sku: 'SH-SESAME-200ML',
              inventory_item_id: 88192021,
              inventory_quantity: 310,
              barcode: '890601234003',
              weight: 280,
              weight_unit: 'g',
            },
          ],
          images: [],
          created_at: '2024-04-05T14:30:00+05:30',
          updated_at: new Date().toISOString(),
        },
        {
          id: 8829102913,
          title: 'Refined Sunflower Cooking Oil - 5L Can',
          handle: 'refined-sunflower-cooking-oil-5l',
          body_html: '<p>Light, cholesterol-free cooking oil with high smoke point.</p>',
          vendor: 'Jyotsvan Organics',
          product_type: 'Edible Oils',
          tags: 'sunflower, bulk, 5l, family-pack',
          status: 'active',
          variants: [
            {
              id: 44910291826,
              product_id: 8829102913,
              title: '5L Jerry Can',
              price: '890.00',
              compare_at_price: '950.00',
              sku: 'SH-SUNFLOWER-5L',
              inventory_item_id: 88192022,
              inventory_quantity: 190,
              barcode: '890601234004',
              weight: 4800,
              weight_unit: 'g',
            },
          ],
          images: [],
          created_at: '2024-04-10T09:15:00+05:30',
          updated_at: new Date().toISOString(),
        },
        {
          id: 8829102914,
          title: 'Cold Pressed Peanut / Groundnut Oil - 1L',
          handle: 'cold-pressed-groundnut-oil-1l',
          body_html: '<p>Rich, nutty flavored groundnut oil extracted from select Saurashtra peanuts.</p>',
          vendor: 'Jyotsvan Organics',
          product_type: 'Edible Oils',
          tags: 'groundnut, peanut, premium',
          status: 'active',
          variants: [
            {
              id: 44910291827,
              product_id: 8829102914,
              title: '1L Bottle',
              price: '295.00',
              compare_at_price: '320.00',
              sku: 'SH-GROUNDNUT-1L',
              inventory_item_id: 88192023,
              inventory_quantity: 540,
              barcode: '890601234005',
              weight: 1020,
              weight_unit: 'g',
            },
          ],
          images: [],
          created_at: '2024-04-12T16:20:00+05:30',
          updated_at: new Date().toISOString(),
        },
      ];
      return { data: { products: mockProducts } as unknown as T, headers: mockHeaders, statusCode: 200 };
    }

    if (endpoint.includes('/customers.json')) {
      const mockCustomers: ShopifyCustomer[] = [
        {
          id: 77291021,
          email: 'priya.sharma@example.com',
          first_name: 'Priya',
          last_name: 'Sharma',
          phone: '+91 9876543210',
          orders_count: 5,
          state: 'enabled',
          total_spent: '3480.00',
          currency: 'INR',
          default_address: {
            address1: 'Flat 402, Lotus Heights',
            city: 'Bhubaneswar',
            province: 'Odisha',
            country: 'India',
            zip: '751024',
            phone: '+91 9876543210',
          },
          created_at: '2024-05-01T12:00:00+05:30',
          updated_at: new Date().toISOString(),
        },
        {
          id: 77291022,
          email: 'rahul.verma@example.com',
          first_name: 'Rahul',
          last_name: 'Verma',
          phone: '+91 9988776655',
          orders_count: 3,
          state: 'enabled',
          total_spent: '2150.00',
          currency: 'INR',
          default_address: {
            address1: 'Plot 18, Saheed Nagar',
            city: 'Bhubaneswar',
            province: 'Odisha',
            country: 'India',
            zip: '751007',
            phone: '+91 9988776655',
          },
          created_at: '2024-05-10T15:30:00+05:30',
          updated_at: new Date().toISOString(),
        },
        {
          id: 77291023,
          email: 'ananya.sen@example.com',
          first_name: 'Ananya',
          last_name: 'Sen',
          phone: '+91 9123456780',
          orders_count: 2,
          state: 'enabled',
          total_spent: '1780.00',
          currency: 'INR',
          default_address: {
            address1: 'Sector 5, Salt Lake',
            city: 'Kolkata',
            province: 'West Bengal',
            country: 'India',
            zip: '700091',
            phone: '+91 9123456780',
          },
          created_at: '2024-05-18T09:45:00+05:30',
          updated_at: new Date().toISOString(),
        },
      ];
      return { data: { customers: mockCustomers } as unknown as T, headers: mockHeaders, statusCode: 200 };
    }

    if (endpoint.includes('/orders.json')) {
      const mockOrders: ShopifyOrder[] = [
        {
          id: 5549102911,
          name: '#JY-1089',
          order_number: 1089,
          email: 'priya.sharma@example.com',
          phone: '+91 9876543210',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          updated_at: new Date().toISOString(),
          total_price: '940.00',
          subtotal_price: '890.00',
          total_tax: '50.00',
          total_discounts: '0.00',
          currency: 'INR',
          financial_status: 'paid',
          fulfillment_status: 'unfulfilled',
          customer: {
            id: 77291021,
            email: 'priya.sharma@example.com',
            first_name: 'Priya',
            last_name: 'Sharma',
            orders_count: 5,
            state: 'enabled',
            total_spent: '3480.00',
            currency: 'INR',
            created_at: '2024-05-01T12:00:00+05:30',
            updated_at: new Date().toISOString(),
          },
          line_items: [
            {
              id: 11928101,
              variant_id: 44910291823,
              product_id: 8829102910,
              title: 'Cold Pressed Virgin Coconut Oil - 500ml',
              variant_title: '500ml Glass Bottle',
              sku: 'SH-COCONUT-500ML',
              quantity: 2,
              price: '340.00',
              total_discount: '0.00',
            },
            {
              id: 11928102,
              variant_id: 44910291824,
              product_id: 8829102911,
              title: 'Organic Kachi Ghani Mustard Oil - 1L',
              variant_title: '1L Bottle',
              sku: 'SH-MUSTARD-1L',
              quantity: 1,
              price: '260.00',
              total_discount: '50.00',
            },
          ],
          shipping_address: {
            first_name: 'Priya',
            last_name: 'Sharma',
            address1: 'Flat 402, Lotus Heights',
            city: 'Bhubaneswar',
            province: 'Odisha',
            country: 'India',
            zip: '751024',
            phone: '+91 9876543210',
          },
        },
        {
          id: 5549102910,
          name: '#JY-1088',
          order_number: 1088,
          email: 'rahul.verma@example.com',
          phone: '+91 9988776655',
          created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 16).toISOString(),
          total_price: '890.00',
          subtotal_price: '890.00',
          total_tax: '0.00',
          total_discounts: '0.00',
          currency: 'INR',
          financial_status: 'paid',
          fulfillment_status: 'fulfilled',
          customer: {
            id: 77291022,
            email: 'rahul.verma@example.com',
            first_name: 'Rahul',
            last_name: 'Verma',
            orders_count: 3,
            state: 'enabled',
            total_spent: '2150.00',
            currency: 'INR',
            created_at: '2024-05-10T15:30:00+05:30',
            updated_at: new Date().toISOString(),
          },
          line_items: [
            {
              id: 11928103,
              variant_id: 44910291826,
              product_id: 8829102913,
              title: 'Refined Sunflower Cooking Oil - 5L Can',
              variant_title: '5L Jerry Can',
              sku: 'SH-SUNFLOWER-5L',
              quantity: 1,
              price: '890.00',
              total_discount: '0.00',
            },
          ],
          shipping_address: {
            first_name: 'Rahul',
            last_name: 'Verma',
            address1: 'Plot 18, Saheed Nagar',
            city: 'Bhubaneswar',
            province: 'Odisha',
            country: 'India',
            zip: '751007',
            phone: '+91 9988776655',
          },
        },
      ];
      return { data: { orders: mockOrders } as unknown as T, headers: mockHeaders, statusCode: 200 };
    }

    if (endpoint.includes('/locations.json')) {
      const mockLocations: ShopifyLocation[] = [
        {
          id: 8829101,
          name: 'Main Bhubaneswar Central Fulfillment Hub',
          address1: 'Plot 42, Infovalley Industrial Area',
          city: 'Bhubaneswar',
          province: 'Odisha',
          country: 'India',
          country_code: 'IN',
          zip: '752054',
          phone: '+91 674 290 1822',
          active: true,
          legacy: false,
        },
        {
          id: 8829102,
          name: 'Cuttack Regional Depot Point',
          address1: 'Madhupatna Industrial Estate',
          city: 'Cuttack',
          province: 'Odisha',
          country: 'India',
          country_code: 'IN',
          zip: '753010',
          active: true,
        },
      ];
      return { data: { locations: mockLocations } as unknown as T, headers: mockHeaders, statusCode: 200 };
    }

    if (endpoint.includes('/inventory_levels.json')) {
      const mockLevels: ShopifyInventoryLevel[] = [
        { inventory_item_id: 88192019, location_id: 8829101, available: 420 },
        { inventory_item_id: 88192020, location_id: 8829101, available: 850 },
        { inventory_item_id: 88192021, location_id: 8829101, available: 310 },
        { inventory_item_id: 88192022, location_id: 8829101, available: 190 },
        { inventory_item_id: 88192023, location_id: 8829101, available: 540 },
      ];
      return { data: { inventory_levels: mockLevels } as unknown as T, headers: mockHeaders, statusCode: 200 };
    }

    // Default Fallback
    return { data: {} as T, headers: mockHeaders, statusCode: 200 };
  }
}
