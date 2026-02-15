const KEYS = {
  SETTINGS: 'ayur_settings',
  PRODUCTS: 'ayur_products',
  ORDERS: 'ayur_orders',
  PACKAGES: 'ayur_packages',
  INVOICE_SEQ: 'ayur_invoice_seq',
}

function getDatePrefix() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

const defaultSettings = {
  doctorName: '',
  clinicName: '',
  address: '',
  phone: '',
  email: '',
}

const defaultPackages = [
  { id: 'p1', name: 'Basic', multiplier: 1.2, items: [] },
  { id: 'p2', name: 'Pro', multiplier: 1.5, items: [] },
  { id: 'p3', name: 'Premium', multiplier: 2, items: [] },
]

function normalizePackage(p) {
  const items = (Array.isArray(p.items) ? p.items : []).map((it) => {
    const item = { ...it }
    if (item.orderId && !item.productId) item.productId = item.orderId
    if (!item.productId && !item.customLabel) item.productId = ''
    return item
  })
  return { ...p, items }
}

export function getSettings() {
  try {
    const s = localStorage.getItem(KEYS.SETTINGS)
    return s ? { ...defaultSettings, ...JSON.parse(s) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
}

function migrateOldOrdersToProducts() {
  try {
    const raw = localStorage.getItem(KEYS.ORDERS)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data) || data.length === 0) return []
    const first = data[0]
    if (!first || first.recipeName === undefined) return []
    return data.map((o, i) => ({
      id: o.id?.startsWith('PRD-') ? o.id : `PRD-${i + 1}`,
      name: o.recipeName || o.name || '',
      ingredients: o.ingredients || [],
      totalQuantity: o.totalQuantity ?? 0,
      workHours: o.workHours ?? 0,
      laborRatePerHour: o.laborRatePerHour ?? 0,
      totalMaterialCost: o.totalMaterialCost ?? 0,
      totalLaborCost: o.totalLaborCost ?? 0,
      totalCostPerUnit: o.totalCostPerUnit ?? 0,
    }))
  } catch {
    return []
  }
}

export function getProducts() {
  try {
    const stored = localStorage.getItem(KEYS.PRODUCTS)
    if (stored) return JSON.parse(stored)
    const migrated = migrateOldOrdersToProducts()
    if (migrated.length > 0) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(migrated))
      localStorage.setItem(KEYS.ORDERS, JSON.stringify([]))
    }
    return migrated
  } catch {
    return []
  }
}

export function saveProducts(products) {
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products))
}

export function getOrders() {
  try {
    const raw = localStorage.getItem(KEYS.ORDERS)
    const data = raw ? JSON.parse(raw) : []
    if (!Array.isArray(data)) return []
    const first = data[0]
    if (first && first.recipeName !== undefined) {
      return []
    }
    return data
  } catch {
    return []
  }
}

export function saveOrders(orders) {
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders))
}

export function getPackages() {
  try {
    const p = localStorage.getItem(KEYS.PACKAGES)
    const list = p ? JSON.parse(p) : defaultPackages
    return list.map(normalizePackage)
  } catch {
    return defaultPackages
  }
}

export function savePackages(packages) {
  localStorage.setItem(KEYS.PACKAGES, JSON.stringify(packages))
}

export function nextProductId(products) {
  const max = products.reduce(
    (m, p) => Math.max(m, parseInt(p.id?.replace('PRD-', '') || 0, 10)),
    0
  )
  return `PRD-${max + 1}`
}

/** Order ID format: ORD-YYYYMMDD-NNN (date + daily sequence) */
export function nextOrderId(orders) {
  const today = getDatePrefix()
  const prefix = `ORD-${today}-`
  let maxSeq = 0
  for (const o of orders || []) {
    const id = o.id || ''
    if (id.startsWith(prefix)) {
      const seq = parseInt(id.slice(prefix.length), 10)
      if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq)
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(3, '0')
  return `${prefix}${nextSeq}`
}

/** Invoice number format: INV-YYYYMMDD-NNN. If consume=true, increments and persists the sequence. */
export function getNextInvoiceNumber(consume = true) {
  const today = getDatePrefix()
  let state = { date: '', seq: 0 }
  try {
    const raw = localStorage.getItem(KEYS.INVOICE_SEQ)
    if (raw) state = { ...state, ...JSON.parse(raw) }
  } catch {}
  if (state.date !== today) {
    state.date = today
    state.seq = 0
  }
  const nextSeq = state.seq + 1
  const number = `INV-${today}-${String(nextSeq).padStart(3, '0')}`
  if (consume) {
    state.seq = nextSeq
    try {
      localStorage.setItem(KEYS.INVOICE_SEQ, JSON.stringify({ date: state.date, seq: state.seq }))
    } catch {}
  }
  return number
}

/** Preview next invoice number without consuming (for display only). */
export function previewNextInvoiceNumber() {
  return getNextInvoiceNumber(false)
}
