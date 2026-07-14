import React, { useState, useEffect } from "react";
import { 
  RestaurantState, 
  User, 
  Table, 
  TableStatus, 
  OrderStatus, 
  OrderItemStatus, 
  Product, 
  PaymentMethod,
  OrderItem,
  SelectedItemModifier
} from "../types";
import { 
  Grid, 
  Clock, 
  Plus, 
  UserCheck, 
  Calculator, 
  DollarSign, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronLeft, 
  LogOut, 
  Bell, 
  Search, 
  Utensils, 
  Percent, 
  Users,
  Printer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { printThermalReceipt } from "./ThermalReceipt";

interface MozoViewProps {
  state: RestaurantState;
  onRefreshState: () => void;
  activeUser: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
}

export default function MozoView({ 
  state, 
  onRefreshState, 
  activeUser, 
  onLoginSuccess, 
  onLogout 
}: MozoViewProps) {
  
  // PIN Login state
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // UI state
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  
  // Modals
  const [isOpeningTable, setIsOpeningTable] = useState(false);
  const [openingGuestCount, setOpeningGuestCount] = useState(2);
  const [isAddingItems, setIsAddingItems] = useState(false);
  
  // Cart state for waiter adding items
  const [waiterCart, setWaiterCart] = useState<Array<{
    product: Product;
    quantity: number;
    notes: string;
    modifiers: SelectedItemModifier[];
  }>>([]);
  const [waiterSearchTerm, setWaiterSearchTerm] = useState("");
  const [waiterCategoryFilter, setWaiterCategoryFilter] = useState("all");

  // Billing modal
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [billingSplitType, setBillingSplitType] = useState<"equal" | "full" | "custom">("full");
  const [billingSplitParts, setBillingSplitParts] = useState(2);
  const [billingCustomAmount, setBillingCustomAmount] = useState(0);
  const [selectedPromoCode, setSelectedPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [tipPercent, setTipPercent] = useState(10); // 10% default
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [billingSuccess, setBillingSuccess] = useState(false);

  // Shift Management State
  const [isShiftControlOpen, setIsShiftControlOpen] = useState(false);
  const [shiftInitialCash, setShiftInitialCash] = useState(50000); // 50K CLP
  const [shiftFinalCash, setShiftFinalCash] = useState(0);

  // Error/Success banner
  const [bannerMsg, setBannerMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);


  // State is updated in real-time via Firestore onSnapshot in App.tsx
  // No polling needed — props update automatically when Firestore data changes

  // Live clock for elapsed time on occupied tables
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, []);


  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg(null), 3000);
  };

  // 1. PIN LOCK LOGIC
  const handlePinKeyPress = (num: string) => {
    if (pinInput.length < 4) {
      setPinInput(prev => {
        const next = prev + num;
        if (next.length === 4) {
          // Trigger PIN validation
          validatePin(next);
        }
        return next;
      });
    }
  };

  const handlePinBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const validatePin = async (pin: string) => {
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      if (res.ok) {
        const user = await res.json();
        onLoginSuccess(user);
        setPinInput("");
        setLoginError("");
        showBanner(`Bienvenido de vuelta, ${user.name}`);
      } else {
        const err = await res.json();
        setLoginError(err.error || "PIN inválido");
        setPinInput("");
      }
    } catch (e) {
      setLoginError("Error de conexión");
      setPinInput("");
    }
  };

  // 2. ACTIVE ORDER HELPERS
  const activeOrder = selectedTable
    ? state.orders.find(o => o.tableId === selectedTable.id && o.status !== OrderStatus.CLOSED)
    : null;

  // 3. TABLE LIFE CYCLE
  const handleOpenTableSubmit = async () => {
    if (!selectedTable) return;
    try {
      const res = await fetch(`/api/tables/${selectedTable.id}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          customerCount: openingGuestCount,
          waiterId: activeUser?.id
        })
      });
      if (res.ok) {
        setIsOpeningTable(false);
        showBanner("Mesa abierta con éxito.");
        onRefreshState();
        // Automatically select table to view
        const updatedState = state;
        const updatedTbl = updatedState.tables.find(t => t.id === selectedTable.id);
        if (updatedTbl) {
          updatedTbl.status = TableStatus.OCCUPIED;
          setSelectedTable({ ...updatedTbl });
        }
      }
    } catch (e) {
      showBanner("Error al conectar con el servidor", "error");
    }
  };

  // Submit new waiter added items to existing order
  const handleAddItemsToOrder = async () => {
    if (waiterCart.length === 0 || !activeOrder) return;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTable?.id,
          waiterId: activeUser?.id,
          isWaiter: true,
          items: waiterCart.map(it => ({
            productId: it.product.id,
            quantity: it.quantity,
            notes: it.notes,
            selectedModifiers: it.modifiers,
            tanda: it.product.categoryId === "c1" ? 1 : 2
          }))
        })
      });

      if (res.ok) {
        setWaiterCart([]);
        setIsAddingItems(false);
        showBanner("Productos agregados a la comanda.");
        onRefreshState();
      }
    } catch (e) {
      showBanner("Error de conexión", "error");
    }
  };

  // Kitchen direct submit (sends pending to kitchen and triggers ingredient deduction)
  const handleSendToKitchen = async () => {
    if (!activeOrder) return;
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/send-to-kitchen`, {
        method: "POST"
      });
      if (res.ok) {
        showBanner("Comanda enviada a Cocina.");
        onRefreshState();
      } else {
        const err = await res.json();
        showBanner(err.error || "No hay ítems pendientes.", "error");
      }
    } catch (e) {
      showBanner("Error de conexión", "error");
    }
  };

  // Change individual order item status
  const handleUpdateItemStatus = async (itemId: string, currentStatus: OrderItemStatus) => {
    if (!activeOrder) return;
    let nextStatus: OrderItemStatus;
    if (currentStatus === OrderItemStatus.PENDING) nextStatus = OrderItemStatus.PREPARING;
    else if (currentStatus === OrderItemStatus.PREPARING) nextStatus = OrderItemStatus.READY;
    else if (currentStatus === OrderItemStatus.READY) nextStatus = OrderItemStatus.DELIVERED;
    else return; // Already delivered

    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/items/${itemId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        onRefreshState();
      }
    } catch (e) {
      showBanner("Error al cambiar estado.", "error");
    }
  };

  // Approve a customer pending order
  const handleApproveOrder = async () => {
    if (!activeOrder) return;
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waiterId: activeUser?.id })
      });
      if (res.ok) {
        showBanner("Comanda del cliente aprobada con éxito.");
        onRefreshState();
      }
    } catch (e) {
      showBanner("Error al aprobar.", "error");
    }
  };

  // Resolve QR notifications
  const handleResolveNotification = async (notifId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notifId}/resolve`, {
        method: "POST"
      });
      if (res.ok) {
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 4. BILLING SUBMIT
  const handleApplyPromo = () => {
    const promo = state.promotions.find(p => p.code.toUpperCase() === selectedPromoCode.toUpperCase() && p.active);
    if (promo) {
      if (promo.type === "DISCOUNT") {
        setAppliedDiscount(promo.value);
        showBanner(`Cupón aplicado: ${promo.value}% de descuento.`);
      } else {
        showBanner("Cupón válido, se aplicará al finalizar.", "success");
      }
    } else {
      showBanner("Código de descuento no encontrado.", "error");
    }
  };

  const calculateActiveOrderTotal = () => {
    if (!activeOrder) return 0;
    return activeOrder.items.reduce((sum, item) => {
      const prod = state.products.find(p => p.id === item.productId);
      if (!prod) return sum;
      const modPrice = item.selectedModifiers.reduce((s, m) => s + m.extraPrice, 0);
      return sum + ((prod.price + modPrice) * item.quantity);
    }, 0);
  };

  const handleCloseBillSubmit = async () => {
    if (!activeOrder) return;
    const orderTotal = calculateActiveOrderTotal();
    const discountAmount = Math.round(orderTotal * (appliedDiscount / 100));
    const tipAmount = Math.round(orderTotal * (tipPercent / 100));
    const totalToPay = orderTotal - discountAmount + tipAmount;

    // Build split payments payload
    let paymentsPayload = [];
    if (billingSplitType === "equal") {
      const amountPerPart = Math.round(totalToPay / billingSplitParts);
      for (let i = 0; i < billingSplitParts; i++) {
        paymentsPayload.push({
          amount: amountPerPart,
          method: paymentMethod,
          tip: Math.round(tipAmount / billingSplitParts),
          discount: Math.round(discountAmount / billingSplitParts)
        });
      }
    } else if (billingSplitType === "custom") {
      paymentsPayload.push({
        amount: billingCustomAmount,
        method: paymentMethod,
        tip: tipAmount,
        discount: discountAmount
      });
      // remaining
      const remaining = totalToPay - billingCustomAmount;
      if (remaining > 0) {
        paymentsPayload.push({
          amount: remaining,
          method: PaymentMethod.CREDIT,
          tip: 0,
          discount: 0
        });
      }
    } else {
      paymentsPayload.push({
        amount: totalToPay,
        method: paymentMethod,
        tip: tipAmount,
        discount: discountAmount
      });
    }

    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: paymentsPayload,
          customerPhone: activeOrder.customerPhone || undefined,
          totalAmount: orderTotal,
          discount: discountAmount,
          tip: tipAmount
        })
      });

      if (res.ok) {
        setBillingSuccess(true);
        // Auto-print the receipt
        if (activeOrder) {
          printThermalReceipt({
            order: activeOrder,
            state,
            payments: paymentsPayload,
            waiterName: activeUser?.name,
          });
        }
        setTimeout(() => {
          setIsBillingOpen(false);
          setSelectedTable(null);
          setBillingSuccess(false);
          setAppliedDiscount(0);
          setSelectedPromoCode("");
          setTipPercent(10);
          onRefreshState();
        }, 5000); // Extended to 5s so user can see success + receipt prints
      }
    } catch (e) {
      showBanner("Error de conexión al cerrar la boleta", "error");
    }
  };

  // 5. SHIFTS CALLS
  const handleOpenShift = async () => {
    try {
      const res = await fetch("/api/shifts/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeUser?.id, initialCash: shiftInitialCash })
      });
      if (res.ok) {
        showBanner("Turno de caja abierto.");
        onRefreshState();
      }
    } catch (e) {
      showBanner("Error de conexión", "error");
    }
  };

  const handleCloseShift = async (shiftId: string) => {
    try {
      const res = await fetch("/api/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shiftId, finalCash: shiftFinalCash })
      });
      if (res.ok) {
        showBanner("Turno cerrado con éxito. Arqueo completado.");
        onRefreshState();
      }
    } catch (e) {
      showBanner("Error de conexión", "error");
    }
  };

  // Filter Catalog Waiter
  const waiterFilteredProducts = state.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(waiterSearchTerm.toLowerCase());
    const matchesCat = waiterCategoryFilter === "all" || p.categoryId === waiterCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Current active shift for activeUser
  const activeShift = state.shifts.find(s => s.userId === activeUser?.id && s.status === "OPEN");

  // Format Helper
  const formatCLP = (val: number) => "$" + Math.round(val).toLocaleString("es-CL");

  // RENDER SECURITY SCREEN IF NOT AUTHENTICATED
  if (!activeUser) {
    return (
      <div className="bg-zinc-950 min-h-screen flex flex-col items-center justify-center p-6 text-white" id="waiter-login-view">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <span className="text-amber-500 font-bold tracking-widest text-xs uppercase block text-center">Staff Terminal</span>
          <h2 className="text-2xl font-black mt-2 text-zinc-100 flex items-center gap-1.5 font-sans">
            <Utensils className="w-6 h-6 text-amber-500" /> POS Móvil Mozo
          </h2>
          <p className="text-zinc-500 text-xs text-center mt-1">Ingresa tu código PIN de 4 dígitos para ingresar al terminal.</p>

          {/* PIN circles indicator */}
          <div className="flex gap-4 my-8">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pinInput.length > idx 
                    ? "bg-amber-500 border-amber-500 scale-110 shadow-lg shadow-amber-500/20" 
                    : "border-zinc-700"
                }`}
              />
            ))}
          </div>

          {loginError && (
            <span className="text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl mb-4">
              {loginError}
            </span>
          )}

          {/* NUMPAD */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                onClick={() => handlePinKeyPress(num)}
                className="w-16 h-16 rounded-full bg-zinc-800/80 hover:bg-zinc-700 font-black text-xl flex items-center justify-center transition-all active:scale-90 border border-zinc-700/50 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handlePinBackspace}
              className="w-16 h-16 rounded-full bg-zinc-800/40 hover:bg-zinc-700 text-sm font-bold flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            >
              Borrar
            </button>
            <button
              onClick={() => handlePinKeyPress("0")}
              className="w-16 h-16 rounded-full bg-zinc-800/80 hover:bg-zinc-700 font-black text-xl flex items-center justify-center transition-all active:scale-90 border border-zinc-700/50 cursor-pointer"
            >
              0
            </button>
            <button
              onClick={() => validatePin(pinInput)}
              disabled={pinInput.length === 0}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 font-bold text-xs flex items-center justify-center transition-all active:scale-90 border border-emerald-500/50 cursor-pointer disabled:opacity-55 text-white"
            >
              Aceptar
            </button>
          </div>

          <div className="text-zinc-600 text-[10px] text-center mt-6">
            Si olvidaste tu PIN, solicita un reinicio a administración.
          </div>
        </div>
      </div>
    );
  }

  // RENDER WAITER CONSOLE
  // Dynamic zones extracted from actual table data
  const zones = Array.from(new Set(state.tables.map(t => t.zone))).sort();
  const currentZoneTables = selectedZone === "all" 
    ? state.tables 
    : state.tables.filter(t => t.zone === selectedZone);

  // Table status summary
  const tableSummary = {
    free: state.tables.filter(t => t.status === TableStatus.FREE).length,
    occupied: state.tables.filter(t => t.status === TableStatus.OCCUPIED).length,
    billRequested: state.tables.filter(t => t.status === TableStatus.BILL_REQUESTED).length,
    reserved: state.tables.filter(t => t.status === TableStatus.RESERVED).length,
  };

  const pendingNotifications = (state.notifications || []).filter(n => !n.resolved);

  return (
    <div className="bg-zinc-100 min-h-screen text-zinc-800 flex flex-col md:flex-row" id="mozo-main-layout">
      
      {/* Banner message */}
      <AnimatePresence>
        {bannerMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
              bannerMsg.type === "success" 
                ? "bg-emerald-800 border-emerald-700 text-white" 
                : "bg-red-800 border-red-700 text-white"
            }`}
          >
            {bannerMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{bannerMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT AREA: MAP AND NOTIFICATIONS */}
      <div className="flex-1 p-4 overflow-y-auto max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black block">Terminal POS</span>
            <h1 className="text-xl font-extrabold text-zinc-900 flex items-center gap-2">
              <Grid className="w-5 h-5 text-amber-500" /> Mapa de Mesas
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsShiftControlOpen(true)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeShift 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {activeShift ? "Turno Activo" : "Caja Cerrada (Abrir)"}
            </button>
            <button
              onClick={onLogout}
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS BAR */}
        {pendingNotifications.length > 0 && (
          <div className="bg-amber-500 text-zinc-950 p-4 rounded-2xl mb-6 shadow-md border border-amber-400">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4 animate-swing" /> Notificaciones de Clientes ({pendingNotifications.length})
            </span>
            <div className="mt-2.5 space-y-1.5">
              {pendingNotifications.map((notif) => (
                <div key={notif.id} className="bg-zinc-950 text-white p-3 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-extrabold text-amber-500">Mesa {notif.tableNumber}</span>
                    <span className="text-zinc-400 mx-1.5">|</span>
                    <span className="font-semibold text-zinc-100">
                      {notif.type === "CALL_WAITER" && "👋 Llama al Mozo"}
                      {notif.type === "REQUEST_BILL" && "💵 Pide la Cuenta"}
                      {notif.type === "NEW_ORDER" && "🍳 Nuevo pedido QR"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleResolveNotification(notif.id)}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-1 rounded-lg hover:shadow-sm cursor-pointer"
                  >
                    Atender
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATUS SUMMARY BAR */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" /> {tableSummary.free} Libres
          </div>
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" /> {tableSummary.occupied} Ocupadas
          </div>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" /> {tableSummary.billRequested} Piden Cuenta
          </div>
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" /> {tableSummary.reserved} Reservadas
          </div>
        </div>

        {/* ZONE SELECTOR - Dynamic from DB */}
        <div className="flex flex-wrap gap-1.5 mb-4 bg-zinc-200 p-1 rounded-xl w-max">
          <button
            onClick={() => setSelectedZone("all")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              selectedZone === "all" 
                ? "bg-white text-zinc-950 shadow-sm" 
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Todas ({state.tables.length})
          </button>
          {zones.map((zone) => {
            const zoneCount = state.tables.filter(t => t.zone === zone).length;
            return (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  selectedZone === zone 
                    ? "bg-white text-zinc-950 shadow-sm" 
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {zone} ({zoneCount})
              </button>
            );
          })}
        </div>

        {/* TABLES GRID (BENTO BOX MAP STYLE) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" id="mozo-table-grid">
          {currentZoneTables.map((tbl, idx) => {
            const isSelected = selectedTable?.id === tbl.id;
            const tableOrder = state.orders.find(o => o.tableId === tbl.id && o.status !== OrderStatus.CLOSED);

            // Calculate elapsed time for occupied tables
            let elapsedText = "";
            if (tableOrder && tbl.status === TableStatus.OCCUPIED) {
              const diffMs = currentTime.getTime() - new Date(tableOrder.createdAt).getTime();
              const diffMins = Math.floor(diffMs / 60000);
              if (diffMins < 60) {
                elapsedText = `${diffMins} min`;
              } else {
                const hrs = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                elapsedText = `${hrs}h ${mins}m`;
              }
            }

            // Get waiter name for this table's order
            const assignedWaiter = tableOrder?.waiterId 
              ? state.users.find(u => u.id === tableOrder.waiterId)
              : null;

            // Count active items
            const itemCount = tableOrder ? tableOrder.items.length : 0;

            // Determine background and text based on status
            let statusBg = "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50";
            let statusText = "Libre";
            let colorAccent = "bg-emerald-500";

            if (tbl.status === TableStatus.OCCUPIED) {
              statusBg = "bg-red-50 border-red-200 text-red-900 hover:bg-red-100";
              statusText = "Ocupada";
              colorAccent = "bg-red-500";
              if (tableOrder?.status === OrderStatus.PENDING_APPROVAL) {
                statusBg = "bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100";
                statusText = "Por aprobar QR";
                colorAccent = "bg-purple-500";
              }
            } else if (tbl.status === TableStatus.BILL_REQUESTED) {
              statusBg = "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100 animate-pulse";
              statusText = "Pide Cuenta";
              colorAccent = "bg-amber-500";
            } else if (tbl.status === TableStatus.RESERVED) {
              statusBg = "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100";
              statusText = "Reservada";
              colorAccent = "bg-blue-500";
            }

            return (
              <motion.button
                key={tbl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                onClick={() => {
                  setSelectedTable(tbl);
                  setIsOpeningTable(false);
                }}
                className={`border-2 rounded-2xl p-3.5 flex flex-col justify-between items-start text-left transition-all min-h-[130px] relative cursor-pointer ${
                  isSelected ? "border-zinc-900 ring-2 ring-amber-500/30 shadow-lg scale-[1.02]" : "hover:shadow-md"
                } ${statusBg}`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-black text-lg">Mesa {tbl.number}</span>
                  <div className="flex items-center gap-1.5">
                    {elapsedText && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        (tableOrder && (currentTime.getTime() - new Date(tableOrder.createdAt).getTime()) > 3600000)
                          ? "bg-red-200 text-red-800"
                          : "bg-zinc-200 text-zinc-600"
                      }`}>
                        ⏱ {elapsedText}
                      </span>
                    )}
                    <div className={`w-2.5 h-2.5 rounded-full ${colorAccent}`} />
                  </div>
                </div>
                <div className="w-full">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase">{statusText}</span>
                  <div className="flex justify-between items-end w-full mt-0.5">
                    <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {tbl.seats} asientos
                    </span>
                    {itemCount > 0 && (
                      <span className="text-[10px] font-bold bg-zinc-900 text-white px-1.5 py-0.5 rounded-md">
                        {itemCount} ítem{itemCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {assignedWaiter && (
                    <span className="text-[10px] text-zinc-400 font-semibold mt-1 block truncate">
                      👤 {assignedWaiter.name.replace(/ \(.*\)/, "")}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDEBAR: SELECTED TABLE DETAILS */}
      <div className="w-full md:w-[380px] bg-white border-l border-zinc-200 p-5 flex flex-col justify-between" id="waiter-table-panel">
        {selectedTable ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h2 className="font-extrabold text-lg text-zinc-900">Mesa {selectedTable.number}</h2>
                <span className="text-xs text-zinc-400 font-semibold">{selectedTable.zone}</span>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STATUS CARDS */}
            {selectedTable.status === TableStatus.FREE ? (
              <div className="space-y-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-950 text-sm">Mesa Disponible</h3>
                  <p className="text-xs text-zinc-400 mt-1">La mesa está vacía. Ábrela para empezar a tomar pedidos.</p>
                </div>
                <button
                  onClick={() => {
                    if (!activeShift) {
                      showBanner("Debes abrir la caja / turno de trabajo primero.", "error");
                      return;
                    }
                    setIsOpeningTable(true);
                  }}
                  className="w-full bg-zinc-950 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  Abrir Mesa / Comensales
                </button>

                {/* Opening Table Panel inside details */}
                {isOpeningTable && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mt-3 text-left space-y-3"
                  >
                    <span className="font-bold text-xs text-zinc-900 block">Configurar Mesa</span>
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 block uppercase">Cantidad de comensales</label>
                      <div className="flex items-center gap-3 mt-1 bg-white p-1 rounded-lg border border-zinc-200 w-max">
                        <button
                          onClick={() => setOpeningGuestCount(q => Math.max(1, q - 1))}
                          className="bg-zinc-100 p-1 rounded hover:bg-zinc-200"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-sm px-2 text-zinc-900">{openingGuestCount}</span>
                        <button
                          onClick={() => setOpeningGuestCount(q => q + 1)}
                          className="bg-zinc-100 p-1 rounded hover:bg-zinc-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenTableSubmit}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black py-2.5 rounded-xl text-xs transition-colors"
                    >
                      Abrir Mesa Ahora
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              /* OCCUPIED DETAILS PANEL */
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 flex justify-between items-center mb-4 text-xs">
                    <div>
                      <span className="text-zinc-500 font-semibold block">Comanda:</span>
                      <span className="font-bold text-zinc-900">
                        {activeOrder ? activeOrder.id : "Sin comanda"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-semibold block">Comensales:</span>
                      <span className="font-bold text-zinc-900">
                        {activeOrder ? activeOrder.customerCount : 0} pers.
                      </span>
                    </div>
                  </div>

                  {/* APPROVAL ROW */}
                  {activeOrder && activeOrder.status === OrderStatus.PENDING_APPROVAL && (
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 mb-4 flex flex-col gap-2">
                      <div className="flex gap-1.5 items-start">
                        <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-purple-900 text-xs block">Pedido QR del Cliente Pendiente</span>
                          <p className="text-[10px] text-purple-600">Revisa la comanda del cliente y pruébala para enviarla a cocina.</p>
                        </div>
                      </div>
                      <button
                        onClick={handleApproveOrder}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg text-xs"
                      >
                        Aprobar Pedido Cliente
                      </button>
                    </div>
                  )}

                  {/* PRODUCTS LIST */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-zinc-400">
                      <span>Platos / Bebidas</span>
                      <span>Estado</span>
                    </div>

                    {activeOrder && activeOrder.items.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {activeOrder.items.map((it) => {
                          const prod = state.products.find(p => p.id === it.productId);
                          if (!prod) return null;
                          return (
                            <div key={it.id} className="border-b border-zinc-100 pb-2 text-xs flex justify-between items-start gap-2">
                              <div>
                                <span className="font-extrabold text-zinc-900">{it.quantity}x {prod.name}</span>
                                {it.selectedModifiers.map(m => (
                                  <span key={m.optionId} className="text-zinc-400 text-[10px] block italic ml-2">
                                    + {m.name}
                                  </span>
                                ))}
                                {it.notes && (
                                  <span className="bg-amber-50 border border-amber-100 text-[10px] text-amber-800 px-1.5 py-0.5 rounded block mt-1">
                                    "{it.notes}"
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => handleUpdateItemStatus(it.id, it.status)}
                                className={`px-2 py-1 rounded-md font-bold text-[10px] border transition-all cursor-pointer ${
                                  it.status === OrderItemStatus.PENDING
                                    ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-amber-100"
                                    : it.status === OrderItemStatus.PREPARING
                                    ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-emerald-100"
                                    : it.status === OrderItemStatus.READY
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 animate-bounce"
                                    : "bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed"
                                }`}
                              >
                                {it.status === OrderItemStatus.PENDING && "Pendiente"}
                                {it.status === OrderItemStatus.PREPARING && "Cocinando"}
                                {it.status === OrderItemStatus.READY && "Entregar"}
                                {it.status === OrderItemStatus.DELIVERED && "Servido ✔"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-xs italic block py-4 text-center">La comanda está vacía. Agrega productos.</span>
                    )}
                  </div>

                  {/* COMMAND ACTIONS */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsAddingItems(true)}
                      className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 font-bold p-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Ítem
                    </button>
                    <button
                      onClick={handleSendToKitchen}
                      className="bg-zinc-950 hover:bg-amber-600 text-white font-bold p-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    >
                      Enviar a Cocina
                    </button>
                  </div>
                </div>

                {/* BOTTOM CLOSING ZONE */}
                {activeOrder && (
                  <div className="border-t border-zinc-100 pt-4 mt-6 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-zinc-600">Total mesa:</span>
                      <span className="font-black text-zinc-950 text-base">
                        {formatCLP(calculateActiveOrderTotal())}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setIsBillingOpen(true);
                        setBillingSplitParts(activeOrder.customerCount || 2);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Calculator className="w-4 h-4" /> Cobrar / Cerrar Mesa
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 text-zinc-400">
            <Utensils className="w-12 h-12 text-zinc-200 mb-3" />
            <h3 className="font-bold text-zinc-700 text-sm">Ninguna Mesa Seleccionada</h3>
            <p className="text-xs text-zinc-400 max-w-[200px] mt-1">Selecciona una mesa del plano visual para operar sobre ella.</p>
          </div>
        )}
      </div>

      {/* MODAL: ADD ITEMS (PRODUCT CATALOG) */}
      <AnimatePresence>
        {isAddingItems && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="font-bold text-zinc-900 text-sm">Catálogo de Productos - Mesa {selectedTable?.number}</h3>
                <button
                  onClick={() => {
                    setIsAddingItems(false);
                    setWaiterCart([]);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 flex gap-4 overflow-hidden flex-1 flex-col sm:flex-row">
                
                {/* Catalog list */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                  
                  {/* Search and Category filter */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar plato..."
                        value={waiterSearchTerm}
                        onChange={(e) => setWaiterSearchTerm(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2 pl-9 pr-4 text-xs text-zinc-900 focus:outline-none"
                      />
                    </div>
                    <select
                      value={waiterCategoryFilter}
                      onChange={(e) => setWaiterCategoryFilter(e.target.value)}
                      className="bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-xs text-zinc-700"
                    >
                      <option value="all">Categorías</option>
                      {state.categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* List of items */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {waiterFilteredProducts.map((p) => {
                      const inCartQty = waiterCart.find(it => it.product.id === p.id)?.quantity || 0;
                      return (
                        <div key={p.id} className="border border-zinc-100 rounded-xl p-2.5 flex justify-between items-center hover:bg-zinc-50 text-xs">
                          <div>
                            <span className="font-bold text-zinc-900 block">{p.name}</span>
                            <span className="text-amber-600 font-extrabold">{formatCLP(p.price)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {inCartQty > 0 ? (
                              <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-md border border-zinc-200">
                                <button
                                  onClick={() => setWaiterCart(prev => {
                                    const c = [...prev];
                                    const idx = c.findIndex(it => it.product.id === p.id);
                                    if (c[idx].quantity > 1) {
                                      c[idx].quantity--;
                                    } else {
                                      c.splice(idx, 1);
                                    }
                                    return c;
                                  })}
                                  className="bg-white px-1.5 py-0.5 rounded font-bold text-zinc-600"
                                >
                                  -
                                </button>
                                <span className="font-extrabold text-zinc-900 text-xs px-1">{inCartQty}</span>
                                <button
                                  onClick={() => setWaiterCart(prev => {
                                    const c = [...prev];
                                    const idx = c.findIndex(it => it.product.id === p.id);
                                    c[idx].quantity++;
                                    return c;
                                  })}
                                  className="bg-white px-1.5 py-0.5 rounded font-bold text-zinc-600"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setWaiterCart(prev => [
                                  ...prev,
                                  { product: p, quantity: 1, notes: "", modifiers: [] }
                                ])}
                                className="bg-zinc-900 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                              >
                                Agregar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Commanda cart panel */}
                <div className="w-full sm:w-64 bg-zinc-50 rounded-xl border border-zinc-200 p-3.5 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-xs text-zinc-900 block mb-3 border-b border-zinc-200 pb-1.5">Mesa {selectedTable?.number} Comanda</span>
                    <div className="space-y-2 overflow-y-auto max-h-[250px]">
                      {waiterCart.map((item, index) => (
                        <div key={index} className="flex justify-between items-start text-xs border-b border-zinc-200/50 pb-2">
                          <div>
                            <span className="font-bold text-zinc-800">{item.quantity}x {item.product.name}</span>
                            <input
                              type="text"
                              placeholder="Notas..."
                              value={item.notes}
                              onChange={(e) => setWaiterCart(prev => {
                                const c = [...prev];
                                c[index].notes = e.target.value;
                                return c;
                              })}
                              className="w-full bg-white border border-zinc-200 text-[10px] text-zinc-800 p-1 rounded mt-1 focus:outline-none"
                            />
                          </div>
                          <span className="font-extrabold text-zinc-900 text-right">{formatCLP(item.product.price * item.quantity)}</span>
                        </div>
                      ))}
                      {waiterCart.length === 0 && (
                        <span className="text-zinc-400 italic text-[11px] block py-8 text-center">No has agregado nada aún.</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-200 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-500">Total Comanda:</span>
                      <span className="font-extrabold text-zinc-900 text-sm">
                        {formatCLP(waiterCart.reduce((sum, it) => sum + (it.product.price * it.quantity), 0))}
                      </span>
                    </div>
                    <button
                      onClick={handleAddItemsToOrder}
                      disabled={waiterCart.length === 0}
                      className="w-full bg-zinc-900 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl text-xs shadow transition-colors cursor-pointer"
                    >
                      Confirmar Comanda
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BILLING & CHECKOUT */}
      <AnimatePresence>
        {isBillingOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div>
                  <h3 className="font-black text-zinc-900 text-base">Cerrar Cuenta Mesa {selectedTable?.number}</h3>
                  <span className="text-zinc-400 text-[10px] font-semibold uppercase">Hacienda Pago Seguros</span>
                </div>
                <button
                  onClick={() => setIsBillingOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {billingSuccess ? (
                  <div className="py-10 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-zinc-950 text-base">¡Pago Procesado de Forma Exitosa!</h4>
                      <p className="text-zinc-400 text-xs mt-1">La mesa ha sido liberada y los puntos de fidelización fueron cargados.</p>
                    </div>
                    {activeOrder && (
                      <button
                        onClick={() =>
                          printThermalReceipt({
                            order: activeOrder,
                            state,
                            payments: [{
                              amount: calculateActiveOrderTotal(),
                              method: paymentMethod,
                              tip: calculateActiveOrderTotal() * (tipPercent / 100),
                              discount: calculateActiveOrderTotal() * (appliedDiscount / 100),
                            }],
                            waiterName: activeUser?.name,
                          })
                        }
                        className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all cursor-pointer mx-auto"
                      >
                        <Printer className="w-4 h-4" />
                        Reimprimir Boleta
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Bill breakdown summary */}
                    <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-bold">Consumo de mesa</span>
                        <span className="text-zinc-900 font-extrabold">{formatCLP(calculateActiveOrderTotal())}</span>
                      </div>
                      
                      {appliedDiscount > 0 && (
                        <div className="flex justify-between text-red-500">
                          <span className="font-bold">Descuento ({appliedDiscount}%)</span>
                          <span>-{formatCLP(calculateActiveOrderTotal() * (appliedDiscount / 100))}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-bold">Propina sugerida ({tipPercent}%)</span>
                        <span className="text-zinc-900 font-extrabold">{formatCLP(calculateActiveOrderTotal() * (tipPercent / 100))}</span>
                      </div>

                      <div className="border-t border-zinc-200/50 pt-2 flex justify-between font-black text-sm text-zinc-950">
                        <span>Total Final a Pagar</span>
                        <span>
                          {formatCLP(
                            calculateActiveOrderTotal() - 
                            Math.round(calculateActiveOrderTotal() * (appliedDiscount / 100)) + 
                            Math.round(calculateActiveOrderTotal() * (tipPercent / 100))
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Split selector */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Dividir Cuenta</span>
                      <div className="grid grid-cols-3 gap-2 bg-zinc-100 p-1 rounded-xl">
                        <button
                          onClick={() => setBillingSplitType("full")}
                          className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            billingSplitType === "full" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                          }`}
                        >
                          Individual
                        </button>
                        <button
                          onClick={() => setBillingSplitType("equal")}
                          className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            billingSplitType === "equal" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                          }`}
                        >
                          Partes Iguales
                        </button>
                        <button
                          onClick={() => setBillingSplitType("custom")}
                          className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            billingSplitType === "custom" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                          }`}
                        >
                          Monto Libre
                        </button>
                      </div>

                      {/* Equal parts options */}
                      {billingSplitType === "equal" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="flex items-center gap-4 bg-zinc-50 border border-zinc-100 rounded-2xl p-3 text-xs"
                        >
                          <div className="flex-1">
                            <span className="text-zinc-500 font-semibold block">Partes:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <button onClick={() => setBillingSplitParts(p => Math.max(2, p - 1))} className="bg-zinc-200 hover:bg-zinc-300 p-1.5 rounded text-zinc-700 font-bold">-</button>
                              <span className="font-extrabold text-zinc-900 px-1 text-sm">{billingSplitParts}</span>
                              <button onClick={() => setBillingSplitParts(p => p + 1)} className="bg-zinc-200 hover:bg-zinc-300 p-1.5 rounded text-zinc-700 font-bold">+</button>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-400 block font-semibold">Monto por persona:</span>
                            <span className="text-zinc-900 font-black text-sm">
                              {formatCLP(
                                (calculateActiveOrderTotal() - 
                                Math.round(calculateActiveOrderTotal() * (appliedDiscount / 100)) + 
                                Math.round(calculateActiveOrderTotal() * (tipPercent / 100))) / billingSplitParts
                              )}
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* Custom Amount Options */}
                      {billingSplitType === "custom" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-1.5"
                        >
                          <label className="text-[10px] font-black text-zinc-400 block uppercase">Monto de cobro libre (CLP)</label>
                          <div className="relative">
                            <DollarSign className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="number"
                              placeholder="Ej. 10000"
                              value={billingCustomAmount || ""}
                              onChange={(e) => setBillingCustomAmount(Number(e.target.value))}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-8 pr-4 text-xs text-zinc-900 focus:outline-none"
                            />
                          </div>
                          <span className="text-[10px] text-zinc-400 block">Restante se cargará a un método secundario.</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Tip configurations */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Propina Mozo (10% sugerido)</span>
                      <div className="flex gap-2">
                        {[0, 10, 15, 20].map((t) => (
                          <button
                            key={t}
                            onClick={() => setTipPercent(t)}
                            className={`flex-1 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              tipPercent === t 
                                ? "bg-amber-100 border-amber-300 text-amber-900" 
                                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                            }`}
                          >
                            {t}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Promo Codes */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Aplicar Cupón</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="BIENVENIDO, DIADELMOZO"
                          value={selectedPromoCode}
                          onChange={(e) => setSelectedPromoCode(e.target.value)}
                          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-900 uppercase focus:outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={handleApplyPromo}
                          className="bg-zinc-900 hover:bg-amber-600 text-white font-bold px-4 rounded-xl text-xs cursor-pointer"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>

                    {/* Payment methods */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Método de Pago</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: PaymentMethod.CASH, name: "💵 Efectivo" },
                          { id: PaymentMethod.DEBIT, name: "💳 Débito" },
                          { id: PaymentMethod.CREDIT, name: "💳 Crédito" },
                          { id: PaymentMethod.TRANSFER, name: "🏦 Transferencia" },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setPaymentMethod(m.id)}
                            className={`p-3 border rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                              paymentMethod === m.id 
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900" 
                                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                            }`}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Actions Footer */}
              {!billingSuccess && (
                <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setIsBillingOpen(false)}
                    className="flex-1 py-3 text-zinc-500 hover:text-zinc-700 font-bold text-xs cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCloseBillSubmit}
                    className="flex-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Confirmar Cobro
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHIFT CONTROL MODAL */}
      <AnimatePresence>
        {isShiftControlOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="font-bold text-zinc-900 text-sm">Control de Turnos de Caja</h3>
                <button onClick={() => setIsShiftControlOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {activeShift ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-xs space-y-2">
                      <span className="font-bold text-emerald-800 block">✓ Turno de Trabajo Activo</span>
                      <p className="text-zinc-500">Iniciado por: <strong>{activeUser?.name}</strong></p>
                      <p className="text-zinc-500">Fecha de apertura: <strong>{new Date(activeShift.openedAt).toLocaleTimeString()}</strong></p>
                      <p className="text-zinc-500 font-bold">Caja de inicio: <strong>{formatCLP(activeShift.initialCash)}</strong></p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 block uppercase">Arqueo / Caja final (CLP)</label>
                      <input
                        type="number"
                        placeholder="Ej. 125000"
                        value={shiftFinalCash || ""}
                        onChange={(e) => setShiftFinalCash(Number(e.target.value))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => {
                        handleCloseShift(activeShift.id);
                        setIsShiftControlOpen(false);
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-colors"
                    >
                      Cerrar Turno de Trabajo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs">
                      <span className="font-bold text-red-800 block">⚠️ Turno Cerrado</span>
                      <p className="text-zinc-500 mt-1">Debes iniciar un turno de caja con efectivo de fondo para poder abrir mesas y registrar cobros.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 block uppercase font-sans">Efectivo inicial de fondo (CLP)</label>
                      <input
                        type="number"
                        value={shiftInitialCash}
                        onChange={(e) => setShiftInitialCash(Number(e.target.value))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => {
                        handleOpenShift();
                        setIsShiftControlOpen(false);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                    >
                      Abrir Turno de Caja
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
