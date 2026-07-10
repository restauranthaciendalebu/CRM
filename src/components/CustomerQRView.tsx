import React, { useState, useRef } from "react";
import { RestaurantState, Product, Category, OrderStatus } from "../types";
import {
  Bell,
  Receipt,
  Search,
  Download,
  ChefHat,
  Flame,
  Star,
  Heart,
  ArrowUp,
  UtensilsCrossed,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";

interface CustomerQRViewProps {
  state: RestaurantState;
  tableNumber: number;
  onRefreshState: () => void;
}

/* ─── Notification toast ─── */
type NoticeKind = "info" | "success" | "error";

export default function CustomerQRView({ state, tableNumber, onRefreshState }: CustomerQRViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Notice state
  const [notice, setNotice] = useState<{ msg: string; kind: NoticeKind } | null>(null);
  const [billRequested, setBillRequested] = useState(false);
  const [waiterJustCalled, setWaiterJustCalled] = useState(false);

  const showNotice = (msg: string, kind: NoticeKind = "info") => {
    setNotice({ msg, kind });
    setTimeout(() => setNotice(null), 4000);
  };

  // Find table
  const activeTable = state.tables.find((t) => t.number === tableNumber);
  const activeTableId = activeTable?.id;

  // Derived state: check if there are delivered orders at this table
  const tableOrders = state.orders.filter((o) => o.tableId === activeTableId);
  const hasDeliveredOrder = tableOrders.some(
    (o) => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CLOSED
  );

  // Derived state: check if there's a pending (unresolved) CALL_WAITER notification for this table
  const hasPendingWaiterCall = state.notifications.some(
    (n) => n.tableNumber === tableNumber && n.type === "CALL_WAITER" && !n.resolved
  );
  const waiterCooldown = hasPendingWaiterCall || waiterJustCalled;

  // Derived state: check if there's a pending REQUEST_BILL notification for this table
  const hasPendingBillRequest = state.notifications.some(
    (n) => n.tableNumber === tableNumber && n.type === "REQUEST_BILL" && !n.resolved
  );
  const billDisabled = !hasDeliveredOrder || billRequested || hasPendingBillRequest;

  // Filter products
  const filteredProducts = state.products.filter((p) => {
    if (!p.isAvailable) return false;
    if (selectedCategory !== "all" && p.categoryId !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by category for organized display
  const categoriesWithProducts = state.categories
    .map((cat) => ({
      ...cat,
      products: filteredProducts.filter((p) => p.categoryId === cat.id),
    }))
    .filter((cat) => cat.products.length > 0);

  /* ─── Actions ─── */
  const handleCallWaiter = async () => {
    if (!activeTable || waiterCooldown) return;
    setWaiterJustCalled(true);
    try {
      const res = await fetch("/api/notifications/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: activeTable.number, type: "CALL_WAITER" }),
      });
      if (res.ok) {
        showNotice("🔔 ¡Llamando al garzón! Se acercará a tu mesa en un momento.", "success");
      }
    } catch {
      showNotice("Error de conexión. Intenta de nuevo.", "error");
      setWaiterJustCalled(false);
    }
  };

  const handleRequestBill = async () => {
    if (!activeTable || billDisabled) return;
    try {
      const res = await fetch("/api/notifications/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: activeTable.number, type: "REQUEST_BILL" }),
      });
      if (res.ok) {
        setBillRequested(true);
        showNotice("💳 Cuenta solicitada. El garzón traerá tu boleta.", "success");
        onRefreshState();
      }
    } catch {
      showNotice("Error de conexión. Intenta de nuevo.", "error");
    }
  };

  /* ─── PDF / Print Download (mobile-friendly) ─── */
  const handleDownloadPDF = () => {
    const menuHTML = state.categories
      .map((cat) => {
        const prods = state.products.filter((p) => p.categoryId === cat.id && p.isAvailable);
        if (prods.length === 0) return "";
        return `
          <div class="category">
            <h2>${cat.name}</h2>
            ${prods
              .map(
                (p) => `
              <div class="item">
                <div class="item-header">
                  <span class="item-name">${p.name}</span>
                  <span class="item-price">$${p.price.toLocaleString("es-CL")}</span>
                </div>
                ${p.description ? `<p class="item-desc">${p.description}</p>` : ""}
                ${p.allergens && p.allergens.length > 0 ? `<p class="item-allergens">⚠️ ${p.allergens.join(", ")}</p>` : ""}
              </div>`
              )
              .join("")}
          </div>`;
      })
      .join("");

    const fullHTML = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Carta - Restaurant Hacienda</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; padding: 32px 24px; max-width: 700px; margin: 0 auto; color: #18181b; }
  .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #f59e0b; padding-bottom: 24px; }
  .header h1 { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
  .header p { color: #71717a; font-size: 12px; margin-top: 4px; }
  .category { margin-bottom: 24px; }
  .category h2 { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #92400e; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; margin-bottom: 10px; }
  .item { padding: 7px 0; border-bottom: 1px dotted #e4e4e7; }
  .item-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .item-name { font-weight: 700; font-size: 13px; }
  .item-price { font-weight: 800; font-size: 13px; color: #92400e; white-space: nowrap; }
  .item-desc { font-size: 11px; color: #71717a; margin-top: 2px; line-height: 1.4; }
  .item-allergens { font-size: 10px; color: #a1a1aa; margin-top: 2px; }
  .footer { text-align: center; margin-top: 28px; padding-top: 14px; border-top: 1px solid #e4e4e7; color: #a1a1aa; font-size: 9px; }
  .print-btn { display: block; margin: 20px auto 0; background: #18181b; color: white; border: none; padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; }
  .print-btn:active { opacity: 0.8; }
  @media print { .print-btn { display: none !important; } body { padding: 16px; } }
</style>
</head><body>
<div class="header">
  <h1>🏠 Restaurant Hacienda</h1>
  <p>Tradición & Alta Parrilla — Carta Digital</p>
</div>
${menuHTML}
<div class="footer">
  <p>Restaurant Hacienda · Carta Digital</p>
</div>
<button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
</body></html>`;

    // Create Blob and open as a new page (works on mobile)
    const blob = new Blob([fullHTML], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showNotice("📄 Carta abierta. Usa 'Guardar como PDF' o 'Imprimir' desde tu navegador.", "info");
  };

  /* ─── Scroll tracking ─── */
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 400);
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── Format price ─── */
  const formatPrice = (price: number) => `$${price.toLocaleString("es-CL")}`;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="min-h-screen bg-zinc-950 text-white overflow-y-auto"
      id="customer-qr-view"
    >
      {/* ── Toast notification ── */}
      {notice && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 animate-slide-down max-w-[90vw] ${
            notice.kind === "success"
              ? "bg-emerald-600 text-white"
              : notice.kind === "error"
              ? "bg-red-600 text-white"
              : "bg-amber-500 text-zinc-900"
          }`}
        >
          {notice.kind === "success" && <Check className="w-4 h-4" />}
          {notice.kind === "error" && <AlertTriangle className="w-4 h-4" />}
          {notice.msg}
        </div>
      )}

      {/* ── Hero Header with background image ── */}
      <header className="relative overflow-hidden px-5 pt-12 pb-10 text-center">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=70"
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Dark overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/85 to-zinc-950" />
          {/* Warm amber glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_60%)]" />
        </div>

        <div className="relative z-10">
          <span className="text-amber-500/90 text-[10px] uppercase tracking-[4px] font-black block">
            Carta Digital
          </span>
          <h1 className="text-3xl font-black mt-2 tracking-tight text-white drop-shadow-lg">
            🏠 Hacienda
          </h1>
          <p className="text-zinc-400 text-xs mt-2 italic max-w-xs mx-auto leading-relaxed">
            "Fuegos de la tradición campera, cortes premium madurados y los más selectos ingredientes de nuestra tierra chilena."
          </p>
          {activeTable && (
            <div className="mt-4 inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-amber-500/25 rounded-full px-4 py-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-400 text-xs font-bold">Mesa {tableNumber}</span>
              <span className="text-zinc-500 text-[10px]">· {activeTable.zone}</span>
            </div>
          )}

          {/* Download PDF button */}
          <button
            onClick={handleDownloadPDF}
            className="mt-5 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/15 text-white text-xs font-bold py-2.5 px-5 rounded-full transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Descargar Carta PDF
          </button>
        </div>
      </header>

      {/* ── Category pills ── */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === "all"
                ? "bg-amber-500 text-zinc-900 shadow-lg shadow-amber-500/20"
                : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            📋 Todo
          </button>
          {state.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-amber-500 text-zinc-900 shadow-lg shadow-amber-500/20"
                  : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar platos, empanadas, vino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Menu content ── */}
      <div className="px-4 pb-40">
        {categoriesWithProducts.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Search className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <span className="font-bold block">No se encontraron platos</span>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
              className="mt-3 text-amber-500 text-xs font-bold underline cursor-pointer"
            >
              Ver toda la carta
            </button>
          </div>
        ) : (
          categoriesWithProducts.map((cat) => (
            <div key={cat.id} className="mb-8">
              {/* Category title */}
              <div className="flex items-center gap-2 mb-4 mt-2">
                <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent" />
                <h2 className="text-xs font-black uppercase tracking-[3px] text-amber-500/70">
                  {cat.name}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-amber-500/30 to-transparent" />
              </div>

              {/* Products */}
              <div className="space-y-3">
                {cat.products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                    className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl overflow-hidden transition-all hover:border-zinc-700 cursor-pointer active:scale-[0.99]"
                  >
                    {/* Product card */}
                    <div className="flex gap-3 p-3">
                      {product.imageUrl && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-zinc-800">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-zinc-100 leading-tight">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-amber-500 font-black text-sm">
                            {formatPrice(product.price)}
                          </span>
                          {product.allergens && product.allergens.length > 0 && (
                            <span className="text-[9px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                              ⚠️ {product.allergens.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedProduct === product.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50">
                        {product.description && (
                          <p className="text-xs text-zinc-400 leading-relaxed mb-2">
                            {product.description}
                          </p>
                        )}
                        {product.allergens && product.allergens.length > 0 && (
                          <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 mb-2">
                            <span className="text-[10px] font-bold text-amber-600 block">⚠️ Información de Alérgenos</span>
                            <span className="text-[10px] text-zinc-400">
                              Contiene: {product.allergens.join(", ")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <ChefHat className="w-3 h-3 text-amber-500/50" />
                          <span className="text-[10px] text-zinc-600 italic">
                            Para ordenar este plato, solicítalo a tu garzón.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Floating action bar (Waiter / Bill) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50 px-4 py-3 safe-bottom">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={handleCallWaiter}
            disabled={waiterCooldown}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              waiterCooldown
                ? "bg-zinc-800 text-zinc-600"
                : "bg-amber-500 hover:bg-amber-400 text-zinc-900 active:scale-[0.97] shadow-lg shadow-amber-500/20"
            }`}
          >
            <Bell className={`w-4 h-4 ${!waiterCooldown ? "animate-bounce" : ""}`} />
            {waiterCooldown ? "Garzón en camino ✓" : "Llamar Garzón"}
          </button>

          <button
            onClick={handleRequestBill}
            disabled={billDisabled}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              billRequested || hasPendingBillRequest
                ? "bg-emerald-900/50 text-emerald-400 border border-emerald-500/20"
                : !hasDeliveredOrder
                ? "bg-zinc-800/50 text-zinc-700 border border-zinc-800"
                : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/50 active:scale-[0.97]"
            }`}
          >
            <Receipt className="w-4 h-4" />
            {billRequested || hasPendingBillRequest
              ? "Cuenta solicitada ✓"
              : !hasDeliveredOrder
              ? "Sin pedidos aún"
              : "Pedir Cuenta"}
          </button>
        </div>

        {/* Restaurant footer */}
        <p className="text-center text-[9px] text-zinc-700 mt-2">
          Restaurant Hacienda · Carta Digital · Mesa {tableNumber}
        </p>
      </div>

      {/* ── Scroll to top ── */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-40 w-10 h-10 bg-amber-500 text-zinc-900 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/20 cursor-pointer active:scale-90 transition-all"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* ── Custom styles ── */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-bottom { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
        @keyframes slide-down {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
