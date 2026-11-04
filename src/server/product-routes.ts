import { Router, Request, Response } from 'express';
import { pool } from './db.ts';

export const productRouter = Router();

// Helper to record audit logs
async function recordAudit(
  organizationId: string,
  actorId: string | null,
  actorEmail: string,
  action: string,
  targetResource: string,
  targetId: string,
  details: any
) {
  try {
    const auditId = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    await pool.query(
      `INSERT INTO audit_logs (id, organization_id, actor_id, actor_email, action, target_resource, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [auditId, organizationId, actorId, actorEmail || 'system@jyotsvan.enterprise', action, targetResource, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.warn('[Audit Log Error]', err);
  }
}

// ============================================================================
// 1. CATEGORIES ENDPOINTS
// ============================================================================

// GET /api/categories - List all categories with product counts
productRouter.get('/categories', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  try {
    const result = await pool.query(
      `SELECT c.id, c.organization_id, c.name, c.code, c.description, c.parent_category_id,
              p.name as parent_name, c.status, c.created_at, c.updated_at,
              COUNT(pr.id)::int as product_count
       FROM categories c
       LEFT JOIN categories p ON c.parent_category_id = p.id
       LEFT JOIN products pr ON pr.category_id = c.id AND pr.status != 'archived'
       WHERE c.organization_id = $1
       GROUP BY c.id, c.organization_id, c.name, c.code, c.description, c.parent_category_id, p.name, c.status, c.created_at, c.updated_at
       ORDER BY c.name ASC`,
      [orgId]
    );

    res.json({ categories: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch categories' });
  }
});

// POST /api/categories - Create category
productRouter.post('/categories', async (req: Request, res: Response) => {
  const { organization_id, name, code, description, parent_category_id, status } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'Category code is required' });
  }

  const cleanCode = code.trim().toUpperCase();

  try {
    // Check code uniqueness
    const existing = await pool.query(
      'SELECT id FROM categories WHERE organization_id = $1 AND UPPER(code) = $2',
      [orgId, cleanCode]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Category code "${cleanCode}" already exists in organization` });
    }

    const categoryId = 'cat-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const insertRes = await pool.query(
      `INSERT INTO categories (id, organization_id, name, code, description, parent_category_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [categoryId, orgId, name.trim(), cleanCode, description || null, parent_category_id || null, status || 'active']
    );

    const category = insertRes.rows[0];

    await recordAudit(orgId, actorId, actorEmail, 'category.create', 'categories', category.id, {
      name: category.name,
      code: category.code,
      parent_category_id: category.parent_category_id,
    });

    res.status(201).json({ category });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Update category
productRouter.put('/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, description, parent_category_id, status } = req.body;
  const orgId = req.body.organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  try {
    // Prevent cycle (parent cannot be itself)
    if (parent_category_id && parent_category_id === id) {
      return res.status(400).json({ error: 'A category cannot be its own parent' });
    }

    // Check code uniqueness if code changed
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const existing = await pool.query(
        'SELECT id FROM categories WHERE organization_id = $1 AND UPPER(code) = $2 AND id != $3',
        [orgId, cleanCode, id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: `Category code "${cleanCode}" already exists in organization` });
      }
    }

    const updateRes = await pool.query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           code = COALESCE(UPPER($2), code),
           description = COALESCE($3, description),
           parent_category_id = $4,
           status = COALESCE($5, status),
           updated_at = NOW()
       WHERE id = $6 AND organization_id = $7
       RETURNING *`,
      [name ? name.trim() : null, code ? code.trim() : null, description, parent_category_id || null, status, id, orgId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updated = updateRes.rows[0];

    await recordAudit(orgId, actorId, actorEmail, 'category.update', 'categories', id, {
      name: updated.name,
      code: updated.code,
      parent_category_id: updated.parent_category_id,
      status: updated.status,
    });

    res.json({ category: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Delete / Archive category
productRouter.delete('/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const actorId = (req.query.actorId as string) || null;
  const actorEmail = (req.query.actorEmail as string) || 'admin@jyotsvan.enterprise';

  try {
    // Check if any products use this category
    const prods = await pool.query(
      'SELECT count(*)::int as cnt FROM products WHERE category_id = $1 AND organization_id = $2',
      [id, orgId]
    );
    if (prods.rows[0].cnt > 0) {
      // Soft-archive instead of hard deleting
      await pool.query('UPDATE categories SET status = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3', [
        'archived',
        id,
        orgId,
      ]);
      await recordAudit(orgId, actorId, actorEmail, 'category.archive', 'categories', id, {
        reason: 'Archived due to associated product records',
      });
      return res.json({ success: true, message: 'Category archived because products are linked to it', archived: true });
    }

    // Check if any child categories exist
    const children = await pool.query('SELECT count(*)::int as cnt FROM categories WHERE parent_category_id = $1', [id]);
    if (children.rows[0].cnt > 0) {
      await pool.query('UPDATE categories SET parent_category_id = NULL WHERE parent_category_id = $1', [id]);
    }

    await pool.query('DELETE FROM categories WHERE id = $1 AND organization_id = $2', [id, orgId]);
    await recordAudit(orgId, actorId, actorEmail, 'category.delete', 'categories', id, {});

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete category' });
  }
});

// ============================================================================
// 2. PRODUCTS ENDPOINTS
// ============================================================================

// GET /api/products - Paginated & Filterable Product Catalog
productRouter.get('/products', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const queryText = (req.query.query as string)?.trim() || '';
  const categoryId = (req.query.categoryId as string) || '';
  const productType = (req.query.productType as string) || '';
  const status = (req.query.status as string) || '';
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 25));
  const sortBy = (req.query.sortBy as string) || 'created_at';
  const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  try {
    const whereClauses: string[] = ['p.organization_id = $1'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (queryText) {
      whereClauses.push(
        `(p.name ILIKE $${paramIndex} OR p.product_code ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.short_name ILIKE $${paramIndex} OR EXISTS (SELECT 1 FROM skus s WHERE s.product_id = p.id AND (s.sku ILIKE $${paramIndex} OR s.barcode ILIKE $${paramIndex} OR s.variant_name ILIKE $${paramIndex})))`
      );
      params.push(`%${queryText}%`);
      paramIndex++;
    }

    if (categoryId && categoryId !== 'all') {
      whereClauses.push(`p.category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    if (productType && productType !== 'all') {
      whereClauses.push(`p.product_type = $${paramIndex}`);
      params.push(productType);
      paramIndex++;
    }

    if (status && status !== 'all') {
      whereClauses.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereSql = whereClauses.join(' AND ');

    // Count total matching
    const countQuery = `SELECT COUNT(DISTINCT p.id)::int as total FROM products p WHERE ${whereSql}`;
    const countRes = await pool.query(countQuery, params);
    const total = countRes.rows[0]?.total || 0;

    // Sorting column validation
    const validSortCols: Record<string, string> = {
      name: 'p.name',
      product_code: 'p.product_code',
      sku: 'p.sku',
      created_at: 'p.created_at',
      cost_price: 'p.cost_price',
      selling_price: 'p.selling_price',
      status: 'p.status',
    };
    const sortCol = validSortCols[sortBy] || 'p.created_at';

    // Fetch paginated products with joined category and primary image
    const offset = (page - 1) * pageSize;
    const dataQuery = `
      SELECT p.*,
             c.name as category_name,
             u.name as unit_name,
             (SELECT count(*)::int FROM skus s WHERE s.product_id = p.id) as sku_count,
             (SELECT count(*)::int FROM product_images img WHERE img.product_id = p.id) as image_count,
             (SELECT count(*)::int FROM product_documents doc WHERE doc.product_id = p.id) as doc_count,
             (SELECT count(*)::int FROM external_sku_mappings ext WHERE ext.product_id = p.id) as ext_mapping_count,
             (SELECT img.public_url FROM product_images img WHERE img.product_id = p.id ORDER BY img.is_primary DESC, img.display_order ASC LIMIT 1) as primary_image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE ${whereSql}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...params, pageSize, offset];
    const dataRes = await pool.query(dataQuery, dataParams);

    const totalPages = Math.ceil(total / pageSize) || 1;

    res.json({
      data: dataRes.rows,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

// GET /api/products/export - Export full product catalog
productRouter.get('/products/export', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  try {
    const result = await pool.query(
      `SELECT p.id, p.product_code, p.name, p.short_name, p.brand, p.product_type,
              c.name as category_name, p.sku as default_sku, p.unit, p.cost_price, p.selling_price, p.mrp,
              p.tax_rate, p.tax_code, p.reorder_level, p.reorder_quantity, p.minimum_stock_level, p.maximum_stock_level,
              p.requires_batch_tracking, p.requires_expiry_tracking, p.status, p.created_at
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.organization_id = $1
       ORDER BY p.name ASC`,
      [orgId]
    );

    res.json({ products: result.rows, exportedAt: new Date().toISOString(), totalCount: result.rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export products' });
  }
});

// GET /api/products/:id - Single Product with all child variants, images, docs, and mappings
productRouter.get('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';

  try {
    const prodRes = await pool.query(
      `SELECT p.*, c.name as category_name, u.name as unit_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN units u ON p.unit_id = u.id
       WHERE p.id = $1 AND p.organization_id = $2`,
      [id, orgId]
    );

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = prodRes.rows[0];

    // SKUs / Variants
    const skusRes = await pool.query(
      `SELECT s.*, u.name as unit_name
       FROM skus s
       LEFT JOIN units u ON s.unit_id = u.id
       WHERE s.product_id = $1 AND s.organization_id = $2
       ORDER BY s.created_at ASC`,
      [id, orgId]
    );

    // Images
    const imagesRes = await pool.query(
      `SELECT * FROM product_images
       WHERE product_id = $1 AND organization_id = $2
       ORDER BY is_primary DESC, display_order ASC, created_at ASC`,
      [id, orgId]
    );

    // Documents
    const docsRes = await pool.query(
      `SELECT * FROM product_documents
       WHERE product_id = $1 AND organization_id = $2
       ORDER BY created_at DESC`,
      [id, orgId]
    );

    // External Mappings
    const mapsRes = await pool.query(
      `SELECT m.*, s.sku as sku_code, s.variant_name
       FROM external_sku_mappings m
       JOIN skus s ON m.sku_id = s.id
       WHERE m.product_id = $1 AND m.organization_id = $2
       ORDER BY m.platform ASC, m.created_at ASC`,
      [id, orgId]
    );

    res.json({
      product: {
        ...product,
        skus: skusRes.rows,
        images: imagesRes.rows,
        documents: docsRes.rows,
        external_mappings: mapsRes.rows,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch product details' });
  }
});

// POST /api/products - Create Product + Initial Canonical SKU
productRouter.post('/products', async (req: Request, res: Response) => {
  const {
    organization_id,
    product_code,
    name,
    short_name,
    description,
    category_id,
    brand,
    product_type,
    status,
    sku,
    unit,
    unit_id,
    cost_price,
    selling_price,
    mrp,
    tax_rate,
    tax_code,
    tax_category,
    packaging_type,
    units_per_case,
    case_weight,
    reorder_level,
    reorder_quantity,
    minimum_stock_level,
    maximum_stock_level,
    requires_batch_tracking,
    requires_expiry_tracking,
    initial_variant_name,
    barcode,
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  // Server-side validations
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Product name is required' });
  }
  if (!product_code || !product_code.trim()) {
    return res.status(400).json({ error: 'Product code is required' });
  }

  const cleanCode = product_code.trim().toUpperCase();
  const cleanSku = (sku || cleanCode).trim().toUpperCase();

  const cPrice = Number(cost_price) || 0;
  const sPrice = Number(selling_price) || 0;
  const mrpPrice = Number(mrp) || sPrice || 0;
  const tRate = Number(tax_rate) !== undefined && !isNaN(Number(tax_rate)) ? Number(tax_rate) : 18.0;

  if (cPrice < 0 || sPrice < 0 || mrpPrice < 0) {
    return res.status(400).json({ error: 'Prices cannot be negative' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check duplicate product code
    const existingCode = await client.query(
      'SELECT id FROM products WHERE organization_id = $1 AND UPPER(product_code) = $2',
      [orgId, cleanCode]
    );
    if (existingCode.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Product code "${cleanCode}" already exists` });
    }

    // 2. Check duplicate SKU
    const existingSku = await client.query(
      'SELECT id FROM skus WHERE organization_id = $1 AND UPPER(sku) = $2',
      [orgId, cleanSku]
    );
    if (existingSku.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `SKU "${cleanSku}" already exists in organization` });
    }

    const productId = 'prod-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const insertProd = await client.query(
      `INSERT INTO products (
        id, organization_id, category_id, product_code, name, short_name, description, brand,
        product_type, status, sku, unit, unit_id, cost_price, selling_price, mrp,
        tax_rate, tax_code, tax_category, packaging_type, units_per_case, case_weight,
        reorder_level, reorder_quantity, minimum_stock_level, maximum_stock_level,
        requires_batch_tracking, requires_expiry_tracking, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, NOW(), NOW()
      ) RETURNING *`,
      [
        productId,
        orgId,
        category_id || null,
        cleanCode,
        name.trim(),
        short_name || null,
        description || null,
        brand || 'Jyotsvan',
        product_type || 'finished_good',
        status || 'active',
        cleanSku,
        unit || 'pcs',
        unit_id || null,
        cPrice,
        sPrice,
        mrpPrice,
        tRate,
        tax_code || 'HSN-8413',
        tax_category || 'GST_18',
        packaging_type || 'Box',
        parseInt(units_per_case, 10) || 1,
        case_weight ? Number(case_weight) : null,
        parseInt(reorder_level, 10) || 10,
        parseInt(reorder_quantity, 10) || 50,
        parseInt(minimum_stock_level, 10) || 5,
        parseInt(maximum_stock_level, 10) || 500,
        Boolean(requires_batch_tracking),
        Boolean(requires_expiry_tracking),
      ]
    );

    const product = insertProd.rows[0];

    // 3. Create Canonical Primary SKU
    const skuId = 'sku-' + productId;
    const insertSku = await client.query(
      `INSERT INTO skus (
        id, organization_id, product_id, sku, variant_name, barcode, unit_id, pack_size, pack_unit,
        cost_price, selling_price, mrp, tax_rate, tax_code, reorder_level, reorder_quantity,
        minimum_stock_level, maximum_stock_level, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, NOW(), NOW()
      ) RETURNING *`,
      [
        skuId,
        orgId,
        productId,
        cleanSku,
        initial_variant_name || 'Standard Pack',
        barcode || ('890' + Math.floor(1000000000 + Math.random() * 9000000000)),
        unit_id || null,
        1,
        unit || 'pcs',
        cPrice,
        sPrice,
        mrpPrice,
        tRate,
        tax_code || 'HSN-8413',
        parseInt(reorder_level, 10) || 10,
        parseInt(reorder_quantity, 10) || 50,
        parseInt(minimum_stock_level, 10) || 5,
        parseInt(maximum_stock_level, 10) || 500,
        status || 'active',
      ]
    );

    await client.query('COMMIT');

    await recordAudit(orgId, actorId, actorEmail, 'product.create', 'products', product.id, {
      product_code: product.product_code,
      name: product.name,
      primary_sku: cleanSku,
      product_type: product.product_type,
    });

    res.status(201).json({
      product: {
        ...product,
        skus: [insertSku.rows[0]],
      },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to create product' });
  } finally {
    client.release();
  }
});

// PUT /api/products/:id - Update Product
productRouter.put('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.body.organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  const {
    product_code,
    name,
    short_name,
    description,
    category_id,
    brand,
    product_type,
    status,
    sku,
    unit,
    unit_id,
    cost_price,
    selling_price,
    mrp,
    tax_rate,
    tax_code,
    tax_category,
    packaging_type,
    units_per_case,
    case_weight,
    reorder_level,
    reorder_quantity,
    minimum_stock_level,
    maximum_stock_level,
    requires_batch_tracking,
    requires_expiry_tracking,
  } = req.body;

  try {
    // Check code uniqueness if changing product_code
    if (product_code) {
      const cleanCode = product_code.trim().toUpperCase();
      const existing = await pool.query(
        'SELECT id FROM products WHERE organization_id = $1 AND UPPER(product_code) = $2 AND id != $3',
        [orgId, cleanCode, id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: `Product code "${cleanCode}" already exists` });
      }
    }

    const updateRes = await pool.query(
      `UPDATE products
       SET product_code = COALESCE(UPPER($1), product_code),
           name = COALESCE($2, name),
           short_name = $3,
           description = $4,
           category_id = $5,
           brand = COALESCE($6, brand),
           product_type = COALESCE($7, product_type),
           status = COALESCE($8, status),
           sku = COALESCE(UPPER($9), sku),
           unit = COALESCE($10, unit),
           unit_id = $11,
           cost_price = COALESCE($12, cost_price),
           selling_price = COALESCE($13, selling_price),
           mrp = COALESCE($14, mrp),
           tax_rate = COALESCE($15, tax_rate),
           tax_code = $16,
           tax_category = COALESCE($17, tax_category),
           packaging_type = COALESCE($18, packaging_type),
           units_per_case = COALESCE($19, units_per_case),
           case_weight = $20,
           reorder_level = COALESCE($21, reorder_level),
           reorder_quantity = COALESCE($22, reorder_quantity),
           minimum_stock_level = COALESCE($23, minimum_stock_level),
           maximum_stock_level = COALESCE($24, maximum_stock_level),
           requires_batch_tracking = COALESCE($25, requires_batch_tracking),
           requires_expiry_tracking = COALESCE($26, requires_expiry_tracking),
           updated_at = NOW()
       WHERE id = $27 AND organization_id = $28
       RETURNING *`,
      [
        product_code ? product_code.trim() : null,
        name ? name.trim() : null,
        short_name || null,
        description || null,
        category_id || null,
        brand || null,
        product_type || null,
        status || null,
        sku ? sku.trim() : null,
        unit || null,
        unit_id || null,
        cost_price !== undefined ? Number(cost_price) : null,
        selling_price !== undefined ? Number(selling_price) : null,
        mrp !== undefined ? Number(mrp) : null,
        tax_rate !== undefined ? Number(tax_rate) : null,
        tax_code || null,
        tax_category || null,
        packaging_type || null,
        units_per_case !== undefined ? parseInt(units_per_case, 10) : null,
        case_weight !== undefined ? Number(case_weight) : null,
        reorder_level !== undefined ? parseInt(reorder_level, 10) : null,
        reorder_quantity !== undefined ? parseInt(reorder_quantity, 10) : null,
        minimum_stock_level !== undefined ? parseInt(minimum_stock_level, 10) : null,
        maximum_stock_level !== undefined ? parseInt(maximum_stock_level, 10) : null,
        requires_batch_tracking !== undefined ? Boolean(requires_batch_tracking) : null,
        requires_expiry_tracking !== undefined ? Boolean(requires_expiry_tracking) : null,
        id,
        orgId,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = updateRes.rows[0];

    await recordAudit(orgId, actorId, actorEmail, 'product.update', 'products', id, {
      name: updatedProduct.name,
      product_code: updatedProduct.product_code,
      status: updatedProduct.status,
    });

    res.json({ product: updatedProduct });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete or archive product
productRouter.delete('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const actorId = (req.query.actorId as string) || null;
  const actorEmail = (req.query.actorEmail as string) || 'admin@jyotsvan.enterprise';

  try {
    // Check if referenced in order_items or inventory_stock
    const inventoryCheck = await pool.query(
      'SELECT count(*)::int as cnt FROM inventory_stock WHERE product_id = $1',
      [id]
    );
    const orderCheck = await pool.query(
      'SELECT count(*)::int as cnt FROM order_items WHERE product_id = $1',
      [id]
    );

    if (inventoryCheck.rows[0].cnt > 0 || orderCheck.rows[0].cnt > 0) {
      // Soft-archive
      await pool.query(
        "UPDATE products SET status = 'archived', updated_at = NOW() WHERE id = $1 AND organization_id = $2",
        [id, orgId]
      );
      await pool.query(
        "UPDATE skus SET status = 'archived', updated_at = NOW() WHERE product_id = $1 AND organization_id = $2",
        [id, orgId]
      );

      await recordAudit(orgId, actorId, actorEmail, 'product.archive', 'products', id, {
        reason: 'Archived due to historical ledger references in inventory or orders',
      });

      return res.json({
        success: true,
        archived: true,
        message: 'Product archived to preserve transaction ledger history',
      });
    }

    // Otherwise cascade delete
    await pool.query('DELETE FROM products WHERE id = $1 AND organization_id = $2', [id, orgId]);
    await recordAudit(orgId, actorId, actorEmail, 'product.delete', 'products', id, {});

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
});

// ============================================================================
// 3. SKUs / VARIANTS ENDPOINTS
// ============================================================================

// GET /api/skus - Global SKU directory
productRouter.get('/skus', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const queryText = (req.query.query as string)?.trim() || '';
  const productId = (req.query.productId as string) || '';
  const status = (req.query.status as string) || '';

  try {
    const whereClauses: string[] = ['s.organization_id = $1'];
    const params: any[] = [orgId];
    let paramIdx = 2;

    if (queryText) {
      whereClauses.push(
        `(s.sku ILIKE $${paramIdx} OR s.variant_name ILIKE $${paramIdx} OR s.barcode ILIKE $${paramIdx} OR p.name ILIKE $${paramIdx} OR p.product_code ILIKE $${paramIdx})`
      );
      params.push(`%${queryText}%`);
      paramIdx++;
    }

    if (productId && productId !== 'all') {
      whereClauses.push(`s.product_id = $${paramIdx}`);
      params.push(productId);
      paramIdx++;
    }

    if (status && status !== 'all') {
      whereClauses.push(`s.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const result = await pool.query(
      `SELECT s.*, p.name as product_name, p.product_code, p.brand, c.name as category_name, u.name as unit_name,
              (SELECT count(*)::int FROM external_sku_mappings m WHERE m.sku_id = s.id) as mapping_count
       FROM skus s
       JOIN products p ON s.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN units u ON s.unit_id = u.id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY p.name ASC, s.created_at ASC`,
      params
    );

    res.json({ skus: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch SKUs' });
  }
});

// POST /api/skus - Create additional SKU / Variant
productRouter.post('/skus', async (req: Request, res: Response) => {
  const {
    organization_id,
    product_id,
    sku,
    variant_name,
    barcode,
    unit_id,
    pack_size,
    pack_unit,
    net_weight,
    gross_weight,
    length,
    width,
    height,
    volume,
    cost_price,
    selling_price,
    mrp,
    tax_rate,
    tax_code,
    reorder_level,
    reorder_quantity,
    minimum_stock_level,
    maximum_stock_level,
    status,
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  if (!product_id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }
  if (!sku || !sku.trim()) {
    return res.status(400).json({ error: 'SKU code is required' });
  }
  if (!variant_name || !variant_name.trim()) {
    return res.status(400).json({ error: 'Variant name is required' });
  }

  const cleanSku = sku.trim().toUpperCase();

  try {
    // Check duplicate SKU
    const existing = await pool.query(
      'SELECT id FROM skus WHERE organization_id = $1 AND UPPER(sku) = $2',
      [orgId, cleanSku]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `SKU "${cleanSku}" already exists in organization` });
    }

    const skuId = 'sku-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const insertRes = await pool.query(
      `INSERT INTO skus (
        id, organization_id, product_id, sku, variant_name, barcode, unit_id, pack_size, pack_unit,
        net_weight, gross_weight, length, width, height, volume,
        cost_price, selling_price, mrp, tax_rate, tax_code,
        reorder_level, reorder_quantity, minimum_stock_level, maximum_stock_level,
        status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24,
        $25, NOW(), NOW()
      ) RETURNING *`,
      [
        skuId,
        orgId,
        product_id,
        cleanSku,
        variant_name.trim(),
        barcode || ('890' + Math.floor(1000000000 + Math.random() * 9000000000)),
        unit_id || null,
        Number(pack_size) || 1,
        pack_unit || 'pcs',
        net_weight ? Number(net_weight) : null,
        gross_weight ? Number(gross_weight) : null,
        length ? Number(length) : null,
        width ? Number(width) : null,
        height ? Number(height) : null,
        volume ? Number(volume) : null,
        Number(cost_price) || 0,
        Number(selling_price) || 0,
        Number(mrp) || Number(selling_price) || 0,
        tax_rate !== undefined ? Number(tax_rate) : 18.0,
        tax_code || 'HSN-8413',
        parseInt(reorder_level, 10) || 10,
        parseInt(reorder_quantity, 10) || 50,
        parseInt(minimum_stock_level, 10) || 5,
        parseInt(maximum_stock_level, 10) || 500,
        status || 'active',
      ]
    );

    const newSku = insertRes.rows[0];

    await recordAudit(orgId, actorId, actorEmail, 'sku.create', 'skus', newSku.id, {
      sku: newSku.sku,
      product_id: newSku.product_id,
      variant_name: newSku.variant_name,
    });

    res.status(201).json({ sku: newSku });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create SKU' });
  }
});

// PUT /api/skus/:id - Update SKU
productRouter.put('/skus/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.body.organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  const {
    sku,
    variant_name,
    barcode,
    unit_id,
    pack_size,
    pack_unit,
    net_weight,
    gross_weight,
    length,
    width,
    height,
    volume,
    cost_price,
    selling_price,
    mrp,
    tax_rate,
    tax_code,
    reorder_level,
    reorder_quantity,
    minimum_stock_level,
    maximum_stock_level,
    status,
  } = req.body;

  try {
    // Check uniqueness if changing SKU code
    if (sku) {
      const cleanSku = sku.trim().toUpperCase();
      const existing = await pool.query(
        'SELECT id FROM skus WHERE organization_id = $1 AND UPPER(sku) = $2 AND id != $3',
        [orgId, cleanSku, id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: `SKU "${cleanSku}" already exists in organization` });
      }
    }

    const updateRes = await pool.query(
      `UPDATE skus
       SET sku = COALESCE(UPPER($1), sku),
           variant_name = COALESCE($2, variant_name),
           barcode = $3,
           unit_id = $4,
           pack_size = COALESCE($5, pack_size),
           pack_unit = COALESCE($6, pack_unit),
           net_weight = $7,
           gross_weight = $8,
           length = $9,
           width = $10,
           height = $11,
           volume = $12,
           cost_price = COALESCE($13, cost_price),
           selling_price = COALESCE($14, selling_price),
           mrp = COALESCE($15, mrp),
           tax_rate = COALESCE($16, tax_rate),
           tax_code = $17,
           reorder_level = COALESCE($18, reorder_level),
           reorder_quantity = COALESCE($19, reorder_quantity),
           minimum_stock_level = COALESCE($20, minimum_stock_level),
           maximum_stock_level = COALESCE($21, maximum_stock_level),
           status = COALESCE($22, status),
           updated_at = NOW()
       WHERE id = $23 AND organization_id = $24
       RETURNING *`,
      [
        sku ? sku.trim() : null,
        variant_name ? variant_name.trim() : null,
        barcode || null,
        unit_id || null,
        pack_size !== undefined ? Number(pack_size) : null,
        pack_unit || null,
        net_weight !== undefined ? Number(net_weight) : null,
        gross_weight !== undefined ? Number(gross_weight) : null,
        length !== undefined ? Number(length) : null,
        width !== undefined ? Number(width) : null,
        height !== undefined ? Number(height) : null,
        volume !== undefined ? Number(volume) : null,
        cost_price !== undefined ? Number(cost_price) : null,
        selling_price !== undefined ? Number(selling_price) : null,
        mrp !== undefined ? Number(mrp) : null,
        tax_rate !== undefined ? Number(tax_rate) : null,
        tax_code || null,
        reorder_level !== undefined ? parseInt(reorder_level, 10) : null,
        reorder_quantity !== undefined ? parseInt(reorder_quantity, 10) : null,
        minimum_stock_level !== undefined ? parseInt(minimum_stock_level, 10) : null,
        maximum_stock_level !== undefined ? parseInt(maximum_stock_level, 10) : null,
        status || null,
        id,
        orgId,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    const updatedSku = updateRes.rows[0];

    await recordAudit(orgId, actorId, actorEmail, 'sku.update', 'skus', id, {
      sku: updatedSku.sku,
      variant_name: updatedSku.variant_name,
      status: updatedSku.status,
    });

    res.json({ sku: updatedSku });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update SKU' });
  }
});

// DELETE /api/skus/:id - Delete SKU
productRouter.delete('/skus/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const actorId = (req.query.actorId as string) || null;
  const actorEmail = (req.query.actorEmail as string) || 'admin@jyotsvan.enterprise';

  try {
    await pool.query('DELETE FROM skus WHERE id = $1 AND organization_id = $2', [id, orgId]);
    await recordAudit(orgId, actorId, actorEmail, 'sku.delete', 'skus', id, {});

    res.json({ success: true, message: 'SKU variant removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete SKU' });
  }
});

// ============================================================================
// 4. PRODUCT IMAGES ENDPOINTS
// ============================================================================

// POST /api/products/:id/images - Register / Add Product Image
productRouter.post('/products/:id/images', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organization_id, sku_id, storage_path, public_url, alt_text, is_primary, display_order } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  if (!public_url || !public_url.trim()) {
    return res.status(400).json({ error: 'Public image URL or asset source is required' });
  }

  try {
    const imgId = 'img-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    // If setting as primary, demote other images for this product
    if (is_primary) {
      await pool.query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [id]);
    }

    const insertRes = await pool.query(
      `INSERT INTO product_images (
        id, organization_id, product_id, sku_id, storage_path, public_url, alt_text, is_primary, display_order, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW(), NOW())
      RETURNING *`,
      [
        imgId,
        orgId,
        id,
        sku_id || null,
        storage_path || `product-images/${id}-${imgId}.png`,
        public_url.trim(),
        alt_text || 'Product image asset',
        Boolean(is_primary),
        parseInt(display_order, 10) || 0,
      ]
    );

    const image = insertRes.rows[0];

    await recordAudit(orgId, actorId, actorEmail, 'product_image.upload', 'product_images', image.id, {
      product_id: id,
      public_url: image.public_url,
      is_primary: image.is_primary,
    });

    res.status(201).json({ image });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save product image' });
  }
});

// DELETE /api/products/:id/images/:imageId - Remove Image
productRouter.delete('/products/:id/images/:imageId', async (req: Request, res: Response) => {
  const { id, imageId } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const actorId = (req.query.actorId as string) || null;
  const actorEmail = (req.query.actorEmail as string) || 'admin@jyotsvan.enterprise';

  try {
    await pool.query('DELETE FROM product_images WHERE id = $1 AND product_id = $2 AND organization_id = $3', [
      imageId,
      id,
      orgId,
    ]);

    await recordAudit(orgId, actorId, actorEmail, 'product_image.delete', 'product_images', imageId, {
      product_id: id,
    });

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete image' });
  }
});

// ============================================================================
// 5. PRODUCT DOCUMENTS ENDPOINTS
// ============================================================================

// POST /api/products/:id/documents - Attach Quality / Specification Document
productRouter.post('/products/:id/documents', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organization_id, title, document_type, file_name, file_size, mime_type, storage_path, public_url } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Document title is required' });
  }

  try {
    const docId = 'doc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const insertRes = await pool.query(
      `INSERT INTO product_documents (
        id, organization_id, product_id, title, document_type, file_name, file_size, mime_type, storage_path, public_url, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', NOW(), NOW())
      RETURNING *`,
      [
        docId,
        orgId,
        id,
        title.trim(),
        document_type || 'spec_sheet',
        file_name || 'spec_sheet.pdf',
        parseInt(file_size, 10) || 102400,
        mime_type || 'application/pdf',
        storage_path || `documents/${id}-${docId}.pdf`,
        public_url || null,
      ]
    );

    const document = insertRes.rows[0];

    await recordAudit(orgId, actorId, actorEmail, 'product_document.attach', 'product_documents', document.id, {
      product_id: id,
      title: document.title,
      document_type: document.document_type,
    });

    res.status(201).json({ document });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to attach document' });
  }
});

// DELETE /api/products/:id/documents/:docId - Remove Document
productRouter.delete('/products/:id/documents/:docId', async (req: Request, res: Response) => {
  const { id, docId } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const actorId = (req.query.actorId as string) || null;
  const actorEmail = (req.query.actorEmail as string) || 'admin@jyotsvan.enterprise';

  try {
    await pool.query('DELETE FROM product_documents WHERE id = $1 AND product_id = $2 AND organization_id = $3', [
      docId,
      id,
      orgId,
    ]);

    await recordAudit(orgId, actorId, actorEmail, 'product_document.delete', 'product_documents', docId, {
      product_id: id,
    });

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete document' });
  }
});

// ============================================================================
// 6. EXTERNAL SKU MAPPINGS (Shopify, Amazon, Flipkart, Myntra)
// ============================================================================

// GET /api/external-mappings - List all external mappings
productRouter.get('/external-mappings', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const platform = (req.query.platform as string) || '';
  const status = (req.query.status as string) || '';

  try {
    const whereClauses: string[] = ['m.organization_id = $1'];
    const params: any[] = [orgId];
    let idx = 2;

    if (platform && platform !== 'all') {
      whereClauses.push(`m.platform = $${idx}`);
      params.push(platform);
      idx++;
    }

    if (status && status !== 'all') {
      whereClauses.push(`m.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const result = await pool.query(
      `SELECT m.*, s.sku as sku_code, s.variant_name, p.name as product_name, p.product_code
       FROM external_sku_mappings m
       JOIN skus s ON m.sku_id = s.id
       JOIN products p ON m.product_id = p.id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY m.platform ASC, m.created_at DESC`,
      params
    );

    res.json({ mappings: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch external mappings' });
  }
});

// POST /api/external-mappings - Create mapping
productRouter.post('/external-mappings', async (req: Request, res: Response) => {
  const {
    organization_id,
    product_id,
    sku_id,
    platform,
    external_product_id,
    external_variant_id,
    external_sku,
    external_identifier,
    status,
    metadata,
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  if (!sku_id || !platform || !external_sku) {
    return res.status(400).json({ error: 'SKU, Platform, and External SKU are required' });
  }

  try {
    // Resolve product_id if not explicitly provided
    let prodId = product_id;
    if (!prodId) {
      const skuRes = await pool.query('SELECT product_id FROM skus WHERE id = $1', [sku_id]);
      if (skuRes.rows.length === 0) {
        return res.status(404).json({ error: 'SKU not found' });
      }
      prodId = skuRes.rows[0].product_id;
    }

    const mapId = 'ext-map-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const insertRes = await pool.query(
      `INSERT INTO external_sku_mappings (
        id, organization_id, product_id, sku_id, platform,
        external_product_id, external_variant_id, external_sku, external_identifier,
        status, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        mapId,
        orgId,
        prodId,
        sku_id,
        platform,
        external_product_id || null,
        external_variant_id || null,
        external_sku.trim(),
        external_identifier || null,
        status || 'active',
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    const mapping = insertRes.rows[0];

    await recordAudit(orgId, actorId, actorEmail, 'product_mapping.create', 'external_sku_mappings', mapping.id, {
      sku_id,
      platform,
      external_sku: mapping.external_sku,
    });

    res.status(201).json({ mapping });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Mapping for platform "${platform}" with external SKU "${external_sku}" already exists.` });
    }
    res.status(500).json({ error: err.message || 'Failed to create external mapping' });
  }
});

// PUT /api/external-mappings/:id - Update mapping
productRouter.put('/external-mappings/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { external_sku, external_identifier, status, metadata } = req.body;
  const orgId = req.body.organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  try {
    const updateRes = await pool.query(
      `UPDATE external_sku_mappings
       SET external_sku = COALESCE($1, external_sku),
           external_identifier = COALESCE($2, external_identifier),
           status = COALESCE($3, status),
           metadata = COALESCE($4, metadata),
           updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [
        external_sku ? external_sku.trim() : null,
        external_identifier || null,
        status || null,
        metadata ? JSON.stringify(metadata) : null,
        id,
        orgId,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    const updated = updateRes.rows[0];

    await recordAudit(orgId, actorId, actorEmail, 'product_mapping.update', 'external_sku_mappings', id, {
      external_sku: updated.external_sku,
      status: updated.status,
    });

    res.json({ mapping: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update external mapping' });
  }
});

// DELETE /api/external-mappings/:id - Unlink mapping
productRouter.delete('/external-mappings/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const actorId = (req.query.actorId as string) || null;
  const actorEmail = (req.query.actorEmail as string) || 'admin@jyotsvan.enterprise';

  try {
    await pool.query('DELETE FROM external_sku_mappings WHERE id = $1 AND organization_id = $2', [id, orgId]);
    await recordAudit(orgId, actorId, actorEmail, 'product_mapping.delete', 'external_sku_mappings', id, {});

    res.json({ success: true, message: 'External mapping unlinked successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unlink external mapping' });
  }
});
