import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { RestaurantState, User } from "./types";
import { themes } from "./theme";
import { subscribeToState } from "./stateClient";
import { useOnlineStatus } from "./offlineSync";

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

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  declare readonly props: Readonly<{ children: React.ReactNode }>;
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Error inesperado en la aplicación", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold">No se pudo cargar esta pantalla</h2>
          <p className="text-zinc-400 text-sm mt-2">Actualiza la aplicación para continuar.</p>
          <button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-zinc-950">
            Actualizar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
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
  const isDemoMode = false;
  const isOnline = useOnlineStatus();
  const hasRequestedDefaultTables = useRef(false);

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

  useEffect(() => {
    if (!state || state.tables.length >= 12 || hasRequestedDefaultTables.current) return;
    hasRequestedDefaultTables.current = true;
    void fetch("/api/tables/ensure-defaults", { method: "POST" }).catch((error) => {
      hasRequestedDefaultTables.current = false;
      console.error("No se pudieron completar las mesas iniciales", error);
    });
  }, [state]);

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
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-bold text-center py-2 px-4 flex items-center justify-center gap-2 shadow-md z-50">
          <span>📶 MODO RESISTENTE SIN CONEXIÓN DE RED</span>
          <span className="font-normal opacity-90 hidden sm:inline">— Operando con memoria local de respaldo. Se sincronizará al restablecer la red.</span>
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

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
