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

  // --- Auto-scroll state ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrollPaused, setIsScrollPaused] = useState(false);
  const scrollDirectionRef = useRef<"down" | "up">("down");
  const isAtBottomPauseRef = useRef(false);

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

  // --- Auto-scroll engine ---
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const SCROLL_SPEED_PX = 1; // pixels per tick
    const TICK_MS = 30; // tick interval (≈33 fps)
    const BOTTOM_PAUSE_MS = 3000; // pause at bottom before scrolling back up

    scrollIntervalRef.current = setInterval(() => {
      if (isScrollPaused || isAtBottomPauseRef.current) return;

      const maxScroll = el.scrollHeight - el.clientHeight;
      // Nothing to scroll
      if (maxScroll <= 0) return;

      if (scrollDirectionRef.current === "down") {
        el.scrollTop += SCROLL_SPEED_PX;
        // Reached bottom
        if (el.scrollTop >= maxScroll - 1) {
          isAtBottomPauseRef.current = true;
          setTimeout(() => {
            isAtBottomPauseRef.current = false;
            scrollDirectionRef.current = "up";
          }, BOTTOM_PAUSE_MS);
        }
      } else {
        el.scrollTop -= SCROLL_SPEED_PX * 3; // scroll back up faster
        if (el.scrollTop <= 0) {
          scrollDirectionRef.current = "down";
        }
      }
    }, TICK_MS);

    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [isScrollPaused]);

  // Pause auto-scroll on user interaction
  const pauseScroll = useCallback(() => {
    setIsScrollPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsScrollPaused(false);
    }, 6000); // resume after 6 seconds of inactivity
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const events = ["touchstart", "mousedown", "wheel"] as const;
    events.forEach((evt) => el.addEventListener(evt, pauseScroll, { passive: true }));
    return () => {
      events.forEach((evt) => el.removeEventListener(evt, pauseScroll));
    };
  }, [pauseScroll]);

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
    <div className="bg-zinc-950 h-screen text-white flex flex-col overflow-hidden" id="kds-root-view">
      {/* COMPACT HEADER */}
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

        {/* CONTROLS */}
        <div className="flex items-center gap-2">
          {isScrollPaused && (
            <span className="text-[9px] text-amber-400 font-bold animate-pulse">⏸ Scroll pausado</span>
          )}
          <button
            onClick={onRefreshState}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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

      {/* SCROLLABLE TICKETS GRID */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ scrollBehavior: "auto" }}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5">
          {sortedOrders.map((order) => {
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
                className={`bg-zinc-900 border rounded-xl overflow-hidden flex flex-col transition-all ${
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
                <div className={`px-2.5 py-2 flex justify-between items-center ${
                  isLate
                    ? "bg-red-950/40"
                    : hasCookingItems
                    ? "bg-amber-950/50"
                    : isResolved
                    ? "bg-emerald-950/30"
                    : "bg-zinc-800/50"
                }`}>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-white leading-tight">Mesa {getTableNumber(order.tableId)}</h3>
                    <span className="text-[8px] text-zinc-400 font-bold block truncate">
                      {getWaiterName(order.waiterId)} · {order.customerCount} com.
                    </span>
                  </div>

                  {/* TIMER BADGE */}
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
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

                {/* Compact Items List */}
                <div className="px-2.5 py-1.5 flex-1 space-y-1">
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
                          {/* Item row: quantity + name + status + action — all in one line */}
                          <div className="flex items-center gap-1.5 justify-between">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <span className="bg-amber-500 text-zinc-950 px-1.5 py-0 rounded text-[10px] font-black shrink-0 leading-relaxed">
                                {it.quantity}x
                              </span>
                              <span className="text-[11px] font-bold text-white truncate">{prod.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isCooking && (
                                <span className="text-amber-300 text-[8px] uppercase font-black tracking-wider animate-pulse">
                                  Cocinando
                                </span>
                              )}
                              {it.status === OrderItemStatus.READY && (
                                <span className="text-emerald-400 text-[8px] uppercase font-black">Listo ✔</span>
                              )}
                              {it.status === OrderItemStatus.DELIVERED && (
                                <span className="text-zinc-500 text-[8px]">Servido</span>
                              )}

                              {/* Inline action button */}
                              {isCooking && (
                                <button
                                  onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.READY)}
                                  disabled={isUpdating}
                                  className={`font-bold text-[9px] py-0.5 px-2 rounded-md border transition-colors ${
                                    isUpdating 
                                      ? "bg-zinc-700 text-zinc-400 border-zinc-700 cursor-wait" 
                                      : "bg-amber-500 hover:bg-emerald-600 text-zinc-950 hover:text-white border-amber-400 cursor-pointer"
                                  }`}
                                >
                                  {isUpdating ? "..." : "Marcar listo"}
                                </button>
                              )}
                              {it.status === OrderItemStatus.READY && (
                                <button
                                  onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.DELIVERED)}
                                  disabled={isUpdating}
                                  className={`font-bold text-[9px] py-0.5 px-2 rounded-md border transition-colors ${
                                    isUpdating 
                                      ? "bg-zinc-700 text-zinc-400 border-zinc-700 cursor-wait" 
                                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700 cursor-pointer"
                                  }`}
                                >
                                  {isUpdating ? "..." : "Servido"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Modifiers (compact) */}
                          {it.selectedModifiers.filter((m) => m.extraPrice >= 0).length > 0 && (
                            <div className="ml-6 mt-0.5">
                              {it.selectedModifiers.filter((m) => m.extraPrice >= 0).map((m) => (
                                <span key={m.optionId} className="text-[8px] text-zinc-500 block italic leading-tight">
                                  {m.extraPrice > 0 ? "+ " : m.extraPrice < 0 ? "- " : ""}{m.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Notes (compact) */}
                          {it.notes && (
                            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] px-1.5 py-0.5 rounded block mt-0.5 ml-6 font-semibold truncate">
                              📝 {it.notes}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Compact Footer */}
                <div className="px-2.5 py-1 bg-zinc-950 border-t border-zinc-800 text-[8px] text-zinc-600 flex justify-between">
                  <span>{order.id.slice(0, 6)}</span>
                  <span className="uppercase font-bold tracking-wider">T{visibleItems[0]?.tanda || 1}</span>
                </div>
              </div>
            );
          })}

          {sortedOrders.length === 0 && (
            <div className="col-span-full py-16 text-center bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center">
              <UtensilsCrossed className="w-10 h-10 text-zinc-800 mb-2 animate-pulse" />
              <p className="text-zinc-500 text-xs font-bold">Sin comandas activas pendientes.</p>
              <p className="text-zinc-600 text-[10px] mt-1">Los pedidos ingresados aparecerán instantáneamente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
