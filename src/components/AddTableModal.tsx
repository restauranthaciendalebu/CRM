import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Table } from "../types";

interface AddTableModalProps {
  tables: Table[];
  operatorName: string;
  onClose: () => void;
  onAdded: (table: Table) => void;
}

export default function AddTableModal({ tables, operatorName, onClose, onAdded }: AddTableModalProps) {
  const existingZones = Array.from(new Set(tables.map((table) => table.zone))).sort();
  const [zone, setZone] = useState(existingZones[0] || "Salón Principal");
  const [seats, setSeats] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const nextNumber = tables.reduce((highest, table) => Math.max(highest, table.number), 0) + 1;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!zone.trim() || seats < 1 || seats > 30) return;

    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/tables/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone: zone.trim(), seats, operatorName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "No se pudo agregar la mesa.");
        return;
      }
      onAdded(data.table as Table);
      onClose();
    } catch {
      setError("No se pudo conectar con el sistema.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/60 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="add-table-title">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-table-title" className="text-base font-extrabold text-zinc-950">Agregar Mesa {nextNumber}</h2>
            <p className="mt-1 text-xs text-zinc-500">La nueva mesa quedará disponible inmediatamente.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 flex items-center justify-center" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-xs font-bold text-zinc-700">
            Zona
            <input
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              list="table-zones"
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-500"
              placeholder="Ej: Salón Principal"
              disabled={isSaving}
            />
            <datalist id="table-zones">
              {existingZones.map((existingZone) => <option key={existingZone} value={existingZone} />)}
            </datalist>
          </label>

          <label className="block text-xs font-bold text-zinc-700">
            Cantidad de asientos
            <input
              type="number"
              min="1"
              max="30"
              value={seats}
              onChange={(event) => setSeats(Number(event.target.value))}
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-500"
              disabled={isSaving}
            />
          </label>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSaving || !zone.trim() || seats < 1 || seats > 30} className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> {isSaving ? "Agregando..." : "Agregar mesa"}
          </button>
        </div>
      </form>
    </div>
  );
}
