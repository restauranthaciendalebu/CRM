import React from "react";
import { User, Role } from "../types";
import { Coffee, ShieldCheck, ChefHat, UserCheck } from "lucide-react";

interface RoleSelectorProps {
  currentRole: "client" | "waiter" | "kitchen" | "admin";
  onChangeRole: (role: "client" | "waiter" | "kitchen" | "admin") => void;
  activeTableIdForClient: string;
  onChangeClientTable: (tableId: string) => void;
  tables: Array<{ id: string; number: number }>;
  activeUser: User | null;
  onLogout: () => void;
  showThemeExplorer: boolean;
  onToggleThemeExplorer: () => void;
}

export default function RoleSelector({
  currentRole,
  onChangeRole,
  activeTableIdForClient,
  onChangeClientTable,
  tables,
  activeUser,
  onLogout,
  showThemeExplorer,
  onToggleThemeExplorer,
}: RoleSelectorProps) {
  return (
    <div className="bg-zinc-900 text-white px-4 py-2 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs" id="role-selector-bar">
      <div className="flex items-center gap-2">
        <span className="font-bold tracking-wider text-amber-500 uppercase flex items-center gap-1.5">
          <Coffee className="w-4 h-4" /> Restaurant Hacienda
        </span>
        <span className="text-zinc-500">|</span>
        <span className="text-zinc-400 font-medium">Entorno de Simulación Integrado</span>
      </div>

      {/* Switcher */}
      <div className="flex flex-wrap gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
        <button
          id="btn-role-client"
          onClick={() => onChangeRole("client")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            currentRole === "client"
              ? "bg-amber-600 text-white font-bold shadow-md"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          📱 Cliente (QR)
        </button>
        <button
          id="btn-role-waiter"
          onClick={() => onChangeRole("waiter")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            currentRole === "waiter"
              ? "bg-amber-600 text-white font-bold shadow-md"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          🤵 Mozo POS
        </button>
        <button
          id="btn-role-kitchen"
          onClick={() => onChangeRole("kitchen")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            currentRole === "kitchen"
              ? "bg-amber-600 text-white font-bold shadow-md"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          🍳 Cocina KDS
        </button>
        <button
          id="btn-role-admin"
          onClick={() => onChangeRole("admin")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            currentRole === "admin"
              ? "bg-amber-600 text-white font-bold shadow-md"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          📈 Admin CRM
        </button>
      </div>

      {/* Role details context */}
      <div className="flex items-center gap-3">
        {currentRole === "client" && (
          <div className="flex items-center gap-1.5 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
            <span className="text-zinc-400 font-medium">Mesa Simulada:</span>
            <select
              id="client-table-select"
              value={activeTableIdForClient}
              onChange={(e) => onChangeClientTable(e.target.value)}
              className="bg-transparent text-amber-500 font-bold focus:outline-none border-none cursor-pointer p-0 text-xs"
            >
              {tables.map((tbl) => (
                <option key={tbl.id} value={tbl.id} className="bg-zinc-900 text-white">
                  Mesa {tbl.number}
                </option>
              ))}
            </select>
          </div>
        )}

        {currentRole === "waiter" && activeUser && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Mozo: <strong className="text-amber-500">{activeUser.name}</strong></span>
            <button
              id="btn-waiter-logout"
              onClick={onLogout}
              className="text-red-400 hover:text-red-300 font-semibold underline ml-1 cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {currentRole === "admin" && activeUser && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Admin: <strong className="text-amber-500">{activeUser.name}</strong></span>
            <button
              id="btn-admin-logout"
              onClick={onLogout}
              className="text-red-400 hover:text-red-300 font-semibold underline ml-1 cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {/* Toggle Theme Explorer button */}
        <button
          onClick={onToggleThemeExplorer}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            showThemeExplorer
              ? "bg-amber-600 border-amber-500 text-white shadow-sm"
              : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700"
          }`}
          title="Ver diferentes opciones de colores y temas"
          id="btn-toggle-themes"
        >
          <span>🎨 Colores y Temas</span>
        </button>
      </div>
    </div>
  );
}
