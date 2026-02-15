import { useState, useEffect } from 'react'
import {
  getSettings,
  saveSettings,
  getProducts,
  saveProducts,
  getOrders,
  saveOrders,
  getPackages,
  savePackages,
  nextProductId,
  nextOrderId,
  getNextInvoiceNumber,
  previewNextInvoiceNumber,
} from './lib/storage'
import { generateInvoicePDF } from './lib/pdf'
import './App.css'

const emptyIngredient = () => ({ name: '', pricePaid: '' })


function App() {
  const [tab, setTab] = useState('products')
  const [settings, setSettingsState] = useState(getSettings())
  const [products, setProducts] = useState(getProducts())
  const [orders, setOrders] = useState(getOrders())
  const [packages, setPackages] = useState(getPackages())

  const [productName, setProductName] = useState('')
  const [ingredients, setIngredients] = useState([emptyIngredient()])
  const [totalQuantity, setTotalQuantity] = useState('')
  const [workHours, setWorkHours] = useState('')
  const [laborRatePerHour, setLaborRatePerHour] = useState('')
  const [editingProductId, setEditingProductId] = useState(null)

  const [orderItems, setOrderItems] = useState([{ productId: '', quantity: 1 }])
  const [orderProfitPercent, setOrderProfitPercent] = useState('')
  const [orderUseSeparatePackage, setOrderUseSeparatePackage] = useState(false)
  const [orderPackageId, setOrderPackageId] = useState('p1')
  const [editingOrderId, setEditingOrderId] = useState(null)

  const [quoteOrderId, setQuoteOrderId] = useState('')
  const [quoteQty, setQuoteQty] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveProducts(products)
  }, [products])

  useEffect(() => {
    saveOrders(orders)
  }, [orders])

  useEffect(() => {
    savePackages(packages)
  }, [packages])


  function addIngredient() {
    setIngredients((prev) => [...prev, emptyIngredient()])
  }

  function removeIngredient(i) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateIngredient(i, field, value) {
    setIngredients((prev) =>
      prev.map((ing, idx) =>
        idx === i ? { ...ing, [field]: field === 'pricePaid' ? value : value } : ing
      )
    )
  }

  function calcProductCosts() {
    const material = ingredients.reduce(
      (sum, ing) => sum + (parseFloat(ing.pricePaid) || 0),
      0
    )
    const qty = parseFloat(totalQuantity) || 0
    const hours = parseFloat(workHours) || 0
    const rate = parseFloat(laborRatePerHour) || 0
    const labor = hours * rate
    const total = material + labor
    const costPerUnit = qty > 0 ? total / qty : 0
    return { material, labor, total, costPerUnit, qty }
  }

  function saveProduct() {
    const { total, costPerUnit, qty } = calcProductCosts()
    if (!productName.trim() || qty <= 0) return
    const payload = {
      name: productName.trim(),
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name.trim(), pricePaid: parseFloat(i.pricePaid) || 0 })),
      totalQuantity: qty,
      workHours: parseFloat(workHours) || 0,
      laborRatePerHour: parseFloat(laborRatePerHour) || 0,
      totalMaterialCost: ingredients.reduce((s, i) => s + (parseFloat(i.pricePaid) || 0), 0),
      totalLaborCost: (parseFloat(workHours) || 0) * (parseFloat(laborRatePerHour) || 0),
      totalCostPerUnit: costPerUnit,
    }
    if (editingProductId) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProductId ? { id: p.id, ...payload } : p))
      )
      setEditingProductId(null)
    } else {
      const id = nextProductId(products)
      setProducts((prev) => [...prev, { id, ...payload }])
    }
    setProductName('')
    setIngredients([emptyIngredient()])
    setTotalQuantity('')
    setWorkHours('')
    setLaborRatePerHour('')
  }

  function startEditProduct(product) {
    setEditingProductId(product.id)
    setProductName(product.name || '')
    setIngredients(
      product.ingredients?.length
        ? product.ingredients.map((i) => ({ name: i.name || '', pricePaid: i.pricePaid ?? '' }))
        : [emptyIngredient()]
    )
    setTotalQuantity(String(product.totalQuantity ?? ''))
    setWorkHours(String(product.workHours ?? ''))
    setLaborRatePerHour(String(product.laborRatePerHour ?? ''))
  }

  function cancelEditProduct() {
    setEditingProductId(null)
    setProductName('')
    setIngredients([emptyIngredient()])
    setTotalQuantity('')
    setWorkHours('')
    setLaborRatePerHour('')
  }

  function deleteProduct(id) {
    setProducts((prev) => prev.filter((p) => p.id !== id))
    if (editingProductId === id) cancelEditProduct()
  }

  function addOrderItem() {
    setOrderItems((prev) => [...prev, { productId: '', quantity: 1 }])
  }

  function updateOrderItem(i, field, value) {
    setOrderItems((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, [field]: field === 'quantity' ? (parseFloat(value) || 0) : value } : item
      )
    )
  }

  function removeOrderItem(i) {
    setOrderItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function getOrderTotal(items) {
    return items.reduce((sum, it) => {
      const p = products.find((pr) => pr.id === it.productId)
      return sum + (p ? p.totalCostPerUnit * (it.quantity || 0) : 0)
    }, 0)
  }

  function getOrderPackage(order) {
    const pkgId = order?.packageId || 'p1'
    return packages.find((p) => p.id === pkgId) || packages[0] || { id: 'p1', name: 'Basic', multiplier: 1.2, items: [] }
  }

  function getPackageTotal(pkg) {
    if (!pkg || !pkg.items?.length) return 0
    return (pkg.items || []).reduce((sum, it) => {
      const pid = it.productId ?? it.orderId
      if (pid && pid !== '__custom__') {
        const product = products.find((pr) => pr.id === pid)
        if (product) return sum + product.totalCostPerUnit * (it.quantity || 0)
      }
      return sum
    }, 0)
  }

  function getOrderSellingPrice(items, profitPercent, packageId, usePackageContents = false) {
    const pkg = packages.find((p) => p.id === (packageId || 'p1')) || packages[0]
    const pct = parseFloat(profitPercent) || 0
    // Use package total only when user chose "separate Packages" and package has contents; else Selling = Net × (1 + profit%)
    const base = usePackageContents && pkg?.items?.length ? getPackageTotal(pkg) : getOrderTotal(items)
    return base * (1 + pct / 100)
  }

  function addPackageItem(pkgId) {
    setPackages((prev) =>
      prev.map((p) =>
        p.id === pkgId
          ? { ...p, items: [...(p.items || []), { productId: '', customLabel: '', quantity: 1 }] }
          : p
      )
    )
  }

  function setPackageItemAsCustom(pkgId, itemIdx) {
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId || !p.items) return p
        const items = p.items.map((it, i) =>
          i !== itemIdx ? it : { ...it, productId: '__custom__', customLabel: it.customLabel || '' }
        )
        return { ...p, items }
      })
    )
  }

  function setPackageItemAsProduct(pkgId, itemIdx, productId) {
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId || !p.items) return p
        const items = p.items.map((it, i) =>
          i !== itemIdx ? it : { ...it, productId: productId || '', customLabel: '' }
        )
        return { ...p, items }
      })
    )
  }

  function updatePackageItem(pkgId, itemIdx, field, value) {
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId || !p.items) return p
        const items = p.items.map((it, i) =>
          i !== itemIdx ? it : { ...it, [field]: field === 'quantity' ? (parseFloat(value) || 0) : value }
        )
        return { ...p, items }
      })
    )
  }

  function removePackageItem(pkgId, itemIdx) {
    setPackages((prev) =>
      prev.map((p) =>
        p.id === pkgId && p.items ? { ...p, items: p.items.filter((_, i) => i !== itemIdx) } : p
      )
    )
  }

  function saveOrder() {
    const valid = orderItems.filter((it) => it.productId && (it.quantity || 0) > 0)
    const pkg = packages.find((p) => p.id === (orderUseSeparatePackage ? orderPackageId : 'p1'))
    const canSaveWithPackage = orderUseSeparatePackage && pkg?.items?.length > 0
    if (valid.length === 0 && !canSaveWithPackage) return
    const profitPct = parseFloat(orderProfitPercent) || 0
    const pkgId = orderUseSeparatePackage ? orderPackageId : 'p1'
    const payload = { items: canSaveWithPackage ? (valid.length ? valid : pkg.items) : valid, profitPercentage: profitPct, packageId: pkgId, useSeparatePackage: orderUseSeparatePackage }
    if (editingOrderId) {
      setOrders((prev) =>
        prev.map((o) => (o.id === editingOrderId ? { id: o.id, ...payload } : o))
      )
      setEditingOrderId(null)
    } else {
      const id = nextOrderId(orders)
      setOrders((prev) => [...prev, { id, ...payload }])
    }
    setOrderItems([{ productId: '', quantity: 1 }])
    setOrderProfitPercent('')
    setOrderUseSeparatePackage(false)
    setOrderPackageId('p1')
  }

  function startEditOrder(order) {
    setEditingOrderId(order.id)
    setOrderItems(
      order.items?.length
        ? order.items.map((it) => ({ productId: it.productId || '', quantity: it.quantity ?? 1 }))
        : [{ productId: '', quantity: 1 }]
    )
    setOrderProfitPercent(order.profitPercentage != null ? String(order.profitPercentage) : '')
    setOrderUseSeparatePackage(order.useSeparatePackage === true || order.packageId === 'p2' || order.packageId === 'p3')
    setOrderPackageId(order.packageId || 'p1')
  }

  function cancelEditOrder() {
    setEditingOrderId(null)
    setOrderItems([{ productId: '', quantity: 1 }])
    setOrderProfitPercent('')
    setOrderUseSeparatePackage(false)
    setOrderPackageId('p1')
  }

  function deleteOrder(id) {
    setOrders((prev) => prev.filter((o) => o.id !== id))
    if (editingOrderId === id) cancelEditOrder()
  }

  const selectedOrder = orders.find((o) => o.id === quoteOrderId)
  const quoteQtyNum = parseFloat(quoteQty) || 0
  const orderSellingPrice = selectedOrder
    ? getOrderSellingPrice(selectedOrder.items || [], selectedOrder.profitPercentage, selectedOrder.packageId, selectedOrder.useSeparatePackage === true)
    : 0
  const effectiveQty = quoteQtyNum > 0 ? quoteQtyNum : 1
  const quotePrice = selectedOrder ? orderSellingPrice * effectiveQty : 0

  function downloadInvoice() {
    if (!selectedOrder) return
    const qty = quoteQtyNum > 0 ? quoteQtyNum : 1
    const invNum = invoiceNumber.trim() || getNextInvoiceNumber()
    const doc = generateInvoicePDF({
      settings,
      products,
      order: selectedOrder,
      package: getOrderPackage(selectedOrder),
      quantity: qty,
      quotePrice: orderSellingPrice * qty,
      invoiceNumber: invNum,
    })
    doc.save(`Invoice_${invNum}.pdf`)
  }

  const { material, labor, total, costPerUnit } = calcProductCosts()

  return (
    <div className="app">
      <h1 style={{ marginBottom: 8, color: 'var(--accent)' }}>
        Ayurvedic Invoice & Quote Maker
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Add products (your standard catalog), create orders, then quote and download invoices. All prices are in Indian Rupee (₹).
      </p>

      <nav className="tabs">
        {['products', 'orders', 'quote', 'settings'].map((t) => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t === 'products' && 'Products'}
            {t === 'orders' && 'Orders'}
            {t === 'quote' && 'Quote & Invoice'}
            {t === 'settings' && 'My Details'}
          </button>
        ))}
      </nav>

      {tab === 'settings' && (
        <div className="card">
          <h2 className="section-title">Letterhead & Contact (for invoice PDF)</h2>
          <div className="settings-grid">
            <label>Clinic / Business name</label>
            <input
              value={settings.clinicName}
              onChange={(e) => setSettingsState((s) => ({ ...s, clinicName: e.target.value }))}
              placeholder="e.g. Dr. Sharma Ayurveda"
            />
            <label>Doctor name</label>
            <input
              value={settings.doctorName}
              onChange={(e) => setSettingsState((s) => ({ ...s, doctorName: e.target.value }))}
              placeholder="Dr. Your Name"
            />
            <label>Address</label>
            <input
              value={settings.address}
              onChange={(e) => setSettingsState((s) => ({ ...s, address: e.target.value }))}
              placeholder="Clinic address"
            />
            <label>Phone</label>
            <input
              value={settings.phone}
              onChange={(e) => setSettingsState((s) => ({ ...s, phone: e.target.value }))}
              placeholder="Phone"
            />
            <label>Email</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettingsState((s) => ({ ...s, email: e.target.value }))}
              placeholder="Email"
            />
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="card">
          <h2 className="section-title">
            {editingProductId ? `Edit product ${editingProductId}` : 'New product (standard catalog)'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
            Define your products here. Each product has a name, ingredients (with prices), batch quantity, and labour — so you get a standard cost per unit. Use these in Orders and Packages.
          </p>
          <div className="form-row">
            <label>
              Product name
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Chavanprash, Triphala Churna"
              />
            </label>
          </div>
          <div>
            <strong>Ingredients / raw material</strong>
            <div className="ingredients-list">
              {ingredients.map((ing, i) => (
                <div key={i} className="ingredient-row">
                  <input
                    placeholder="Ingredient name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price (₹)"
                    value={ing.pricePaid}
                    onChange={(e) => updateIngredient(i, 'pricePaid', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: '6px 10px' }}
                    onClick={() => removeIngredient(i)}
                    disabled={ingredients.length === 1}
                  >
                    −
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-ghost" onClick={addIngredient}>
              + Add ingredient
            </button>
          </div>
          <div className="form-row" style={{ marginTop: 16 }}>
            <label>
              Total quantity to make (batch)
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                placeholder="e.g. 100"
              />
            </label>
            <label>
              Work hours required
              <input
                type="number"
                min="0"
                step="0.5"
                value={workHours}
                onChange={(e) => setWorkHours(e.target.value)}
                placeholder="e.g. 4"
              />
            </label>
            <label>
              Labor rate per hour (₹)
              <input
                type="number"
                min="0"
                step="10"
                value={laborRatePerHour}
                onChange={(e) => setLaborRatePerHour(e.target.value)}
                placeholder="e.g. 200"
              />
            </label>
          </div>
          <div className="summary">
            Material: ₹ {material.toFixed(2)} · Labor: ₹ {labor.toFixed(2)} · Total cost: ₹{' '}
            {total.toFixed(2)} → <strong>Cost per unit: ₹ {costPerUnit.toFixed(2)}</strong> (all in INR)
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={saveProduct}>
              {editingProductId ? 'Update product' : 'Save product'}
            </button>
            {editingProductId && (
              <button type="button" className="btn-ghost" onClick={cancelEditProduct}>
                Cancel
              </button>
            )}
          </div>

          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Product catalog</h3>
          {products.length === 0 ? (
            <p className="empty-state">No products yet. Add one above to build your standard list.</p>
          ) : (
            <ul className="orders-list">
              {products.map((p) => (
                <li key={p.id}>
                  <span>
                    <strong>{p.id}</strong> — {p.name} · ₹{p.totalCostPerUnit?.toFixed(2)}/unit (INR)
                  </span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      onClick={() => startEditProduct(p)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      onClick={() => deleteProduct(p.id)}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="card">
          <h2 className="section-title">
            {editingOrderId ? `Edit order ${editingOrderId}` : 'New order (from product list)'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            Create an order by adding products from your catalog and quantities. Order total is calculated from product cost per unit.
          </p>

          <div className="summary" style={{ marginBottom: 16, padding: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <strong>Profit %</strong>
              <input
                type="number"
                min="0"
                step="0.5"
                value={orderProfitPercent}
                onChange={(e) => setOrderProfitPercent(e.target.value)}
                placeholder="e.g. 20"
                style={{ width: 80, padding: '8px 10px' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '1rem' }}>
              <input
                type="checkbox"
                checked={orderUseSeparatePackage}
                onChange={(e) => setOrderUseSeparatePackage(e.target.checked)}
              />
              <strong>Do you want to create separate Packages?</strong>
            </label>
            {!orderUseSeparatePackage && (
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6, marginLeft: 28 }}>Default: Basic. Add order items below.</span>
            )}
            {orderUseSeparatePackage && (
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6, marginLeft: 28 }}>Packages = different bundles (extra products or not). Net and Selling price shown per package below.</span>
            )}
          </div>

          {orderUseSeparatePackage && (
            <div className="package-contents" style={{ marginBottom: 20, paddingTop: 8 }}>
                <strong>Define what’s in each package — Net and Selling price per package:</strong>
                {packages.map((p) => {
                  const net = getPackageTotal(p)
                  const sp = net * (1 + (parseFloat(orderProfitPercent) || 0) / 100)
                  return (
                  <div key={p.id} className="package-block" style={{ marginTop: 12 }}>
                    <div className="package-row" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <strong>{p.name}</strong>
                      <span>Net: <strong>₹ {net.toFixed(2)}</strong> (INR)</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Selling price: ₹ {sp.toFixed(2)} (INR)</span>
                    </div>
                    <div style={{ marginLeft: 8 }}>
                      <span style={{ fontSize: '0.9rem' }}>What’s included:</span>
                      {(p.items || []).length === 0 ? (
                        <p className="empty-state" style={{ padding: '8px 0', margin: 0, fontSize: '0.9rem' }}>No items. Add products or custom lines below.</p>
                      ) : (
                        (p.items || []).map((it, idx) => (
                          <div key={idx} className="package-item-row" style={{ marginTop: 6 }}>
                            <select
                              value={(it.productId ?? it.orderId ?? '')}
                              onChange={(e) => {
                                const v = e.target.value
                                if (v === '__custom__') setPackageItemAsCustom(p.id, idx)
                                else setPackageItemAsProduct(p.id, idx, v)
                              }}
                            >
                              <option value="">— Select product —</option>
                              {products.map((pr) => (
                                <option key={pr.id} value={pr.id}>{pr.id} — {pr.name}</option>
                              ))}
                              <option value="__custom__">— Custom item —</option>
                            </select>
                            {(it.productId ?? it.orderId) === '__custom__' ? (
                              <input
                                className="package-custom-label"
                                placeholder="e.g. Consultation"
                                value={it.customLabel || ''}
                                onChange={(e) => updatePackageItem(p.id, idx, 'customLabel', e.target.value)}
                              />
                            ) : null}
                            <label className="package-qty">
                              Qty
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={it.quantity ?? 1}
                                onChange={(e) => updatePackageItem(p.id, idx, 'quantity', e.target.value)}
                              />
                            </label>
                            <button type="button" className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => removePackageItem(p.id, idx)}>−</button>
                          </div>
                        ))
                      )}
                      <button type="button" className="btn-ghost" style={{ marginTop: 6, fontSize: '0.9rem' }} onClick={() => addPackageItem(p.id)}>+ Add item to {p.name}</button>
                    </div>
                  </div>
                  )
                })}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                  Select package for this order
                  <select
                    value={orderPackageId}
                    onChange={(e) => setOrderPackageId(e.target.value)}
                    style={{ padding: '8px 12px', minWidth: 180 }}
                  >
                    {packages.map((p) => {
                      const net = getPackageTotal(p)
                      const sp = net * (1 + (parseFloat(orderProfitPercent) || 0) / 100)
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} — Net ₹{net.toFixed(2)} · SP ₹{sp.toFixed(2)}
                        </option>
                      )
                    })}
                  </select>
                </label>
                <div className="summary" style={{ marginTop: 16 }}>
                  <div>Selected package selling price: <strong style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>₹ {getOrderSellingPrice(orderItems, orderProfitPercent, orderPackageId, true).toFixed(2)}</strong> (INR)</div>
                </div>
              </div>
            )}

          {!orderUseSeparatePackage && (
            <>
          <div className="package-contents">
            <strong>Order items</strong>
            {orderItems.map((it, i) => (
              <div key={i} className="package-item-row">
                <select
                  value={it.productId}
                  onChange={(e) => updateOrderItem(i, 'productId', e.target.value)}
                >
                  <option value="">— Select product —</option>
                  {products.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.id} — {pr.name} (₹{pr.totalCostPerUnit?.toFixed(2)}/unit)
                    </option>
                  ))}
                </select>
                <label className="package-qty">
                  Qty
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.quantity}
                    onChange={(e) => updateOrderItem(i, 'quantity', e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '6px 10px' }}
                  onClick={() => removeOrderItem(i)}
                  disabled={orderItems.length === 1}
                >
                  −
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={addOrderItem}>
              + Add product to order
            </button>
          </div>
          <div className="summary" style={{ marginTop: 16 }}>
            <div>Net price (cost): <strong>₹ {getOrderTotal(orderItems).toFixed(2)}</strong> (INR)</div>
            <div style={{ marginTop: 8 }}>
              Selling price (with Profit % above): <strong style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>₹ {getOrderSellingPrice(orderItems, orderProfitPercent, 'p1', false).toFixed(2)}</strong> (INR)
            </div>
          </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={saveOrder}>
              {editingOrderId ? 'Update order' : 'Save order (get Order ID)'}
            </button>
            {editingOrderId && (
              <button type="button" className="btn-ghost" onClick={cancelEditOrder}>
                Cancel
              </button>
            )}
          </div>

          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Saved orders</h3>
          {orders.length === 0 ? (
            <p className="empty-state">No orders yet. Add products above and save.</p>
          ) : (
            <ul className="orders-list">
              {orders.map((o) => (
                <li key={o.id}>
                  <span>
                    <strong>{o.id}</strong> — {o.items?.length || 0} item(s) · Net ₹{getOrderTotal(o.items || []).toFixed(2)}
                    {o.profitPercentage != null && o.profitPercentage > 0 && (
                      <> · Selling ₹{getOrderSellingPrice(o.items || [], o.profitPercentage, o.packageId, o.useSeparatePackage === true).toFixed(2)}</>
                    )}
                    {getOrderPackage(o).name !== 'Basic' && ` · ${getOrderPackage(o).name}`}
                    {' '}(INR)
                  </span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      onClick={() => startEditOrder(o)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      onClick={() => deleteOrder(o.id)}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'quote' && (
        <div className="card">
          <h2 className="section-title">Create quote & download invoice</h2>
          <div className="form-row">
            <label>
              Order
              <select
                value={quoteOrderId}
                onChange={(e) => setQuoteOrderId(e.target.value)}
              >
                <option value="">Select order</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} — {o.items?.length || 0} item(s) · {getOrderPackage(o).name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="0"
                step="0.01"
                value={quoteQty}
                onChange={(e) => setQuoteQty(e.target.value)}
                placeholder="e.g. 1 or 2"
              />
            </label>
          </div>
          {selectedOrder && (
            <div className="package-quote-summary">
              <strong>Order {selectedOrder.id}</strong> · Package: {getOrderPackage(selectedOrder).name}
              <ul>
                {(selectedOrder.items || []).map((it, idx) => {
                  const pr = products.find((x) => x.id === it.productId)
                  return pr ? (
                    <li key={idx}>{it.quantity}× {pr.name}</li>
                  ) : null
                })}
              </ul>
              <p>
                Selling price per order: ₹ {orderSellingPrice.toFixed(2)} (INR)
                {<> · Total ({quoteQtyNum > 0 ? quoteQtyNum : 1}): ₹ {quotePrice.toFixed(2)}</>}
              </p>
            </div>
          )}
          <label style={{ display: 'block', marginTop: 12 }}>
            Invoice number (optional override)
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder={previewNextInvoiceNumber()}
              style={{ marginTop: 4, maxWidth: 280 }}
            />
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Leave blank for auto: {previewNextInvoiceNumber()} (date + daily sequence)
            </span>
          </label>
          {selectedOrder && orderSellingPrice > 0 && (
            <div className="quote-box">
              <div>Quote for customer (Indian Rupee)</div>
              <div className="big-price">₹ {quotePrice.toFixed(2)}</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {quoteQtyNum <= 0 ? 'Quantity defaulting to 1. Change above if needed.' : `Quantity: ${quoteQtyNum}`}
              </p>
              <button
                type="button"
                className="btn"
                onClick={downloadInvoice}
                style={{ marginTop: 12 }}
              >
                Download invoice PDF
              </button>
            </div>
          )}
        </div>
      )}
      <footer style={{ marginTop: 48, padding: '16px 0', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Developer{' '}
        <a href="https://ak-apoorvkulkarni.github.io/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
          Apoorv Kulkarni
        </a>
      </footer>
    </div>
  )
}

export default App
