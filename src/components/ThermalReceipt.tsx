import React from "react";
import { Order, RestaurantState, PaymentMethod } from "../types";

interface ThermalReceiptProps {
  order: Order;
  state: RestaurantState;
  payments: Array<{ id?: string; amount: number; method: PaymentMethod; tip: number; discount: number; createdAt?: string }>;
  waiterName?: string;
  accountSubtotal?: number;
  accountDiscount?: number;
  accountTip?: number;
  accountTotal?: number;
  previouslyPaid?: number;
  remainingBalance?: number;
}

/**
 * Opens a print-optimized window formatted for 80mm thermal printers (302px).
 * Includes all legally required receipt fields for Chile (boleta).
 */
export function printThermalReceipt({
  order,
  state,
  payments,
  waiterName,
  accountSubtotal,
  accountDiscount,
  accountTip,
  accountTotal,
  previouslyPaid = 0,
  remainingBalance = 0,
}: ThermalReceiptProps) {
  const table = state.tables.find((t) => t.id === order.tableId);
  const tableName = table ? `Mesa ${table.number} — ${table.zone}` : "Sin mesa";

  const receiptDate = new Date(payments[0]?.createdAt || (order.status === "CLOSED" ? order.updatedAt : new Date().toISOString()));
  const dateStr = receiptDate.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = receiptDate.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const receiptDay = `${receiptDate.getFullYear()}${String(receiptDate.getMonth() + 1).padStart(2, "0")}${String(receiptDate.getDate()).padStart(2, "0")}`;
  const receiptSourceId = payments[0]?.id || order.id;
  const receiptId = receiptSourceId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase().padStart(8, "0");
  const receiptNumber = `B-${receiptDay}-${receiptId}`;

  // Build items rows
  const itemsHTML = order.items
    .map((item) => {
      const product = state.products.find((p) => p.id === item.productId);
      if (!product) return "";
      const modPrice = item.selectedModifiers?.reduce((sum, m) => sum + m.extraPrice, 0) || 0;
      const unitPrice = product.price + modPrice;
      const lineTotal = unitPrice * item.quantity;
      const modifiersText = item.selectedModifiers && item.selectedModifiers.length > 0
        ? item.selectedModifiers.map((m) => {
            const prefix = m.extraPrice > 0 ? "+" : m.extraPrice < 0 ? "-" : "";
            const price = m.extraPrice !== 0
              ? ` (${m.extraPrice > 0 ? "+" : "-"}$${Math.abs(m.extraPrice).toLocaleString("es-CL")})`
              : "";
            return `  ${prefix} ${m.name}${price}`;
          }).join("<br/>")
        : "";
      return `
        <tr>
          <td class="item-name">
            ${item.quantity}x ${product.name}
            ${modifiersText ? `<br/><span class="mod">${modifiersText}</span>` : ""}
            ${item.notes ? `<br/><span class="mod">📝 ${item.notes}</span>` : ""}
          </td>
          <td class="item-price">$${lineTotal.toLocaleString("es-CL")}</td>
        </tr>`;
    })
    .join("");

  // Totals
  const subtotal = order.items.reduce((acc, item) => {
    const product = state.products.find((p) => p.id === item.productId);
    if (!product) return acc;
    const modPrice = item.selectedModifiers?.reduce((sum, m) => sum + m.extraPrice, 0) || 0;
    return acc + (product.price + modPrice) * item.quantity;
  }, 0);

  const totalDiscount = payments.reduce((sum, p) => sum + (p.discount || 0), 0);
  const totalTip = payments.reduce((sum, p) => sum + (p.tip || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const fullSubtotal = accountSubtotal ?? subtotal;
  const fullDiscount = accountDiscount ?? totalDiscount;
  const fullTip = accountTip ?? totalTip;
  const fullAccountTotal = accountTotal ?? totalPaid;
  const isPartialReceipt = previouslyPaid > 0 || remainingBalance > 0 || totalPaid < fullAccountTotal;

  const paymentMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: "Efectivo",
      [PaymentMethod.CREDIT]: "T. Crédito",
      [PaymentMethod.DEBIT]: "T. Débito",
      [PaymentMethod.TRANSFER]: "Transferencia",
      [PaymentMethod.ACCOUNT]: "Cuenta autorizada",
    };
    return labels[method] || method;
  };

  const paymentsHTML = payments
    .map(
      (p) =>
        `<tr><td>${paymentMethodLabel(p.method)}</td><td class="item-price">$${p.amount.toLocaleString("es-CL")}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Boleta ${receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      width: 302px;
      margin: 0 auto;
      padding: 8px 4px;
      font-size: 11px;
      color: #000;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .sep {
      border: none;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .double-sep {
      border: none;
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    .header h1 {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .header p {
      font-size: 9px;
      color: #333;
      line-height: 1.3;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 2px 0;
      vertical-align: top;
      font-size: 11px;
    }
    .item-name { width: 72%; }
    .item-price { width: 28%; text-align: right; font-weight: 700; }
    .mod { font-size: 9px; color: #555; }
    .total-row td {
      font-size: 14px;
      font-weight: 700;
      padding: 4px 0;
    }
    .footer {
      text-align: center;
      font-size: 9px;
      color: #555;
      margin-top: 8px;
      line-height: 1.4;
    }
    .footer .big {
      font-size: 12px;
      font-weight: 700;
      color: #000;
    }
    @media print {
      body { width: 100%; padding: 0; }
      .no-print { display: none !important; }
    }
    .print-btn {
      display: block;
      width: 100%;
      margin: 12px 0;
      background: #000;
      color: #fff;
      border: none;
      padding: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header center">
    <h1>🏠 HACIENDA</h1>
    <p>
      Restaurant & Parrilla<br/>
      Dirección: Av. Ejemplo 1234, Lebu<br/>
      RUT: 76.XXX.XXX-X<br/>
      Giro: Restaurant y Servicios de Alimentación
    </p>
  </div>

  <hr class="double-sep" />

  <!-- Receipt info -->
  <div class="info-row"><span>Boleta N°</span><span class="bold">${receiptNumber}</span></div>
  <div class="info-row"><span>Fecha</span><span>${dateStr}  ${timeStr}</span></div>
  <div class="info-row"><span>Mesa</span><span class="bold">${tableName}</span></div>
  ${waiterName ? `<div class="info-row"><span>Garzón</span><span>${waiterName}</span></div>` : ""}
  <div class="info-row"><span>Comensales</span><span>${order.customerCount}</span></div>

  <hr class="sep" />

  <!-- Items -->
  <table>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <hr class="sep" />

  <!-- Totals -->
  <table>
    <tr><td>Consumo total</td><td class="item-price">$${fullSubtotal.toLocaleString("es-CL")}</td></tr>
    ${fullDiscount > 0 ? `<tr><td>Descuento cuenta</td><td class="item-price" style="color:#c00">-$${fullDiscount.toLocaleString("es-CL")}</td></tr>` : ""}
    ${fullTip > 0 ? `<tr><td>Propina cuenta</td><td class="item-price">$${fullTip.toLocaleString("es-CL")}</td></tr>` : ""}
    ${isPartialReceipt ? `<tr><td>Total cuenta</td><td class="item-price">$${fullAccountTotal.toLocaleString("es-CL")}</td></tr>` : ""}
    ${previouslyPaid > 0 ? `<tr><td>Pagado anteriormente</td><td class="item-price">$${previouslyPaid.toLocaleString("es-CL")}</td></tr>` : ""}
  </table>

  <hr class="double-sep" />

  <table>
    <tr class="total-row"><td>${isPartialReceipt ? "PAGO ESTA BOLETA" : "TOTAL"}</td><td class="item-price">$${totalPaid.toLocaleString("es-CL")}</td></tr>
    ${isPartialReceipt ? `<tr><td>Saldo pendiente</td><td class="item-price">$${remainingBalance.toLocaleString("es-CL")}</td></tr>` : ""}
  </table>

  <hr class="sep" />

  <!-- Payment methods -->
  <div class="center bold" style="font-size:10px; margin-bottom:3px;">FORMA DE PAGO</div>
  <table>
    ${paymentsHTML}
  </table>

  <hr class="sep" />

  <!-- Footer -->
  <div class="footer">
    <p class="big">¡Gracias por su visita!</p>
    <p>Esperamos verle pronto de vuelta</p>
    <p style="margin-top:4px;">
      www.restauranthaciendalebu.github.io/CRM<br/>
      Carta Digital — Escanea el QR de tu mesa
    </p>
    <p style="margin-top:6px; font-size:8px; color:#999;">
      Documento tributario simplificado<br/>
      Boleta electrónica de venta
    </p>
  </div>

  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir Boleta</button>
</body>
</html>`;

  // Open in new window for printing
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWin = window.open(url, "_blank");
  if (printWin) {
    printWin.onload = () => {
      setTimeout(() => {
        printWin.print();
      }, 500);
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export interface PrintZetaReportParams {
  shift: Shift;
  operatorName: string;
  payments: Array<{ amount: number; method: PaymentMethod; tip: number; createdAt?: string }>;
}

export function printThermalZetaReport({ shift, operatorName, payments }: PrintZetaReportParams) {
  const openedDate = new Date(shift.openedAt);
  const closedDate = shift.closedAt ? new Date(shift.closedAt) : new Date();

  // Filter payments during shift window
  const shiftPayments = payments.filter((p) => {
    if (!p.createdAt) return false;
    const pDate = new Date(p.createdAt);
    return pDate >= openedDate && pDate <= closedDate;
  });

  const cashSales = shiftPayments
    .filter((p) => p.method === PaymentMethod.CASH)
    .reduce((sum, p) => sum + p.amount, 0);

  const cardSales = shiftPayments
    .filter((p) => p.method === PaymentMethod.DEBIT || p.method === PaymentMethod.CREDIT)
    .reduce((sum, p) => sum + p.amount, 0);

  const transferSales = shiftPayments
    .filter((p) => p.method === PaymentMethod.TRANSFER)
    .reduce((sum, p) => sum + p.amount, 0);

  const accountSales = shiftPayments
    .filter((p) => p.method === PaymentMethod.ACCOUNT)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalTips = shiftPayments.reduce((sum, p) => sum + (p.tip || 0), 0);
  const totalSales = cashSales + cardSales + transferSales + accountSales;

  const initialCash = shift.initialCash || 0;
  const expectedCash = initialCash + cashSales;
  const finalCash = shift.finalCash ?? expectedCash;
  const diffCash = finalCash - expectedCash;

  const openTimeStr = openedDate.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const closeTimeStr = closedDate.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const dateStr = closedDate.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Cierre de Caja Zeta - ${dateStr}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body { font-family: monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 11px; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .header { margin-bottom: 8px; }
    .header h2 { margin: 0; font-size: 15px; }
    hr.sep { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    hr.double-sep { border: none; border-top: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; font-size: 11px; }
    .item-price { text-align: right; }
    .total-row { font-weight: bold; font-size: 12px; }
    .diff-box { border: 1px solid #000; padding: 4px; margin-top: 6px; font-weight: bold; text-align: center; }
    .no-print { margin-top: 12px; text-align: center; }
    .print-btn { background: #000; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="header center">
    <h2>RESTAURANT HACIENDA</h2>
    <p style="margin:2px 0;">REPORT DE CIERRE DE CAJA (ZETA)</p>
    <p style="margin:2px 0; font-size:10px;">Fecha: ${dateStr}</p>
    <p style="margin:2px 0; font-size:10px;">Apertura: ${openTimeStr} | Cierre: ${closeTimeStr}</p>
    <p style="margin:2px 0; font-size:10px;">Cajero: ${operatorName}</p>
  </div>

  <hr class="double-sep" />

  <div class="bold center" style="margin-bottom:4px;">DESGLOSE DE VENTAS</div>
  <table>
    <tr><td>Efectivo (+)</td><td class="item-price">$${cashSales.toLocaleString("es-CL")}</td></tr>
    <tr><td>Tarjetas Débito/Crédito (+)</td><td class="item-price">$${cardSales.toLocaleString("es-CL")}</td></tr>
    <tr><td>Transferencias (+)</td><td class="item-price">$${transferSales.toLocaleString("es-CL")}</td></tr>
    ${accountSales > 0 ? `<tr><td>Cuentas Fiadas (+)</td><td class="item-price">$${accountSales.toLocaleString("es-CL")}</td></tr>` : ""}
    <tr><td>Propinas (+)</td><td class="item-price">$${totalTips.toLocaleString("es-CL")}</td></tr>
  </table>

  <hr class="sep" />

  <table>
    <tr class="total-row"><td>TOTAL VENTAS</td><td class="item-price">$${totalSales.toLocaleString("es-CL")}</td></tr>
  </table>

  <hr class="double-sep" />

  <div class="bold center" style="margin-bottom:4px;">ARQUEO DE EFECTIVO</div>
  <table>
    <tr><td>Fondo Inicial de Caja</td><td class="item-price">$${initialCash.toLocaleString("es-CL")}</td></tr>
    <tr><td>Ventas en Efectivo</td><td class="item-price">+$${cashSales.toLocaleString("es-CL")}</td></tr>
    <tr class="total-row"><td>Efectivo Esperado</td><td class="item-price">$${expectedCash.toLocaleString("es-CL")}</td></tr>
    <tr><td>Efectivo Declarado</td><td class="item-price">$${finalCash.toLocaleString("es-CL")}</td></tr>
  </table>

  <div class="diff-box">
    DIFERENCIA DE CAJA: $${diffCash.toLocaleString("es-CL")}
    ${diffCash === 0 ? " (EXACTA ✅)" : diffCash < 0 ? " (FALTANTE ⚠️)" : " (SOBRANTE ℹ️)"}
  </div>

  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir Reporte Zeta</button>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWin = window.open(url, "_blank");
  if (printWin) {
    printWin.onload = () => {
      setTimeout(() => {
        printWin.print();
      }, 500);
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
