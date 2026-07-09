import React, { useState, useEffect } from "react";
import { 
  RestaurantState, 
  Product, 
  Category, 
  Ingredient, 
  Customer, 
  CustomerLoyaltyTx, 
  Promotion, 
  Payment 
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
  FileDown
} from "lucide-react";

interface AdminViewProps {
  state: RestaurantState;
  onRefreshState: () => void;
}

export default function AdminView({ state, onRefreshState }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<"reports" | "boletas" | "menu" | "crm" | "inventory" | "audits">("reports");
  
  // Inventory actions
  const [addingStockIngId, setAddingStockIngId] = useState<string | null>(null);
  const [addingStockQty, setAddingStockQty] = useState(1000);
  
  // Menu action modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState(0);

  // CRM action state
  const [crmSearch, setCrmSearch] = useState("");
  const [selectedCrmCustomer, setSelectedCrmCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    onRefreshState();
  }, []);

  const formatCLP = (val: number) => "$" + Math.round(val).toLocaleString("es-CL");

  // 1. CALCULATE REAL METRICS FROM COMPLETED PAYMENTS & ORDERS
  const completedPayments = state.payments || [];
  const totalSalesVolume = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalTipVolume = completedPayments.reduce((sum, p) => sum + p.tip, 0);
  const totalOrdersCount = state.orders.length;
  const closedOrdersCount = state.orders.filter(o => o.status === "CLOSED").length;
  const averageTicket = closedOrdersCount > 0 ? Math.round(totalSalesVolume / closedOrdersCount) : 0;

  // Best selling products count
  const productSalesMap: Record<string, number> = {};
  state.orders.forEach(o => {
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
          minStock: ing.minStock
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
          price: editPrice
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
        method: "POST"
      });
      if (res.ok) {
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
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
        {[
          { id: "reports", name: "📈 Reportes Analíticos" },
          { id: "boletas", name: "🧾 Historial de Boletas" },
          { id: "menu", name: "🍔 Carta & Precios" },
          { id: "crm", name: "👥 CRM & Fidelidad" },
          { id: "inventory", name: "📦 Inventario" },
          { id: "audits", name: "🛡️ Auditoría & Backups" },
        ].map((tab) => (
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
            {/* Bento Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Ventas Hoy</span>
                  <h3 className="font-extrabold text-lg text-zinc-950 mt-0.5">{formatCLP(totalSalesVolume)}</h3>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Ticket Promedio</span>
                  <h3 className="font-extrabold text-lg text-zinc-950 mt-0.5">{formatCLP(averageTicket)}</h3>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Comandas</span>
                  <h3 className="font-extrabold text-lg text-zinc-950 mt-0.5">{totalOrdersCount} mesas</h3>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Propinas Recibidas</span>
                  <h3 className="font-extrabold text-lg text-zinc-950 mt-0.5">{formatCLP(totalTipVolume)}</h3>
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
                    const waiterOrders = state.orders.filter(o => o.waiterId === w.id);
                    const completedSales = state.payments.filter(p => {
                      const ord = state.orders.find(o => o.id === p.orderId);
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
                  state.payments.forEach(pay => {
                    const ord = state.orders.find(o => o.id === pay.orderId);
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
                    state.payments.forEach(p => {
                      const o = state.orders.find(or => or.id === p.orderId);
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
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">Hamburguesas, Carnes y Platos</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Controla los precios de venta y desactiva platos agotados de forma inmediata.</p>
              </div>
            </div>

            <div className="space-y-3">
              {state.products.map((p) => (
                <div key={p.id} className="border-b border-zinc-100 pb-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-zinc-900 block">{p.name}</span>
                    <span className="text-zinc-400">{state.categories.find(c => c.id === p.categoryId)?.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {editingProduct?.id === p.id ? (
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="bg-zinc-50 border border-zinc-200 rounded p-1 w-20 text-xs text-zinc-900 font-bold"
                        />
                        <button onClick={handlePriceUpdate} className="bg-emerald-600 text-white px-2 py-1 rounded font-bold">✓</button>
                        <button onClick={() => setEditingProduct(null)} className="bg-zinc-200 text-zinc-700 px-2 py-1 rounded font-bold">X</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-zinc-900">{formatCLP(p.price)}</span>
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setEditPrice(p.price);
                          }}
                          className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

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
          </div>
        )}

        {/* TAB 3: CRM & LOYALTY */}
        {activeTab === "crm" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="admin-crm-tab">
            
            {/* Customers list area */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm md:col-span-1">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-2">Listado de Clientes</span>
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
                      </div>
                      <span className="bg-amber-500 text-zinc-950 font-black px-1.5 py-0.5 rounded text-[10px]">
                        {c.points} pts
                      </span>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" /> Historial de Boletas & Ventas Cerradas
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Visualiza, audita e imprime boletas de consumo, o realiza anulaciones que restauran inventario.</p>
                </div>
              </div>

              <div className="space-y-3">
                {state.orders.filter(o => o.status === "CLOSED" || (o as any).voided).length > 0 ? (
                  [...state.orders]
                    .filter(o => o.status === "CLOSED" || (o as any).voided)
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map((order) => {
                      const isVoided = (order as any).voided;
                      const orderPayment = state.payments.find(p => p.orderId === order.id);
                      
                      const subtotal = order.items.reduce((sum, it) => {
                        const p = state.products.find(prod => prod.id === it.productId);
                        return sum + (p ? p.price : 0) * it.quantity;
                      }, 0);
                      const totalAmount = orderPayment ? orderPayment.amount : subtotal;
                      const tipAmount = orderPayment ? orderPayment.tip : 0;
                      const finalTotal = totalAmount + tipAmount;

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
                                    Subtotal: {formatCLP(totalAmount)} | Propina: {formatCLP(tipAmount)}
                                  </span>
                                )}
                              </div>

                              {!isVoided && (
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

      </div>
    </div>
  );
}
