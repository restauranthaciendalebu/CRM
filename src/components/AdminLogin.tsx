import React, { useState } from "react";
import { User } from "../types";
import { ShieldCheck, Lock } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: (user: User) => void;
  onLoginError: (error: string) => void;
}

export default function AdminLogin({ onLoginSuccess, onLoginError }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const validateAdminCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setIsValidating(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        const user = (await res.json()) as User;
        if (user.role === "ADMIN" || (user.permissions && user.permissions.length > 0)) {
          onLoginSuccess(user);
        } else {
          setLoginError("Acceso denegado. No tienes permisos para ingresar a este panel.");
          onLoginError("No admin permissions");
          setPassword("");
        }
      } else {
        const err = await res.json();
        setLoginError(err.error || "Usuario o contraseña incorrectos");
        onLoginError("Invalid PIN credentials");
        setPassword("");
      }
    } catch (e) {
      setLoginError("Error de conexión con el servidor");
      onLoginError("Network connection error");
      setPassword("");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-[85vh] flex flex-col items-center justify-center p-6 text-white" id="admin-login-view">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        <span className="text-amber-500 font-bold tracking-widest text-xs uppercase block text-center">Control Panel</span>
        <h2 className="text-2xl font-black mt-2 text-zinc-100 flex items-center gap-1.5 font-sans">
          <ShieldCheck className="w-6 h-6 text-amber-500" /> Admin CRM Hacienda
        </h2>
        <p className="text-zinc-500 text-xs text-center mt-1">Ingresa tu usuario y contraseña de administrador.</p>

        {loginError && (
          <span className="text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl mb-4 text-center">
            {loginError}
          </span>
        )}

        <form onSubmit={validateAdminCredentials} className="w-full space-y-4 mt-7">
          <label className="block text-xs font-bold text-zinc-400">Usuario
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoComplete="username" className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none focus:border-amber-500" placeholder="Ej: admin" disabled={isValidating} />
          </label>
          <label className="block text-xs font-bold text-zinc-400">Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none focus:border-amber-500" placeholder="Ingresa tu contraseña" disabled={isValidating} />
          </label>
          <button type="submit" disabled={isValidating || !username.trim() || !password} className="w-full rounded-xl bg-emerald-600 py-3.5 font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50">
            {isValidating ? "Verificando..." : "Ingresar al panel"}
          </button>
        </form>

        <div className="text-zinc-600 text-[10px] text-center mt-6">
          Si olvidaste tus credenciales, solicita un reinicio a administración.
        </div>
      </div>
    </div>
  );
}
