import React, { useState } from "react";
import { User } from "../types";
import { ShieldCheck, Lock } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: (user: User) => void;
  onLoginError: (error: string) => void;
}

export default function AdminLogin({ onLoginSuccess, onLoginError }: AdminLoginProps) {
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handlePinKeyPress = (num: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
    }
  };

  const handlePinBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const validateAdminPin = async (pin: string) => {
    setIsValidating(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      
      if (res.ok) {
        const user = (await res.json()) as User;
        if (user.role === "ADMIN" || (user.permissions && user.permissions.length > 0)) {
          onLoginSuccess(user);
        } else {
          setLoginError("Acceso denegado. No tienes permisos para ingresar a este panel.");
          onLoginError("No admin permissions");
          setPinInput("");
        }
      } else {
        const err = await res.json();
        setLoginError(err.error || "PIN inválido");
        onLoginError("Invalid PIN credentials");
        setPinInput("");
      }
    } catch (e) {
      setLoginError("Error de conexión con el servidor");
      onLoginError("Network connection error");
      setPinInput("");
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
        <p className="text-zinc-500 text-xs text-center mt-1">Ingresa tu código PIN de administrador para acceder a las métricas e inventario.</p>

        {/* PIN circles indicator */}
        <div className="flex gap-4 my-8">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                pinInput.length > idx 
                  ? "bg-amber-500 border-amber-500 scale-110 shadow-lg shadow-amber-500/20" 
                  : "border-zinc-700"
              }`}
            />
          ))}
        </div>

        {loginError && (
          <span className="text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl mb-4 text-center">
            {loginError}
          </span>
        )}

        {/* NUMPAD */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handlePinKeyPress(num)}
              disabled={isValidating}
              className="w-16 h-16 rounded-full bg-zinc-800/80 hover:bg-zinc-700 font-black text-xl flex items-center justify-center transition-all active:scale-90 border border-zinc-700/50 cursor-pointer disabled:opacity-55"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handlePinBackspace}
            disabled={isValidating}
            className="w-16 h-16 rounded-full bg-zinc-800/40 hover:bg-zinc-700 text-xs font-bold flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-55"
          >
            Borrar
          </button>
          <button
            onClick={() => handlePinKeyPress("0")}
            disabled={isValidating}
            className="w-16 h-16 rounded-full bg-zinc-800/80 hover:bg-zinc-700 font-black text-xl flex items-center justify-center transition-all active:scale-90 border border-zinc-700/50 cursor-pointer disabled:opacity-55"
          >
            0
          </button>
          <button
            onClick={() => validateAdminPin(pinInput)}
            disabled={isValidating || pinInput.length === 0}
            className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 font-bold text-xs flex items-center justify-center transition-all active:scale-90 border border-emerald-500/50 cursor-pointer disabled:opacity-55 text-white"
          >
            Aceptar
          </button>
        </div>

        <div className="text-zinc-600 text-[10px] text-center mt-6">
          PIN Administrador por defecto: <br />
          <strong>1234</strong>
        </div>
      </div>
    </div>
  );
}
