import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  RestaurantState, 
  Order, 
  OrderItem, 
  OrderItemStatus, 
  OrderStatus 
} from "../types";
import { 
  Clock, 
  AlertTriangle, 
  ChefHat, 
  UtensilsCrossed, 
  RefreshCw,
  LogOut,
  Flame,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight
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

  // --- Carousel / Paging state (10s auto switch) ---
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TABLES_PER_PAGE = 3; // Max 3 columns visible on screen

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
    );

  // --- Priority sorting: urgent (>10 min) → cooking → ready ---
  const getOrderPriority = (order: Order): number => {
    const visibleItems = order.items.filter(isVisibleKitchenItem);
    const hasCookingItems = visibleItems.some((it) =>
      it.status === OrderItemStatus.SENT_TO_KITCHEN ||
      it.status === OrderItemStatus.RECEIVED ||
      it.status === OrderItemStatus.PREPARING
    );
    const allReady = visibleItems.length > 0 && visibleItems.every((it) =>
      it.status === OrderItemStatus.READY || it.status === OrderItemStatus.DELIVERED
    );

    if (hasCookingItems) {
      const timerStartedAt = order.kitchenSentAt || order.updatedAt || order.createdAt;
      const elapsed = (currentTime.getTime() - new Date(timerStartedAt).getTime()) / 1000 / 60;
      if (elapsed >= 10) return 0; // URGENT - top priority
      return 1; // cooking
    }
    if (allReady) return 2; // ready / resolved
    return 1; // fallback = cooking tier
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const pa = getOrderPriority(a);
    const pb = getOrderPriority(b);
    if (pa !== pb) return pa - pb;
    // Same priority: oldest first
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / TABLES_PER_PAGE));

  // Keep currentPage within bounds when totalPages changes
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(0);
    }
  }, [totalPages, currentPage]);

  // --- 10-Second Auto Page Switcher ---
  useEffect(() => {
    if (isPaused || totalPages <= 1) return;

    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [isPaused, totalPages]);

  // Temporary pause on manual interaction
  const triggerPause = useCallback(() => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 15000); // Resume auto-paging after 15s of inactivity
  }, []);

  const handleNextPage = () => {
    triggerPause();
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const handlePrevPage = () => {
    triggerPause();
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  // Slice active page orders
  const displayedOrders = sortedOrders.slice(
    currentPage * TABLES_PER_PAGE,
    (currentPage + 1) * TABLES_PER_PAGE
  );

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
    triggerPause();
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
        const anyCooking = order.items.some((candidate) =>
          candidate.status === OrderItemStatus.SENT_TO_KITCHEN ||
          candidate.status === OrderItemStatus.RECEIVED ||
          candidate.status === OrderItemStatus.PREPARING
        );
        order.status = allDelivered
          ? OrderStatus.DELIVERED
          : allReady
          ? OrderStatus.READY
          : anyCooking
          ? OrderStatus.PREPARING
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
    <div className="bg-zinc-950 h-screen text-white flex flex-col overflow-hidden select-none" id="kds-root-view">
      {/* HEADER WITH PAGE CONTROLS */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-amber-500" />
          <div>
            <span className="text-[8px] text-amber-500 font-black tracking-widest uppercase block leading-none">Cocina</span>
            <h1 className="text-base font-black text-white font-sans leading-tight">KDS</h1>
          </div>
          <span className="text-[10px] text-zinc-500 font-bold ml-2">
            {sortedOrders.length} mesa{sortedOrders.length !== 1 ? "s" : ""} activa{sortedOrders.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* CAROUSEL / PAGE INDICATOR */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl">
            <button
              onClick={handlePrevPage}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 px-1">
              <span>Pág {currentPage + 1}/{totalPages}</span>
              {isPaused ? (
                <span className="text-[9px] text-zinc-400 font-normal animate-pulse ml-1">(Pausado)</span>
              ) : (
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping ml-1" title="Cambiando cada 10s" />
              )}
            </div>

            <button
              onClick={handleNextPage}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CONTROLS */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshState}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Refrescar estado"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-2 bg-red-950/40 border border-red-900/50 hover:bg-red-900 text-red-200 hover:text-white font-extrabold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-all"
            >
              <LogOut className="w-3 h-3" /> Salir
            </button>
          )}
        </div>
      </div>

      {/* TICKETS GRID (FORCED 3 COLUMNS SIDE-BY-SIDE IN 1 ROW, FULL SCREEN HEIGHT) */}
      <div className="flex-1 px-3 py-2 overflow-hidden">
        <div className="grid grid-cols-3 gap-2.5 h-full">
          {displayedOrders.map((order) => {
            const visibleItems = order.items.filter(isVisibleKitchenItem);
            const hasCookingItems = visibleItems.some((it) =>
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
            const elapsedMins = hasCookingItems ? getElapsedMinutes(timerStartedAt) : 0;
            const isLate = hasCookingItems && elapsedMins >= 10;
            const isResolved = !hasCookingItems && allVisibleItemsReady;

            return (
              <div
                key={order.id}
                className={`bg-zinc-900 border rounded-xl overflow-hidden flex flex-col h-full transition-all ${
                  isLate 
                    ? "border-red-500/50 ring-1 ring-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] animate-pulse" 
                    : hasCookingItems
                    ? "border-amber-400 ring-1 ring-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.15)] animate-pulse"
                    : isResolved
                    ? "border-emerald-500/40 ring-1 ring-emerald-500/15"
                    : "border-zinc-800"
                }`}
              >
                {/* Compact Ticket Header */}
                <div className={`px-2.5 py-1.5 flex justify-between items-center shrink-0 ${
                  isLate
                    ? "bg-red-950/40"
                    : hasCookingItems
                    ? "bg-amber-950/50"
                    : isResolved
                    ? "bg-emerald-950/30"
                    : "bg-zinc-800/50"
                }`}>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-base text-white leading-tight">Mesa {getTableNumber(order.tableId)}</h3>
                    <span className="text-[9px] text-zinc-400 font-bold block truncate">
                      {getWaiterName(order.waiterId)} · {order.customerCount} com.
                    </span>
                  </div>

                  {/* TIMER BADGE */}
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-black shrink-0 ${
                    isLate
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : hasCookingItems
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : isResolved
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>
                      {hasCookingItems ? getElapsedTimeText(timerStartedAt) : allVisibleItemsDelivered ? "Servido" : "Listo"}
                    </span>
                    {isLate && <AlertTriangle className="w-3 h-3 text-red-400 animate-bounce" />}
                  </div>
                </div>

                {/* Items List (Full height & compact padding to display entire order) */}
                <div className="px-2.5 py-1.5 flex-1 overflow-y-auto space-y-1">
                  {visibleItems
                    .map((it) => {
                      const prod = state.products.find((p) => p.id === it.productId);
                      if (!prod) return null;
                      const isUpdating = pendingItemIds.includes(it.id);
                      const isCooking = 
                        it.status === OrderItemStatus.SENT_TO_KITCHEN ||
                        it.status === OrderItemStatus.RECEIVED ||
                        it.status === OrderItemStatus.PREPARING;

                      return (
                        <div key={it.id} className="border-b border-zinc-800/60 pb-1 last:border-b-0 last:pb-0">
                          {/* Item row: quantity + full product name + SINGLE ICON STATUS BUTTON */}
                          <div className="flex items-center gap-1.5 justify-between">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="bg-amber-500 text-zinc-950 px-1 py-0.5 rounded text-[10px] font-black shrink-0 leading-none">
                                {it.quantity}x
                              </span>
                              <span className="text-[12px] font-extrabold text-white leading-tight break-words">
                                {prod.name}
                              </span>
                            </div>

                            {/* SINGLE ICON STATUS BUTTON */}
                            <div className="shrink-0 ml-1">
                              {/* 1. Cooking status icon -> click to mark READY */}
                              {isCooking && (
                                <button
                                  onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.READY)}
                                  disabled={isUpdating}
                                  title="Cocinando — Clic para marcar LISTO"
                                  className={`p-1 rounded-md border transition-all flex items-center justify-center cursor-pointer ${
                                    isUpdating 
                                      ? "bg-zinc-700 text-zinc-400 border-zinc-700 cursor-wait" 
                                      : "bg-amber-500/20 hover:bg-emerald-500 text-amber-400 hover:text-zinc-950 border-amber-500/40 hover:border-emerald-400 active:scale-95 shadow-sm"
                                  }`}
                                >
                                  <Flame className="w-3.5 h-3.5 animate-pulse stroke-[2.5]" />
                                </button>
                              )}

                              {/* 2. Ready status icon -> click to mark DELIVERED */}
                              {it.status === OrderItemStatus.READY && (
                                <button
                                  onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.DELIVERED)}
                                  disabled={isUpdating}
                                  title="¡Listo! — Clic para marcar SERVIDO"
                                  className={`p-1 rounded-md border transition-all flex items-center justify-center cursor-pointer ${
                                    isUpdating 
                                      ? "bg-zinc-700 text-zinc-400 border-zinc-700 cursor-wait" 
                                      : "bg-emerald-500 text-zinc-950 border-emerald-400 hover:bg-emerald-400 active:scale-95 shadow-md shadow-emerald-950/40"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              )}

                              {/* 3. Delivered status icon */}
                              {it.status === OrderItemStatus.DELIVERED && (
                                <div 
                                  className="p-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-600 flex items-center justify-center" 
                                  title="Servido"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Modifiers */}
                          {it.selectedModifiers.filter((m) => m.extraPrice >= 0).length > 0 && (
                            <div className="ml-5 mt-0.5">
                              {it.selectedModifiers.filter((m) => m.extraPrice >= 0).map((m) => (
                                <span key={m.optionId} className="text-[9px] text-zinc-400 block italic leading-tight">
                                  {m.extraPrice > 0 ? "+ " : m.extraPrice < 0 ? "- " : ""}{m.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Kitchen Notes */}
                          {it.notes && (
                            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded block mt-0.5 ml-5 font-semibold">
                              📝 {it.notes}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Compact Footer */}
                <div className="px-2.5 py-1 bg-zinc-950 border-t border-zinc-800 text-[8px] text-zinc-600 flex justify-between shrink-0">
                  <span>ID: {order.id.slice(0, 6)}</span>
                  <span className="uppercase font-bold tracking-wider">Tanda {visibleItems[0]?.tanda || 1}</span>
                </div>
              </div>
            );
          })}

          {displayedOrders.length === 0 && (
            <div className="col-span-full py-16 text-center bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center h-full">
              <UtensilsCrossed className="w-12 h-12 text-zinc-800 mb-2 animate-pulse" />
              <p className="text-zinc-500 text-sm font-bold">Sin comandas activas pendientes.</p>
              <p className="text-zinc-600 text-xs mt-1">Los pedidos ingresados aparecerán instantáneamente en esta pantalla.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

