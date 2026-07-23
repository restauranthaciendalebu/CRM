import React, { useState, useEffect, useRef } from "react";
import { playWaiterCallSound, setupAudioUnlock } from "../audioUtils";
import { 
  RestaurantState, 
  User, 
  Table, 
  TableStatus, 
  OrderStatus, 
  OrderItemStatus, 
  Product, 
  PaymentMethod,
  Payment,
  OrderItem,
  SelectedItemModifier,
  Reservation,
  ReservationStatus
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
  Printer,
  ReceiptText,
  Trash2,
  Minus,
  Pencil,
  CalendarDays,
  Phone,
  BookOpen,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { printThermalReceipt } from "./ThermalReceipt";
import { isDirectServiceProduct } from "../orderUtils";
import AddTableModal from "./AddTableModal";
import WaiterReceiptHistory from "./WaiterReceiptHistory";
import { allocateRemainingAdjustment, getNextPaymentAmount, getRemainingBalance } from "../billingUtils";

interface MozoViewProps {
  state: RestaurantState;
  onRefreshState: () => void;
  activeUser: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
}

const isCookingItemStatus = (status: OrderItemStatus) =>
  status === OrderItemStatus.SENT_TO_KITCHEN ||
  status === OrderItemStatus.RECEIVED ||
  status === OrderItemStatus.PREPARING;

export default function MozoView({ 
  state, 
  onRefreshState, 
  activeUser, 
  onLoginSuccess, 
  onLogout 
}: MozoViewProps) {

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
    adjustmentType: "extra" | "discount";
    adjustmentValueType: "amount" | "percent";
    adjustmentAmount: number;
    adjustmentLabel: string;
  }>>([]);
  const [waiterSearchTerm, setWaiterSearchTerm] = useState("");
  const [waiterCategoryFilter, setWaiterCategoryFilter] = useState("all");
  const [editingOrderItemId, setEditingOrderItemId] = useState<string | null>(null);
  const [editingOrderItemReason, setEditingOrderItemReason] = useState("");
  const [pendingOrderActionIds, setPendingOrderActionIds] = useState<string[]>([]);
  const [isSendingKitchen, setIsSendingKitchen] = useState(false);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isReceiptHistoryOpen, setIsReceiptHistoryOpen] = useState(false);
  const [isUpdatingGuestCount, setIsUpdatingGuestCount] = useState(false);

  // Billing modal
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [billingSplitType, setBillingSplitType] = useState<"equal" | "full" | "custom">("full");
  const [billingSplitParts, setBillingSplitParts] = useState(2);
  const [billingCustomAmount, setBillingCustomAmount] = useState(0);
  const [selectedPromoCode, setSelectedPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [tipPercent, setTipPercent] = useState(10); // 10% default
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [billingCreditCustomerId, setBillingCreditCustomerId] = useState("");
  const [billingSuccess, setBillingSuccess] = useState(false);
  const [lastBillingPayments, setLastBillingPayments] = useState<Payment[]>([]);
  const [lastBillingOrderId, setLastBillingOrderId] = useState("");
  const [billingRemainingAfterPayment, setBillingRemainingAfterPayment] = useState(0);
  const [billingClosedAfterPayment, setBillingClosedAfterPayment] = useState(false);

  // Shift Management State
  const [isShiftControlOpen, setIsShiftControlOpen] = useState(false);
  const [shiftInitialCash, setShiftInitialCash] = useState(50000); // 50K CLP
  const [shiftFinalCash, setShiftFinalCash] = useState(0);

  // Error/Success banner
  const [bannerMsg, setBannerMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Reservation state
  const [isReservingTable, setIsReservingTable] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [resName, setResName] = useState("");
  const [resPhone, setResPhone] = useState("");
  const [resDate, setResDate] = useState("");
  const [resTime, setResTime] = useState("");
  const [resGuests, setResGuests] = useState(2);
  const [resNotes, setResNotes] = useState("");
  const [resAdvance, setResAdvance] = useState(0);
  const [resAdvanceMethod, setResAdvanceMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [isSavingReservation, setIsSavingReservation] = useState(false);
  const [resItems, setResItems] = useState<OrderItem[]>([]);
  const [showResItemPicker, setShowResItemPicker] = useState(false);
  const [resItemSearch, setResItemSearch] = useState("");
  const [resItemCategory, setResItemCategory] = useState("all");



  // State is updated in real-time via Firestore onSnapshot in App.tsx
  // No polling needed — props update automatically when Firestore data changes

  // Live clock for elapsed time on occupied tables
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedTable || window.matchMedia("(min-width: 768px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedTable]);

  // Audio chime & haptic vibration when customer calls waiter or requests bill
  const prevUnresolvedNotifIdsRef = useRef<string[]>([]);
  useEffect(() => {
    setupAudioUnlock();
    const currentUnresolved = (state.notifications || [])
      .filter(n => !n.resolved)
      .map(n => n.id);

    const hasNewNotif = currentUnresolved.some(id => !prevUnresolvedNotifIdsRef.current.includes(id));
    if (hasNewNotif && prevUnresolvedNotifIdsRef.current.length > 0) {
      playWaiterCallSound();
    }
    prevUnresolvedNotifIdsRef.current = currentUnresolved;
  }, [state.notifications]);


  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg(null), 3000);
  };

  // Firestore direct mode already updates the screen through onSnapshot.
  // Keep the manual refresh only for the server/polling deployment.
  const refreshStateIfNeeded = () => {
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API !== "true") {
      onRefreshState();
    }
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
  const billingOrder = activeOrder || (lastBillingOrderId
    ? state.orders.find((order) => order.id === lastBillingOrderId)
    : null);
  const activeOrderPayments = billingOrder
    ? state.payments.filter((payment) => payment.orderId === billingOrder.id)
    : [];
  const activeOrderPaid = activeOrderPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const activeOrderHasPayments = Boolean(activeOrder && state.payments.some((payment) => payment.orderId === activeOrder.id));
  const hasPendingKitchenItems = activeOrder?.items.some((it) => it.status === OrderItemStatus.PENDING) ?? false;
  const canBillActiveOrder = Boolean(
    activeOrder?.items.length && activeOrder.items.every((item) =>
      item.status === OrderItemStatus.READY || item.status === OrderItemStatus.DELIVERED
    )
  );
  const authorizedCreditCustomers = state.customers.filter((c) => c.isCreditAuthorized);
  const selectedBillingCreditCustomer = authorizedCreditCustomers.find((c) => c.id === billingCreditCustomerId);

  const openAddItemsModal = () => {
    setEditingOrderItemId(null);
    setEditingOrderItemReason("");
    setWaiterCart([]);
    setWaiterSearchTerm("");
    setWaiterCategoryFilter("all");
    setIsAddingItems(true);
  };

  const openEditItemModal = (item: OrderItem, product: Product) => {
    if (activeOrderHasPayments) {
      showBanner("La comanda ya tiene un pago o una boleta emitida y no puede modificarse.", "error");
      return;
    }
    const reason = item.status === OrderItemStatus.PENDING
      ? "Corrección antes de enviar a cocina"
      : window.prompt("Indica el motivo del cambio (por ejemplo: cliente cambió de opinión):", "")?.trim();
    if (!reason) {
      if (item.status !== OrderItemStatus.PENDING) showBanner("Debes indicar el motivo del cambio.", "error");
      return;
    }
    setEditingOrderItemId(item.id);
    setEditingOrderItemReason(reason);
    setWaiterCart([{
      product,
      quantity: item.quantity,
      notes: item.notes || "",
      modifiers: [...(item.selectedModifiers || [])],
      adjustmentType: "extra",
      adjustmentValueType: "amount",
      adjustmentAmount: 0,
      adjustmentLabel: "",
    }]);
    setWaiterSearchTerm("");
    setWaiterCategoryFilter("all");
    setIsAddingItems(true);
  };

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
        setOpeningGuestCount(2);
        showBanner("Mesa abierta con éxito.");
        refreshStateIfNeeded();
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

  // ---- RESERVATION HANDLERS ----
  const resetReservationForm = () => {
    setResName("");
    setResPhone("");
    setResDate("");
    setResTime("");
    setResGuests(2);
    setResNotes("");
    setResAdvance(0);
    setResAdvanceMethod(PaymentMethod.TRANSFER);
    setResItems([]);
    setShowResItemPicker(false);
    setResItemSearch("");
    setResItemCategory("all");
    setEditingReservation(null);
    setIsReservingTable(false);
  };

  const handleSaveReservation = async () => {
    if (!selectedTable) return;
    const finalName = resName.trim() || `Reserva Mesa ${selectedTable.number}`;
    const targetDate = resDate || new Date().toISOString().split("T")[0];
    const targetTime = resTime || "20:00";
    setIsSavingReservation(true);
    const dateTime = `${targetDate}T${targetTime}:00`;
    const payload: any = {
      customerName: finalName,
      customerPhone: resPhone.trim(),
      customerCount: resGuests || 1,
      dateTime,
      tableId: selectedTable.id,
      notes: resNotes.trim(),
      advancePayment: resAdvance || 0,
      advancePaymentMethod: resAdvance > 0 ? resAdvanceMethod : undefined,
      items: resItems,
    };
    if (editingReservation) {
      payload.id = editingReservation.id;
    }

    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      await applyDirectStateUpdate((nextState) => {
        if (editingReservation) {
          const r = nextState.reservations.find(res => res.id === editingReservation.id);
          if (r) {
            r.customerName = payload.customerName;
            r.customerPhone = payload.customerPhone;
            r.customerCount = payload.customerCount;
            r.dateTime = dateTime;
            r.notes = payload.notes;
            r.advancePayment = resAdvance;
            if (resAdvance > 0) r.advancePaymentMethod = resAdvanceMethod;
            r.items = resItems;
          }
        } else {
          const newRes: Reservation = {
            id: "res_" + Math.random().toString(36).substring(2, 11),
            customerName: payload.customerName,
            customerPhone: payload.customerPhone,
            customerCount: payload.customerCount,
            dateTime,
            tableId: selectedTable.id,
            notes: payload.notes,
            status: ReservationStatus.PENDING,
            advancePayment: resAdvance,
            advancePaymentMethod: resAdvance > 0 ? resAdvanceMethod : undefined,
            items: resItems,
          };
          nextState.reservations.push(newRes);
          const table = nextState.tables.find(t => t.id === selectedTable.id);
          if (table) table.status = TableStatus.RESERVED;
        }
      });
    }

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showBanner(editingReservation ? "Reserva actualizada." : "Reserva creada con éxito.");
        resetReservationForm();
        refreshStateIfNeeded();
        // Update local table to show RESERVED immediately
        if (!editingReservation) {
          const updatedTbl = state.tables.find(t => t.id === selectedTable.id);
          if (updatedTbl) {
            updatedTbl.status = TableStatus.RESERVED;
            setSelectedTable({ ...updatedTbl });
          }
        }
      } else {
        showBanner("Error al guardar la reserva.", "error");
        if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") await refreshDirectState();
      }
    } catch (e) {
      showBanner("Error de conexión al guardar reserva.", "error");
      if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") await refreshDirectState();
    } finally {
      setIsSavingReservation(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      await applyDirectStateUpdate((nextState) => {
        const r = nextState.reservations.find(res => res.id === reservationId);
        if (r) {
          if (r.tableId) {
            const table = nextState.tables.find(t => t.id === r.tableId);
            if (table && table.status === TableStatus.RESERVED) table.status = TableStatus.FREE;
          }
          r.status = ReservationStatus.CANCELLED;
        }
      });
    }
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, { method: "DELETE" });
      if (res.ok) {
        showBanner("Reserva cancelada.");
        refreshStateIfNeeded();
        if (selectedTable) {
          const updatedTbl = state.tables.find(t => t.id === selectedTable.id);
          if (updatedTbl) {
            updatedTbl.status = TableStatus.FREE;
            setSelectedTable({ ...updatedTbl });
          }
        }
      } else {
        showBanner("Error al cancelar reserva.", "error");
        if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") await refreshDirectState();
      }
    } catch (e) {
      showBanner("Error de conexión.", "error");
      if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") await refreshDirectState();
    }
  };

  const handleArriveReservation = async (reservation: Reservation) => {
    if (!selectedTable) return;
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      await applyDirectStateUpdate((nextState) => {
        const r = nextState.reservations.find(res => res.id === reservation.id);
        if (r) {
          r.status = ReservationStatus.ARRIVED;
          const table = nextState.tables.find(t => t.id === selectedTable.id);
          if (table) {
            table.status = TableStatus.OCCUPIED;
            const newOrder = {
              id: "o_" + Math.random().toString(36).substring(2, 11),
              tableId: selectedTable.id,
              status: OrderStatus.PREPARING,
              customerCount: r.customerCount,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              items: Array.isArray(r.items) ? r.items.map(it => ({
                ...it,
                id: "item_" + Math.random().toString(36).substring(2, 11),
                status: OrderItemStatus.SENT_TO_KITCHEN
              })) : [],
              customerPhone: r.customerPhone
            };
            nextState.orders.push(newOrder);
          }
        }
      });
    }
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reservation.id,
          customerName: reservation.customerName,
          customerPhone: reservation.customerPhone,
          customerCount: reservation.customerCount,
          dateTime: reservation.dateTime,
          tableId: selectedTable.id,
          notes: reservation.notes,
          status: ReservationStatus.ARRIVED,
          items: reservation.items || [],
        }),
      });
      if (res.ok) {
        showBanner(`¡${reservation.customerName} ha llegado! Mesa abierta.`);
        refreshStateIfNeeded();
        const updatedTbl = state.tables.find(t => t.id === selectedTable.id);
        if (updatedTbl) {
          updatedTbl.status = TableStatus.OCCUPIED;
          setSelectedTable({ ...updatedTbl });
        }
      }
    } catch (e) {
      showBanner("Error al registrar llegada.", "error");
      if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") await refreshDirectState();
    }
  };

  const openEditReservation = (reservation: Reservation) => {
    setResName(reservation.customerName);
    setResPhone(reservation.customerPhone);
    const dt = new Date(reservation.dateTime);
    setResDate(reservation.dateTime.split("T")[0]);
    const h = dt.getHours().toString().padStart(2, "0");
    const m = dt.getMinutes().toString().padStart(2, "0");
    setResTime(`${h}:${m}`);
    setResGuests(reservation.customerCount);
    setResNotes(reservation.notes || "");
    setResAdvance(reservation.advancePayment || 0);
    setResAdvanceMethod(reservation.advancePaymentMethod || PaymentMethod.TRANSFER);
    setResItems(reservation.items || []);
    setEditingReservation(reservation);
    setIsReservingTable(true);
  };

  const handleUpdateGuestCount = async (nextCount: number) => {
    if (!activeOrder || isUpdatingGuestCount || nextCount < 1 || nextCount > 30) return;
    setIsUpdatingGuestCount(true);
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      await applyDirectStateUpdate((nextState) => {
        const order = nextState.orders.find((candidate) => candidate.id === activeOrder.id);
        if (order) order.customerCount = nextCount;
      });
    }
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/customer-count`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerCount: nextCount, userId: activeUser?.id }),
      });
      if (!res.ok) {
        const error = await res.json();
        if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") await refreshDirectState();
        showBanner(error.error || "No se pudo actualizar los comensales.", "error");
      } else {
        showBanner(`Mesa actualizada a ${nextCount} comensales.`);
        refreshStateIfNeeded();
      }
    } catch {
      if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") await refreshDirectState();
      showBanner("Error al actualizar los comensales.", "error");
    } finally {
      setIsUpdatingGuestCount(false);
    }
  };

  const getWaiterCartAdjustmentValue = (item: (typeof waiterCart)[number]) => {
    const value = Math.max(0, Number(item.adjustmentAmount) || 0);
    if (item.adjustmentValueType === "percent") {
      return Math.min(value, item.adjustmentType === "discount" ? 100 : 500);
    }
    return item.adjustmentType === "discount" ? Math.min(value, item.product.price) : value;
  };

  const getWaiterCartAdjustment = (item: (typeof waiterCart)[number]) => {
    const value = getWaiterCartAdjustmentValue(item);
    const amount = Math.round(
      item.adjustmentValueType === "percent"
        ? item.product.price * (value / 100)
        : value
    );
    return item.adjustmentType === "discount" ? -amount : amount;
  };

  const getWaiterCartUnitPrice = (item: (typeof waiterCart)[number]) =>
    Math.max(0, item.product.price + item.modifiers.reduce((sum, modifier) => sum + modifier.extraPrice, 0) + getWaiterCartAdjustment(item));

  const createOrderItemPayload = (item: (typeof waiterCart)[number], index: number) => {
    const adjustment = getWaiterCartAdjustment(item);
    const adjustmentValue = getWaiterCartAdjustmentValue(item);
    const adjustmentTypeLabel = adjustment > 0 ? "Extra" : "Descuento";
    const adjustmentValueLabel = item.adjustmentValueType === "percent" ? ` ${adjustmentValue}%` : "";
    const customModifier: SelectedItemModifier[] = adjustment !== 0 ? [{
      modifierId: "waiter_price_adjustment",
      optionId: `waiter_adjustment_${Date.now()}_${index}`,
      name: `${adjustmentTypeLabel}${adjustmentValueLabel}: ${item.adjustmentLabel.trim() || "Ajuste manual"}`,
      extraPrice: adjustment,
    }] : [];
    return {
      productId: item.product.id,
      quantity: item.quantity,
      notes: item.notes,
      selectedModifiers: [...item.modifiers, ...customModifier],
      tanda: item.product.categoryId === "c1" ? 1 : 2,
    };
  };

  // Submit new waiter added items to existing order
  const handleAddItemsToOrder = async () => {
    if (waiterCart.length === 0 || !activeOrder) return;
    if (waiterCart.some((item) => item.adjustmentAmount > 0 && !item.adjustmentLabel.trim())) {
      showBanner("Escribe el motivo de cada extra o descuento.", "error");
      return;
    }
    try {
      const isEditing = Boolean(editingOrderItemId);
      if (isEditing && activeOrderHasPayments) {
        showBanner("La comanda ya tiene un pago o una boleta emitida y no puede modificarse.", "error");
        return;
      }
      const payloadItems = waiterCart.map(createOrderItemPayload);
      const res = await fetch(
        isEditing ? `/api/orders/${activeOrder.id}/items/${editingOrderItemId}` : "/api/orders",
        {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? {
          ...payloadItems[0],
          userId: activeUser?.id,
          changeReason: editingOrderItemReason,
        } : {
          tableId: selectedTable?.id,
          waiterId: activeUser?.id,
          isWaiter: true,
          items: payloadItems,
        })
      });

      if (res.ok) {
        setWaiterCart([]);
        setIsAddingItems(false);
        setEditingOrderItemId(null);
        setEditingOrderItemReason("");
        showBanner(isEditing ? "Ítem actualizado. Cocina recibió el cambio." : "Productos agregados a la comanda.");
        refreshStateIfNeeded();
      } else {
        const error = await res.json();
        showBanner(error.error || "No se pudo guardar el cambio.", "error");
      }
    } catch (e) {
      showBanner("Error de conexión", "error");
    }
  };

  const handleDeleteOrderItem = async (itemId: string, removeAll = true) => {
    if (!activeOrder || pendingOrderActionIds.includes(itemId)) return;
    const item = activeOrder.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    if (activeOrderHasPayments) {
      showBanner("La comanda ya tiene un pago o una boleta emitida y no puede modificarse.", "error");
      return;
    }
    const removingOne = !removeAll && item.quantity > 1;
    const itemStage = item.status === OrderItemStatus.PENDING ? "pendiente" : item.status === OrderItemStatus.DELIVERED ? "servido" : "en preparación";
    const confirmation = removingOne
      ? `¿Quitar una unidad de este ítem ${itemStage}? El total, cocina y stock se actualizarán.`
      : `¿Eliminar toda esta línea (${itemStage})? El total, cocina y stock se actualizarán.`;
    if (!window.confirm(confirmation)) return;
    const changeReason = item.status === OrderItemStatus.PENDING
      ? "Corrección antes de enviar a cocina"
      : window.prompt("Indica el motivo de la eliminación:", "")?.trim();
    if (!changeReason) {
      if (item.status !== OrderItemStatus.PENDING) showBanner("Debes indicar el motivo de la eliminación.", "error");
      return;
    }

    setPendingOrderActionIds((previous) => [...previous, itemId]);
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      await applyDirectStateUpdate((nextState) => {
        const order = nextState.orders.find((candidate) => candidate.id === activeOrder.id);
        if (order) {
          const optimisticItem = order.items.find((candidate) => candidate.id === itemId);
          if (optimisticItem && removingOne) optimisticItem.quantity -= 1;
          else order.items = order.items.filter((candidate) => candidate.id !== itemId);
          order.updatedAt = new Date().toISOString();
        }
      });
    }
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/items/${itemId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeAll, userId: activeUser?.id, changeReason }),
      });
      if (!res.ok) {
        const error = await res.json();
        if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") await refreshDirectState();
        showBanner(error.error || "No se pudo eliminar el ítem.", "error");
      } else {
        showBanner(removingOne ? "Se quitó una unidad y se actualizó la comanda." : "Ítem eliminado y comanda actualizada.");
        refreshStateIfNeeded();
      }
    } catch {
      if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") await refreshDirectState();
      showBanner("Error al eliminar el ítem.", "error");
    } finally {
      setPendingOrderActionIds((previous) => previous.filter((id) => id !== itemId));
    }
  };

  // Kitchen direct submit (sends pending to kitchen and triggers ingredient deduction)
  const handleSendToKitchen = async () => {
    if (!activeOrder || !hasPendingKitchenItems || isSendingKitchen) return;
    setIsSendingKitchen(true);
    const sentAt = new Date().toISOString();
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      await applyDirectStateUpdate((nextState) => {
        const order = nextState.orders.find((candidate) => candidate.id === activeOrder.id);
        if (!order) return;
        order.items.forEach((item) => {
          if (item.status === OrderItemStatus.PENDING) {
            const product = nextState.products.find((candidate) => candidate.id === item.productId);
            item.status = isDirectServiceProduct(product)
              ? OrderItemStatus.READY
              : OrderItemStatus.PREPARING;
          }
        });
        const hasKitchenQueueItems = order.items.some((item) =>
          item.status === OrderItemStatus.SENT_TO_KITCHEN || item.status === OrderItemStatus.RECEIVED
        );
        const hasPreparingItems = order.items.some((item) => item.status === OrderItemStatus.PREPARING);
        const allItemsReady = order.items.length > 0 && order.items.every((item) =>
          item.status === OrderItemStatus.READY || item.status === OrderItemStatus.DELIVERED
        );
        order.status = allItemsReady
          ? OrderStatus.READY
          : hasPreparingItems
          ? OrderStatus.PREPARING
          : hasKitchenQueueItems
          ? OrderStatus.PENDING_KITCHEN
          : order.status;
        order.kitchenSentAt = sentAt;
        order.updatedAt = sentAt;
      });
    }
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/send-to-kitchen`, {
        method: "POST"
      });
      if (res.ok) {
        showBanner("Comanda enviada a Cocina.");
      } else {
        const err = await res.json();
        if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
          await refreshDirectState();
        }
        showBanner(err.error || "No hay ítems pendientes.", "error");
      }
    } catch (e) {
      if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
        await refreshDirectState();
      }
      showBanner("Error de conexión", "error");
    } finally {
      setIsSendingKitchen(false);
    }
  };

  // Change individual order item status
  const handleUpdateItemStatus = async (itemId: string, currentStatus: OrderItemStatus) => {
    if (!activeOrder || pendingOrderActionIds.includes(itemId)) return;
    if (!isCookingItemStatus(currentStatus) && currentStatus !== OrderItemStatus.READY) return;
    const nextStatus = isCookingItemStatus(currentStatus)
      ? OrderItemStatus.READY
      : OrderItemStatus.DELIVERED;

    setPendingOrderActionIds(prev => [...prev, itemId]);
    if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
      await applyDirectStateUpdate((nextState) => {
        const order = nextState.orders.find((candidate) => candidate.id === activeOrder.id);
        const item = order?.items.find((candidate) => candidate.id === itemId);
        if (item) item.status = nextStatus;
      });
    }
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/items/${itemId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) {
        if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
          await refreshDirectState();
        }
        showBanner("No se pudo cambiar el estado.", "error");
      }
    } catch (e) {
      if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
        await refreshDirectState();
      }
      showBanner("Error al cambiar estado.", "error");
    } finally {
      setPendingOrderActionIds(prev => prev.filter(id => id !== itemId));
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
        refreshStateIfNeeded();
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
        refreshStateIfNeeded();
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

  const billingSubtotal = billingOrder?.billingSubtotal ?? calculateActiveOrderTotal();
  const billingDiscountAmount = billingOrder?.billingDiscount ?? Math.round(billingSubtotal * (appliedDiscount / 100));
  const billingTipAmount = billingOrder?.billingTip ?? Math.round(billingSubtotal * (tipPercent / 100));
  const billingAccountTotal = billingOrder?.billingTotal ?? billingSubtotal - billingDiscountAmount + billingTipAmount;
  const billingRemaining = getRemainingBalance(billingAccountTotal, activeOrderPaid);
  const billingTermsLocked = activeOrderPayments.length > 0;
  const nextBillingPaymentAmount = getNextPaymentAmount(
    billingRemaining,
    billingSplitType,
    billingSplitParts,
    billingCustomAmount,
  );
  const isBillingAmountInvalid = !Number.isFinite(nextBillingPaymentAmount) ||
    nextBillingPaymentAmount <= 0 ||
    nextBillingPaymentAmount > billingRemaining;

  const handleCloseBillSubmit = async () => {
    if (!activeOrder) return;
    if (!canBillActiveOrder) {
      setIsBillingOpen(false);
      showBanner("No puedes cobrar hasta que todos los pedidos salgan de cocina.", "error");
      return;
    }
    if (paymentMethod === PaymentMethod.ACCOUNT && !selectedBillingCreditCustomer) {
      showBanner("Selecciona una cuenta autorizada para cargar el consumo.", "error");
      return;
    }
    if (billingRemaining <= 0) {
      showBanner("La cuenta ya está completamente pagada.", "error");
      return;
    }

    const paymentAmount = getNextPaymentAmount(
      billingRemaining,
      billingSplitType,
      billingSplitParts,
      billingCustomAmount,
    );
    if (billingSplitType === "custom") {
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        showBanner("Ingresa un monto libre válido.", "error");
        return;
      }
      if (paymentAmount > billingRemaining) {
        showBanner(`El monto supera el saldo pendiente de ${formatCLP(billingRemaining)}.`, "error");
        return;
      }
    }

    const previouslyRecordedTip = activeOrderPayments.reduce((sum, payment) => sum + (payment.tip || 0), 0);
    const previouslyRecordedDiscount = activeOrderPayments.reduce((sum, payment) => sum + (payment.discount || 0), 0);
    const allocatedTip = allocateRemainingAdjustment(
      billingTipAmount,
      previouslyRecordedTip,
      paymentAmount,
      billingRemaining,
    );
    const allocatedDiscount = allocateRemainingAdjustment(
      billingDiscountAmount,
      previouslyRecordedDiscount,
      paymentAmount,
      billingRemaining,
    );
    const createPaymentPayload = (amount: number, method: PaymentMethod, tip: number, discount: number) => ({
      amount,
      method,
      tip,
      discount,
      ...(method === PaymentMethod.ACCOUNT && selectedBillingCreditCustomer
        ? { creditCustomerId: selectedBillingCreditCustomer.id }
        : {}),
    });

    // Each confirmation is one real payment and therefore one receipt.
    const paymentsPayload = [createPaymentPayload(paymentAmount, paymentMethod, allocatedTip, allocatedDiscount)];

    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: paymentsPayload,
          customerPhone: selectedBillingCreditCustomer?.phone || activeOrder.customerPhone || undefined,
          totalAmount: billingSubtotal,
          discount: billingDiscountAmount,
          tip: billingTipAmount
        })
      });

      if (res.ok) {
        const result = await res.json() as {
          payments: Payment[];
          remaining: number;
          closed: boolean;
        };
        const processedPayments = result.payments || [];
        setBillingSuccess(true);
        setLastBillingPayments(processedPayments);
        setLastBillingOrderId(activeOrder.id);
        setBillingRemainingAfterPayment(result.remaining);
        setBillingClosedAfterPayment(result.closed);
        if (billingSplitType === "equal" && billingSplitParts > 1) {
          setBillingSplitParts((parts) => Math.max(1, parts - 1));
        }
        setBillingCustomAmount(0);

        if (activeOrder && processedPayments.length > 0) {
          printThermalReceipt({
            order: activeOrder,
            state,
            payments: processedPayments,
            waiterName: activeUser?.name,
            accountSubtotal: billingSubtotal,
            accountDiscount: billingDiscountAmount,
            accountTip: billingTipAmount,
            accountTotal: billingAccountTotal,
            previouslyPaid: activeOrderPaid,
            remainingBalance: result.remaining,
          });
        }
        refreshStateIfNeeded();
      } else {
        const err = await res.json().catch(() => ({}));
        showBanner(err.error || "No se pudo cerrar la cuenta.", "error");
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
        refreshStateIfNeeded();
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
        refreshStateIfNeeded();
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
  const formatSignedCLP = (val: number) =>
    `${val >= 0 ? "+" : "-"}$${Math.abs(Math.round(val)).toLocaleString("es-CL")}`;

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
              onClick={() => setIsAddTableOpen(true)}
              className="h-9 w-9 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:border-amber-400 hover:text-amber-700 flex items-center justify-center"
              title="Agregar mesa"
              aria-label="Agregar mesa"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsReceiptHistoryOpen(true)}
              className="h-9 w-9 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:border-amber-400 hover:text-amber-700 flex items-center justify-center"
              title="Historial de boletas"
              aria-label="Abrir historial de boletas"
            >
              <ReceiptText className="w-4 h-4" />
            </button>
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

            // Find active reservation for this table
            const tableReservation = tbl.status === TableStatus.RESERVED
              ? state.reservations.find(r => r.tableId === tbl.id && r.status !== ReservationStatus.CANCELLED && r.status !== ReservationStatus.ARRIVED)
              : null;

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
                  setIsReservingTable(false);
                  resetReservationForm();
                  if (tbl.status === TableStatus.FREE) setOpeningGuestCount(2);
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
                  {tableReservation && (
                    <div className="mt-1.5 bg-blue-100 text-blue-800 rounded-lg px-2 py-1">
                      <span className="text-[10px] font-bold block truncate">📅 {new Date(tableReservation.dateTime).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })} {new Date(tableReservation.dateTime).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-[9px] font-semibold block truncate">👤 {tableReservation.customerName}</span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {selectedTable && (
        <button
          type="button"
          onClick={() => setSelectedTable(null)}
          className="fixed inset-0 z-30 bg-zinc-950/55 md:hidden"
          aria-label="Cerrar detalle de mesa"
        />
      )}

      {/* RIGHT SIDEBAR: SELECTED TABLE DETAILS */}
      <div
        className={`${selectedTable ? "fixed inset-x-0 bottom-0 top-12 z-40 flex rounded-t-2xl shadow-2xl" : "hidden"} md:static md:z-auto md:flex md:w-[380px] md:rounded-none md:shadow-none w-full bg-white border-l border-zinc-200 p-5 flex-col justify-between overflow-hidden`}
        id="waiter-table-panel"
        role={selectedTable ? "dialog" : undefined}
        aria-modal={selectedTable ? true : undefined}
        aria-label={selectedTable ? `Detalle de Mesa ${selectedTable.number}` : undefined}
      >
        {selectedTable ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 flex justify-between items-center border-b border-zinc-100 pb-3 mb-4 bg-white">
              <div>
                <h2 className="font-extrabold text-lg text-zinc-900">Mesa {selectedTable.number}</h2>
                <span className="text-xs text-zinc-400 font-semibold">{selectedTable.zone}</span>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
                aria-label="Cerrar detalle de mesa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STATUS CARDS */}
            {selectedTable.status === TableStatus.FREE || selectedTable.status === TableStatus.RESERVED ? (() => {
              const activeReservation = selectedTable.status === TableStatus.RESERVED
                ? state.reservations.find(r => r.tableId === selectedTable.id && r.status !== ReservationStatus.CANCELLED && r.status !== ReservationStatus.ARRIVED)
                : null;

              return (
                <div className="space-y-3 py-4 flex-1 overflow-y-auto">
                  {/* ======== RESERVED: Show reservation details ======== */}
                  {selectedTable.status === TableStatus.RESERVED && activeReservation ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                          <h3 className="font-black text-blue-900 text-sm">Reserva Activa</h3>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-bold text-zinc-800">
                              {new Date(activeReservation.dateTime).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" })}{" "}
                              {new Date(activeReservation.dateTime).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <UserPlus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-bold text-zinc-800">{activeReservation.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-semibold text-zinc-600">{activeReservation.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-semibold text-zinc-600">{activeReservation.customerCount} comensales</span>
                          </div>
                          {activeReservation.advancePayment && activeReservation.advancePayment > 0 ? (
                            <div className="flex items-center gap-2 text-xs">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="font-bold text-emerald-700">
                                Abono: ${activeReservation.advancePayment.toLocaleString("es-CL")} ({activeReservation.advancePaymentMethod || "Transferencia"})
                              </span>
                            </div>
                          ) : null}
                          {activeReservation.notes && (
                            <div className="text-[11px] text-zinc-500 italic mt-1 bg-white rounded-lg p-2 border border-zinc-100">
                              📝 {activeReservation.notes}
                            </div>
                          )}
                          {activeReservation.items && activeReservation.items.length > 0 && (
                            <div className="bg-white border border-blue-200 rounded-xl p-2.5 mt-2 space-y-1.5">
                              <span className="text-[10px] font-black text-blue-900 block uppercase flex items-center gap-1">
                                <Utensils className="w-3 h-3 text-blue-600" /> Platos Pre-pedidos ({activeReservation.items.length})
                              </span>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {activeReservation.items.map((it, idx) => {
                                  const prod = state.products.find(p => p.id === it.productId);
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                      <span className="font-bold text-zinc-800">
                                        {it.quantity}x {prod ? prod.name : "Producto"}
                                      </span>
                                      <span className="text-zinc-500 font-semibold">
                                        ${((prod?.price || 0) * it.quantity).toLocaleString("es-CL")}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="border-t border-zinc-100 pt-1 flex justify-between items-center text-xs font-bold text-zinc-900">
                                <span>Total Pre-pedido:</span>
                                <span className="text-blue-600">
                                  ${activeReservation.items.reduce((sum, it) => {
                                    const prod = state.products.find(p => p.id === it.productId);
                                    return sum + ((prod?.price || 0) * it.quantity);
                                  }, 0).toLocaleString("es-CL")}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions for RESERVED table */}
                      <button
                        onClick={() => handleArriveReservation(activeReservation)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Llegó el cliente — Abrir Mesa
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditReservation(activeReservation)}
                          className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => handleCancelReservation(activeReservation.id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Cancelar Reserva
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ======== FREE: Open or Reserve ======== */
                    <div className="space-y-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-950 text-sm">Mesa Disponible</h3>
                        <p className="text-xs text-zinc-400 mt-1">Ábrela para tomar pedidos o resérvala para un cliente.</p>
                      </div>
                      <button
                        onClick={() => {
                          if (!activeShift) {
                            showBanner("Debes abrir la caja / turno de trabajo primero.", "error");
                            return;
                          }
                          setOpeningGuestCount(2);
                          setIsOpeningTable(true);
                          setIsReservingTable(false);
                        }}
                        className="w-full bg-zinc-950 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                      >
                        Abrir Mesa / Comensales
                      </button>
                      <button
                        onClick={() => {
                          setIsReservingTable(true);
                          setIsOpeningTable(false);
                          // Default date to today
                          if (!resDate) setResDate(new Date().toISOString().split("T")[0]);
                          if (!resTime) setResTime("20:00");
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" /> Reservar Mesa
                      </button>
                    </div>
                  )}

                  {/* Opening Table Panel (inside details) */}
                  {isOpeningTable && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mt-1 text-left space-y-3"
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

                  {/* ======== RESERVATION FORM ======== */}
                  {isReservingTable && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-1 text-left space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs text-blue-900 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" /> {editingReservation ? "Editar Reserva" : "Nueva Reserva"}
                        </span>
                        <button onClick={resetReservationForm} className="text-zinc-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 block uppercase mb-1">Nombre del cliente (opcional)</label>
                        <input
                          type="text"
                          value={resName}
                          onChange={e => setResName(e.target.value)}
                          placeholder="Ej: Juan Pérez (o dejar en blanco)"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 block uppercase mb-1">Teléfono (opcional)</label>
                        <input
                          type="tel"
                          value={resPhone}
                          onChange={e => setResPhone(e.target.value)}
                          placeholder="Ej: +56 9 1234 5678"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>

                      {/* Date & Time */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-zinc-500 block uppercase mb-1">Fecha</label>
                          <input
                            type="date"
                            value={resDate}
                            onChange={e => setResDate(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-zinc-500 block uppercase mb-1">Hora</label>
                          <input
                            type="time"
                            value={resTime}
                            onChange={e => setResTime(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      </div>

                      {/* Guest count */}
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 block uppercase mb-1">Comensales</label>
                        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-zinc-200 w-max">
                          <button onClick={() => setResGuests(g => Math.max(1, g - 1))} className="bg-zinc-100 p-1 rounded hover:bg-zinc-200 text-zinc-700 font-bold">-</button>
                          <span className="font-extrabold text-sm px-2 text-zinc-900">{resGuests}</span>
                          <button onClick={() => setResGuests(g => g + 1)} className="bg-zinc-100 p-1 rounded hover:bg-zinc-200 text-zinc-700 font-bold">+</button>
                        </div>
                      </div>

                      {/* Advance payment */}
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 block uppercase mb-1">Abono / Pago anticipado (opcional)</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">$</span>
                            <input
                              type="number"
                              value={resAdvance || ""}
                              onChange={e => setResAdvance(Number(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full bg-white border border-zinc-200 rounded-lg pl-7 pr-3 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                          </div>
                          {resAdvance > 0 && (
                            <select
                              value={resAdvanceMethod}
                              onChange={e => setResAdvanceMethod(e.target.value as PaymentMethod)}
                              className="bg-white border border-zinc-200 rounded-lg px-2 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                              <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                              <option value={PaymentMethod.CASH}>Efectivo</option>
                              <option value={PaymentMethod.DEBIT}>Débito</option>
                              <option value={PaymentMethod.CREDIT}>Crédito</option>
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 block uppercase mb-1">Notas (opcional)</label>
                        <textarea
                          value={resNotes}
                          onChange={e => setResNotes(e.target.value)}
                          placeholder="Ej: Cumpleaños, alergia a mariscos..."
                          rows={2}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                        />
                      </div>

                      {/* Pre-ordered dishes section */}
                      <div className="border-t border-blue-200 pt-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-blue-900 uppercase flex items-center gap-1">
                            <Utensils className="w-3.5 h-3.5 text-blue-600" /> Pre-pedido / Carta (opcional)
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowResItemPicker(!showResItemPicker)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-colors flex items-center gap-1"
                          >
                            {showResItemPicker ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            {showResItemPicker ? "Cerrar Carta" : "Cargar Carta"}
                          </button>
                        </div>

                        {/* List of pre-ordered items */}
                        {resItems.length > 0 && (
                          <div className="bg-white border border-blue-200 rounded-xl p-2.5 space-y-2">
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {resItems.map(item => {
                                const prod = state.products.find(p => p.id === item.productId);
                                if (!prod) return null;
                                return (
                                  <div key={item.productId} className="flex justify-between items-center bg-zinc-50 p-1.5 rounded-lg border border-zinc-100 text-xs">
                                    <div className="min-w-0 flex-1 pr-2">
                                      <span className="font-bold text-zinc-900 block truncate">{prod.name}</span>
                                      <span className="text-[10px] text-zinc-500 font-semibold">${prod.price.toLocaleString("es-CL")} c/u</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-md p-0.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setResItems(prev => prev.map(it => {
                                              if (it.productId === item.productId) {
                                                const nq = it.quantity - 1;
                                                return nq > 0 ? { ...it, quantity: nq } : null;
                                              }
                                              return it;
                                            }).filter(Boolean) as OrderItem[]);
                                          }}
                                          className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 rounded text-xs font-black text-zinc-700"
                                        >
                                          -
                                        </button>
                                        <span className="font-extrabold px-1 text-xs">{item.quantity}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setResItems(prev => prev.map(it => it.productId === item.productId ? { ...it, quantity: it.quantity + 1 } : it));
                                          }}
                                          className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 rounded text-xs font-black text-zinc-700"
                                        >
                                          +
                                        </button>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setResItems(prev => prev.filter(it => it.productId !== item.productId))}
                                        className="text-red-500 hover:text-red-700 p-0.5"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="border-t border-zinc-100 pt-1 flex justify-between items-center text-xs font-black text-zinc-900">
                              <span>Total Pre-pedido:</span>
                              <span className="text-blue-600">
                                ${resItems.reduce((sum, it) => {
                                  const prod = state.products.find(p => p.id === it.productId);
                                  return sum + ((prod?.price || 0) * it.quantity);
                                }, 0).toLocaleString("es-CL")}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Product Picker from Menu */}
                        {showResItemPicker && (
                          <div className="bg-white border border-blue-200 rounded-xl p-2.5 space-y-2">
                            {/* Search & Category */}
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder="Buscar plato..."
                                  value={resItemSearch}
                                  onChange={e => setResItemSearch(e.target.value)}
                                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-8 pr-2 py-1 text-xs text-zinc-900 focus:outline-none"
                                />
                              </div>
                              <select
                                value={resItemCategory}
                                onChange={e => setResItemCategory(e.target.value)}
                                className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-900 focus:outline-none"
                              >
                                <option value="all">Todas las cat.</option>
                                {state.categories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Product List */}
                            <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                              {state.products
                                .filter(p => p.isAvailable)
                                .filter(p => resItemCategory === "all" || p.categoryId === resItemCategory)
                                .filter(p => !resItemSearch || p.name.toLowerCase().includes(resItemSearch.toLowerCase()))
                                .map(prod => {
                                  const inCart = resItems.find(it => it.productId === prod.id);
                                  return (
                                    <div key={prod.id} className="flex justify-between items-center bg-zinc-50 hover:bg-blue-50 p-2 rounded-lg border border-zinc-100 text-xs transition-colors">
                                      <div className="min-w-0 flex-1 pr-2">
                                        <span className="font-bold text-zinc-900 block truncate">{prod.name}</span>
                                        <span className="text-[10px] text-zinc-500 font-semibold">${prod.price.toLocaleString("es-CL")}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setResItems(prev => {
                                            const existing = prev.find(it => it.productId === prod.id);
                                            if (existing) {
                                              return prev.map(it => it.productId === prod.id ? { ...it, quantity: it.quantity + 1 } : it);
                                            }
                                            return [...prev, {
                                              id: "resitem_" + Math.random().toString(36).substring(2, 9),
                                              productId: prod.id,
                                              quantity: 1,
                                              status: OrderItemStatus.PENDING,
                                              selectedModifiers: []
                                            }];
                                          });
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded-md text-[10px] transition-colors cursor-pointer shrink-0"
                                      >
                                        {inCart ? `+ Add (${inCart.quantity})` : "+ Agregar"}
                                      </button>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Submit */}
                      <button
                        onClick={handleSaveReservation}
                        disabled={isSavingReservation}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSavingReservation ? "Guardando..." : editingReservation ? "Actualizar Reserva" : "Confirmar Reserva"}
                      </button>
                    </motion.div>
                  )}
                </div>
              );
            })() : (
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
                      <div className="mt-1 flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5">
                        <button
                          type="button"
                          title="Quitar comensal"
                          aria-label="Quitar comensal"
                          onClick={() => activeOrder && handleUpdateGuestCount(activeOrder.customerCount - 1)}
                          disabled={!activeOrder || activeOrder.customerCount <= 1 || isUpdatingGuestCount}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-35"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-14 text-center font-bold text-zinc-900">
                          {activeOrder ? activeOrder.customerCount : 0} pers.
                        </span>
                        <button
                          type="button"
                          title="Agregar comensal"
                          aria-label="Agregar comensal"
                          onClick={() => activeOrder && handleUpdateGuestCount(activeOrder.customerCount + 1)}
                          disabled={!activeOrder || activeOrder.customerCount >= 30 || isUpdatingGuestCount}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-35"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
                          const isUpdating = pendingOrderActionIds.includes(it.id);
                          return (
                            <div key={it.id} className="border-b border-zinc-100 pb-2 text-xs flex justify-between items-start gap-2">
                              <div>
                                <span className="font-extrabold text-zinc-900">{it.quantity}x {prod.name}</span>
                                {it.selectedModifiers.map(m => (
                                  <span key={m.optionId} className="text-zinc-400 text-[10px] block italic ml-2">
                                    {m.extraPrice > 0 ? "+ " : m.extraPrice < 0 ? "- " : ""}{m.name}
                                    {m.extraPrice !== 0 && ` (${formatSignedCLP(m.extraPrice)})`}
                                  </span>
                                ))}
                                {it.notes && (
                                  <span className="bg-amber-50 border border-amber-100 text-[10px] text-amber-800 px-1.5 py-0.5 rounded block mt-1">
                                    "{it.notes}"
                                  </span>
                                )}
                              </div>

                              <div className="flex shrink-0 items-center gap-1">
                                {!activeOrderHasPayments && (
                                  <>
                                    {it.quantity > 1 && (
                                      <button
                                        type="button"
                                        title="Quitar una unidad"
                                        aria-label={`Quitar una unidad de ${prod.name}`}
                                        onClick={() => handleDeleteOrderItem(it.id, false)}
                                        disabled={isUpdating}
                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                                      >
                                        <Minus className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      title="Cambiar producto, cantidad o detalles"
                                      aria-label={`Cambiar ${prod.name}`}
                                      onClick={() => openEditItemModal(it, prod)}
                                      disabled={isUpdating}
                                      className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Eliminar toda la línea"
                                      aria-label={`Eliminar toda la línea de ${prod.name}`}
                                      onClick={() => handleDeleteOrderItem(it.id, true)}
                                      disabled={isUpdating}
                                      className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleUpdateItemStatus(it.id, it.status)}
                                  disabled={isUpdating || (!isCookingItemStatus(it.status) && it.status !== OrderItemStatus.READY)}
                                  title={isCookingItemStatus(it.status) ? "Marcar plato listo para servir" : it.status === OrderItemStatus.READY ? "Marcar plato servido" : undefined}
                                  className={`px-2 py-1 rounded-md font-bold text-[10px] border transition-all ${
                                    isUpdating
                                      ? "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-wait"
                                      :
                                    it.status === OrderItemStatus.PENDING
                                      ? "bg-zinc-100 border-zinc-200 text-zinc-700 cursor-not-allowed"
                                      : isCookingItemStatus(it.status)
                                      ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 cursor-pointer"
                                      : it.status === OrderItemStatus.READY
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 animate-bounce cursor-pointer"
                                      : "bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed"
                                  }`}
                                >
                                  {isUpdating && "Actualizando..."}
                                  {!isUpdating && it.status === OrderItemStatus.PENDING && "Pendiente"}
                                  {!isUpdating && isCookingItemStatus(it.status) && "Cocinando"}
                                  {!isUpdating && it.status === OrderItemStatus.READY && "Entregar"}
                                  {!isUpdating && it.status === OrderItemStatus.DELIVERED && "Servido ✔"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-xs italic block py-4 text-center">La comanda está vacía. Agrega productos.</span>
                    )}
                    {activeOrderHasPayments && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-900">
                        Esta comanda ya tiene una boleta o pago. Los cambios de productos están bloqueados para proteger los montos emitidos.
                      </div>
                    )}
                  </div>

                  {/* COMMAND ACTIONS */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={openAddItemsModal}
                      className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 font-bold p-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Ítem
                    </button>
                    <button
                      onClick={handleSendToKitchen}
                      disabled={!hasPendingKitchenItems || isSendingKitchen}
                      className={`font-bold p-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all ${
                        hasPendingKitchenItems && !isSendingKitchen
                          ? "bg-zinc-950 hover:bg-amber-600 text-white cursor-pointer"
                          : "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed"
                      }`}
                    >
                      {isSendingKitchen ? "Enviando..." : hasPendingKitchenItems ? "Enviar a Cocina" : "Sin nuevos platos"}
                    </button>
                  </div>
                </div>

                {/* BOTTOM CLOSING ZONE */}
                {activeOrder && (
                  <div className="border-t border-zinc-100 pt-4 mt-6 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-zinc-600">Total mesa:</span>
                      <span className="font-black text-zinc-950 text-base">
                        {formatCLP(billingAccountTotal)}
                      </span>
                    </div>
                    {activeOrderPaid > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                        <div className="flex justify-between font-bold text-emerald-700">
                          <span>Pagado</span>
                          <span>{formatCLP(activeOrderPaid)}</span>
                        </div>
                        <div className="mt-1 flex justify-between font-black text-amber-900">
                          <span>Saldo pendiente</span>
                          <span>{formatCLP(billingRemaining)}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (!canBillActiveOrder) return;
                        setIsBillingOpen(true);
                        setBillingSuccess(false);
                        setLastBillingPayments([]);
                        setLastBillingOrderId(activeOrder.id);
                        setBillingCustomAmount(0);
                        setPaymentMethod(PaymentMethod.CASH);
                        setBillingCreditCustomerId("");
                        setBillingSplitParts(Math.max(1, (activeOrder.customerCount || 2) - activeOrderPayments.length));
                        if (activeOrder.billingSubtotal && activeOrder.billingTotal !== undefined) {
                          setAppliedDiscount(Math.round(((activeOrder.billingDiscount || 0) / activeOrder.billingSubtotal) * 100));
                          setTipPercent(Math.round(((activeOrder.billingTip || 0) / activeOrder.billingSubtotal) * 100));
                        }
                      }}
                      disabled={!canBillActiveOrder}
                      title={canBillActiveOrder ? "Cobrar y cerrar mesa" : "Disponible cuando todos los pedidos salgan de cocina"}
                      className={`w-full font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors ${
                        canBillActiveOrder
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
                          : "bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed"
                      }`}
                    >
                      {canBillActiveOrder ? <Calculator className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      {canBillActiveOrder
                        ? activeOrderPaid > 0 ? "Continuar cobro" : "Cobrar / Cerrar Mesa"
                        : "Esperando salida de cocina"}
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
                <h3 className="font-bold text-zinc-900 text-sm">
                  {editingOrderItemId ? "Cambiar ítem" : "Catálogo de Productos"} - Mesa {selectedTable?.number}
                </h3>
                <button
                  onClick={() => {
                    setIsAddingItems(false);
                    setWaiterCart([]);
                    setEditingOrderItemId(null);
                    setEditingOrderItemReason("");
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
                                onClick={() => setWaiterCart(prev => {
                                  const replacement = {
                                    product: p,
                                    quantity: 1,
                                    notes: "",
                                    modifiers: [],
                                    adjustmentType: "extra",
                                    adjustmentValueType: "amount",
                                    adjustmentAmount: 0,
                                    adjustmentLabel: "",
                                  };
                                  return editingOrderItemId ? [replacement] : [...prev, replacement];
                                })}
                                className="bg-zinc-900 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                              >
                                {editingOrderItemId ? "Elegir" : "Agregar"}
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
                    <span className="font-bold text-xs text-zinc-900 block mb-3 border-b border-zinc-200 pb-1.5">
                      {editingOrderItemId ? "Nuevo detalle del ítem" : `Mesa ${selectedTable?.number} Comanda`}
                    </span>
                    <div className="space-y-2 overflow-y-auto max-h-[250px]">
                      {waiterCart.map((item, index) => (
                        <div key={item.product.id} className="border-b border-zinc-200/50 pb-3 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                            <span className="font-bold text-zinc-800">{item.quantity}x {item.product.name}</span>
                            {item.modifiers.map((modifier) => (
                              <span key={modifier.optionId} className="block text-[9px] text-zinc-500">
                                {modifier.name} {modifier.extraPrice !== 0 && `(${formatSignedCLP(modifier.extraPrice)})`}
                              </span>
                            ))}
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
                            <span className="shrink-0 text-right font-extrabold text-zinc-900">
                              {formatCLP(getWaiterCartUnitPrice(item) * item.quantity)}
                            </span>
                          </div>

                          <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-2">
                            <div className="grid grid-cols-2 gap-1 rounded-md bg-zinc-100 p-1">
                              <button
                                type="button"
                                onClick={() => setWaiterCart((previous) => previous.map((candidate, candidateIndex) =>
                                  candidateIndex === index ? { ...candidate, adjustmentType: "extra" } : candidate
                                ))}
                                className={`flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold ${
                                  item.adjustmentType === "extra" ? "bg-emerald-600 text-white" : "text-zinc-600"
                                }`}
                              >
                                <Plus className="h-3 w-3" /> Extra
                              </button>
                              <button
                                type="button"
                                onClick={() => setWaiterCart((previous) => previous.map((candidate, candidateIndex) =>
                                  candidateIndex === index ? {
                                    ...candidate,
                                    adjustmentType: "discount",
                                    adjustmentAmount: Math.min(
                                      candidate.adjustmentAmount,
                                      candidate.adjustmentValueType === "percent" ? 100 : candidate.product.price
                                    ),
                                  } : candidate
                                ))}
                                className={`flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold ${
                                  item.adjustmentType === "discount" ? "bg-red-600 text-white" : "text-zinc-600"
                                }`}
                              >
                                <Percent className="h-3 w-3" /> Descuento
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-zinc-100 p-1">
                              <button
                                type="button"
                                onClick={() => setWaiterCart((previous) => previous.map((candidate, candidateIndex) =>
                                  candidateIndex === index ? {
                                    ...candidate,
                                    adjustmentValueType: "amount",
                                    adjustmentAmount: candidate.adjustmentType === "discount"
                                      ? Math.min(candidate.adjustmentAmount, candidate.product.price)
                                      : candidate.adjustmentAmount,
                                  } : candidate
                                ))}
                                className={`flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold ${
                                  item.adjustmentValueType === "amount" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                                }`}
                              >
                                <DollarSign className="h-3 w-3" /> Monto
                              </button>
                              <button
                                type="button"
                                onClick={() => setWaiterCart((previous) => previous.map((candidate, candidateIndex) =>
                                  candidateIndex === index ? {
                                    ...candidate,
                                    adjustmentValueType: "percent",
                                    adjustmentAmount: Math.min(
                                      candidate.adjustmentAmount,
                                      candidate.adjustmentType === "discount" ? 100 : 500
                                    ),
                                  } : candidate
                                ))}
                                className={`flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold ${
                                  item.adjustmentValueType === "percent" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                                }`}
                              >
                                <Percent className="h-3 w-3" /> Porcentaje
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-[1fr_88px] gap-2">
                              <input
                                type="text"
                                placeholder="Motivo: extra queso"
                                value={item.adjustmentLabel}
                                onChange={(event) => setWaiterCart((previous) => previous.map((candidate, candidateIndex) =>
                                  candidateIndex === index ? { ...candidate, adjustmentLabel: event.target.value } : candidate
                                ))}
                                className="min-w-0 rounded-md border border-zinc-200 px-2 py-1.5 text-[10px] text-zinc-800 outline-none focus:border-amber-400"
                              />
                              <input
                                type="number"
                                min="0"
                                max={item.adjustmentValueType === "percent"
                                  ? (item.adjustmentType === "discount" ? 100 : 500)
                                  : (item.adjustmentType === "discount" ? item.product.price : undefined)}
                                step={item.adjustmentValueType === "percent" ? "1" : "100"}
                                inputMode="decimal"
                                aria-label={item.adjustmentValueType === "percent"
                                  ? "Porcentaje del ajuste por unidad"
                                  : "Monto del ajuste por unidad"}
                                value={item.adjustmentAmount || ""}
                                onChange={(event) => {
                                  const entered = Math.max(0, Number(event.target.value) || 0);
                                  const maximum = item.adjustmentValueType === "percent"
                                    ? (item.adjustmentType === "discount" ? 100 : 500)
                                    : (item.adjustmentType === "discount" ? item.product.price : Number.POSITIVE_INFINITY);
                                  const amount = Math.min(entered, maximum);
                                  setWaiterCart((previous) => previous.map((candidate, candidateIndex) =>
                                    candidateIndex === index ? { ...candidate, adjustmentAmount: amount } : candidate
                                  ));
                                }}
                                placeholder={item.adjustmentValueType === "percent" ? "0%" : "$0"}
                                className="rounded-md border border-zinc-200 px-2 py-1.5 text-right text-[10px] font-bold text-zinc-800 outline-none focus:border-amber-400"
                              />
                            </div>
                            <span className="mt-1 block text-[9px] text-zinc-400">
                              {item.adjustmentValueType === "percent"
                                ? "Porcentaje calculado sobre el precio unitario."
                                : "Monto aplicado por cada unidad."}
                            </span>
                          </div>
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
                        {formatCLP(waiterCart.reduce((sum, it) => sum + (getWaiterCartUnitPrice(it) * it.quantity), 0))}
                      </span>
                    </div>
                    <button
                      onClick={handleAddItemsToOrder}
                      disabled={waiterCart.length === 0}
                      className="w-full bg-zinc-900 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl text-xs shadow transition-colors cursor-pointer"
                    >
                      {editingOrderItemId ? "Guardar Cambio" : "Confirmar Comanda"}
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
                  <h3 className="font-black text-zinc-900 text-base">Cobrar Cuenta Mesa {selectedTable?.number}</h3>
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
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-zinc-950 text-base">Pago registrado correctamente</h4>
                      <p className="text-zinc-500 text-xs mt-1">
                        {billingClosedAfterPayment
                          ? "La cuenta quedó pagada y la mesa fue liberada."
                          : `La mesa sigue abierta. Saldo pendiente: ${formatCLP(billingRemainingAfterPayment)}.`}
                      </p>
                    </div>
                    {billingOrder && lastBillingPayments.length > 0 && (
                      <button
                        onClick={() =>
                          printThermalReceipt({
                            order: billingOrder,
                            state,
                            payments: lastBillingPayments,
                            waiterName: activeUser?.name,
                            accountSubtotal: billingSubtotal,
                            accountDiscount: billingDiscountAmount,
                            accountTip: billingTipAmount,
                            accountTotal: billingAccountTotal,
                            previouslyPaid: Math.max(0, billingAccountTotal - billingRemainingAfterPayment - lastBillingPayments.reduce((sum, payment) => sum + payment.amount, 0)),
                            remainingBalance: billingRemainingAfterPayment,
                          })
                        }
                        className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all cursor-pointer mx-auto"
                      >
                        <Printer className="w-4 h-4" />
                        Reimprimir Boleta
                      </button>
                    )}
                    <div className="flex gap-2 pt-2">
                      {!billingClosedAfterPayment && (
                        <button
                          type="button"
                          onClick={() => {
                            setBillingSuccess(false);
                            setPaymentMethod(PaymentMethod.CASH);
                            setBillingCreditCustomerId("");
                          }}
                          className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white hover:bg-emerald-700"
                        >
                          Cobrar siguiente pago
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsBillingOpen(false);
                          setBillingSuccess(false);
                          if (billingClosedAfterPayment) setSelectedTable(null);
                          setAppliedDiscount(0);
                          setSelectedPromoCode("");
                          setTipPercent(10);
                          setBillingCreditCustomerId("");
                        }}
                        className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                      >
                        {billingClosedAfterPayment ? "Finalizar" : "Cerrar por ahora"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Bill breakdown summary */}
                    <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-bold">Consumo de mesa</span>
                        <span className="text-zinc-900 font-extrabold">{formatCLP(billingSubtotal)}</span>
                      </div>
                      
                      {billingDiscountAmount > 0 && (
                        <div className="flex justify-between text-red-500">
                          <span className="font-bold">Descuento</span>
                          <span>-{formatCLP(billingDiscountAmount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-bold">Propina sugerida</span>
                        <span className="text-zinc-900 font-extrabold">{formatCLP(billingTipAmount)}</span>
                      </div>

                      <div className="border-t border-zinc-200/50 pt-2 flex justify-between font-black text-sm text-zinc-950">
                        <span>Total cuenta</span>
                        <span>{formatCLP(billingAccountTotal)}</span>
                      </div>
                      {activeOrderPaid > 0 && (
                        <>
                          <div className="flex justify-between font-bold text-emerald-700">
                            <span>Pagado</span>
                            <span>{formatCLP(activeOrderPaid)}</span>
                          </div>
                          <div className="flex justify-between rounded-lg bg-amber-50 px-2 py-2 font-black text-amber-900">
                            <span>Saldo pendiente</span>
                            <span>{formatCLP(billingRemaining)}</span>
                          </div>
                        </>
                      )}
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
                            <span className="text-zinc-500 font-semibold block">Personas restantes:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <button onClick={() => setBillingSplitParts(p => Math.max(1, p - 1))} className="bg-zinc-200 hover:bg-zinc-300 p-1.5 rounded text-zinc-700 font-bold">-</button>
                              <span className="font-extrabold text-zinc-900 px-1 text-sm">{billingSplitParts}</span>
                              <button onClick={() => setBillingSplitParts(p => p + 1)} className="bg-zinc-200 hover:bg-zinc-300 p-1.5 rounded text-zinc-700 font-bold">+</button>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-400 block font-semibold">Monto por persona:</span>
                            <span className="text-zinc-900 font-black text-sm">
                              {formatCLP(nextBillingPaymentAmount)}
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
                              min={1}
                              max={billingRemaining}
                              placeholder="Ej. 10000"
                              value={billingCustomAmount || ""}
                              onChange={(e) => setBillingCustomAmount(Number(e.target.value))}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-8 pr-4 text-xs text-zinc-900 focus:outline-none"
                            />
                          </div>
                          <span className="text-[10px] text-zinc-400 block">Se emitirá una boleta por este monto. El saldo permanecerá en la mesa.</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Tip configurations */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">
                        Propina Mozo {billingTermsLocked ? "(definida en el primer pago)" : "(10% sugerido)"}
                      </span>
                      <div className="flex gap-2">
                        {[0, 10, 15, 20].map((t) => (
                          <button
                            key={t}
                            onClick={() => setTipPercent(t)}
                            disabled={billingTermsLocked}
                            className={`flex-1 py-2 border rounded-xl text-xs font-bold transition-all ${
                              tipPercent === t 
                                ? "bg-amber-100 border-amber-300 text-amber-900" 
                                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                            } ${billingTermsLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                            }`}
                          >
                            {t}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Promo Codes */}
                    <div className={`space-y-1.5 ${billingTermsLocked ? "opacity-60" : ""}`}>
                      <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Aplicar Cupón</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="BIENVENIDO, DIADELMOZO"
                          value={selectedPromoCode}
                          onChange={(e) => setSelectedPromoCode(e.target.value)}
                          disabled={billingTermsLocked}
                          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-900 uppercase focus:outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={billingTermsLocked}
                          className="bg-zinc-900 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-bold px-4 rounded-xl text-xs cursor-pointer disabled:cursor-not-allowed"
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
                          { id: PaymentMethod.ACCOUNT, name: "📒 Cuenta autorizada" },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setPaymentMethod(m.id);
                              if (m.id !== PaymentMethod.ACCOUNT) setBillingCreditCustomerId("");
                            }}
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
                      {paymentMethod === PaymentMethod.ACCOUNT && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2"
                        >
                          <label className="text-[10px] font-black text-amber-900 block uppercase">Cargar consumo a</label>
                          <select
                            value={billingCreditCustomerId}
                            onChange={(e) => setBillingCreditCustomerId(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-zinc-900 focus:outline-none"
                          >
                            <option value="">Seleccionar cuenta autorizada</option>
                            {authorizedCreditCustomers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} · {c.phone}
                              </option>
                            ))}
                          </select>
                          {authorizedCreditCustomers.length === 0 ? (
                            <p className="text-[10px] text-red-600 font-bold">
                              No hay cuentas autorizadas. El administrador debe crearlas en CRM.
                            </p>
                          ) : selectedBillingCreditCustomer ? (
                            <p className="text-[10px] text-amber-900 font-bold">
                              Autorizado: {selectedBillingCreditCustomer.name}
                            </p>
                          ) : (
                            <p className="text-[10px] text-amber-800">
                              Solo se puede cargar a personas autorizadas por administración.
                            </p>
                          )}
                        </motion.div>
                      )}
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
                    disabled={isBillingAmountInvalid || (paymentMethod === PaymentMethod.ACCOUNT && !selectedBillingCreditCustomer)}
                    className={`flex-2 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-colors ${
                      isBillingAmountInvalid || (paymentMethod === PaymentMethod.ACCOUNT && !selectedBillingCreditCustomer)
                        ? "bg-zinc-300 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                    }`}
                  >
                    {paymentMethod === PaymentMethod.ACCOUNT
                      ? `Confirmar cargo ${formatCLP(nextBillingPaymentAmount)}`
                      : `Cobrar ${formatCLP(nextBillingPaymentAmount)}`}
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

      {isAddTableOpen && (
        <AddTableModal
          tables={state.tables}
          operatorName={activeUser?.name || "Garzón"}
          onClose={() => setIsAddTableOpen(false)}
          onAdded={(table) => showBanner(`Mesa ${table.number} agregada con éxito.`)}
        />
      )}

      {isReceiptHistoryOpen && (
        <WaiterReceiptHistory
          state={state}
          onClose={() => setIsReceiptHistoryOpen(false)}
        />
      )}

    </div>
  );
}
