import React, { useState, useEffect } from "react";
import {
  RestaurantState, 
  Order, 
  OrderItem, 
  OrderItemStatus, 
  OrderStatus 
} from "../types";
import { 
  Clock, 
  Check, 
  AlertTriangle, 
  ChefHat, 
  UtensilsCrossed, 
  RefreshCw,
  LogOut
} from "lucide-react";
import { isDirectServiceProduct } from "../orderUtils";

interface KitchenKDSProps {
  state: RestaurantState;
  onRefreshState: () => void;
  onLogout?: () => void;
}

export default function KitchenKDS({ state, onRefreshState, onLogout }: KitchenKDSProps) {
  const applyDirectStateUpdate = async (mutator: (state: RestaurantState) => void) => {
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      const client = await import("../dbClient");
      client.applyLocalStateUpdate(mutator);
    }
  };

  const refreshDirectState = async () => {
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      const client = await import("../dbClient");
      await client.refreshStateFromServer();
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingItemIds, setPendingItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") return;
    // Poll the server state every 3 seconds
    const interval = setInterval(() => {
      onRefreshState();
    }, 3000);
    return () => clearInterval(interval);
  }, [onRefreshState]);

  // Keep current time ticked every second for exact elapsed time calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isKitchenProduct = (productId: string) => {
    const product = state.products.find((candidate) => candidate.id === productId);
    return Boolean(product && !isDirectServiceProduct(product));
  };

  const isVisibleKitchenItem = (item: OrderItem) => isKitchenProduct(item.productId) &&
    item.status !== OrderItemStatus.PENDING;

  // Draft waiter items and all beverages stay outside the kitchen display.
  const filteredOrders = state.orders
    .filter((order) =>
      order.status !== OrderStatus.CLOSED &&
      order.status !== OrderStatus.PENDING_APPROVAL &&
      order.items.some(isVisibleKitchenItem)
    )
    // Sort oldest first
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Calculate cooking elapsed minutes
  const getElapsedTimeText = (createdAtStr: string) => {
    const created = new Date(createdAtStr);
    const diffMs = currentTime.getTime() - created.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getElapsedMinutes = (createdAtStr: string) => {
    const created = new Date(createdAtStr);
    const diffMs = currentTime.getTime() - created.getTime();
    return Math.floor(diffMs / 1000 / 60);
  };

  const handleUpdateItemStatus = async (orderId: string, itemId: string, nextStatus: OrderItemStatus) => {
    if (pendingItemIds.includes(itemId)) return;
    setPendingItemIds(prev => [...prev, itemId]);
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      await applyDirectStateUpdate((nextState) => {
        const order = nextState.orders.find((candidate) => candidate.id === orderId);
        const item = order?.items.find((candidate) => candidate.id === itemId);
        if (!order || !item) return;
        item.status = nextStatus;
        order.updatedAt = new Date().toISOString();
        const allReady = order.items.every((candidate) =>
          candidate.status === OrderItemStatus.READY || candidate.status === OrderItemStatus.DELIVERED
        );
        const allDelivered = order.items.every((candidate) => candidate.status === OrderItemStatus.DELIVERED);
        const anyPreparing = order.items.some((candidate) => candidate.status === OrderItemStatus.PREPARING);
        const anyKitchenQueue = order.items.some((candidate) =>
          candidate.status === OrderItemStatus.SENT_TO_KITCHEN || candidate.status === OrderItemStatus.RECEIVED
        );
        order.status = allDelivered
          ? OrderStatus.DELIVERED
          : allReady
          ? OrderStatus.READY
          : anyPreparing
          ? OrderStatus.PREPARING
          : anyKitchenQueue
          ? OrderStatus.PENDING_KITCHEN
          : order.status;
      });
    }
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
          await refreshDirectState();
        }
        console.error("No se pudo actualizar el estado del item");
      }
    } catch (e) {
      if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
        await refreshDirectState();
      }
      console.error(e);
    } finally {
      setPendingItemIds(prev => prev.filter(id => id !== itemId));
    }
  };

  const getTableNumber = (tableId: string) => {
    const table = state.tables.find((t) => t.id === tableId);
    return table ? table.number : "?";
  };

  const getWaiterName = (waiterId?: string) => {
    if (!waiterId) return "Cliente (QR)";
    const waiter = state.users.find((u) => u.id === waiterId);
    return waiter ? waiter.name.replace(" (Mozo)", "") : "Mozo";
  };

  return (
    <div className="bg-zinc-950 min-h-screen text-white p-6 flex flex-col" id="kds-root-view">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div>
          <span className="text-[10px] text-amber-500 font-black tracking-widest uppercase block">Cocina</span>
          <h1 className="text-2xl font-black text-white flex items-center gap-2 font-sans">
            <ChefHat className="w-6 h-6 text-amber-500" /> Kitchen Display System (KDS)
          </h1>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshState}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-2.5 bg-red-950/40 border border-red-900/50 hover:bg-red-900 text-red-200 hover:text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          )}
        </div>
      </div>

      {/* TICKETS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
        {filteredOrders.map((order) => {
          const visibleItems = order.items.filter(isVisibleKitchenItem);
          const hasNewItems = visibleItems.some((it) => it.status === OrderItemStatus.SENT_TO_KITCHEN);
          const hasReceivedItems = visibleItems.some((it) => it.status === OrderItemStatus.RECEIVED);
          const hasRunningItems = visibleItems.some((it) =>
            it.status === OrderItemStatus.SENT_TO_KITCHEN ||
            it.status === OrderItemStatus.RECEIVED ||
            it.status === OrderItemStatus.PREPARING
          );
          const allVisibleItemsReady = visibleItems.length > 0 && visibleItems.every((it) =>
            it.status === OrderItemStatus.READY || it.status === OrderItemStatus.DELIVERED
          );
          const allVisibleItemsDelivered = visibleItems.length > 0 && visibleItems.every((it) =>
            it.status === OrderItemStatus.DELIVERED
          );
          const timerStartedAt = order.kitchenSentAt || order.updatedAt || order.createdAt;
          const elapsedMins = hasRunningItems ? getElapsedMinutes(timerStartedAt) : 0;
          const isLate = hasRunningItems && elapsedMins >= 10;
          const isResolved = !hasRunningItems && allVisibleItemsReady;

          return (
            <div
              key={order.id}
              className={`bg-zinc-900 border rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                isLate 
                  ? "border-red-500/50 ring-2 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse" 
                  : hasNewItems
                  ? "border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_18px_rgba(251,191,36,0.18)] animate-pulse"
                  : hasReceivedItems
                  ? "border-cyan-500/60 ring-1 ring-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.12)]"
                  : isResolved
                  ? "border-emerald-500/40 ring-1 ring-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                  : "border-zinc-800 shadow-xl"
              }`}
            >
              {/* Ticket Header */}
              <div className={`p-3.5 flex justify-between items-start ${
                isLate
                  ? "bg-red-950/40"
                  : hasNewItems
                  ? "bg-amber-950/50"
                  : hasReceivedItems
                  ? "bg-cyan-950/40"
                  : isResolved
                  ? "bg-emerald-950/30"
                  : "bg-zinc-800/50"
              }`}>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Mesa {getTableNumber(order.tableId)}</h3>
                  <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                    Mozo: {getWaiterName(order.waiterId)} | {order.customerCount} com.
                  </span>
                </div>

                {/* TIMER CLOCK */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${
                  isLate
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : hasNewItems
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : hasReceivedItems
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    : isResolved
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {hasRunningItems ? getElapsedTimeText(timerStartedAt) : allVisibleItemsDelivered ? "Servido" : "Listo"}
                  </span>
                  {isLate && <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-bounce" />}
                </div>
              </div>

              {/* Items checklist */}
              <div className="p-4 flex-1 space-y-3.5">
                {visibleItems
                  .map((it) => {
                    const prod = state.products.find((p) => p.id === it.productId);
                    if (!prod) return null;
                    const isUpdating = pendingItemIds.includes(it.id);

                    return (
                      <div key={it.id} className="border-b border-zinc-800/80 pb-3 flex flex-col justify-between gap-2">
                        <div className="flex justify-between items-start gap-1">
                          <div>
                            <span className="text-sm font-black text-white flex items-center gap-1.5">
                              <span className="bg-amber-500 text-zinc-950 px-2 py-0.5 rounded-md text-xs font-black">
                                {it.quantity}x
                              </span>
                              {prod.name}
                            </span>
                            
                            {/* Modifiers List */}
                            {it.selectedModifiers.filter((m) => m.extraPrice >= 0).map((m) => (
                              <span key={m.optionId} className="text-[10px] text-zinc-400 block italic ml-8">
                                {m.extraPrice > 0 ? "+ " : m.extraPrice < 0 ? "- " : ""}{m.name}
                              </span>
                            ))}

                            {/* Kitchen notes */}
                            {it.notes && (
                              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-md block mt-1.5 max-w-xs font-semibold ml-8">
                                Nota: "{it.notes}"
                              </span>
                            )}
                          </div>

                          {/* Status indicators */}
                          <div className="text-right">
                            {it.status === OrderItemStatus.SENT_TO_KITCHEN && (
                              <span className="text-amber-300 text-[10px] uppercase font-black tracking-wider animate-pulse">
                                Nuevo pedido
                              </span>
                            )}
                            {it.status === OrderItemStatus.RECEIVED && (
                              <span className="text-cyan-300 text-[10px] uppercase font-black tracking-wider">
                                Recepcionado
                              </span>
                            )}
                            {it.status === OrderItemStatus.PREPARING && (
                              <span className="text-blue-400 text-[10px] uppercase font-black tracking-wider animate-pulse">
                                Preparando
                              </span>
                            )}
                            {it.status === OrderItemStatus.READY && (
                              <span className="text-emerald-400 text-[10px] uppercase font-black tracking-wider">
                                Listo ✔
                              </span>
                            )}
                            {it.status === OrderItemStatus.DELIVERED && (
                              <span className="text-zinc-500 text-[10px]">Servido</span>
                            )}
                          </div>
                        </div>

                        {/* Status Change Nudges */}
                        <div className="flex justify-end gap-1.5 mt-1.5">
                          {it.status === OrderItemStatus.SENT_TO_KITCHEN && (
                            <button
                              onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.RECEIVED)}
                              disabled={isUpdating}
                              className={`font-bold text-[10px] py-1 px-3 rounded-lg border transition-colors ${
                                isUpdating ? "bg-zinc-700 text-zinc-400 border-zinc-700 cursor-wait" : "bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 cursor-pointer"
                              }`}
                            >
                              {isUpdating ? "Actualizando..." : "Recepcionar"}
                            </button>
                          )}
                          {it.status === OrderItemStatus.RECEIVED && (
                            <button
                              onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.PREPARING)}
                              disabled={isUpdating}
                              className={`font-bold text-[10px] py-1 px-3 rounded-lg border transition-colors ${
                                isUpdating ? "bg-zinc-700 text-zinc-400 border-zinc-700 cursor-wait" : "bg-cyan-950 hover:bg-blue-600 text-cyan-100 border-cyan-700 cursor-pointer"
                              }`}
                            >
                              {isUpdating ? "Actualizando..." : "Comenzar preparación"}
                            </button>
                          )}
                          {it.status === OrderItemStatus.PREPARING && (
                            <button
                              onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.READY)}
                              disabled={isUpdating}
                              className={`font-bold text-[10px] py-1 px-3 rounded-lg border transition-colors ${
                                isUpdating ? "bg-zinc-700 text-zinc-400 border-zinc-700 cursor-wait" : "bg-zinc-800 hover:bg-emerald-600 text-white border-zinc-700 cursor-pointer"
                              }`}
                            >
                              {isUpdating ? "Actualizando..." : "Listo / Servir"}
                            </button>
                          )}
                          {it.status === OrderItemStatus.READY && (
                            <button
                              onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.DELIVERED)}
                              disabled={isUpdating}
                              className={`font-bold text-[10px] py-1 px-3 rounded-lg border transition-colors ${
                                isUpdating ? "bg-zinc-700 text-zinc-400 border-zinc-700 cursor-wait" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700 cursor-pointer"
                              }`}
                            >
                              {isUpdating ? "Actualizando..." : "Servido"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Tanda Footer */}
              <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
                <span>ID: {order.id.slice(0, 8)}</span>
                <span className="uppercase font-bold tracking-wider">Tanda {visibleItems[0]?.tanda || 1}</span>
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-24 text-center bg-zinc-900 border border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center">
            <UtensilsCrossed className="w-12 h-12 text-zinc-800 mb-3 animate-pulse" />
            <p className="text-zinc-500 text-sm font-bold">Sin comandas activas pendientes.</p>
            <p className="text-zinc-600 text-xs mt-1">Los pedidos ingresados aparecerán instantáneamente en esta pantalla.</p>
          </div>
        )}
      </div>
    </div>
  );
}
