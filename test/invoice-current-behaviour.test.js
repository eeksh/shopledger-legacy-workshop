var test = require('node:test');
var assert = require('node:assert/strict');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');
var reports = require('../lib/reports');

test('invoice GST and total match order pricing for HSN slab items', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }];
  var ledgerFigures = pricing.computeTotals(items, '');
  var order = {
    id: 7, date: '2026-11-15', items: items, coupon: '',
    subtotal: ledgerFigures.subtotal, discount: ledgerFigures.discount,
    tax: ledgerFigures.tax, total: ledgerFigures.total
  };
  var invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { tax: ledgerFigures.tax, total: ledgerFigures.total },
    { tax: 5, total: 105 }
  );
  assert.deepEqual(
    { tax: invoiceFigures.tax, total: invoiceFigures.total, rowRate: invoiceFigures.rows[0].gstPercent },
    { tax: ledgerFigures.tax, total: ledgerFigures.total, rowRate: 5 }
  );
});

test('invoice coupon discount, GST, and total match the billed order', function () {
  var items = [{ id: 2, name: 'Tea', hsn: '0902', price: 3000, qty: 1 }];
  var ledgerFigures = pricing.computeTotals(items, 'SAVE10');
  var order = {
    id: 8, date: '2026-11-15', items: items, coupon: 'SAVE10',
    subtotal: ledgerFigures.subtotal, discount: ledgerFigures.discount,
    tax: ledgerFigures.tax, total: ledgerFigures.total
  };
  var invoiceFigures = invoice.computeInvoiceFigures(order);
  var db = { orders: [order], products: [], customers: [] };
  var reconciliation = reports.getGstReconciliation(db);

  assert.deepEqual(
    { discount: ledgerFigures.discount, tax: ledgerFigures.tax, total: ledgerFigures.total },
    { discount: 150, tax: 513, total: 3363 }
  );
  assert.deepEqual(
    { discount: invoiceFigures.discount, tax: invoiceFigures.tax, total: invoiceFigures.total },
    { discount: ledgerFigures.discount, tax: ledgerFigures.tax, total: ledgerFigures.total }
  );
  assert.deepEqual(
    { mismatches: reconciliation.mismatchCount, delta: reconciliation.rows[0].delta, matched: reconciliation.rows[0].matched },
    { mismatches: 0, delta: 0, matched: true }
  );
});

test('invoice CGST and SGST split matches the billed GST rounding', function () {
  var items = [
    { id: 3, name: 'Rice', hsn: '1006', price: 0.1, qty: 1 }
  ];
  var ledgerFigures = pricing.computeTotals(items, '');
  var figures = invoice.computeInvoiceFigures({
    id: 9,
    items: items
  });

  assert.deepEqual(
    { tax: figures.tax, cgst: figures.cgst, sgst: figures.sgst },
    { tax: ledgerFigures.tax, cgst: ledgerFigures.cgst, sgst: ledgerFigures.sgst }
  );
});
