import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export function generateInvoicePDF({ settings, products = [], order, package: pkg, quantity, quotePrice, invoiceNumber }) {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  let y = 20

  // Letterhead
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text(settings.clinicName || 'Clinic Name', 20, y)
  y += 8
  doc.setFontSize(12)
  doc.setFont(undefined, 'normal')
  if (settings.doctorName) {
    doc.text(settings.doctorName, 20, y)
    y += 6
  }
  if (settings.address) {
    doc.text(settings.address, 20, y)
    y += 6
  }
  if (settings.phone) doc.text('Phone: ' + settings.phone, 20, y)
  if (settings.email) doc.text('Email: ' + settings.email, 20, y + 6)
  y += 20

  // Invoice title
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text('INVOICE', 20, y)
  doc.setFont(undefined, 'normal')
  doc.setFontSize(10)
  doc.text('Invoice #: ' + (invoiceNumber || 'INV-' + Date.now()), pageW - 70, y)
  doc.text('Date: ' + new Date().toLocaleDateString(), pageW - 70, y + 6)
  doc.text('Order: ' + (order?.id || '-'), 20, y + 6)
  doc.text('Package: ' + (pkg?.name || '-'), 20, y + 12)
  y += 20

  // Build rows: use package items if defined, else order items
  const header = ['Description', 'Qty', 'Unit Price (₹)', 'Amount (₹)']
  const body = []
  const profitMult = 1 + (order?.profitPercentage ?? 0) / 100

  if (pkg?.items?.length) {
    for (const it of pkg.items) {
      const qty = (it.quantity || 0) * quantity
      const pid = it.productId ?? it.orderId
      if (pid && pid !== '__custom__') {
        const product = products.find((pr) => pr.id === pid)
        if (product) {
          const unitPrice = product.totalCostPerUnit * profitMult
          const amount = unitPrice * qty
          body.push([product.name || product.id, String(qty), unitPrice.toFixed(2), amount.toFixed(2)])
        }
      } else {
        body.push([it.customLabel || 'Custom', String(qty || quantity), '—', 'Included'])
      }
    }
  } else if (order?.items?.length) {
    for (const it of order.items) {
      const product = products.find((pr) => pr.id === it.productId)
      if (product) {
        const qty = (it.quantity || 0) * quantity
        const unitPrice = product.totalCostPerUnit * profitMult
        const amount = unitPrice * qty
        body.push([product.name || product.id, String(qty), unitPrice.toFixed(2), amount.toFixed(2)])
      }
    }
  }

  if (body.length === 0) {
    body.push([pkg?.name || order?.id || 'Order', String(quantity), (quotePrice / quantity).toFixed(2), quotePrice.toFixed(2)])
  }

  doc.autoTable({
    startY: y,
    head: [header],
    body,
    theme: 'grid',
    headStyles: { fillColor: [45, 90, 61] },
    margin: { left: 20, right: 20 },
  })

  y = doc.lastAutoTable.finalY + 14
  doc.setFont(undefined, 'bold')
  doc.text('Total: ₹ ' + quotePrice.toFixed(2), pageW - 70, y)
  doc.setFont(undefined, 'normal')
  y += 20

  doc.setFontSize(9)
  doc.text('Thank you for your business.', 20, y)
  doc.text('All amounts in Indian Rupee (INR). This is a computer-generated invoice.', 20, y + 6)
  doc.setFontSize(8)
  doc.text('Developer Apoorv Kulkarni — https://ak-apoorvkulkarni.github.io/', 20, y + 12)

  return doc
}
