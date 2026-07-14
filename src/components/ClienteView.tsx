import React, { useState, useEffect } from "react";
import { 
  RestaurantState, 
  Product, 
  Category, 
  OrderItem, 
  SelectedItemModifier, 
  OrderStatus, 
  OrderItemStatus,
  Table
} from "../types";
import { 
  Search, 
  ShoppingCart, 
  Bell, 
  Receipt, 
  Info, 
  Plus, 
  Minus, 
  X, 
  Check, 
  Clock, 
  ChefHat, 
  UtensilsCrossed, 
  Coins,
  Sparkles,
  Star,
  Award,
  Flame,
  ArrowRight,
  BookOpen,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MENU_CATEGORY_TRANSLATIONS, MENU_PRODUCT_TRANSLATIONS } from "../menuTranslations";

interface ClienteViewProps {
  state: RestaurantState;
  activeTableId: string;
  onRefreshState: () => void;
}

const TRANSLATIONS = {
  es: {
    title: "Hacienda",
    subtitle: "Tradición & Alta Parrilla",
    motto: '"Fuegos de la tradición campera, cortes premium madurados y los más selectos ingredientes de nuestra tierra chilena."',
    mesa: "Mesa",
    viewingMenu: "CARTA DIGITAL HACIENDA",
    callWaiter: "Llamar al Mozo",
    requestBill: "Pedir la Cuenta",
    chefSpecials: "Especialidades Recomendadas",
    chefSpecialsSub: "Nuestras joyas gastronómicas más aclamadas de la cocina tradicional.",
    allPlates: "📋 Todos los platos",
    searchPlaceholder: "Buscar empanadas, lomo, pisco sour...",
    sinGluten: "🚫🌾 Sin Gluten",
    sinLacteos: "🥛🚫 Sin Lácteos",
    noProducts: "No se encontraron productos en esta sección.",
    resetFilters: "Restablecer filtros",
    chefSuggestion: "Sugerencia del Maestro Cocinero",
    chefSuggestionText: "Recomendamos disfrutar este plato caliente y maridarlo con nuestra selección de vinos tintos del Valle Central.",
    allergensTitle: "Información de Alérgenos",
    allergensContains: "Contiene",
    specialNotes: "Notas especiales o especificaciones",
    specialNotesPlaceholder: "Ej. Sin cebolla, aderezo aparte, punto bien jugoso...",
    quantity: "Cantidad",
    backToMenu: "Volver a la Carta",
    pairingTitle: "🍷 Maridaje de Selección Sugerido",
    pairingExplanation: "Creado por nuestro Sommelier para realzar los sabores y texturas de este plato.",
    likesCount: "les encanta este plato",
    youLiked: "¡Te gusta!",
    loveThis: "Guardar favorito",
    digitalMenuBannerTitle: "Bienvenidos a la Mesa de Hacienda",
    digitalMenuBannerDesc: '"Nuestra cocina rescata los fuegos de la tradición criolla, seleccionando con pasión cortes madurados e ingredientes locales para honrar las raíces de nuestra gastronomía."',
    digitalMenuBannerItem1Title: "Carnes de Selección",
    digitalMenuBannerItem1Desc: "Cortes premium madurados, asados con maestría sobre leña de espino.",
    digitalMenuBannerItem2Title: "Cepa & Terroir",
    digitalMenuBannerItem2Desc: "Una fina curaduría de vinos chilenos escogidos para maridar cada corte.",
    digitalMenuBannerItem3Title: "Cosecha Criolla",
    digitalMenuBannerItem3Desc: "Verduras de productores locales e ingredientes que narran nuestra historia.",
    digitalMenuModeActive: "📖 Modo Menú Digital Activo",
    digitalMenuExplore: "Explora nuestra carta actual. Para realizar tu pedido, solicítalo a nuestro personal de servicio.",
    recetaHacienda: "Receta Hacienda",
    casa: "Casa",
    destacado: "Destacado",
    agotado: "Agotado",
    verPlato: "Ver Plato",
    recommended: "RECOMENDADO",
    pausado: "Pausado",
  },
  en: {
    title: "Hacienda",
    subtitle: "Tradition & Premium Grill",
    motto: '"Fire of country tradition, premium aged meats, and the most select ingredients of our Chilean land."',
    mesa: "Table",
    viewingMenu: "HACIENDA DIGITAL MENU",
    callWaiter: "Call Waiter",
    requestBill: "Request Bill",
    chefSpecials: "Recommended Chef Specials",
    chefSpecialsSub: "Our most acclaimed culinary jewels of traditional cuisine.",
    allPlates: "📋 All Dishes",
    searchPlaceholder: "Search empanadas, steak, pisco sour...",
    sinGluten: "🚫🌾 Gluten-Free",
    sinLacteos: "🥛🚫 Dairy-Free",
    noProducts: "No products found in this section.",
    resetFilters: "Reset filters",
    chefSuggestion: "Chef's Suggestion",
    chefSuggestionText: "We recommend enjoying this dish hot and pairing it with our fine selection of red wines from the Colchagua Valley.",
    allergensTitle: "Allergen Information",
    allergensContains: "Contains",
    specialNotes: "Special instructions or notes",
    specialNotesPlaceholder: "E.g., No onions, dressing on the side, juicy medium rare...",
    quantity: "Quantity",
    backToMenu: "Back to Menu",
    pairingTitle: "🍷 Suggested Fine Pairing",
    pairingExplanation: "Curated by our Sommelier to elevate the flavor profiles and textures of this dish.",
    likesCount: "people love this dish",
    youLiked: "Liked!",
    loveThis: "Add to favorites",
    digitalMenuBannerTitle: "Welcome to Hacienda's Table",
    digitalMenuBannerDesc: '"Our kitchen rescues the embers of creole tradition, passionately selecting aged cuts and local ingredients to honor the roots of our gastronomy."',
    digitalMenuBannerItem1Title: "Selected Meats",
    digitalMenuBannerItem1Desc: "Premium aged cuts, masterfully grilled over native hawthorn firewood.",
    digitalMenuBannerItem2Title: "Vine & Terroir",
    digitalMenuBannerItem2Desc: "A fine curation of Chilean wines chosen to pair beautifully with each cut.",
    digitalMenuBannerItem3Title: "Creole Harvest",
    digitalMenuBannerItem3Desc: "Locally farmed vegetables and ingredients that narrate our culinary history.",
    digitalMenuModeActive: "📖 Digital Menu Active",
    digitalMenuExplore: "Explore our current menu. To place your order, please request it directly from our service staff.",
    recetaHacienda: "Hacienda Recipe",
    casa: "House",
    destacado: "Featured",
    agotado: "Out of Stock",
    verPlato: "View Dish",
    recommended: "RECOMMENDED",
    pausado: "Paused",
  }
};

const PRODUCT_TRANSLATIONS: Record<string, { name: string; description: string }> = {
  p1: {
    name: "Classic Beef Empanada",
    description: "Traditional wood-fired Chilean pastry filled with hand-minced beef, sautéed onions, hard-boiled egg, and a black olive."
  },
  p2: {
    name: "Wild Reineta Ceviche",
    description: "Fresh local sea bream fish marinated in fresh lime juice, red onions, sweet bell peppers, and fresh cilantro."
  },
  p3: {
    name: "Grilled Provoleta Cheese",
    description: "Melted premium provolone cheese seasoned with fresh wild oregano and a splash of olive oil."
  },
  p4: {
    name: "Lomo a lo Pobre Steak",
    description: "300g premium flame-broiled ribeye steak, golden crispy hand-cut fries, caramelized onions, and two fried eggs."
  },
  p5: {
    name: "Hacienda Sweet Corn Pie",
    description: "Traditional sweet corn and sweet basil soufflé baked in artisan clay pot over savory beef, chicken, olives, and egg."
  },
  p6: {
    name: "Pan-Seared Patagonia Salmon",
    description: "Patagonian salmon fillet on the griddle with lemon herb butter sauce and casera duchess potatoes."
  },
  p7: {
    name: "Traditional Pisco Sour",
    description: "Premium Chilean pisco 35°, fresh lime juice from Pica, simple syrup, egg whites, and Angostura bitters."
  }
};

const PRODUCT_PAIRINGS: Record<string, { es: { name: string; desc: string }; en: { name: string; desc: string } }> = {
  p1: {
    es: { name: "🍷 Copa de Cabernet Sauvignon Reserva", desc: "La frutosidad y taninos de este tinto estructuran perfectamente la jugosidad de la empanada chilena." },
    en: { name: "🍷 Glass of Cabernet Sauvignon Reserve", desc: "The fruitiness and robust tannins of this red wine perfectly complement the richness and spices of the empanada." }
  },
  p2: {
    es: { name: "🍷 Copa de Sauvignon Blanc Valle de Casablanca", desc: "Notas cítricas y excelente acidez para equilibrar la frescura y limón de nuestro ceviche costero." },
    en: { name: "🍷 Glass of Casablanca Valley Sauvignon Blanc", desc: "Crisp citrus notes and bright acidity balance the fresh, tangy lime marinade of our coastal ceviche." }
  },
  p3: {
    es: { name: "🍷 Copa de Carmenere Gran Reserva Colchagua", desc: "Los dejos especiados y cuerpo medio de esta cepa maridan de manera sublime con la untuosidad del queso fundido." },
    en: { name: "🍷 Glass of Colchagua Carmenere Gran Reserva", desc: "The subtle spicy undertones and medium body of this varietal pair sublimely with the rich, melted provolone." }
  },
  p4: {
    es: { name: "🍷 Copa de Syrah Premium Cordillera", desc: "Intenso y especiado, ideal para acompañar el lomo vetado a la parrilla y el toque dulce de las cebollas." },
    en: { name: "🍷 Glass of Cordillera Premium Syrah", desc: "Intense and spicy notes, ideal to cut through the ribeye marbling and balance the sweet caramelized onions." }
  },
  p5: {
    es: { name: "🍹 Pisco Sour Tradicional de la Hacienda", desc: "La acidez dulce y refrescante limpia el paladar realzando el dulzor natural del choclo tierno." },
    en: { name: "🍹 Hacienda Traditional Pisco Sour", desc: "The sweet, refreshing citrus acidity cleanses the palate while accentuating the sweet corn soufflé's natural creaminess." }
  },
  p6: {
    es: { name: "🍷 Copa de Chardonnay de la Costa", desc: "Un blanco untuoso con notas de madera suave que marida perfectamente con la grasitud noble del salmón." },
    en: { name: "🍷 Glass of Coastal Reserve Chardonnay", desc: "A buttery white with subtle oak notes that matches perfectly with the rich texture and flavors of fresh salmon." }
  },
  p7: {
    es: { name: "🥟 Empanaditas de Cóctel del Chef", desc: "El mejor acompañamiento para abrir el apetito junto con un refrescante cóctel de la casa." },
    en: { name: "🥟 Chef's Cocktail Mini-Empanadas", desc: "The ultimate pairing to open up the appetite alongside our signature house sour." }
  },
};

export default function ClienteView({ state, activeTableId, onRefreshState }: ClienteViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dietaryFilter, setDietaryFilter] = useState<string>("all"); // "gluten-free", "lacteos-free", "all"
  
  // Premium Features States
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  
  const [likes, setLikes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("hacienda_menu_likes_counts");
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return { p1: 142, p2: 98, p3: 110, p4: 312, p5: 254, p6: 184, p7: 420 };
  });

  const [userLikes, setUserLikes] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("hacienda_user_liked_items");
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return {};
  });

  const t = TRANSLATIONS[language];

  const getTranslatedCategoryName = (cat: Category) => {
    if (language === 'en') {
      const translatedName = (cat as Category & { nameEn?: string }).nameEn || MENU_CATEGORY_TRANSLATIONS[cat.id];
      if (translatedName) return translatedName;
    }
    return cat.name;
  };

  const getTranslatedProductData = (p: Product) => {
    if (language === 'en') {
      const staticTranslation = MENU_PRODUCT_TRANSLATIONS[p.id] || PRODUCT_TRANSLATIONS[p.id];
      if (p.nameEn || p.descriptionEn || staticTranslation) {
        return {
          ...p,
          name: p.nameEn || staticTranslation?.name || p.name,
          description: p.descriptionEn || staticTranslation?.description || p.description,
        };
      }
    }
    return p;
  };

  const getTranslatedAllergen = (alg: string) => {
    if (language === 'en') {
      const lower = alg.toLowerCase();
      if (lower.includes("gluten")) return "Gluten";
      if (lower.includes("lácteos") || lower.includes("lacteos") || lower.includes("dairy")) return "Dairy";
      if (lower.includes("huevo") || lower.includes("egg")) return "Eggs";
      if (lower.includes("pescado") || lower.includes("fish")) return "Fish";
      if (lower.includes("mariscos") || lower.includes("seafood") || lower.includes("shellfish")) return "Shellfish";
    }
    return alg;
  };

  const handleLikeProduct = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const alreadyLiked = userLikes[productId];
    
    const nextUserLikes = { ...userLikes, [productId]: !alreadyLiked };
    const nextLikes = { ...likes, [productId]: (likes[productId] || 100) + (alreadyLiked ? -1 : 1) };
    
    setUserLikes(nextUserLikes);
    setLikes(nextLikes);
    
    localStorage.setItem("hacienda_user_liked_items", JSON.stringify(nextUserLikes));
    localStorage.setItem("hacienda_menu_likes_counts", JSON.stringify(nextLikes));
    
    if (!alreadyLiked) {
      showNotice(language === 'es' ? "¡Agregado a tus favoritos! ❤️" : "Added to your favorites! ❤️", "success");
    }
  };

  // Cart state
  const [cart, setCart] = useState<Array<{
    product: Product;
    quantity: number;
    notes: string;
    modifiers: SelectedItemModifier[];
  }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isRegisteringLoyalty, setIsRegisteringLoyalty] = useState(false);

  // Active item for variant modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNotes, setModalNotes] = useState("");
  const [modalModifiers, setModalModifiers] = useState<SelectedItemModifier[]>([]);

  // Submitting order
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Poll for state updates every 3 seconds to represent real-time changes
  useEffect(() => {
    const interval = setInterval(() => {
      onRefreshState();
    }, 3000);
    return () => clearInterval(interval);
  }, [onRefreshState]);

  // Current active order for this table
  const currentOrder = state.orders.find(o => o.tableId === activeTableId && o.status !== OrderStatus.CLOSED);
  const activeTable = state.tables.find(t => t.id === activeTableId);

  // All active (non-closed) orders for this table — for accumulated total
  const allActiveTableOrders = state.orders.filter(
    (o) => o.tableId === activeTableId && o.status !== OrderStatus.CLOSED
  );

  // Helper categories
  const categories = state.categories;
  const products = state.products;

  // Modifiers available for products dynamically based on category/product
  const getModifiersForProduct = (product: Product) => {
    const isEn = language === "en";
    if (product.categoryId === "c3") { // Bebidas
      return [
        {
          id: "mod_ice",
          name: isEn ? "Ice" : "Hielo",
          type: "SINGLE",
          options: [
            { id: "opt_ice_yes", name: isEn ? "With ice" : "Con hielo", extraPrice: 0 },
            { id: "opt_ice_no", name: isEn ? "No ice" : "Sin hielo", extraPrice: 0 },
          ]
        },
        {
          id: "mod_lemon",
          name: isEn ? "Lemon Slice" : "Rodaja de Limón",
          type: "SINGLE",
          options: [
            { id: "opt_lem_yes", name: isEn ? "With lemon slice" : "Con rodaja de limón", extraPrice: 0 },
            { id: "opt_lem_no", name: isEn ? "No lemon" : "Sin limón", extraPrice: 0 },
          ]
        }
      ];
    } else if (product.categoryId === "c2") { // Carnes/Fondos
      return [
        {
          id: "mod_temp",
          name: isEn ? "Cooking Doneness" : "Punto de Cocción",
          type: "SINGLE",
          options: [
            { id: "opt_temp_rare", name: isEn ? "Rare (Juicy)" : "Jugoso (Sangrante)", extraPrice: 0 },
            { id: "opt_temp_medium", name: isEn ? "Medium" : "A Punto (Término medio)", extraPrice: 0 },
            { id: "opt_temp_well", name: isEn ? "Well Done" : "Bien Cocido", extraPrice: 0 },
          ]
        }
      ];
    }
    return [];
  };

  const handleOpenProductModal = (product: Product) => {
    setSelectedProduct(product);
    setModalQuantity(1);
    setModalNotes("");
    
    // Set default modifiers
    const mods = getModifiersForProduct(product);
    const defaults: SelectedItemModifier[] = mods.map(m => ({
      modifierId: m.id,
      optionId: m.options[0].id,
      name: `${m.name}: ${m.options[0].name}`,
      extraPrice: m.options[0].extraPrice
    }));
    setModalModifiers(defaults);
  };

  const handleModifierChange = (modId: string, optId: string, modName: string, optName: string, extra: number) => {
    setModalModifiers(prev => {
      const filtered = prev.filter(m => m.modifierId !== modId);
      return [...filtered, {
        modifierId: modId,
        optionId: optId,
        name: `${modName}: ${optName}`,
        extraPrice: extra
      }];
    });
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    setCart(prev => [
      ...prev,
      {
        product: selectedProduct,
        quantity: modalQuantity,
        notes: modalNotes,
        modifiers: [...modalModifiers]
      }
    ]);
    setSelectedProduct(null);
    showNotice("Producto agregado al carrito", "success");
  };

  const showNotice = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificationMsg({ text, type });
    setTimeout(() => {
      setNotificationMsg(null);
    }, 4000);
  };

  // Trigger actions
  const handleCallWaiter = async () => {
    if (!activeTable) return;
    try {
      const res = await fetch("/api/notifications/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: activeTable.number, type: "CALL_WAITER" })
      });
      if (res.ok) {
        showNotice("Llamando al mozo... Un asistente se acercará pronto.", "info");
      }
    } catch (e) {
      showNotice("Error de conexión, intenta de nuevo.", "error");
    }
  };

  const handleRequestBill = async () => {
    if (!activeTable) return;
    try {
      const res = await fetch("/api/notifications/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: activeTable.number, type: "REQUEST_BILL" })
      });
      if (res.ok) {
        showNotice("Solicitud de cuenta enviada. El mozo traerá tu boleta.", "info");
        onRefreshState();
      }
    } catch (e) {
      showNotice("Error de conexión, intenta de nuevo.", "error");
    }
  };

  const handleSendOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    
    try {
      // First, if customer input loyalty details, register/update them
      if (customerPhone && customerName) {
        await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: customerName, phone: customerPhone })
        });
      }

      // Prepare order payload
      const payload = {
        tableId: activeTableId,
        customerCount: 2, // simulated count
        notes: "Pedido desde la mesa por QR",
        customerPhone: customerPhone || undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
          selectedModifiers: item.modifiers,
          tanda: item.product.categoryId === "c1" ? 1 : 2 // starters first, then mains
        }))
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCart([]);
        setIsCartOpen(false);
        showNotice("¡Pedido enviado con éxito! Esperando aprobación del personal.", "success");
        onRefreshState();
      } else {
        showNotice("Hubo un problema al procesar tu pedido.", "error");
      }
    } catch (e) {
      showNotice("Error de conexión.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.categoryId === selectedCategory;
    
    let matchesDietary = true;
    if (dietaryFilter === "gluten-free") {
      matchesDietary = !p.allergens.includes("Gluten");
    } else if (dietaryFilter === "lacteos-free") {
      matchesDietary = !p.allergens.includes("Lácteos");
    }

    return matchesSearch && matchesCategory && matchesDietary;
  });

  const cartTotal = cart.reduce((acc, item) => {
    const modifierPrice = item.modifiers.reduce((sum, m) => sum + m.extraPrice, 0);
    return acc + ((item.product.price + modifierPrice) * item.quantity);
  }, 0);

  // Accumulated total from previous orders at this table
  const previousOrdersTotal = allActiveTableOrders.reduce((acc, order) => {
    return acc + order.items.reduce((sum, item) => {
      const product = state.products.find(p => p.id === item.productId);
      const modPrice = item.selectedModifiers?.reduce((ms, m) => ms + m.extraPrice, 0) || 0;
      return sum + ((product?.price || 0) + modPrice) * item.quantity;
    }, 0);
  }, 0);
  const grandTotal = previousOrdersTotal + cartTotal;

  const formatPrice = (price: number) => {
    return "$" + price.toLocaleString("es-CL");
  };

  return (
    <div className="bg-stone-50 min-h-screen pb-24 font-sans" id="cliente-root-view">
      {/* Visual Cinematic Header Banner */}
      <div 
        className="text-white py-20 px-6 relative overflow-hidden flex flex-col items-center justify-center text-center border-b border-amber-950/20 shadow-lg"
        style={{ backgroundColor: "var(--color-bg-header)" }}
      >
        <div className="absolute inset-0 opacity-30 bg-cover bg-center scale-105 transition-transform duration-1000" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/45 to-black/90"></div>
        
        {/* Language switcher absolute top right */}
        <div className="absolute top-4 right-4 z-20 flex gap-1 bg-black/60 backdrop-blur-md border border-white/10 p-1 rounded-full text-[9px] font-bold shadow-sm">
          <button 
            onClick={() => { setLanguage('es'); showNotice("Idioma: Español 🇨🇱", "info"); }}
            className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${language === 'es' ? 'bg-amber-500 text-stone-950 font-black' : 'text-zinc-400 hover:text-white'}`}
          >
            ES 🇨🇱
          </button>
          <button 
            onClick={() => { setLanguage('en'); showNotice("Language: English 🇬🇧", "info"); }}
            className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${language === 'en' ? 'bg-amber-500 text-stone-950 font-black' : 'text-zinc-400 hover:text-white'}`}
          >
            EN 🇬🇧
          </button>
        </div>

        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
            <Sparkles className="w-3 h-3 text-amber-400" /> {t.viewingMenu}
          </div>
          
          <div className="space-y-1">
            <motion.h1 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-extralight tracking-wider font-serif text-amber-500 italic"
            >
              {t.title}
            </motion.h1>
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto my-2" />
            <span className="text-zinc-300 text-xs font-semibold tracking-widest uppercase block">{t.subtitle}</span>
          </div>
          
          <p className="text-zinc-400 text-[11px] leading-relaxed max-w-sm mx-auto font-medium italic">
            {t.motto}
          </p>
 
          <div 
            className="mt-6 inline-flex items-center gap-2 font-bold border px-4 py-1.5 rounded-full text-[11px] shadow-sm backdrop-blur-md"
            style={{ backgroundColor: "var(--color-badge-bg)", color: "var(--color-badge-text)", borderColor: "var(--color-accent-border)" }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>{t.mesa} {activeTable ? activeTable.number : "?"} • {activeTable?.zone || "Salón Principal"}</span>
          </div>
        </div>
      </div>
 
      {/* Floating Waiter Actions */}
      {!state.onlyViewMenuQr && (
        <div className="max-w-4xl mx-auto px-4 -mt-6 relative z-10 flex gap-2">
          <button
            id="btn-call-waiter"
            onClick={handleCallWaiter}
            className="flex-1 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200/80 py-3.5 px-4 rounded-xl shadow-md font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Bell className="w-4 h-4 animate-bounce text-amber-600" />
            {t.callWaiter}
          </button>
          <button
            id="btn-request-bill"
            onClick={handleRequestBill}
            className="flex-1 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200/80 py-3.5 px-4 rounded-xl shadow-md font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            {t.requestBill}
          </button>
        </div>
      )}
 
      <div className="max-w-4xl mx-auto px-4 mt-8">
        {state.onlyViewMenuQr && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 md:p-8 shadow-sm text-center space-y-6 relative overflow-hidden" id="client-only-view-banner">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700" />
            
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 mb-1 border border-amber-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
                {t.digitalMenuBannerTitle}
              </h2>
              <div className="h-[1px] w-16 bg-amber-500/30 mx-auto" />
              <p className="text-stone-600 text-sm md:text-base leading-relaxed italic max-w-lg mx-auto">
                {t.digitalMenuBannerDesc}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
                <div className="p-3.5 bg-stone-50 border border-stone-100 rounded-2xl flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 font-bold text-xs flex-shrink-0">🥩</div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">{t.digitalMenuBannerItem1Title}</h4>
                    <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">{t.digitalMenuBannerItem1Desc}</p>
                  </div>
                </div>
                <div className="p-3.5 bg-stone-50 border border-stone-100 rounded-2xl flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 font-bold text-xs flex-shrink-0">🍷</div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">{t.digitalMenuBannerItem2Title}</h4>
                    <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">{t.digitalMenuBannerItem2Desc}</p>
                  </div>
                </div>
                <div className="p-3.5 bg-stone-50 border border-stone-100 rounded-2xl flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 font-bold text-xs flex-shrink-0">🌿</div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">{t.digitalMenuBannerItem3Title}</h4>
                    <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">{t.digitalMenuBannerItem3Desc}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1.5 font-semibold text-stone-700 bg-stone-100 px-3 py-1 rounded-full">
                  {t.digitalMenuModeActive}
                </span>
                <span>{t.digitalMenuExplore}</span>
              </div>
            </div>
          </div>
        )}

        {/* State Alerts */}
        <AnimatePresence>
          {notificationMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 p-4 rounded-xl text-sm font-medium flex items-center gap-2 border shadow-sm ${
                notificationMsg.type === "success" 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                  : notificationMsg.type === "error"
                  ? "bg-red-50 border-red-100 text-red-800"
                  : "bg-amber-50 border-amber-100 text-amber-800"
              }`}
            >
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{notificationMsg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ORDER STATUS TRACKER */}
        {currentOrder && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6" id="client-order-tracker">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-600 block">Tu Pedido en Curso</span>
                <span className="text-zinc-500 text-xs">ID: {currentOrder.id}</span>
              </div>
              <div className="flex items-center gap-2">
                {currentOrder.status === OrderStatus.PENDING_APPROVAL && (
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 animate-pulse" /> Esperando Aprobación
                  </span>
                )}
                {currentOrder.status === OrderStatus.PREPARING && (
                  <span className="bg-blue-100 text-blue-800 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 animate-pulse">
                    <ChefHat className="w-3.5 h-3.5" /> En Preparación
                  </span>
                )}
                {currentOrder.status === OrderStatus.READY && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 animate-bounce">
                    <Check className="w-3.5 h-3.5" /> ¡Listo para servir!
                  </span>
                )}
                {currentOrder.status === OrderStatus.DELIVERED && (
                  <span className="bg-zinc-100 text-zinc-800 border border-zinc-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                    <UtensilsCrossed className="w-3.5 h-3.5" /> Entregado en Mesa
                  </span>
                )}
              </div>
            </div>

            {/* Step indicator */}
            <div className="grid grid-cols-4 gap-1.5 mt-4 text-center text-[10px] font-bold text-zinc-400">
              <div className={`py-1 rounded border ${currentOrder.status ? "bg-amber-500/20 border-amber-500/30 text-amber-700" : ""}`}>
                Confirmado
              </div>
              <div className={`py-1 rounded border ${
                currentOrder.status === OrderStatus.PREPARING || 
                currentOrder.status === OrderStatus.READY || 
                currentOrder.status === OrderStatus.DELIVERED 
                  ? "bg-blue-500/20 border-blue-500/30 text-blue-700" : ""
              }`}>
                Cocina
              </div>
              <div className={`py-1 rounded border ${
                currentOrder.status === OrderStatus.READY || 
                currentOrder.status === OrderStatus.DELIVERED 
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-700" : ""
              }`}>
                Listo
              </div>
              <div className={`py-1 rounded border ${currentOrder.status === OrderStatus.DELIVERED ? "bg-purple-500/20 border-purple-500/30 text-purple-700" : ""}`}>
                Entregado
              </div>
            </div>

            {/* Display active order items */}
            <div className="mt-4 border-t border-zinc-200/50 pt-3 space-y-2">
              <span className="text-zinc-600 text-xs font-semibold block">Ítems solicitados:</span>
              {currentOrder.items.map((it) => {
                const prod = products.find(p => p.id === it.productId);
                return (
                  <div key={it.id} className="flex justify-between items-center text-xs text-zinc-700">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded font-bold">{it.quantity}x</span>
                      <span>{prod?.name}</span>
                      {it.selectedModifiers.map(m => (
                        <span key={m.optionId} className="text-zinc-400 text-[10px] italic">({m.name})</span>
                      ))}
                    </div>
                    <div>
                      {it.status === OrderItemStatus.PENDING && (
                        <span className="text-zinc-400 text-[10px]">En cola</span>
                      )}
                      {it.status === OrderItemStatus.PREPARING && (
                        <span className="text-blue-500 text-[10px] font-bold animate-pulse">Cocinando</span>
                      )}
                      {it.status === OrderItemStatus.READY && (
                        <span className="text-emerald-500 text-[10px] font-bold">Listo</span>
                      )}
                      {it.status === OrderItemStatus.DELIVERED && (
                        <span className="text-zinc-500 text-[10px]">Servido</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RECOMENDACIONES DE NUESTRO CHEF */}
        {selectedCategory === "all" && !searchTerm && (
          <div className="mt-10 mb-8" id="chef-specials-section">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-serif text-2xl font-bold text-stone-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> {t.chefSpecials}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">{t.chefSpecialsSub}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {products.filter(p => ["p4", "p5", "p2"].includes(p.id) && p.isAvailable).map(rawP => {
                const p = getTranslatedProductData(rawP);
                return (
                  <div 
                    key={p.id}
                    onClick={() => handleOpenProductModal(rawP)}
                    className="bg-white rounded-2xl overflow-hidden border border-stone-200/60 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer group text-left relative"
                  >
                    {p.imageUrl && (
                      <div className="h-44 w-full overflow-hidden relative bg-stone-100 flex-shrink-0">
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 bg-stone-950/90 backdrop-blur-md text-amber-400 font-bold tracking-widest text-[9px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-amber-500/20">
                          <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" /> {t.recommended}
                        </div>
                        
                        {/* Interactive Favorite/Heart Button */}
                        <button 
                          onClick={(e) => handleLikeProduct(p.id, e)}
                          className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white hover:text-red-500 transition-all border border-white/10 shadow-sm cursor-pointer z-10"
                        >
                          <Heart className={`w-3.5 h-3.5 transition-colors ${userLikes[p.id] ? "fill-red-500 text-red-500" : "text-white"}`} />
                        </button>

                        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                    )}
                    
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-serif text-base font-bold text-stone-900 line-clamp-1 leading-snug group-hover:text-amber-600 transition-colors">{p.name}</h4>
                          <span className="text-xs font-black text-amber-600 flex-shrink-0">{formatPrice(p.price)}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">{p.description}</p>
                      </div>
                      
                      <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                        <span className="font-semibold text-amber-800 bg-amber-500/5 px-2 py-0.5 rounded-md border border-amber-500/10 flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {t.recetaHacienda}
                        </span>
                        
                        {/* Favorite count counter */}
                        <span className="font-bold flex items-center gap-1.5 text-stone-500">
                          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                          <span>{(likes[p.id] || 100).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION DIVIDER */}
        <div className="flex items-center gap-3 my-8">
          <div className="h-[1px] flex-1 bg-stone-200" />
          <span className="text-stone-400 text-xs font-serif italic font-medium">{t.allPlates}</span>
          <div className="h-[1px] flex-1 bg-stone-200" />
        </div>

        {/* CATEGORIES SCROLLER */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mt-4" id="categories-scroller-bar">
          <button
            onClick={() => setSelectedCategory("all")}
            className="px-5 py-2.5 rounded-full font-bold text-xs flex-shrink-0 transition-all cursor-pointer border shadow-xs"
            style={
              selectedCategory === "all"
                ? { backgroundColor: "var(--color-primary)", color: "#ffffff", borderColor: "var(--color-primary)" }
                : { backgroundColor: "#ffffff", color: "#57534e", borderColor: "#e7e5e4" }
            }
          >
            📋 {t.allPlates}
          </button>
          {categories.map((cat) => {
            const getCatEmoji = (cid: string) => {
              if (cid === "c1") return "🍲";
              if (cid === "c2") return "🥩";
              if (cid === "c3") return "🍷";
              if (cid === "c4") return "🥞";
              return "🍽️";
            };
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="px-5 py-2.5 rounded-full font-bold text-xs flex-shrink-0 transition-all cursor-pointer border shadow-xs"
                style={
                  selectedCategory === cat.id
                    ? { backgroundColor: "var(--color-primary)", color: "#ffffff", borderColor: "var(--color-primary)" }
                    : { backgroundColor: "#ffffff", color: "#57534e", borderColor: "#e7e5e4" }
                }
              >
                {getCatEmoji(cat.id)} {getTranslatedCategoryName(cat)}
              </button>
            );
          })}
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-stone-900 shadow-xs"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setDietaryFilter(prev => prev === "gluten-free" ? "all" : "gluten-free")}
              className="px-4 py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              style={
                dietaryFilter === "gluten-free"
                  ? { backgroundColor: "var(--color-badge-bg)", color: "var(--color-badge-text)", borderColor: "var(--color-accent-border)" }
                  : { backgroundColor: "#ffffff", color: "#57534e", borderColor: "#e7e5e4" }
              }
            >
              {t.sinGluten}
            </button>
            <button
              onClick={() => setDietaryFilter(prev => prev === "lacteos-free" ? "all" : "lacteos-free")}
              className="px-4 py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              style={
                dietaryFilter === "lacteos-free"
                  ? { backgroundColor: "var(--color-badge-bg)", color: "var(--color-badge-text)", borderColor: "var(--color-accent-border)" }
                  : { backgroundColor: "#ffffff", color: "#57534e", borderColor: "#e7e5e4" }
              }
            >
              {t.sinLacteos}
            </button>
          </div>
        </div>

        {/* PRODUCTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
          {filteredProducts.map((rawP) => {
            const p = getTranslatedProductData(rawP);
            const isSpecial = ["p4", "p5", "p6"].includes(p.id);
            return (
              <motion.div
                layout
                key={p.id}
                onClick={() => handleOpenProductModal(rawP)}
                className={`bg-white border border-stone-200/60 rounded-3xl p-4 flex gap-4 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group text-left relative ${
                  !p.isAvailable ? "opacity-60" : ""
                }`}
              >
                {p.imageUrl && (
                  <div className="w-28 h-28 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0 relative shadow-inner">
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      referrerPolicy="no-referrer" 
                    />
                    {!p.isAvailable && (
                      <div className="absolute inset-0 bg-stone-900/85 flex items-center justify-center text-center">
                        <span className="text-[9px] text-white font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-white/20">{t.agotado}</span>
                      </div>
                    )}
                    {isSpecial && p.isAvailable && (
                      <div className="absolute top-1.5 left-1.5 bg-amber-500 text-stone-950 font-black text-[8px] uppercase px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                        <Flame className="w-2 h-2 fill-current" /> {t.destacado}
                      </div>
                    )}
                    
                    {/* Heart Favorite Button inside grid item image box */}
                    {p.isAvailable && (
                      <button 
                        onClick={(e) => handleLikeProduct(p.id, e)}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white hover:text-red-500 transition-all border border-white/10 shadow-sm cursor-pointer z-10"
                      >
                        <Heart className={`w-3 h-3 transition-colors ${userLikes[p.id] ? "fill-red-500 text-red-500" : "text-white"}`} />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-serif font-bold text-stone-900 text-base leading-tight group-hover:text-amber-600 transition-all truncate">
                        {p.name}
                      </h3>
                      <span className="font-extrabold text-sm flex-shrink-0 text-amber-600 font-mono">
                        {formatPrice(p.price)}
                      </span>
                    </div>
                    <p className="text-stone-500 text-[11px] line-clamp-2 mt-1.5 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {p.allergens.map((alg) => (
                        <span key={alg} className="bg-stone-100 text-stone-600 text-[9px] font-bold px-2 py-0.5 rounded-md border border-stone-200/30">
                          {getTranslatedAllergen(alg)}
                        </span>
                      ))}
                      {p.isAvailable && !isSpecial && (
                        <span className="bg-amber-500/5 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-md border border-amber-500/10">
                          {t.casa}
                        </span>
                      )}
                      
                      {/* Real-time likes counter */}
                      <span className="text-[10px] text-stone-400 flex items-center gap-1 font-semibold ml-1">
                        <Heart className="w-2.5 h-2.5 text-red-500 fill-red-500" />
                        <span>{(likes[p.id] || 100).toLocaleString()}</span>
                      </span>
                    </div>

                    {p.isAvailable ? (
                      state.onlyViewMenuQr ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProductModal(rawP);
                          }}
                          className="text-stone-800 bg-stone-100 hover:bg-stone-200 font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer transition-all border border-stone-200/60 font-sans"
                        >
                          <Info className="w-3 h-3 text-stone-500" /> {t.verPlato}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProductModal(rawP);
                          }}
                          className="text-white font-bold p-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center hover:brightness-105"
                          style={{ backgroundColor: "var(--color-primary)" }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )
                    ) : (
                      <span className="text-stone-400 text-[10px] font-extrabold tracking-wider uppercase">{t.pausado}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white border border-stone-200 rounded-3xl shadow-xs">
              <div className="text-stone-300 font-bold text-4xl mb-2">🍽️</div>
              <p className="text-stone-400 text-xs font-semibold">{t.noProducts}</p>
              <button 
                onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }}
                className="mt-3 text-amber-600 hover:text-amber-700 text-xs font-bold underline"
              >
                {t.resetFilters}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FLOAT BAR FOR ACTIVE CART TRIGGER */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-zinc-950 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl border border-zinc-800 hover:bg-zinc-900 active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div 
                className="text-white text-xs font-extrabold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {cart.reduce((sum, it) => sum + it.quantity, 0)}
              </div>
              <div>
                <span className="font-bold text-sm block">Ver Carrito</span>
                <span className="text-zinc-400 text-[11px]">Hacienda Gourmet</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[var(--color-primary)]">{formatPrice(cartTotal)}</span>
              <ShoppingCart className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
          </button>
        </div>
      )}

      {/* PRODUCT MODAL WITH CUSTOM MODIFIERS */}
      <AnimatePresence>
        {selectedProduct && (() => {
          const p = getTranslatedProductData(selectedProduct);
          const isHouseSpecial = ["p4", "p5", "p2"].includes(p.id);
          const hasWinePairing = !!PRODUCT_PAIRINGS[p.id];
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col"
              >
                {/* Header */}
                <div className="relative h-44 w-full bg-zinc-100 flex-shrink-0">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                      <UtensilsCrossed className="w-12 h-12 text-zinc-700" />
                    </div>
                  )}
                  
                  {/* Heart Like Button absolute on top left of Modal image */}
                  {p.isAvailable && (
                    <button 
                      onClick={(e) => handleLikeProduct(p.id, e)}
                      className="absolute top-3 left-3 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white hover:text-red-500 transition-all border border-white/10 shadow-sm cursor-pointer z-10"
                    >
                      <Heart className={`w-4 h-4 transition-colors ${userLikes[p.id] ? "fill-red-500 text-red-500" : "text-white"}`} />
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="bg-black/60 text-white rounded-full p-1.5 absolute top-3 right-3 hover:bg-black cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 text-left">
                  <div>
                    {isHouseSpecial && (
                      <div className="flex items-center gap-1 bg-amber-500/10 text-amber-800 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-md w-fit mb-2">
                        <Sparkles className="w-2.5 h-2.5 text-amber-600 fill-amber-600" /> {language === 'es' ? 'Especialidad de la Casa' : 'House Specialty'}
                      </div>
                    )}
                    <h3 className="font-serif text-2xl font-black text-stone-900 leading-tight">{p.name}</h3>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="font-extrabold text-xl text-amber-600">{formatPrice(p.price)}</p>
                      {/* Quantity selector — right next to price */}
                      {!state.onlyViewMenuQr && (
                        <div className="flex items-center gap-3 bg-stone-100 p-1.5 rounded-xl border border-stone-200">
                          <button
                            onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                            className="bg-white text-stone-700 p-1 rounded-lg hover:bg-stone-200 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-extrabold text-sm text-stone-900 px-2">{modalQuantity}</span>
                          <button
                            onClick={() => setModalQuantity(q => q + 1)}
                            className="bg-white text-stone-700 p-1 rounded-lg hover:bg-stone-200 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-stone-600 text-xs mt-3 leading-relaxed border-l-2 border-amber-500/40 pl-3 italic">
                      "{p.description}"
                    </p>
                  </div>

                  {/* Chef's Note callout to trigger appetite */}
                  <div className="p-3 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-[11px] text-stone-600 flex gap-2 leading-relaxed">
                    <span className="text-sm">👨‍🍳</span>
                    <div>
                      <span className="font-bold text-stone-800 block">{t.chefSuggestion}</span>
                      {t.chefSuggestionText}
                    </div>
                  </div>

                  {/* Sommelier Selected Pairing */}
                  {hasWinePairing && (
                    <div className="p-4 rounded-2xl border bg-red-500/[0.03] border-red-500/10 space-y-2 text-left">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-700 block">
                        {t.pairingTitle}
                      </span>
                      <h5 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        {PRODUCT_PAIRINGS[p.id][language].name}
                      </h5>
                      <p className="text-[11px] text-stone-500 leading-relaxed italic">
                        {PRODUCT_PAIRINGS[p.id][language].desc}
                      </p>
                    </div>
                  )}

                  {/* Modifiers checklist */}
                  {getModifiersForProduct(selectedProduct).length > 0 && (
                    <div className="space-y-4">
                      {getModifiersForProduct(selectedProduct).map((mod) => (
                        <div key={mod.id} className="border-t border-stone-100 pt-4">
                          <span className="text-stone-900 font-bold text-xs uppercase tracking-wider block mb-2">{mod.name}</span>
                          <div className="space-y-1.5">
                            {mod.options.map((opt) => {
                              const isSelected = modalModifiers.some(m => m.optionId === opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleModifierChange(mod.id, opt.id, mod.name, opt.name, opt.extraPrice)}
                                  className="w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer shadow-xs"
                                  style={
                                    isSelected 
                                      ? { backgroundColor: "var(--color-badge-bg)", color: "var(--color-badge-text)", borderColor: "var(--color-accent-border)" }
                                      : { backgroundColor: "#fafafa", color: "#44403c", borderColor: "#e7e5e4" }
                                  }
                                >
                                  <span>{opt.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    {opt.extraPrice > 0 && (
                                      <span className="font-extrabold text-[var(--color-primary)]">+{formatPrice(opt.extraPrice)}</span>
                                    )}
                                    <div 
                                      className="w-4 h-4 rounded-full border flex items-center justify-center"
                                      style={
                                        isSelected 
                                          ? { backgroundColor: "var(--color-primary)", borderColor: "var(--color-primary)", color: "#ffffff" }
                                          : { borderColor: "#d6d3d1" }
                                      }
                                    >
                                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Allergens Information */}
                  {p.allergens.length > 0 && (
                    <div className="border-t border-stone-100 pt-4 text-left">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">{t.allergensTitle}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.allergens.map((alg) => (
                          <span key={alg} className="bg-stone-100 text-stone-600 text-[10px] font-bold px-2.5 py-1 rounded-md border border-stone-200/30">
                            ⚠️ {t.allergensContains} {getTranslatedAllergen(alg)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes box */}
                  {!state.onlyViewMenuQr && (
                    <div className="border-t border-stone-100 pt-4">
                      <span className="text-stone-900 font-bold text-xs uppercase tracking-wide block mb-1">{t.specialNotes}</span>
                      <input
                        type="text"
                        placeholder={t.specialNotesPlaceholder}
                        value={modalNotes}
                        onChange={(e) => setModalNotes(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] text-zinc-900"
                      />
                    </div>
                  )}


                </div>

                {/* Actions Footer */}
                <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex gap-2 flex-shrink-0">
                  {state.onlyViewMenuQr ? (
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer text-center"
                    >
                      {t.backToMenu}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setSelectedProduct(null)}
                        className="flex-1 py-3 text-zinc-500 hover:text-zinc-700 font-bold text-xs cursor-pointer text-center"
                      >
                        {language === 'es' ? 'Cancelar' : 'Cancel'}
                      </button>
                      <button
                        onClick={handleAddToCart}
                        className="flex-2 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        <span>{language === 'es' ? 'Agregar al Pedido' : 'Add to Order'}</span>
                        <span>|</span>
                        <span>{formatPrice((p.price + modalModifiers.reduce((sum, m) => sum + m.extraPrice, 0)) * modalQuantity)}</span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* SHOPPING CART VIEW MODAL */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="text-base font-extrabold text-zinc-900">Tu Pedido</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="space-y-3">
                  {cart.map((item, index) => {
                    const itemModifiersPrice = item.modifiers.reduce((sum, m) => sum + m.extraPrice, 0);
                    const itemSubtotal = (item.product.price + itemModifiersPrice) * item.quantity;
                    return (
                      <div key={index} className="flex justify-between gap-3 bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-xs">
                        <div className="min-w-0">
                          <span className="font-bold text-zinc-900 block">{item.product.name}</span>
                          {item.modifiers.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.modifiers.map(m => (
                                <span key={m.optionId} className="text-[10px] text-zinc-400 block italic">
                                  + {m.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.notes && (
                            <span 
                              className="text-[10px] block mt-1 border px-1.5 py-0.5 rounded w-max"
                              style={{ backgroundColor: "var(--color-badge-bg)", color: "var(--color-badge-text)", borderColor: "var(--color-accent-border)" }}
                            >
                              Nota: "{item.notes}"
                            </span>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => {
                                setCart(prev => {
                                  const c = [...prev];
                                  if (c[index].quantity > 1) {
                                    c[index].quantity--;
                                  } else {
                                    c.splice(index, 1);
                                  }
                                  return c;
                                });
                              }}
                              className="bg-white hover:bg-zinc-200 text-zinc-600 border border-zinc-200 p-0.5 rounded cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-extrabold text-zinc-900">{item.quantity}</span>
                            <button
                              onClick={() => {
                                setCart(prev => {
                                  const c = [...prev];
                                  c[index].quantity++;
                                  return c;
                                });
                              }}
                              className="bg-white hover:bg-zinc-200 text-zinc-600 border border-zinc-200 p-0.5 rounded cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-extrabold text-zinc-900 block">{formatPrice(itemSubtotal)}</span>
                          <button
                            onClick={() => setCart(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-400 hover:text-red-600 underline text-[10px] mt-1 block cursor-pointer"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Loyalty Form Card Toggle */}
                <div 
                  className="border rounded-2xl p-4"
                  style={{ backgroundColor: "var(--color-badge-bg)", borderColor: "var(--color-accent-border)" }}
                >
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsRegisteringLoyalty(!isRegisteringLoyalty)}>
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-[var(--color-primary)]" />
                      <div>
                        <span className="font-bold text-xs text-zinc-900 block">Club de Fidelización Hacienda</span>
                        <span className="text-[10px] text-zinc-500">Acumula 1 punto por cada $100 CLP gastados</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold underline text-[var(--color-badge-text)]">
                      {isRegisteringLoyalty ? "Ocultar" : "Inscribirme"}
                    </span>
                  </div>

                  {isRegisteringLoyalty && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 pt-3 border-t border-zinc-200/50 space-y-2.5"
                    >
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block">Tu Nombre</label>
                        <input
                          type="text"
                          placeholder="María José"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block">WhatsApp / Celular</label>
                        <input
                          type="tel"
                          placeholder="+56912345678"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-zinc-900"
                        />
                        <span className="text-[9px] text-zinc-400 mt-1 block">Recibe un bono de 100 puntos por inscribirte hoy.</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex flex-col gap-2.5 flex-shrink-0">
                {/* Previous orders accumulated total */}
                {previousOrdersTotal > 0 && (
                  <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-[10px] font-bold uppercase">Pedidos anteriores</span>
                      <span className="text-zinc-700 font-bold text-xs">{formatPrice(previousOrdersTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-[10px] font-bold uppercase">Pedido nuevo</span>
                      <span className="text-zinc-700 font-bold text-xs">{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="border-t border-amber-300/50 pt-1 flex justify-between items-center">
                      <span className="text-zinc-900 font-black text-xs">Total acumulado mesa</span>
                      <span className="text-zinc-900 font-black text-lg">{formatPrice(grandTotal)}</span>
                    </div>
                  </div>
                )}
                {previousOrdersTotal === 0 && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-zinc-500 font-bold text-xs">Total del Pedido</span>
                    <span className="text-zinc-900 font-black text-lg">{formatPrice(cartTotal)}</span>
                  </div>
                )}
                
                <button
                  onClick={handleSendOrder}
                  disabled={isSubmitting}
                  className="w-full text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Enviando pedido...</span>
                  ) : (
                    <>
                      <span>Confirmar y Enviar Pedido</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
