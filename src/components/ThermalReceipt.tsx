import React from "react";
import { Order, RestaurantState, PaymentMethod } from "../types";

interface ThermalReceiptProps {
  order: Order;
  state: RestaurantState;
  payments: Array<{ amount: number; method: PaymentMethod; tip: number; discount: number }>;
  waiterName?: string;
}

/**
 * Opens a print-optimized window formatted for 80mm thermal printers (302px).
 * Includes all legally required receipt fields for Chile (boleta).
 */
export function printThermalReceipt({ order, state, payments, waiterName }: ThermalReceiptProps) {
  const table = state.tables.find((t) => t.id === order.tableId);
  const tableName = table ? `Mesa ${table.number} — ${table.zone}` : "Sin mesa";

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const receiptNumber = `B-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;

  // Build items rows
  const itemsHTML = order.items
    .map((item) => {
      const product = state.products.find((p) => p.id === item.productId);
      if (!product) return "";
      const modPrice = item.selectedModifiers?.reduce((sum, m) => sum + m.extraPrice, 0) || 0;
      const unitPrice = product.price + modPrice;
      const lineTotal = unitPrice * item.quantity;
      const modifiersText = item.selectedModifiers && item.selectedModifiers.length > 0
        ? item.selectedModifiers.map((m) => `  + ${m.name}`).join("<br/>")
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

  const paymentMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: "Efectivo",
      [PaymentMethod.CREDIT_CARD]: "T. Crédito",
      [PaymentMethod.DEBIT_CARD]: "T. Débito",
      [PaymentMethod.TRANSFER]: "Transferencia",
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
    <tr><td>Subtotal</td><td class="item-price">$${subtotal.toLocaleString("es-CL")}</td></tr>
    ${totalDiscount > 0 ? `<tr><td>Descuento</td><td class="item-price" style="color:#c00">-$${totalDiscount.toLocaleString("es-CL")}</td></tr>` : ""}
    ${totalTip > 0 ? `<tr><td>Propina (sugerida)</td><td class="item-price">$${totalTip.toLocaleString("es-CL")}</td></tr>` : ""}
  </table>

  <hr class="double-sep" />

  <table>
    <tr class="total-row"><td>TOTAL</td><td class="item-price">$${totalPaid.toLocaleString("es-CL")}</td></tr>
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
