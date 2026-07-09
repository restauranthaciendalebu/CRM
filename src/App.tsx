import React, { useState, useEffect } from "react";
import { RestaurantState, User } from "./types";
import RoleSelector from "./components/RoleSelector";
import ClienteView from "./components/ClienteView";
import MozoView from "./components/MozoView";
import KitchenKDS from "./components/KitchenKDS";
import AdminView from "./components/AdminView";
import AdminLogin from "./components/AdminLogin";
import ThemeCarousel from "./components/ThemeCarousel";
import { themes } from "./theme";
import { subscribeToState } from "./dbClient";

export default function App() {
  const [currentRole, setCurrentRole] = useState<"client" | "waiter" | "kitchen" | "admin">("client");
  const [clientTableId, setClientTableId] = useState("t5");
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Theme state
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem("hacienda-app-theme-id") || "amber";
  });
  const [showThemeExplorer, setShowThemeExplorer] = useState(false);

  // App database state
  const [state, setState] = useState<RestaurantState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

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

  // Core fetch state — fallback when Firestore snap fails
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        setIsDemoMode(false);
      }
    } catch {
      // Handled by snapshot listener
    }
  };

  useEffect(() => {
    // Subscribe to real-time updates from Firebase Firestore
    const unsubscribe = subscribeToState((newState) => {
      setState(newState);
      setIsDemoMode(false); // Sincronizado con Firebase Firestore
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: User) => { setActiveUser(user); };
  const handleLogout = () => { setActiveUser(null); };

  if (isLoading) {
    return (
      <div className="bg-zinc-950 min-h-screen text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold font-sans">Restaurant Hacienda</h2>
        <p className="text-zinc-500 text-xs mt-1">Inicializando carta digital...</p>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col" id="restaurant-hacienda-app-root">
      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="bg-amber-500/90 text-zinc-900 text-xs font-semibold text-center py-1.5 px-4">
          🎯 Modo Demo — Explorando con datos de ejemplo. Conecta el servidor para uso real.
        </div>
      )}

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
          activeUser && activeUser.role === "ADMIN" ? (
            <AdminView
              state={state}
              onRefreshState={fetchState}
            />
          ) : (
            <AdminLogin
              onLoginSuccess={handleLoginSuccess}
              onLoginError={(err) => console.log("Admin login error:", err)}
            />
          )
        )}
      </main>
    </div>
  );
}
