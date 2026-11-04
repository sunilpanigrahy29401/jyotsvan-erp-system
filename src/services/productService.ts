import type {
  Product,
  Category,
  SKU,
  ProductImage,
  ProductDocument,
  ExternalSKUMapping,
  ProductListParams,
  PaginatedResult,
} from '../types/products';

class ProductService {
  private baseUrl = '/api';

  // ---------------------------------------------------------------------------
  // 1. Categories
  // ---------------------------------------------------------------------------
  async getCategories(organizationId?: string): Promise<Category[]> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);

    const res = await fetch(`${this.baseUrl}/categories?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch categories' }));
      throw new Error(err.error || 'Failed to fetch categories');
    }
    const data = await res.json();
    return data.categories || [];
  }

  async createCategory(category: Partial<Category>, actor?: { id?: string; email?: string }): Promise<Category> {
    const res = await fetch(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...category,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create category' }));
      throw new Error(err.error || 'Failed to create category');
    }
    const data = await res.json();
    return data.category;
  }

  async updateCategory(id: string, updates: Partial<Category>, actor?: { id?: string; email?: string }): Promise<Category> {
    const res = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update category' }));
      throw new Error(err.error || 'Failed to update category');
    }
    const data = await res.json();
    return data.category;
  }

  async deleteCategory(id: string, organizationId?: string, actor?: { id?: string; email?: string }): Promise<{ success: boolean; archived?: boolean; message?: string }> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (actor?.id) params.append('actorId', actor.id);
    if (actor?.email) params.append('actorEmail', actor.email);

    const res = await fetch(`${this.baseUrl}/categories/${id}?${params.toString()}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete category' }));
      throw new Error(err.error || 'Failed to delete category');
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // 2. Products
  // ---------------------------------------------------------------------------
  async getProducts(params: ProductListParams = {}): Promise<PaginatedResult<Product>> {
    const queryParams = new URLSearchParams();
    if (params.organizationId) queryParams.append('organizationId', params.organizationId);
    if (params.query) queryParams.append('query', params.query);
    if (params.categoryId && params.categoryId !== 'all') queryParams.append('categoryId', params.categoryId);
    if (params.productType && params.productType !== 'all') queryParams.append('productType', params.productType);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const res = await fetch(`${this.baseUrl}/products?${queryParams.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch products' }));
      throw new Error(err.error || 'Failed to fetch products');
    }
    return res.json();
  }

  async getProductById(id: string, organizationId?: string): Promise<Product> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);

    const res = await fetch(`${this.baseUrl}/products/${id}?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch product details' }));
      throw new Error(err.error || 'Failed to fetch product details');
    }
    const data = await res.json();
    return data.product;
  }

  async createProduct(product: any, actor?: { id?: string; email?: string }): Promise<Product> {
    const res = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...product,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create product' }));
      throw new Error(err.error || 'Failed to create product');
    }
    const data = await res.json();
    return data.product;
  }

  async updateProduct(id: string, updates: Partial<Product>, actor?: { id?: string; email?: string }): Promise<Product> {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update product' }));
      throw new Error(err.error || 'Failed to update product');
    }
    const data = await res.json();
    return data.product;
  }

  async deleteProduct(id: string, organizationId?: string, actor?: { id?: string; email?: string }): Promise<{ success: boolean; archived?: boolean; message?: string }> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (actor?.id) params.append('actorId', actor.id);
    if (actor?.email) params.append('actorEmail', actor.email);

    const res = await fetch(`${this.baseUrl}/products/${id}?${params.toString()}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete product' }));
      throw new Error(err.error || 'Failed to delete product');
    }
    return res.json();
  }

  async exportCatalog(organizationId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);

    const res = await fetch(`${this.baseUrl}/products/export?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to export catalog' }));
      throw new Error(err.error || 'Failed to export catalog');
    }
    const data = await res.json();
    return data.products || [];
  }

  // ---------------------------------------------------------------------------
  // 3. SKUs / Variants
  // ---------------------------------------------------------------------------
  async getSKUs(params: { organizationId?: string; query?: string; productId?: string; status?: string } = {}): Promise<SKU[]> {
    const qp = new URLSearchParams();
    if (params.organizationId) qp.append('organizationId', params.organizationId);
    if (params.query) qp.append('query', params.query);
    if (params.productId) qp.append('productId', params.productId);
    if (params.status) qp.append('status', params.status);

    const res = await fetch(`${this.baseUrl}/skus?${qp.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch SKUs' }));
      throw new Error(err.error || 'Failed to fetch SKUs');
    }
    const data = await res.json();
    return data.skus || [];
  }

  async createSKU(sku: Partial<SKU>, actor?: { id?: string; email?: string }): Promise<SKU> {
    const res = await fetch(`${this.baseUrl}/skus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sku,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create SKU variant' }));
      throw new Error(err.error || 'Failed to create SKU variant');
    }
    const data = await res.json();
    return data.sku;
  }

  async updateSKU(id: string, updates: Partial<SKU>, actor?: { id?: string; email?: string }): Promise<SKU> {
    const res = await fetch(`${this.baseUrl}/skus/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update SKU' }));
      throw new Error(err.error || 'Failed to update SKU');
    }
    const data = await res.json();
    return data.sku;
  }

  async deleteSKU(id: string, organizationId?: string, actor?: { id?: string; email?: string }): Promise<{ success: boolean; message?: string }> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (actor?.id) params.append('actorId', actor.id);
    if (actor?.email) params.append('actorEmail', actor.email);

    const res = await fetch(`${this.baseUrl}/skus/${id}?${params.toString()}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete SKU' }));
      throw new Error(err.error || 'Failed to delete SKU');
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // 4. Product Media & Documents
  // ---------------------------------------------------------------------------
  async addProductImage(productId: string, imageData: Partial<ProductImage>, actor?: { id?: string; email?: string }): Promise<ProductImage> {
    const res = await fetch(`${this.baseUrl}/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...imageData,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to add product image' }));
      throw new Error(err.error || 'Failed to add product image');
    }
    const data = await res.json();
    return data.image;
  }

  async deleteProductImage(productId: string, imageId: string, organizationId?: string, actor?: { id?: string; email?: string }): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (actor?.id) params.append('actorId', actor.id);
    if (actor?.email) params.append('actorEmail', actor.email);

    const res = await fetch(`${this.baseUrl}/products/${productId}/images/${imageId}?${params.toString()}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete image' }));
      throw new Error(err.error || 'Failed to delete image');
    }
    return res.json();
  }

  async attachProductDocument(productId: string, docData: Partial<ProductDocument>, actor?: { id?: string; email?: string }): Promise<ProductDocument> {
    const res = await fetch(`${this.baseUrl}/products/${productId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...docData,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to attach product document' }));
      throw new Error(err.error || 'Failed to attach product document');
    }
    const data = await res.json();
    return data.document;
  }

  async deleteProductDocument(productId: string, docId: string, organizationId?: string, actor?: { id?: string; email?: string }): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (actor?.id) params.append('actorId', actor.id);
    if (actor?.email) params.append('actorEmail', actor.email);

    const res = await fetch(`${this.baseUrl}/products/${productId}/documents/${docId}?${params.toString()}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete document' }));
      throw new Error(err.error || 'Failed to delete document');
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // 5. External Marketplace SKU Mappings
  // ---------------------------------------------------------------------------
  async getExternalMappings(params: { organizationId?: string; platform?: string; status?: string } = {}): Promise<ExternalSKUMapping[]> {
    const qp = new URLSearchParams();
    if (params.organizationId) qp.append('organizationId', params.organizationId);
    if (params.platform) qp.append('platform', params.platform);
    if (params.status) qp.append('status', params.status);

    const res = await fetch(`${this.baseUrl}/external-mappings?${qp.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch external mappings' }));
      throw new Error(err.error || 'Failed to fetch external mappings');
    }
    const data = await res.json();
    return data.mappings || [];
  }

  async createExternalMapping(mapping: Partial<ExternalSKUMapping>, actor?: { id?: string; email?: string }): Promise<ExternalSKUMapping> {
    const res = await fetch(`${this.baseUrl}/external-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...mapping,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create external mapping' }));
      throw new Error(err.error || 'Failed to create external mapping');
    }
    const data = await res.json();
    return data.mapping;
  }

  async updateExternalMapping(id: string, updates: Partial<ExternalSKUMapping>, actor?: { id?: string; email?: string }): Promise<ExternalSKUMapping> {
    const res = await fetch(`${this.baseUrl}/external-mappings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        actor_id: actor?.id,
        actor_email: actor?.email,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update external mapping' }));
      throw new Error(err.error || 'Failed to update external mapping');
    }
    const data = await res.json();
    return data.mapping;
  }

  async deleteExternalMapping(id: string, organizationId?: string, actor?: { id?: string; email?: string }): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (actor?.id) params.append('actorId', actor.id);
    if (actor?.email) params.append('actorEmail', actor.email);

    const res = await fetch(`${this.baseUrl}/external-mappings/${id}?${params.toString()}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete external mapping' }));
      throw new Error(err.error || 'Failed to delete external mapping');
    }
    return res.json();
  }
}

export const productService = new ProductService();
