import React, { Suspense, lazy, useEffect, useState } from "react";
import { RestaurantState, User } from "./types";
import { themes } from "./theme";
import { subscribeToState } from "./dbClient";

const RoleSelector = lazy(() => import("./components/RoleSelector"));
const ClienteView = lazy(() => import("./components/ClienteView"));
const MozoView = lazy(() => import("./components/MozoView"));
const KitchenKDS = lazy(() => import("./components/KitchenKDS"));
const AdminView = lazy(() => import("./components/AdminView"));
const AdminLogin = lazy(() => import("./components/AdminLogin"));
const CustomerQRView = lazy(() => import("./components/CustomerQRView"));
const ThemeCarousel = lazy(() => import("./components/ThemeCarousel"));
const LoginView = lazy(() => import("./components/LoginView"));

function getQRTableNumber(): number | null {
  const params = new URLSearchParams(window.location.search);
  const mesa = params.get("mesa");
  if (mesa && !isNaN(Number(mesa))) {
    return Number(mesa);
  }
  return null;
}

function LoadingScreen() {
  return (
    <div className="bg-zinc-950 min-h-screen text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-bold font-sans">Restaurant Hacienda</h2>
      <p className="text-zinc-500 text-xs mt-1">Inicializando carta digital...</p>
    </div>
  );
}

export default function App() {
  const [currentRole, setCurrentRole] = useState<"client" | "waiter" | "kitchen" | "admin">("client");
  const [clientTableId, setClientTableId] = useState("t5");
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [qrTableNumber] = useState<number | null>(() => getQRTableNumber());
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem("hacienda-app-theme-id") || "amber";
  });
  const [showThemeExplorer, setShowThemeExplorer] = useState(false);
  const [state, setState] = useState<RestaurantState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

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

  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        setIsDemoMode(false);
      }
    } catch {
      // Snapshot listener owns connection errors for now.
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToState((newState) => {
      setState(newState);
      setIsDemoMode(false);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setActiveUser(user);
    if (user.role === "WAITER") {
      setCurrentRole("waiter");
    } else if (user.role === "KITCHEN") {
      setCurrentRole("kitchen");
    } else if (user.role === "ADMIN") {
      setCurrentRole("admin");
    }
  };

  const handleLogout = () => {
    setActiveUser(null);
    setCurrentRole("client");
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!state) return null;

  if (qrTableNumber !== null) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <CustomerQRView
          state={state}
          tableNumber={qrTableNumber}
          onRefreshState={fetchState}
        />
      </Suspense>
    );
  }

  if (!activeUser) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LoginView
          state={state}
          onLoginSuccess={handleLoginSuccess}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col" id="restaurant-hacienda-app-root">
      {isDemoMode && (
        <div className="bg-amber-500/90 text-zinc-900 text-xs font-semibold text-center py-1.5 px-4">
          Modo Demo - Explorando con datos de ejemplo. Conecta el servidor para uso real.
        </div>
      )}

      <Suspense fallback={<LoadingScreen />}>
        {activeUser.role === "ADMIN" && (
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
        )}

        {showThemeExplorer && (
          <div className="px-4 py-2">
            <ThemeCarousel
              currentThemeId={themeId}
              onSelectTheme={setThemeId}
              onClose={() => setShowThemeExplorer(false)}
            />
          </div>
        )}

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
              onLogout={handleLogout}
            />
          )}

          {currentRole === "admin" && (
            activeUser && (activeUser.role === "ADMIN" || (activeUser.permissions && activeUser.permissions.length > 0)) ? (
              <AdminView
                state={state}
                onRefreshState={fetchState}
                activeUser={activeUser}
              />
            ) : (
              <AdminLogin
                onLoginSuccess={handleLoginSuccess}
                onLoginError={(err) => console.log("Admin login error:", err)}
              />
            )
          )}
        </main>
      </Suspense>
    </div>
  );
}
