import React, { useState, useEffect } from "react";
import { RestaurantState, User } from "./types";
import RoleSelector from "./components/RoleSelector";
import ClienteView from "./components/ClienteView";
import MozoView from "./components/MozoView";
import KitchenKDS from "./components/KitchenKDS";
import AdminView from "./components/AdminView";
import ThemeCarousel from "./components/ThemeCarousel";
import { themes } from "./theme";

export default function App() {
  const [currentRole, setCurrentRole] = useState<"client" | "waiter" | "kitchen" | "admin">("client");
  const [clientTableId, setClientTableId] = useState("t5"); // Default simulated Mesa 5
  const [activeUser, setActiveUser] = useState<User | null>(null);
  
  // Theme state
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem("hacienda-app-theme-id") || "amber";
  });
  const [showThemeExplorer, setShowThemeExplorer] = useState(true); // Default to true so it is shown right away

  // App database state
  const [state, setState] = useState<RestaurantState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply theme colors dynamically using CSS Custom Properties
  useEffect(() => {
    const activeTheme = themes.find((t) => t.id === themeId) || themes[0];
    const root = document.documentElement;
    root.style.setProperty("--color-primary", activeTheme.primary);
    root.style.setProperty("--color-primary-hover", activeTheme.primaryHover);
    root.style.setProperty("--color-bg-header", activeTheme.bgHeader);
    root.style.setProperty("--color-text-header", activeTheme.textHeader);
    root.style.setProperty("--color-badge-bg", activeTheme.badgeBg);
    root.style.setProperty("--color-badge-text", activeTheme.badgeText);
    root.style.setProperty("--color-accent-border", activeTheme.accentBorder);
    localStorage.setItem("hacienda-app-theme-id", themeId);
  }, [themeId]);

  // Core fetch state
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        setError(null);
      } else {
        setError("Error al cargar el estado del servidor.");
      }
    } catch (err) {
      setError("No se pudo establecer conexión con el servidor backend de Hacienda.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    
    // Poll state every 4 seconds as global background sync
    const interval = setInterval(() => {
      fetchState();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setActiveUser(user);
  };

  const handleLogout = () => {
    setActiveUser(null);
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-950 min-h-screen text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold font-sans">Restaurant Hacienda</h2>
        <p className="text-zinc-500 text-xs mt-1">Conectando con el servidor POS e inicializando carta digital...</p>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="bg-zinc-950 min-h-screen text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-sm">
          <span className="text-red-400 font-bold block text-sm">⚠️ Error de Ingress de Red</span>
          <p className="text-zinc-400 text-xs mt-2">{error || "Servidor offline o inicializando."}</p>
          <button
            onClick={fetchState}
            className="mt-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col" id="restaurant-hacienda-app-root">
      {/* Simulation switcher top header */}
      <RoleSelector
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        activeTableIdForClient={clientTableId}
        onChangeClientTable={setClientTableId}
        tables={state.tables}
        activeUser={activeUser}
        onLogout={handleLogout}
        showThemeExplorer={showThemeExplorer}
        onToggleThemeExplorer={() => setShowThemeExplorer((prev) => !prev)}
      />

      {/* Dynamic Theme Carousel Panel */}
      {showThemeExplorer && (
        <div className="px-4 py-2">
          <ThemeCarousel
            currentThemeId={themeId}
            onSelectTheme={setThemeId}
            onClose={() => setShowThemeExplorer(false)}
          />
        </div>
      )}

      {/* Main dynamic view panel based on selected role */}
      <main className="flex-1">
        {currentRole === "client" && (
          <ClienteView 
            state={state} 
            activeTableId={clientTableId} 
            onRefreshState={fetchState} 
          />
        )}

        {currentRole === "waiter" && (
          <MozoView
            state={state}
            onRefreshState={fetchState}
            activeUser={activeUser}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        )}

        {currentRole === "kitchen" && (
          <KitchenKDS 
            state={state} 
            onRefreshState={fetchState} 
          />
        )}

        {currentRole === "admin" && (
          <AdminView 
            state={state} 
            onRefreshState={fetchState} 
          />
        )}
      </main>
    </div>
  );
}
