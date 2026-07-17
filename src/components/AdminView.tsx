import React, { useState, useEffect } from "react";
import QRGenerator from "./QRGenerator";
import AddTableModal from "./AddTableModal";
import { printThermalReceipt } from "./ThermalReceipt";
import { 
  RestaurantState, 
  Product, 
  Category, 
  Ingredient, 
  Customer, 
  CustomerLoyaltyTx, 
  Promotion, 
  Payment,
  PaymentMethod,
  User,
  Role
} from "../types";
import { 
  TrendingUp, 
  DollarSign, 
  ClipboardList, 
  Package, 
  Users, 
  Award, 
  Search, 
  Plus, 
  Edit3, 
  AlertTriangle, 
  CheckCircle, 
  UserPlus, 
  BadgePercent, 
  Map, 
  UtensilsCrossed,
  Clock,
  Database,
  Download,
  Upload,
  Trash2,
  History,
  FileText,
  RefreshCw,
  FileDown,
  Printer,
  Shield,
  Lock,
  Key,
  Star,
  X
} from "lucide-react";

interface AdminViewProps {
  state: RestaurantState;
  onRefreshState: () => void;
  activeUser: User | null;
}

export default function AdminView({ state, onRefreshState, activeUser }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<"reports" | "boletas" | "menu" | "crm" | "inventory" | "qr" | "personal" | "audits">("reports");
  
  // Permission helper
  const hasPermission = (permission: string) => {
    if (!activeUser) return false;
    if (activeUser.role === Role.ADMIN) return true;
    return activeUser.permissions?.includes(permission) || false;
  };

  const visibleTabs = [
    { id: "reports", name: "📈 Reportes Analíticos", perm: "view_reports" },
    { id: "boletas", name: "🧾 Historial de Boletas", perm: "view_reports" },
    { id: "menu", name: "🍔 Carta & Precios", perm: "manage_menu" },
    { id: "crm", name: "👥 CRM & Fidelidad", perm: "view_reports" },
    { id: "inventory", name: "📦 Inventario", perm: "manage_inventory" },
    { id: "qr", name: "📱 QR Mesas", perm: "manage_menu" },
    { id: "personal", name: "👥 Personal", perm: "manage_staff" },
    { id: "audits", name: "🛡️ Auditoría & Backups", perm: "manage_staff" },
  ].filter(t => hasPermission(t.perm));

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id as any);
    }
  }, [activeUser, state]);

  // Inventory actions
  const [addingStockIngId, setAddingStockIngId] = useState<string | null>(null);
  const [addingStockQty, setAddingStockQty] = useState(1000);
  
  // Menu action modal (Quick price edit)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState(0);

  // User/Staff management state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [staffRole, setStaffRole] = useState<Role>(Role.WAITER);
  const [staffPermissions, setStaffPermissions] = useState<string[]>([]);
  const [staffError, setStaffError] = useState("");
  const [isStaffSaving, setIsStaffSaving] = useState(false);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [tableNotice, setTableNotice] = useState("");

  // Product management state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductModal, setEditingProductModal] = useState<Product | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState(0);
  const [prodCategoryId, setProdCategoryId] = useState("");
  const [prodDescription, setProdDescription] = useState("");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodAllergens, setProdAllergens] = useState<string[]>([]);
  const [prodIsRecommended, setProdIsRecommended] = useState(false);
  const [prodError, setProdError] = useState("");
  const [isProductSaving, setIsProductSaving] = useState(false);

  // CRM action state
  const [crmSearch, setCrmSearch] = useState("");
  const [selectedCrmCustomer, setSelectedCrmCustomer] = useState<Customer | null>(null);
  const [crmName, setCrmName] = useState("");
  const [crmPhone, setCrmPhone] = useState("");
  const [crmEmail, setCrmEmail] = useState("");
  const [crmCreditLabel, setCrmCreditLabel] = useState<Customer["creditLabel"]>("CUSTOMER");
  const [crmCreditLimit, setCrmCreditLimit] = useState(0);
  const [crmCreditNotes, setCrmCreditNotes] = useState("");
  const [crmError, setCrmError] = useState("");
  const [isCrmSaving, setIsCrmSaving] = useState(false);

  // Date filters for Historial de Boletas
  const [boletasPeriod, setBoletasPeriod] = useState<string>("all"); // "today", "yesterday", "7days", "30days", "all", "custom"
  const [boletasStartDate, setBoletasStartDate] = useState<string>("");
  const [boletasEndDate, setBoletasEndDate] = useState<string>("");

  // Date filters for Reportes Analíticos
  const [reportsPeriod, setReportsPeriod] = useState<string>("today"); // "today", "yesterday", "thisweek", "thismonth", "lastmonth", "custom"
  const [reportsStartDate, setReportsStartDate] = useState<string>("");
  const [reportsEndDate, setReportsEndDate] = useState<string>("");

  useEffect(() => {
    onRefreshState();
  }, []);

  const formatCLP = (val: number) => "$" + Math.round(val).toLocaleString("es-CL");
  const creditLabelText = (label?: Customer["creditLabel"]) => {
    const labels: Record<string, string> = {
      OWNER: "Dueño",
      STAFF: "Equipo",
      FAMILY: "Familiar",
      CUSTOMER: "Cliente autorizado",
      OTHER: "Otro",
    };
    return labels[label || "CUSTOMER"] || "Cliente autorizado";
  };

  const getCreditBalance = (customerId?: string) => {
    if (!customerId) return 0;
    return (state.payments || [])
      .filter((p) => p.method === PaymentMethod.ACCOUNT && p.creditCustomerId === customerId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const resetCrmForm = () => {
    setCrmName("");
    setCrmPhone("");
    setCrmEmail("");
    setCrmCreditLabel("CUSTOMER");
    setCrmCreditLimit(0);
    setCrmCreditNotes("");
    setCrmError("");
  };

  const handleCreateCreditCustomer = async () => {
    if (!crmName.trim() || !crmPhone.trim()) {
      setCrmError("Nombre y teléfono son obligatorios.");
      return;
    }
    setIsCrmSaving(true);
    setCrmError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: crmName.trim(),
          phone: crmPhone.trim(),
          email: crmEmail.trim(),
          allergies: [],
          notes: crmCreditNotes.trim(),
          isCreditAuthorized: true,
          creditLabel: crmCreditLabel,
          creditLimit: Number(crmCreditLimit || 0),
          creditNotes: crmCreditNotes.trim(),
          creditAuthorizedBy: activeUser?.name || "Administrador",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCrmError(data.error || "No se pudo crear la cuenta.");
        return;
      }
      resetCrmForm();
      setSelectedCrmCustomer(data.customer || null);
      onRefreshState();
    } catch (e) {
      setCrmError("Error de conexión.");
    } finally {
      setIsCrmSaving(false);
    }
  };

  const handleToggleCreditCustomer = async (customer: Customer) => {
    setIsCrmSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customer,
          isCreditAuthorized: !customer.isCreditAuthorized,
          creditLabel: customer.creditLabel || "CUSTOMER",
          creditLimit: customer.creditLimit || 0,
          creditNotes: customer.creditNotes || "",
          creditAuthorizedBy: activeUser?.name || "Administrador",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSelectedCrmCustomer(data.customer || { ...customer, isCreditAuthorized: !customer.isCreditAuthorized });
        onRefreshState();
      }
    } finally {
      setIsCrmSaving(false);
    }
  };

  const renderTrendBadge = (current: number, previous: number) => {
    if (previous <= 0) {
      return (
        <span className="text-[10px] text-zinc-400 font-semibold mt-1 block">
          Sin datos previos
        </span>
      );
    }
    const percentChange = Math.round(((current - previous) / previous) * 100);
    const isPositive = percentChange >= 0;
    return (
      <span className={`text-[10px] font-bold mt-1 block ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
        {isPositive ? "▲" : "▼"} {Math.abs(percentChange)}% vs. anterior
      </span>
    );
  };

  const isDateInPeriod = (dateStr: string, period: string, start?: string, end?: string): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    
    // Set hours to 0 to compare full days
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const orderDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    switch (period) {
      case "today": {
        return orderDay.getTime() === today.getTime();
      }
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return orderDay.getTime() === yesterday.getTime();
      }
      case "7days": {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return orderDay.getTime() >= sevenDaysAgo.getTime() && orderDay.getTime() <= today.getTime();
      }
      case "30days": {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return orderDay.getTime() >= thirtyDaysAgo.getTime() && orderDay.getTime() <= today.getTime();
      }
      case "thisweek": {
        // Start of this week (assume Monday)
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
        return orderDay.getTime() >= startOfWeek.getTime();
      }
      case "thismonth": {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return orderDay.getTime() >= startOfMonth.getTime();
      }
      case "lastmonth": {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return orderDay.getTime() >= startOfLastMonth.getTime() && orderDay.getTime() <= endOfLastMonth.getTime();
      }
      case "custom": {
        if (!start) return true;
        const startDate = new Date(start + "T00:00:00");
        const endDate = end ? new Date(end + "T23:59:59") : new Date();
        return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime();
      }
      case "all":
      default:
        return true;
    }
  };

  const isDateInPreviousPeriod = (dateStr: string, period: string, start?: string, end?: string): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const orderDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    switch (period) {
      case "today": {
        // Previous period is yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return orderDay.getTime() === yesterday.getTime();
      }
      case "yesterday": {
        // Previous period is day before yesterday
        const dayBefore = new Date(today);
        dayBefore.setDate(dayBefore.getDate() - 2);
        return orderDay.getTime() === dayBefore.getTime();
      }
      case "7days": {
        // 8 to 14 days ago
        const startPrev = new Date(today);
        startPrev.setDate(startPrev.getDate() - 14);
        const endPrev = new Date(today);
        endPrev.setDate(endPrev.getDate() - 8);
        return orderDay.getTime() >= startPrev.getTime() && orderDay.getTime() <= endPrev.getTime();
      }
      case "30days": {
        // 31 to 60 days ago
        const startPrev = new Date(today);
        startPrev.setDate(startPrev.getDate() - 60);
        const endPrev = new Date(today);
        endPrev.setDate(endPrev.getDate() - 31);
        return orderDay.getTime() >= startPrev.getTime() && orderDay.getTime() <= endPrev.getTime();
      }
      case "thisweek": {
        // Last week
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfWeek);
        endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
        return orderDay.getTime() >= startOfLastWeek.getTime() && orderDay.getTime() <= endOfLastWeek.getTime();
      }
      case "thismonth": {
        // Last month
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return orderDay.getTime() >= startOfLastMonth.getTime() && orderDay.getTime() <= endOfLastMonth.getTime();
      }
      case "lastmonth": {
        // Month before last
        const startOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const endOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        return orderDay.getTime() >= startOfTwoMonthsAgo.getTime() && orderDay.getTime() <= endOfTwoMonthsAgo.getTime();
      }
      case "custom": {
        if (!start) return false;
        const startDate = new Date(start + "T00:00:00");
        const endDate = end ? new Date(end + "T23:59:59") : new Date();
        const durationMs = endDate.getTime() - startDate.getTime();
        const startPrev = new Date(startDate.getTime() - durationMs - 1000);
        const endPrev = new Date(startDate.getTime() - 1000);
        return date.getTime() >= startPrev.getTime() && date.getTime() <= endPrev.getTime();
      }
      default:
        return false;
    }
  };

  // 1. CALCULATE REAL METRICS FROM COMPLETED PAYMENTS & ORDERS
  const completedPayments = state.payments || [];
  const allOrders = state.orders || [];

  // Filter current period
  const currentPayments = completedPayments.filter(p => isDateInPeriod(p.createdAt, reportsPeriod, reportsStartDate, reportsEndDate));
  const currentPaidPayments = currentPayments.filter(p => p.method !== PaymentMethod.ACCOUNT);
  const currentOrders = allOrders.filter(o => isDateInPeriod(o.createdAt, reportsPeriod, reportsStartDate, reportsEndDate));
  const currentClosedOrders = currentOrders.filter(o => o.status === "CLOSED");

  const totalSalesVolume = currentPaidPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalTipVolume = currentPaidPayments.reduce((sum, p) => sum + p.tip, 0);
  const totalOrdersCount = currentOrders.length;
  const closedOrdersCount = currentClosedOrders.length;
  const averageTicket = closedOrdersCount > 0 ? Math.round(totalSalesVolume / closedOrdersCount) : 0;

  // Filter previous period
  const prevPayments = completedPayments.filter(p => isDateInPreviousPeriod(p.createdAt, reportsPeriod, reportsStartDate, reportsEndDate));
  const prevPaidPayments = prevPayments.filter(p => p.method !== PaymentMethod.ACCOUNT);
  const prevOrders = allOrders.filter(o => isDateInPreviousPeriod(o.createdAt, reportsPeriod, reportsStartDate, reportsEndDate));
  const prevClosedOrders = prevOrders.filter(o => o.status === "CLOSED");

  const prevSalesVolume = prevPaidPayments.reduce((sum, p) => sum + p.amount, 0);
  const prevTipVolume = prevPaidPayments.reduce((sum, p) => sum + p.tip, 0);
  const prevOrdersCount = prevOrders.length;
  const prevClosedOrdersCount = prevClosedOrders.length;
  const prevAverageTicket = prevClosedOrdersCount > 0 ? Math.round(prevSalesVolume / prevClosedOrdersCount) : 0;

  // Best selling products count
  const productSalesMap: Record<string, number> = {};
  currentOrders.forEach(o => {
    o.items.forEach(it => {
      productSalesMap[it.productId] = (productSalesMap[it.productId] || 0) + it.quantity;
    });
  });

  const topSellingProducts = Object.entries(productSalesMap)
    .map(([productId, quantity]) => {
      const p = state.products.find(prod => prod.id === productId);
      return {
        productName: p ? p.name : "Desconocido",
        quantity,
        totalSalesValue: (p ? p.price : 0) * quantity
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 4);

  // 2. INVENTORY STOCK MANAGEMENT
  const handleAddStock = async (ingId: string) => {
    const ing = state.ingredients.find(i => i.id === ingId);
    if (!ing) return;
    
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ingId,
          name: ing.name,
          stock: ing.stock + Number(addingStockQty),
          unit: ing.unit,
          minStock: ing.minStock,
          operatorName: activeUser?.name || "Administrador"
        })
      });
      if (res.ok) {
        setAddingStockIngId(null);
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. EDIT MENU PRICE
  const handlePriceUpdate = async () => {
    if (!editingProduct) return;
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingProduct,
          price: editPrice,
          operatorName: activeUser?.name || "Administrador"
        })
      });
      if (res.ok) {
        setEditingProduct(null);
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle dish availability (activar/desactivar ítems sin borrar)
  const handleToggleProduct = async (prodId: string) => {
    try {
      const res = await fetch(`/api/products/${prodId}/toggle-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorName: activeUser?.name || "Administrador"
        })
      });
      if (res.ok) {
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRecommended = async (product: Product) => {
    const nextRecommended = !product.isRecommended;
    const recommendedCount = state.products.filter(p => p.isRecommended).length;
    if (nextRecommended && recommendedCount >= 5) {
      window.alert("Solo puedes destacar hasta 5 platos recomendados.");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...product,
          isRecommended: nextRecommended,
          operatorName: activeUser?.name || "Administrador"
        })
      });
      if (res.ok) {
        onRefreshState();
      } else {
        const err = await res.json();
        window.alert(err.error || "No se pudo actualizar el recomendado.");
      }
    } catch (e) {
      window.alert("Error de red al actualizar el recomendado.");
    }
  };

  // 3.5 User/Staff action handlers
  const openAddUserModal = () => {
    setEditingUser(null);
    setStaffName("");
    setStaffUsername("");
    setStaffPassword("");
    setStaffPin("");
    setStaffRole(Role.WAITER);
    setStaffPermissions([]);
    setStaffError("");
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setStaffName(user.name);
    setStaffUsername(user.username || user.name.split("(")[0].trim().split(/\s+/)[0].toLowerCase());
    setStaffPassword("");
    setStaffPin("");
    setStaffRole(user.role);
    setStaffPermissions(user.permissions || []);
    setStaffError("");
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!staffName.trim()) {
      setStaffError("El nombre es requerido.");
      return;
    }
    if (!staffUsername.trim() || (!editingUser && !staffPassword)) {
      setStaffError(editingUser ? "El usuario es requerido." : "Usuario y contraseña son obligatorios.");
      return;
    }
    const pinIsRequired = !editingUser;
    const pinWasEntered = staffPin.length > 0;
    if ((pinIsRequired || pinWasEntered) && (staffPin.length !== 4 || isNaN(Number(staffPin)))) {
      setStaffError(editingUser ? "El nuevo PIN debe tener exactamente 4 números." : "El PIN debe ser de exactamente 4 números.");
      return;
    }
    setIsStaffSaving(true);
    setStaffError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser?.id,
          name: staffName,
          username: staffUsername,
          password: staffPassword,
          pin: staffPin,
          role: staffRole,
          permissions: staffPermissions,
          operatorName: activeUser?.name || "Administrador"
        })
      });
      if (res.ok) {
        setIsUserModalOpen(false);
        onRefreshState();
      } else {
        const err = await res.json();
        setStaffError(err.error || "Error al guardar el usuario.");
      }
    } catch (e) {
      setStaffError("Error de red.");
    } finally {
      setIsStaffSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este perfil de personal?")) return;
    try {
      const res = await fetch(`/api/users/${userId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorName: activeUser?.name || "Administrador"
        })
      });
      if (res.ok) {
        onRefreshState();
      } else {
        alert("Error al eliminar el usuario.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const togglePermission = (perm: string) => {
    if (staffPermissions.includes(perm)) {
      setStaffPermissions(prev => prev.filter(p => p !== perm));
    } else {
      setStaffPermissions(prev => [...prev, perm]);
    }
  };

  // 3.6 Product action handlers
  const openAddProductModal = () => {
    setEditingProductModal(null);
    setProdName("");
    setProdPrice(0);
    setProdCategoryId(state.categories[0]?.id || "");
    setProdDescription("");
    setProdImageUrl("");
    setProdAllergens([]);
    setProdIsRecommended(false);
    setProdError("");
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProductModal(product);
    setProdName(product.name);
    setProdPrice(product.price);
    setProdCategoryId(product.categoryId);
    setProdDescription(product.description || "");
    setProdImageUrl(product.imageUrl || "");
    setProdAllergens(product.allergens || []);
    setProdIsRecommended(!!product.isRecommended);
    setProdError("");
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!prodName.trim()) {
      setProdError("El nombre es requerido.");
      return;
    }
    if (prodPrice <= 0) {
      setProdError("El precio debe ser mayor a 0.");
      return;
    }
    const recommendedCount = state.products.filter(p => p.isRecommended && p.id !== editingProductModal?.id).length;
    if (prodIsRecommended && recommendedCount >= 5) {
      setProdError("Solo puedes destacar hasta 5 platos recomendados.");
      return;
    }
    setIsProductSaving(true);
    setProdError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProductModal?.id,
          name: prodName,
          price: prodPrice,
          categoryId: prodCategoryId,
          description: prodDescription,
          imageUrl: prodImageUrl,
          allergens: prodAllergens,
          isRecommended: prodIsRecommended,
          operatorName: activeUser?.name || "Administrador"
        })
      });
      if (res.ok) {
        setIsProductModalOpen(false);
        onRefreshState();
      } else {
        const err = await res.json();
        setProdError(err.error || "Error al guardar el producto.");
      }
    } catch (e) {
      setProdError("Error de red.");
    } finally {
      setIsProductSaving(false);
    }
  };

  const toggleAllergen = (allergen: string) => {
    if (prodAllergens.includes(allergen)) {
      setProdAllergens(prev => prev.filter(a => a !== allergen));
    } else {
      setProdAllergens(prev => [...prev, allergen]);
    }
  };

  // 4. RECIPES HELPER: calculate how many items of a product can be made from current stock
  const calculateDishesRemaningForProduct = (product: Product) => {
    if (!product.recipe || product.recipe.length === 0) return "Ilimitado";
    
    let minCookable = Infinity;
    product.recipe.forEach(item => {
      const ing = state.ingredients.find(i => i.id === item.ingredientId);
      if (ing) {
        const cookable = Math.floor(ing.stock / item.quantity);
        if (cookable < minCookable) {
          minCookable = cookable;
        }
      } else {
        minCookable = 0;
      }
    });

    return minCookable === Infinity ? "0" : minCookable.toString() + " raciones";
  };

  return (
    <div className="bg-zinc-50 min-h-screen text-zinc-800" id="admin-root-view">
      {/* Banner de Bienvenida */}
      <div className="bg-zinc-900 text-white p-6 border-b border-zinc-800">
        <span className="text-[10px] text-amber-500 uppercase tracking-widest font-black block">Consola Administrativa</span>
        <h1 className="text-xl font-extrabold flex items-center gap-2">
          CRM & Control de Negocio - Hacienda
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Visibilidad total de inventarios, recetas, fidelidad de clientes y reportes analíticos.</p>
      </div>

      {/* ADMIN SECTION SUB-TABS */}
      <div className="flex flex-wrap border-b border-zinc-200 bg-white">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[120px] py-4 text-xs font-bold transition-all text-center border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? "border-amber-600 text-amber-700 bg-amber-500/5"
                : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        
        {/* TAB 1: REPORTS */}
        {activeTab === "reports" && (
          <div className="space-y-6" id="admin-reports-tab">
            {/* Period Selector Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                  📊 Reportes Analíticos e Indicadores
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Compara el rendimiento financiero y operativo entre diferentes períodos de tiempo.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-zinc-500">Período:</span>
                <select
                  value={reportsPeriod}
                  onChange={(e) => setReportsPeriod(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="today">Hoy</option>
                  <option value="yesterday">Ayer</option>
                  <option value="7days">Últimos 7 días</option>
                  <option value="thisweek">Esta Semana</option>
                  <option value="thismonth">Este Mes</option>
                  <option value="lastmonth">Mes Anterior</option>
                  <option value="custom">Rango Personalizado</option>
                </select>

                {reportsPeriod === "custom" && (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={reportsStartDate}
                      onChange={(e) => setReportsStartDate(e.target.value)}
                      className="bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1 font-bold text-zinc-700 text-[11px]"
                    />
                    <span className="text-zinc-400 text-[10px]">al</span>
                    <input
                      type="date"
                      value={reportsEndDate}
                      onChange={(e) => setReportsEndDate(e.target.value)}
                      className="bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1 font-bold text-zinc-700 text-[11px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bento Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">
                    {reportsPeriod === "today" ? "Ventas Hoy" : reportsPeriod === "yesterday" ? "Ventas Ayer" : "Ventas del Período"}
                  </span>
                  <h3 className="font-extrabold text-lg text-zinc-950 mt-0.5">{formatCLP(totalSalesVolume)}</h3>
                  {renderTrendBadge(totalSalesVolume, prevSalesVolume)}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Ticket Promedio</span>
                  <h3 className="font-extrabold text-lg text-zinc-950 mt-0.5">{formatCLP(averageTicket)}</h3>
                  {renderTrendBadge(averageTicket, prevAverageTicket)}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Comandas</span>
                  <h3 className="font-extrabold text-lg text-zinc-950 mt-0.5">{totalOrdersCount} mesas</h3>
                  {renderTrendBadge(totalOrdersCount, prevOrdersCount)}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Propinas Recibidas</span>
                  <h3 className="font-extrabold text-lg text-zinc-950 mt-0.5">{formatCLP(totalTipVolume)}</h3>
                  {renderTrendBadge(totalTipVolume, prevTipVolume)}
                </div>
              </div>
            </div>

            {/* Detailed analytical metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Top Selling Products */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-zinc-900 text-sm mb-4">🍽️ Productos Más Vendidos</h3>
                <div className="space-y-3.5">
                  {topSellingProducts.map((p, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded font-extrabold">{index + 1}</span>
                        <span className="font-bold text-zinc-800">{p.productName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-900 font-extrabold block">{p.quantity} pedidos</span>
                        <span className="text-zinc-400 text-[10px]">Total: {formatCLP(p.totalSalesValue)}</span>
                      </div>
                    </div>
                  ))}
                  {topSellingProducts.length === 0 && (
                    <span className="text-zinc-400 text-xs italic block py-6 text-center">Registra cobros para ver analíticas de platos.</span>
                  )}
                </div>
              </div>

              {/* Waiter Productivity */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-zinc-900 text-sm mb-4">🤵 Rendimiento por Mozo (Leaderboard)</h3>
                <div className="space-y-3.5 text-xs text-zinc-700">
                  {state.users.filter(u => u.role === "WAITER").map((w) => {
                    // Calculate wait staff's orders
                    const waiterOrders = currentOrders.filter(o => o.waiterId === w.id);
                    const completedSales = currentPayments.filter(p => {
                      const ord = currentOrders.find(o => o.id === p.orderId);
                      return ord && ord.waiterId === w.id;
                    });
                    const salesVolume = completedSales.reduce((s, p) => s + p.amount, 0);

                    return (
                      <div key={w.id} className="flex justify-between items-center border-b border-zinc-100 pb-2">
                        <div>
                          <span className="font-bold text-zinc-900 block">{w.name}</span>
                          <span className="text-zinc-400 text-[10px]">{waiterOrders.length} mesas atendidas</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-zinc-900 block">{formatCLP(salesVolume)}</span>
                          <span className="text-emerald-600 font-semibold text-[10px]">Ventas</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Custom Interactive HTML Analytical Sales Chart */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-zinc-900 text-sm mb-2">📊 Flujo de Ventas por Turno / Categoría</h3>
              <p className="text-xs text-zinc-400 mb-6">Gráfico dinámico de ventas por categorías culinarias basado en cobros reales.</p>
              
              <div className="space-y-4">
                {state.categories.map((cat) => {
                  // Calculate total sales in this category
                  let catSales = 0;
                  currentPayments.forEach(pay => {
                    const ord = currentOrders.find(o => o.id === pay.orderId);
                    if (ord) {
                      ord.items.forEach(it => {
                        const prod = state.products.find(p => p.id === it.productId);
                        if (prod && prod.categoryId === cat.id) {
                          catSales += prod.price * it.quantity;
                        }
                      });
                    }
                  });

                  // Calculate percentage width for visual chart bar
                  const maxVal = Math.max(...state.categories.map(c => {
                    let s = 0;
                    currentPayments.forEach(p => {
                      const o = currentOrders.find(or => or.id === p.orderId);
                      if (o) o.items.forEach(it => {
                        const pr = state.products.find(pro => pro.id === it.productId);
                        if (pr && pr.categoryId === c.id) s += pr.price * it.quantity;
                      });
                    });
                    return s;
                  })) || 1;

                  const percentWidth = Math.max(5, Math.round((catSales / maxVal) * 100));

                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex justify-between text-xs text-zinc-600 font-bold">
                        <span>{cat.name}</span>
                        <span className="text-zinc-900 font-extrabold">{formatCLP(catSales)}</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-3.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MENU AND PRICING */}
        {activeTab === "menu" && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm" id="admin-menu-tab">
            <div className="flex justify-between items-center mb-5">
              <div className="text-left">
                <h3 className="font-bold text-zinc-900 text-sm">Hamburguesas, Carnes y Platos</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Controla precios, disponibilidad y hasta 5 platos recomendados para la carta pública.</p>
                <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  {state.products.filter(p => p.isRecommended).length}/5 recomendados
                </span>
              </div>
              <button
                onClick={openAddProductModal}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Agregar Nuevo Producto
              </button>
            </div>

            <div className="space-y-6">
              {state.categories.map((cat) => {
                const productsInCategory = state.products
                  .filter((p) => p.categoryId === cat.id)
                  .sort((a, b) => Number(!!b.isRecommended) - Number(!!a.isRecommended) || a.name.localeCompare(b.name));
                if (productsInCategory.length === 0) return null;

                return (
                  <section key={cat.id} className="border border-zinc-100 rounded-2xl overflow-hidden">
                    <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-black text-xs uppercase tracking-wider text-zinc-900">{cat.name}</h4>
                        <span className="text-[10px] text-zinc-400 font-bold">{productsInCategory.length} productos</span>
                      </div>
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        {productsInCategory.filter(p => p.isRecommended).length} destacados
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-100">
                      {productsInCategory.map((p) => (
                        <div key={p.id} className="py-3 px-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3 text-xs">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-zinc-900 block">{p.name}</span>
                              {p.isRecommended && (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                  Recomendado
                                </span>
                              )}
                            </div>
                            {p.description && (
                              <span className="text-zinc-400 line-clamp-1 mt-0.5 block">{p.description}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 justify-end flex-wrap">
                            <span className="font-extrabold text-zinc-900 min-w-[80px] text-right">{formatCLP(p.price)}</span>

                            <button
                              onClick={() => handleToggleRecommended(p)}
                              title={p.isRecommended ? "Quitar de recomendados" : "Marcar como recomendado"}
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                                p.isRecommended
                                  ? "bg-amber-500 border-amber-600 text-zinc-950"
                                  : "bg-white border-zinc-200 text-zinc-300 hover:text-amber-500 hover:border-amber-300"
                              }`}
                            >
                              <Star className={`w-4 h-4 ${p.isRecommended ? "fill-zinc-950" : ""}`} />
                            </button>

                            <button
                              onClick={() => openEditProductModal(p)}
                              title="Editar producto"
                              className="w-8 h-8 rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-600 flex items-center justify-center cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleProduct(p.id)}
                              className={`px-2.5 py-1 rounded-full font-bold text-[10px] border transition-all cursor-pointer ${
                                p.isAvailable 
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                  : "bg-red-50 border-red-200 text-red-800"
                              }`}
                            >
                              {p.isAvailable ? "Activo" : "Pausado"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CRM & LOYALTY */}
        {activeTab === "crm" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="admin-crm-tab">
            
            {/* Customers list area */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm md:col-span-1">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-2">Listado de Clientes</span>
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Nueva cuenta autorizada</span>
                  <UserPlus className="w-4 h-4 text-amber-600" />
                </div>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={crmName}
                  onChange={(e) => setCrmName(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="tel"
                  placeholder="Teléfono o identificador"
                  value={crmPhone}
                  onChange={(e) => setCrmPhone(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="email"
                  placeholder="Email opcional"
                  value={crmEmail}
                  onChange={(e) => setCrmEmail(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={crmCreditLabel}
                    onChange={(e) => setCrmCreditLabel(e.target.value as Customer["creditLabel"])}
                    className="bg-white border border-zinc-200 rounded-lg py-2 px-2 text-xs focus:outline-none"
                  >
                    <option value="OWNER">Dueño</option>
                    <option value="STAFF">Equipo</option>
                    <option value="FAMILY">Familiar</option>
                    <option value="CUSTOMER">Cliente</option>
                    <option value="OTHER">Otro</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Límite $"
                    value={crmCreditLimit || ""}
                    onChange={(e) => setCrmCreditLimit(Number(e.target.value))}
                    className="bg-white border border-zinc-200 rounded-lg py-2 px-2 text-xs focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Notas internas opcionales"
                  value={crmCreditNotes}
                  onChange={(e) => setCrmCreditNotes(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {crmError && <p className="text-[10px] font-bold text-red-600">{crmError}</p>}
                <button
                  onClick={handleCreateCreditCustomer}
                  disabled={isCrmSaving}
                  className="w-full bg-zinc-900 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-extrabold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Crear y autorizar crédito
                </button>
              </div>
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por fono..."
                  value={crmSearch}
                  onChange={(e) => setCrmSearch(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {state.customers
                  .filter(c => c.phone.includes(crmSearch) || c.name.toLowerCase().includes(crmSearch.toLowerCase()))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCrmCustomer(c)}
                      className={`w-full text-left p-3 rounded-xl border text-xs flex justify-between items-center transition-all cursor-pointer ${
                        selectedCrmCustomer?.id === c.id 
                          ? "bg-amber-50 border-amber-300 text-amber-900 font-bold" 
                          : "bg-zinc-50 border-zinc-100 hover:bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      <div>
                        <span className="font-extrabold block">{c.name}</span>
                        <span className="text-zinc-400 text-[10px]">{c.phone}</span>
                        {c.isCreditAuthorized && (
                          <span className="block text-[9px] text-emerald-700 font-black uppercase mt-0.5">
                            Cuenta: {creditLabelText(c.creditLabel)}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="bg-amber-500 text-zinc-950 font-black px-1.5 py-0.5 rounded text-[10px] block">
                          {c.points} pts
                        </span>
                        {getCreditBalance(c.id) > 0 && (
                          <span className="text-red-600 font-black text-[10px] block mt-1">{formatCLP(getCreditBalance(c.id))}</span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Customer Details History Pane */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm md:col-span-2">
              {selectedCrmCustomer ? (
                <div className="space-y-5 text-xs text-zinc-700">
                  <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
                    <div>
                      <h4 className="font-black text-lg text-zinc-900">{selectedCrmCustomer.name}</h4>
                      <p className="text-zinc-400 text-[11px] mt-0.5">Celular: <strong>{selectedCrmCustomer.phone}</strong> | Email: {selectedCrmCustomer.email || "No registrado"}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold block">Puntos Disponibles</span>
                      <strong className="text-lg font-black">{selectedCrmCustomer.points}</strong>
                    </div>
                  </div>

                  <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selectedCrmCustomer.isCreditAuthorized
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-zinc-50 border-zinc-100"
                  }`}>
                    <div>
                      <span className={`text-[10px] uppercase font-black tracking-wider ${
                        selectedCrmCustomer.isCreditAuthorized ? "text-emerald-700" : "text-zinc-400"
                      }`}>
                        {selectedCrmCustomer.isCreditAuthorized ? "Crédito autorizado" : "Sin crédito autorizado"}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-bold">
                        <span>{creditLabelText(selectedCrmCustomer.creditLabel)}</span>
                        <span>Límite: {selectedCrmCustomer.creditLimit ? formatCLP(selectedCrmCustomer.creditLimit) : "Sin límite definido"}</span>
                        <span>Saldo a cuenta: {formatCLP(getCreditBalance(selectedCrmCustomer.id))}</span>
                      </div>
                      {selectedCrmCustomer.creditNotes && (
                        <p className="text-[11px] text-zinc-500 mt-1">{selectedCrmCustomer.creditNotes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleCreditCustomer(selectedCrmCustomer)}
                      disabled={isCrmSaving}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                        selectedCrmCustomer.isCreditAuthorized
                          ? "bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                          : "bg-zinc-900 text-white hover:bg-amber-600"
                      }`}
                    >
                      {selectedCrmCustomer.isCreditAuthorized ? "Bloquear crédito" : "Autorizar crédito"}
                    </button>
                  </div>

                  {/* Customer history list */}
                  <div className="space-y-2">
                    <span className="font-bold text-zinc-900 uppercase tracking-wide text-[10px] block mb-2">Historial de Visitas y Puntos</span>
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {state.loyaltyTxs
                        .filter(tx => tx.customerId === selectedCrmCustomer.id)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((tx) => (
                          <div key={tx.id} className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl flex justify-between items-center">
                            <div>
                              <span className="font-bold text-zinc-800 block">{tx.description}</span>
                              <span className="text-zinc-400 text-[10px]">{new Date(tx.createdAt).toLocaleDateString()}</span>
                            </div>
                            <span className={`font-black ${tx.type === "EARNED" ? "text-emerald-600" : "text-red-500"}`}>
                              {tx.type === "EARNED" ? `+${tx.points}` : `-${tx.points}`} pts
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-zinc-400">
                  <Users className="w-12 h-12 text-zinc-200 mb-2" />
                  <h4 className="font-bold text-zinc-600">Selecciona un Cliente</h4>
                  <p className="text-xs text-zinc-400 max-w-[220px] mt-1">Haz clic en el listado para auditar fichas de fidelización.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: INVENTORY & RECIPES */}
        {activeTab === "inventory" && (
          <div className="space-y-6" id="admin-inventory-tab">
            
            {/* Ingredients table */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">Control de Insumos & Stock Mínimo</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Alertas automáticas de reposición para evitar quiebres en la carta.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2">Ingrediente</th>
                      <th className="py-2">Stock Actual</th>
                      <th className="py-2">Mínimo Alerta</th>
                      <th className="py-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.ingredients.map((ing) => {
                      const isLowStock = ing.stock <= ing.minStock;
                      return (
                        <tr key={ing.id} className="border-b border-zinc-100">
                          <td className="py-3 font-bold text-zinc-900 flex items-center gap-1.5">
                            {ing.name}
                            {isLowStock && (
                              <span className="bg-red-100 text-red-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" /> RECOMPRAR
                              </span>
                            )}
                          </td>
                          <td className={`py-3 font-black ${isLowStock ? "text-red-600" : "text-zinc-950"}`}>
                            {ing.stock} {ing.unit}
                          </td>
                          <td className="py-3 text-zinc-500 font-semibold">
                            {ing.minStock} {ing.unit}
                          </td>
                          <td className="py-3 text-right">
                            {addingStockIngId === ing.id ? (
                              <div className="flex gap-1 justify-end">
                                <input
                                  type="number"
                                  value={addingStockQty}
                                  onChange={(e) => setAddingStockQty(Number(e.target.value))}
                                  className="border border-zinc-200 rounded p-1 w-16 text-xs text-zinc-900 focus:outline-none"
                                />
                                <button
                                  onClick={() => handleAddStock(ing.id)}
                                  className="bg-emerald-600 text-white px-2 py-1 rounded font-bold"
                                >
                                  Refill
                                </button>
                                <button
                                  onClick={() => setAddingStockIngId(null)}
                                  className="bg-zinc-200 text-zinc-700 px-2 py-1 rounded font-bold"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setAddingStockIngId(ing.id);
                                  setAddingStockQty(1000);
                                }}
                                className="bg-zinc-900 hover:bg-amber-600 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-colors cursor-pointer"
                              >
                                + Cargar Stock
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recipes linked map */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-zinc-900 text-sm mb-1">🍔 Vinculación Receta-Insumo</h3>
              <p className="text-xs text-zinc-400 mb-4">Revisa cómo cada producto descuenta del stock y la cantidad teórica de platos cocinables.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.products.filter(p => p.recipe && p.recipe.length > 0).map((p) => (
                  <div key={p.id} className="border border-zinc-100 rounded-2xl p-3.5 bg-zinc-50 text-xs">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-black text-zinc-900">{p.name}</span>
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        Stock: {calculateDishesRemaningForProduct(p)}
                      </span>
                    </div>

                    <div className="space-y-1 mt-1">
                      {p.recipe.map((r) => {
                        const ing = state.ingredients.find(i => i.id === r.ingredientId);
                        return (
                          <div key={r.ingredientId} className="flex justify-between text-zinc-500 text-[11px]">
                            <span>• {ing ? ing.name : "Insumo"}</span>
                            <span>{r.quantity} {ing ? ing.unit : "g"} por ración</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 📋 Inventory Transaction Log (Kardex) */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5 mb-1">
                <History className="w-4 h-4 text-amber-500" /> Kardex de Movimientos - Historial de Consumo
              </h3>
              <p className="text-xs text-zinc-400 mb-4">Registro detallado de ingresos manuales, devoluciones por anulación, y consumo automático por comandas.</p>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {state.inventoryTransactions && state.inventoryTransactions.length > 0 ? (
                  [...state.inventoryTransactions]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((tx) => {
                      const isPositive = tx.change > 0;
                      return (
                        <div key={tx.id} className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs flex justify-between items-center">
                          <div className="space-y-0.5 text-left">
                            <span className="font-extrabold text-zinc-950 block">{tx.ingredientName}</span>
                            <div className="flex gap-1.5 items-center">
                              <span className={`px-1.5 py-0.5 font-bold rounded text-[8px] uppercase ${
                                tx.type === "ORDER_DEDUCTION" 
                                  ? "bg-red-50 text-red-700" 
                                  : tx.type === "VOID_RESTORE" 
                                    ? "bg-emerald-50 text-emerald-700" 
                                    : "bg-blue-50 text-blue-700"
                              }`}>
                                {tx.type === "ORDER_DEDUCTION" 
                                  ? "Consumo Comanda" 
                                  : tx.type === "VOID_RESTORE" 
                                    ? "Anulación" 
                                    : "Carga Manual"}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {new Date(tx.createdAt).toLocaleString("es-CL")}
                              </span>
                            </div>
                          </div>

                          <span className={`font-black text-xs ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                            {isPositive ? "+" : ""}{tx.change}
                          </span>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-12 text-zinc-400 text-xs">
                    <History className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                    <span>No hay transacciones de inventario aún</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: HISTORIAL DE BOLETAS */}
        {activeTab === "boletas" && (
          <div className="space-y-6" id="admin-boletas-tab">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-zinc-100 pb-4">
                <div className="text-left">
                  <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" /> Historial de Boletas & Ventas Cerradas
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Visualiza, audita e imprime boletas de consumo, o realiza anulaciones que restauran inventario.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-zinc-500">Filtrar por:</span>
                  <select
                    value={boletasPeriod}
                    onChange={(e) => setBoletasPeriod(e.target.value)}
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="all">Todas las fechas</option>
                    <option value="today">Hoy</option>
                    <option value="yesterday">Ayer</option>
                    <option value="7days">Últimos 7 días</option>
                    <option value="30days">Últimos 30 días</option>
                    <option value="custom">Rango Personalizado</option>
                  </select>

                  {boletasPeriod === "custom" && (
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={boletasStartDate}
                        onChange={(e) => setBoletasStartDate(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1 font-bold text-zinc-700 text-[11px]"
                      />
                      <span className="text-zinc-400 text-[10px]">al</span>
                      <input
                        type="date"
                        value={boletasEndDate}
                        onChange={(e) => setBoletasEndDate(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1 font-bold text-zinc-700 text-[11px]"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {state.orders.filter(o => (o.status === "CLOSED" || (o as any).voided) && isDateInPeriod(o.updatedAt, boletasPeriod, boletasStartDate, boletasEndDate)).length > 0 ? (
                  [...state.orders]
                    .filter(o => (o.status === "CLOSED" || (o as any).voided) && isDateInPeriod(o.updatedAt, boletasPeriod, boletasStartDate, boletasEndDate))
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map((order) => {
                      const isVoided = (order as any).voided;
                      const orderPayments = state.payments
                        .filter(p => p.orderId === order.id)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                      
                      const subtotal = order.items.reduce((sum, it) => {
                        const p = state.products.find(prod => prod.id === it.productId);
                        return sum + (p ? p.price : 0) * it.quantity;
                      }, 0);
                      const totalAmount = orderPayments.length > 0
                        ? orderPayments.reduce((sum, payment) => sum + payment.amount, 0)
                        : subtotal;
                      const tipAmount = orderPayments.reduce((sum, payment) => sum + (payment.tip || 0), 0);
                      const finalTotal = totalAmount;

                      const table = state.tables.find(t => t.id === order.tableId);

                      return (
                        <div key={order.id} className={`p-4 border rounded-2xl transition-all text-left ${
                          isVoided 
                            ? "bg-red-50/50 border-red-200" 
                            : "bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50"
                        }`}>
                          <div className="flex flex-col md:flex-row justify-between gap-4 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-zinc-900 text-sm">Comanda #{order.id.slice(-5).toUpperCase()}</span>
                                <span className={`px-2 py-0.5 font-bold rounded text-[9px] uppercase ${
                                  isVoided 
                                    ? "bg-red-100 text-red-800" 
                                    : "bg-emerald-100 text-emerald-800"
                                }`}>
                                  {isVoided ? "Anulado & Reembolsado" : "Pagado & Cerrado"}
                                </span>
                              </div>
                              <p className="text-zinc-500">
                                Mesa {table ? table.number : "?"} ({table?.zone}) • {order.customerCount} Comensales
                              </p>
                              <p className="text-zinc-400 text-[10px] font-mono">
                                Pagado: {new Date(order.updatedAt).toLocaleString("es-CL")}
                              </p>
                              {order.customerPhone && (
                                <p className="text-amber-800 text-[10px] font-bold">
                                  📞 Cliente: {order.customerPhone}
                                </p>
                              )}
                            </div>

                            <div className="flex-1 max-w-xs space-y-1 bg-white p-2.5 rounded-xl border border-zinc-100 text-left">
                              <span className="text-[9px] font-black uppercase text-zinc-400 block border-b border-zinc-100 pb-1">Detalle</span>
                              <div className="space-y-0.5 max-h-[100px] overflow-y-auto pr-1">
                                {order.items.map((it) => {
                                  const prod = state.products.find(p => p.id === it.productId);
                                  return (
                                    <div key={it.id} className="flex justify-between text-[10px] text-zinc-600">
                                      <span>{it.quantity}x {prod ? prod.name : "Item"}</span>
                                      <span>{formatCLP((prod ? prod.price : 0) * it.quantity)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="text-right space-y-2 flex flex-col justify-between items-end">
                              <div>
                                <span className="text-[10px] text-zinc-400 block font-bold">Monto Total</span>
                                <h4 className={`text-base font-black ${isVoided ? "text-red-600 line-through" : "text-zinc-950"}`}>
                                  {formatCLP(finalTotal)}
                                </h4>
                                {!isVoided && (
                                  <span className="text-[9px] text-zinc-400 block">
                                    {orderPayments.length} {orderPayments.length === 1 ? "boleta" : "boletas"} | Propina incluida: {formatCLP(tipAmount)}
                                  </span>
                                )}
                              </div>

                              {!isVoided && (
                                <div className="flex flex-wrap justify-end gap-2">
                                  {orderPayments.map((payment, paymentIndex) => {
                                    const previouslyPaid = orderPayments
                                      .slice(0, paymentIndex)
                                      .reduce((sum, candidate) => sum + candidate.amount, 0);
                                    const accountTotal = order.billingTotal ?? totalAmount;
                                    const remainingBalance = Math.max(0, accountTotal - previouslyPaid - payment.amount);
                                    return (
                                      <button
                                        key={payment.id}
                                        onClick={() => printThermalReceipt({
                                          order,
                                          state,
                                          payments: [payment],
                                          accountSubtotal: order.billingSubtotal ?? subtotal,
                                          accountDiscount: order.billingDiscount,
                                          accountTip: order.billingTip,
                                          accountTotal,
                                          previouslyPaid,
                                          remainingBalance,
                                        })}
                                        className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-700 text-white font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] border border-zinc-800 transition-colors cursor-pointer"
                                      >
                                        <Printer className="w-3.5 h-3.5" /> Boleta {paymentIndex + 1}: {formatCLP(payment.amount)}
                                      </button>
                                    );
                                  })}
                                  <button
                                    onClick={async () => {
                                      const reason = window.confirm("¿Seguro que deseas ANULAR este pedido? Se reembolsará el stock completo al inventario, se cancelarán las transacciones financieras y se descontarán los puntos del cliente.");
                                      if (!reason) return;

                                      const res = await fetch(`/api/orders/${order.id}/void`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ operatorName: "Administrador" })
                                      });
                                      if (res.ok) {
                                        alert("Pedido anulado y stock devuelto con éxito.");
                                        onRefreshState();
                                      }
                                    }}
                                    className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] border border-red-200 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Anular Venta
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-20 text-zinc-400">
                    <FileText className="w-10 h-10 text-zinc-200 mx-auto mb-2" />
                    <span className="font-bold">No hay ventas cerradas aún</span>
                    <p className="text-[11px] text-zinc-400 mt-1">Cuando los mozos cierren cuentas o cobren en caja, aparecerán aquí.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AUDITORÍA & RESPALDOS */}
        {activeTab === "audits" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="admin-audits-tab">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm md:col-span-1 space-y-4 text-left">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                  <Map className="w-4 h-4 text-amber-500" /> Modo Funcionamiento QR
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Define si los clientes pueden realizar pedidos autónomos desde el código QR de su mesa o si solo es de visualización.</p>
              </div>

              <div className="space-y-3 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Solo Menú QR (Lectura)</span>
                  <button
                    onClick={async () => {
                      const newStatus = !state.onlyViewMenuQr;
                      const res = await fetch("/api/admin/config/toggle-menu-qr", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ onlyViewMenuQr: newStatus, userName: "Administrador" })
                      });
                      if (res.ok) {
                        onRefreshState();
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      state.onlyViewMenuQr ? "bg-amber-600" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        state.onlyViewMenuQr ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="text-[10px] text-zinc-500 leading-relaxed font-semibold">
                  {state.onlyViewMenuQr ? (
                    <span className="text-amber-800 font-extrabold block">
                      📖 Modo Menú Digital activo. Los clientes pueden ver la carta, precios, alérgenos y fotos, pero no pueden enviar pedidos desde el móvil.
                    </span>
                  ) : (
                    <span className="text-zinc-600 block">
                      🛒 Modo Autoservicio activo. Los clientes pueden armar su carro de compras y enviar comandas directamente a cocina.
                    </span>
                  )}
                </div>
              </div>

              <hr className="border-zinc-100" />

              <div>
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-amber-500" /> Copias de Seguridad
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Exporta la base de datos completa como archivo JSON para tener respaldos físicos externos.</p>
              </div>

              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `hacienda_db_backup_${new Date().toISOString().split('T')[0]}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" /> Exportar Respaldo (JSON)
              </button>

              <hr className="border-zinc-100" />

              <div>
                <h4 className="font-bold text-zinc-900 text-xs">Restaurar Copia de Seguridad</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Sube un archivo de respaldo .json para restaurar el estado completo de mesas, menú, inventario y ventas.</p>
              </div>

              <div className="border-2 border-dashed border-zinc-200 hover:border-amber-400 transition-colors rounded-xl p-4 text-center cursor-pointer relative bg-zinc-50/50">
                <input
                  type="file"
                  accept=".json"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const parsed = JSON.parse(event.target?.result as string);
                        const confirmRestore = window.confirm("¿Estás seguro de que deseas restaurar este respaldo? Se sobrescribirá el estado actual del restaurant por completo.");
                        if (!confirmRestore) return;

                        const res = await fetch("/api/admin/db/import", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ state: parsed })
                        });
                        
                        if (res.ok) {
                          alert("Copia de seguridad restaurada con éxito.");
                          onRefreshState();
                        } else {
                          const errData = await res.json();
                          alert("Error al restaurar: " + errData.error);
                        }
                      } catch (err) {
                        alert("El archivo no es un JSON de base de datos válido.");
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                <span className="text-[11px] font-bold text-zinc-600 block">Sube un archivo .json</span>
                <span className="text-[9px] text-zinc-400">o haz clic para explorar</span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm md:col-span-2 space-y-4 text-left">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                    <History className="w-4 h-4 text-amber-500" /> Historial de Auditoría en Tiempo Real
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Línea de tiempo de acciones críticas, cierres de caja y auditorías operacionales.</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {state.auditLogs && state.auditLogs.length > 0 ? (
                  [...state.auditLogs]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((log) => {
                      return (
                        <div key={log.id} className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs space-y-1 text-left">
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-zinc-950 bg-amber-500/10 text-amber-800 px-2 py-0.5 rounded text-[10px] uppercase">
                              {log.action}
                            </span>
                            <span className="text-zinc-400 text-[10px] font-mono">
                              {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-zinc-700 font-medium leading-relaxed">{log.details}</p>
                          {log.userName && (
                            <span className="text-[10px] text-zinc-400 block font-bold">
                              Operador: {log.userName}
                            </span>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-20 text-zinc-400">
                    <History className="w-10 h-10 text-zinc-200 mx-auto mb-2" />
                    <span className="font-bold">No hay registros de auditoría aún</span>
                    <p className="text-[11px] text-zinc-400 mt-1">Las acciones del personal se registrarán aquí.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: QR CODES */}
        {activeTab === "qr" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-zinc-950">Gestión de mesas</h2>
                <p className="mt-0.5 text-xs text-zinc-500">{state.tables.length} mesas registradas en el sistema.</p>
              </div>
              <button
                onClick={() => setIsAddTableOpen(true)}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-zinc-950 hover:bg-amber-400 flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Agregar mesa
              </button>
            </div>
            {tableNotice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{tableNotice}</p>}
            <QRGenerator tables={state.tables} restaurantName="Restaurant Hacienda" />
          </div>
        )}

        {/* TAB 8: PERSONAL & ROLES MANAGEMENT */}
        {activeTab === "personal" && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-6 text-left" id="admin-personal-tab">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-500" /> Control de Personal y Autorizaciones
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Administra usuarios, contraseñas y permisos de acceso.</p>
              </div>
              <button
                onClick={openAddUserModal}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer animate-fade-in"
              >
                <UserPlus className="w-4 h-4" /> Agregar Personal
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.users.map((u) => {
                const userPermissions = u.permissions || [];
                return (
                  <div key={u.id} className="border border-zinc-200 hover:border-amber-500/40 hover:shadow-md transition-all rounded-2xl p-4 flex flex-col justify-between bg-zinc-50/50">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-sm text-zinc-900 block">{u.name}</span>
                          <span className="text-[10px] bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                            {u.role === "ADMIN" ? "Administrador" : u.role === "WAITER" ? "Mozo / POS" : "Cocinero KDS"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-zinc-700">
                          <Lock className="w-3 h-3 text-zinc-400" />
                          <span>{u.username || u.name.split("(")[0].trim().split(/\s+/)[0].toLowerCase()}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-200/50 space-y-1">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Autorizaciones</span>
                        {userPermissions.length === 0 ? (
                          <span className="text-[10px] text-zinc-400 italic block">Sin permisos administrativos asignados</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {userPermissions.map(p => (
                              <span key={p} className="bg-amber-500/10 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/20">
                                {p === "manage_menu" ? "🍔 Carta" : p === "manage_inventory" ? "📦 Stock" : p === "view_reports" ? "📊 Ventas" : "👥 Personal"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-200/50">
                      <button
                        onClick={() => openEditUserModal(u)}
                        className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer text-center"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === activeUser?.id}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 cursor-pointer"
                        title={u.id === activeUser?.id ? "No puedes eliminar tu propio usuario" : "Eliminar personal"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* MODAL: AGREGAR / EDITAR PERSONAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col text-left animate-slide-up">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                {editingUser ? "Editar Personal" : "Agregar Nuevo Personal"}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {staffError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{staffError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej: Pedro González"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-950 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Usuario</label>
                  <input
                    type="text"
                    autoCapitalize="none"
                    placeholder="Ej: pedro"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-950 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">{editingUser ? "Nueva contraseña (opcional)" : "Contraseña"}</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder={editingUser ? "Dejar igual" : "Contraseña segura"}
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-950 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">
                    {editingUser ? "Nuevo PIN (opcional)" : "PIN (4 números)"}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder={editingUser ? "Dejar igual" : "Ej: 5555"}
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-center font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-950"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Rol Principal</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as Role)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-950 font-bold"
                  >
                    <option value={Role.WAITER}>Mozo (POS)</option>
                    <option value={Role.KITCHEN}>Cocina (KDS)</option>
                    <option value={Role.ADMIN}>Administrador</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <label className="text-xs font-bold text-zinc-700 block">Autorizaciones / Permisos</label>
                <div className="space-y-2 bg-zinc-50 border border-zinc-200 p-4 rounded-2xl">
                  {[
                    { id: "manage_menu", title: "🍔 Gestionar Carta & Precios", desc: "Permite agregar platos, cambiar precios y pausar disponibilidad." },
                    { id: "manage_inventory", title: "📦 Gestionar Inventario", desc: "Permite revisar y ajustar stock de ingredientes." },
                    { id: "view_reports", title: "📊 Ver Ventas y Reportes", desc: "Permite ver cierres de turno, historial de boletas y estadísticas." },
                    { id: "manage_staff", title: "👥 Gestionar Personal y Sistema", desc: "Permite crear usuarios, modificar permisos y cambiar modo de mesa." },
                  ].map((p) => (
                    <label key={p.id} className="flex items-start gap-3 cursor-pointer p-1.5 hover:bg-zinc-200/40 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={staffPermissions.includes(p.id) || staffRole === Role.ADMIN}
                        disabled={staffRole === Role.ADMIN}
                        onChange={() => togglePermission(p.id)}
                        className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-zinc-300"
                      />
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block">{p.title}</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">{p.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex gap-2">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="flex-1 py-3 text-zinc-500 hover:text-zinc-700 font-bold text-xs cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={isStaffSaving}
                className="flex-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isStaffSaving ? "Guardando..." : "Guardar Personal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR / EDITAR PRODUCTO */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col text-left animate-slide-up">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-900 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                {editingProductModal ? "Editar Plato" : "Agregar Nuevo Plato"}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {prodError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{prodError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Nombre del Plato / Producto</label>
                <input
                  type="text"
                  placeholder="Ej: Lomo Liso Premium"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-950 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Categoría</label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-950 font-bold"
                  >
                    {state.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Precio de Venta ($ CLP)</label>
                  <input
                    type="number"
                    placeholder="Ej: 18500"
                    value={prodPrice || ""}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-950"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Descripción / Ingredientes</label>
                <textarea
                  placeholder="Ej: Jugoso corte de lomo liso de 350g, asado a las brasas con sal de mar..."
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">URL de Imagen (Opcional)</label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/foto.jpg"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-955 font-mono text-zinc-950"
                />
              </div>

              <button
                type="button"
                onClick={() => setProdIsRecommended(prev => !prev)}
                className={`w-full border rounded-xl p-3 text-left flex items-center justify-between transition-all cursor-pointer ${
                  prodIsRecommended
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className={`w-4 h-4 ${prodIsRecommended ? "fill-amber-500 text-amber-500" : "text-zinc-400"}`} />
                  <div>
                    <span className="text-xs font-black block">Plato recomendado</span>
                    <span className="text-[10px] text-zinc-400 font-semibold">
                      Se mostrará destacado con estrella en la carta pública.
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                  prodIsRecommended ? "bg-amber-500 text-zinc-950" : "bg-white border border-zinc-200 text-zinc-400"
                }`}>
                  {prodIsRecommended ? "Activo" : "No"}
                </span>
              </button>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 block">Alérgenos</label>
                <div className="flex flex-wrap gap-2">
                  {["Gluten", "Lácteos", "Mariscos", "Huevo", "Soya", "Maní", "Frutos Secos"].map((alg) => {
                    const active = prodAllergens.includes(alg);
                    return (
                      <button
                        key={alg}
                        type="button"
                        onClick={() => toggleAllergen(alg)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                          active
                            ? "bg-amber-500 border-amber-600 text-zinc-950 shadow-sm"
                            : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                        }`}
                      >
                        ⚠️ {alg}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex gap-2">
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="flex-1 py-3 text-zinc-500 hover:text-zinc-700 font-bold text-xs cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={isProductSaving}
                className="flex-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProductSaving ? "Guardando..." : editingProductModal ? "Guardar Cambios" : "Guardar Plato"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddTableOpen && (
        <AddTableModal
          tables={state.tables}
          operatorName={activeUser?.name || "Administrador"}
          onClose={() => setIsAddTableOpen(false)}
          onAdded={(table) => {
            setTableNotice(`Mesa ${table.number} agregada correctamente.`);
            window.setTimeout(() => setTableNotice(""), 3500);
          }}
        />
      )}
    </div>
  );
}
