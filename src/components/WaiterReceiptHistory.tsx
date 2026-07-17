import React, { useMemo, useState } from "react";
import { Printer, ReceiptText, Search, X } from "lucide-react";
import { OrderStatus, PaymentMethod, RestaurantState } from "../types";
import { printThermalReceipt } from "./ThermalReceipt";

interface WaiterReceiptHistoryProps {
  state: RestaurantState;
  onClose: () => void;
}

const paymentLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Efectivo",
  [PaymentMethod.DEBIT]: "Débito",
  [PaymentMethod.CREDIT]: "Crédito",
  [PaymentMethod.TRANSFER]: "Transferencia",
  [PaymentMethod.ACCOUNT]: "Cuenta autorizada",
};

export default function WaiterReceiptHistory({ state, onClose }: WaiterReceiptHistoryProps) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<"today" | "7days" | "30days" | "all">("today");

  const receiptEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const periodStart = period === "today"
      ? startOfToday
      : period === "7days"
        ? startOfToday - 6 * 24 * 60 * 60 * 1000
        : period === "30days"
          ? startOfToday - 29 * 24 * 60 * 60 * 1000
          : 0;

    return state.payments
      .map((payment) => ({
        payment,
        order: state.orders.find((order) => order.id === payment.orderId),
      }))
      .filter((entry) => entry.order && !(entry.order as typeof entry.order & { voided?: boolean }).voided)
      .filter((entry) => new Date(entry.payment.createdAt).getTime() >= periodStart)
      .filter((entry) => {
        if (!normalizedSearch) return true;
        const order = entry.order!;
        const table = state.tables.find((candidate) => candidate.id === order.tableId);
        return order.id.toLocaleLowerCase().includes(normalizedSearch) ||
          entry.payment.id.toLocaleLowerCase().includes(normalizedSearch) ||
          String(table?.number || "").includes(normalizedSearch) ||
          (order.customerPhone || "").toLocaleLowerCase().includes(normalizedSearch);
      })
      .sort((a, b) => new Date(b.payment.createdAt).getTime() - new Date(a.payment.createdAt).getTime());
  }, [period, search, state.orders, state.payments, state.tables]);

  const formatCLP = (value: number) => "$" + Math.round(value).toLocaleString("es-CL");

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/65 p-0 sm:p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="waiter-receipts-title">
      <div className="h-full w-full bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-zinc-200 sm:shadow-2xl flex flex-col overflow-hidden">
        <header className="shrink-0 border-b border-zinc-200 bg-white p-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="waiter-receipts-title" className="text-base font-extrabold text-zinc-950 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-amber-500" /> Historial de boletas
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Busca una venta cerrada y vuelve a imprimir una copia.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 flex items-center justify-center" aria-label="Cerrar historial de boletas">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-zinc-100 bg-zinc-50 p-4 flex flex-col sm:flex-row gap-2">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por mesa, comanda o teléfono"
              className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
            />
          </label>
          <select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-amber-500">
            <option value="today">Boletas de hoy</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="all">Todas las fechas</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {receiptEntries.length > 0 ? (
            <div className="space-y-3">
              {receiptEntries.map(({ order: maybeOrder, payment }) => {
                const order = maybeOrder!;
                const table = state.tables.find((candidate) => candidate.id === order.tableId);
                const orderPayments = state.payments
                  .filter((candidate) => candidate.orderId === order.id)
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                const paymentIndex = orderPayments.findIndex((candidate) => candidate.id === payment.id);
                const previouslyPaid = orderPayments
                  .slice(0, Math.max(0, paymentIndex))
                  .reduce((sum, candidate) => sum + candidate.amount, 0);
                const accountTotal = order.billingTotal ?? orderPayments.reduce((sum, candidate) => sum + candidate.amount, 0);
                const remainingBalance = Math.max(0, accountTotal - previouslyPaid - payment.amount);
                const waiter = state.users.find((user) => user.id === order.waiterId);
                const isClosed = order.status === OrderStatus.CLOSED;

                return (
                  <article key={payment.id} className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-zinc-950">Mesa {table?.number || "?"}</span>
                        <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${isClosed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {isClosed ? "Cuenta pagada" : "Pago parcial"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {new Date(payment.createdAt).toLocaleString("es-CL")} · Boleta {payment.id.slice(-6).toUpperCase()}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">{paymentLabels[payment.method]}{waiter ? ` · ${waiter.name}` : ""}</p>
                      {remainingBalance > 0 && <p className="mt-1 text-[10px] font-bold text-amber-700">Saldo posterior: {formatCLP(remainingBalance)}</p>}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-base font-black text-zinc-950">{formatCLP(payment.amount)}</span>
                      <button
                        type="button"
                        onClick={() => printThermalReceipt({
                          order,
                          state,
                          payments: [payment],
                          waiterName: waiter?.name,
                          accountSubtotal: order.billingSubtotal,
                          accountDiscount: order.billingDiscount,
                          accountTip: order.billingTip,
                          accountTotal,
                          previouslyPaid,
                          remainingBalance,
                        })}
                        className="h-10 w-10 rounded-lg bg-zinc-950 text-white hover:bg-amber-500 hover:text-zinc-950 flex items-center justify-center"
                        title="Imprimir copia"
                        aria-label={`Imprimir copia de boleta de Mesa ${table?.number || ""}`}
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="h-full min-h-64 flex flex-col items-center justify-center text-center text-zinc-400">
              <ReceiptText className="h-10 w-10 text-zinc-200" />
              <p className="mt-3 text-sm font-bold text-zinc-600">No se encontraron boletas</p>
              <p className="mt-1 text-xs">Prueba cambiando la fecha o el término de búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
