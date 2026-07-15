import React, { useState } from "react";
import { User, RestaurantState } from "../types";
import { Utensils } from "lucide-react";
import { motion } from "motion/react";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  state: RestaurantState;
}

export default function LoginView({ onLoginSuccess, state }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const validateCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setIsValidating(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const user = (await res.json()) as User;
        onLoginSuccess(user);
      } else {
        const err = await res.json();
        setLoginError(err.error || "Usuario o contraseña incorrectos");
        setPassword("");
      }
    } catch (e) {
      setLoginError("Error de conexión con el servidor");
      setPassword("");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen flex flex-col items-center justify-center p-6 text-white" id="main-login-view">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center"
      >
        <span className="text-amber-500 font-bold tracking-widest text-xs uppercase block text-center">Acceso de Personal</span>
        <h2 className="text-2xl font-black mt-2 text-zinc-100 flex items-center gap-1.5 font-sans">
          <Utensils className="w-6 h-6 text-amber-500" /> Restaurant Hacienda
        </h2>
        <p className="text-zinc-500 text-xs text-center mt-2">Ingresa tu usuario y contraseña para acceder al sistema.</p>

        {loginError && (
          <span className="text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl mb-4 text-center">
            {loginError}
          </span>
        )}

        <form onSubmit={validateCredentials} className="w-full space-y-4 mt-7">
          <label className="block text-xs font-bold text-zinc-400">Usuario
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none focus:border-amber-500"
              disabled={isValidating}
            >
              <option value="">Selecciona tu usuario</option>
              {state.users.map((user) => (
                <option key={user.id} value={user.username || user.name}>{user.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-zinc-400">Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none focus:border-amber-500" placeholder="Ingresa tu contraseña" disabled={isValidating} />
          </label>
          <button type="submit" disabled={isValidating || !username.trim() || !password} className="w-full rounded-xl bg-emerald-600 py-3.5 font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50">
            {isValidating ? "Verificando..." : "Ingresar"}
          </button>
        </form>

        <div className="text-zinc-600 text-[10px] text-center mt-6">
          Si olvidaste tus credenciales, solicita un reinicio a administración.
        </div>
      </motion.div>
    </div>
  );
}
