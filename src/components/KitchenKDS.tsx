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
  Wine, 
  UtensilsCrossed, 
  RefreshCw,
  LogOut
} from "lucide-react";

interface KitchenKDSProps {
  state: RestaurantState;
  onRefreshState: () => void;
  onLogout?: () => void;
}

export default function KitchenKDS({ state, onRefreshState, onLogout }: KitchenKDSProps) {
  const [filterType, setFilterType] = useState<"all" | "cocina" | "bar">("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
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

  // Filter orders that are active and not closed
  const activeOrders = state.orders.filter(
    (o) => o.status !== OrderStatus.CLOSED && o.status !== OrderStatus.PENDING_APPROVAL
  );

  // Group items by category to filter between Food (Cocina) vs Drink (Bar)
  const isDrinkCategory = (productId: string) => {
    const prod = state.products.find((p) => p.id === productId);
    return prod?.categoryId === "c3"; // "Bebidas y Tragos"
  };

  const hasItemsForFilter = (order: Order) => {
    if (filterType === "all") return order.items.length > 0;
    if (filterType === "bar") return order.items.some((it) => isDrinkCategory(it.productId));
    if (filterType === "cocina") return order.items.some((it) => !isDrinkCategory(it.productId));
    return false;
  };

  // Filter orders based on item categories
  const filteredOrders = activeOrders
    .filter(hasItemsForFilter)
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
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
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
          <span className="text-[10px] text-amber-500 font-black tracking-widest uppercase block">Cocina / Barra</span>
          <h1 className="text-2xl font-black text-white flex items-center gap-2 font-sans">
            <ChefHat className="w-6 h-6 text-amber-500" /> Kitchen Display System (KDS)
          </h1>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === "all" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Vista General
            </button>
            <button
              onClick={() => setFilterType("cocina")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === "cocina" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" /> Comida
            </button>
            <button
              onClick={() => setFilterType("bar")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === "bar" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Wine className="w-3.5 h-3.5" /> Barra/Bebidas
            </button>
          </div>

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
          const elapsedMins = getElapsedMinutes(order.createdAt);
          const isLate = elapsedMins >= 10; // Red alert if 10 minutes exceeded

          return (
            <div
              key={order.id}
              className={`bg-zinc-900 border rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                isLate 
                  ? "border-red-500/50 ring-2 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse" 
                  : "border-zinc-800 shadow-xl"
              }`}
            >
              {/* Ticket Header */}
              <div className={`p-3.5 flex justify-between items-start ${isLate ? "bg-red-950/40" : "bg-zinc-800/50"}`}>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Mesa {getTableNumber(order.tableId)}</h3>
                  <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                    Mozo: {getWaiterName(order.waiterId)} | {order.customerCount} com.
                  </span>
                </div>

                {/* TIMER CLOCK */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${
                  isLate ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{getElapsedTimeText(order.createdAt)}</span>
                  {isLate && <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-bounce" />}
                </div>
              </div>

              {/* Items checklist */}
              <div className="p-4 flex-1 space-y-3.5">
                {order.items
                  .filter((it) => {
                    if (filterType === "all") return true;
                    const isDrink = isDrinkCategory(it.productId);
                    return filterType === "bar" ? isDrink : !isDrink;
                  })
                  .map((it) => {
                    const prod = state.products.find((p) => p.id === it.productId);
                    if (!prod) return null;

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
                            {it.selectedModifiers.map((m) => (
                              <span key={m.optionId} className="text-[10px] text-zinc-400 block italic ml-8">
                                + {m.name}
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
                            {it.status === OrderItemStatus.PREPARING && (
                              <span className="text-blue-400 text-[10px] uppercase font-black tracking-wider animate-pulse">
                                Cocinando
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
                          {it.status === OrderItemStatus.PENDING && (
                            <button
                              onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.PREPARING)}
                              className="bg-zinc-800 hover:bg-blue-600 text-white font-bold text-[10px] py-1 px-3 rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                            >
                              Preparar
                            </button>
                          )}
                          {it.status === OrderItemStatus.PREPARING && (
                            <button
                              onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.READY)}
                              className="bg-zinc-800 hover:bg-emerald-600 text-white font-bold text-[10px] py-1 px-3 rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                            >
                              Listo / Servir
                            </button>
                          )}
                          {it.status === OrderItemStatus.READY && (
                            <button
                              onClick={() => handleUpdateItemStatus(order.id, it.id, OrderItemStatus.DELIVERED)}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold text-[10px] py-1 px-3 rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                            >
                              Servido
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
                <span className="uppercase font-bold tracking-wider">Tanda {order.items[0]?.tanda || 1}</span>
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
