import React, { useState } from "react";
import { RestaurantState, Product, DailyMenuChoiceGroup, DAILY_MENU_CATEGORY_ID } from "../types";
import { X, Check, Plus, Trash2, Loader2, UtensilsCrossed, Settings2 } from "lucide-react";

interface DailyMenuManagerProps {
  state: RestaurantState;
  operatorName: string;
  onClose: () => void;
  onChanged: () => void;
}

const formatCLP = (value: number) => `$${value.toLocaleString("es-CL")}`;

const DEFAULT_PRICE = 6000;
const DEFAULT_PUBLIC_SERVICE_PRICE = 4800;

const STARTER_DISHES = [
  "Lentejas con longaniza",
  "Lasaña boloñesa",
  "Cazuela de vacuno",
  "Cazuela de pollo",
  "Strogonoff de vacuno",
  "Estofado de cerdo",
  "Estofado de costilla de vacuno",
  "Porotos con rienda y longaniza",
  "Tallarines con salsa boloñesa",
  "Tallarines en salsa Alfredo",
  "Tortillas de verduras",
  "Tortillas de acelga",
  "Croquetas de atún",
  "Croquetas de verdura",
  "Zapallo italiano relleno",
  "Budín de zapallo italiano",
  "Charquicán",
];

export default function DailyMenuManager({ state, operatorName, onClose, onChanged }: DailyMenuManagerProps) {
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isEditingChoices, setIsEditingChoices] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isSavingChoices, setIsSavingChoices] = useState(false);
  const [draftGroups, setDraftGroups] = useState<DailyMenuChoiceGroup[]>(
    () => JSON.parse(JSON.stringify(state.dailyMenuChoiceGroups || [])),
  );

  const dailyMenuProducts = state.products
    .filter((p) => p.categoryId === DAILY_MENU_CATEGORY_ID)
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeCount = dailyMenuProducts.filter((p) => p.isAvailable).length;

  const toggleProduct = async (product: Product) => {
    if (pendingIds.includes(product.id)) return;
    setPendingIds((prev) => [...prev, product.id]);
    setError("");
    try {
      const res = await fetch(`/api/products/${product.id}/toggle-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorName }),
      });
      if (res.ok) {
        onChanged();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "No se pudo cambiar la disponibilidad.");
      }
    } catch {
      setError("Error de conexión al cambiar la disponibilidad.");
    } finally {
      setPendingIds((prev) => prev.filter((id) => id !== product.id));
    }
  };

  const setAll = async (available: boolean) => {
    const targets = dailyMenuProducts.filter((p) => Boolean(p.isAvailable) !== available);
    for (const product of targets) {
      // Sequential on purpose: each toggle is its own transaction, and firing
      // seventeen at once would make them collide on the same documents.
      await toggleProduct(product);
    }
  };

  const runSetup = async () => {
    setIsSettingUp(true);
    setError("");
    try {
      const res = await fetch("/api/admin/daily-menu/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishes: STARTER_DISHES,
          price: DEFAULT_PRICE,
          publicServicePrice: DEFAULT_PUBLIC_SERVICE_PRICE,
          operatorName,
        }),
      });
      if (res.ok) {
        onChanged();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "No se pudo preparar el menú del día.");
      }
    } catch {
      setError("Error de conexión al preparar el menú del día.");
    } finally {
      setIsSettingUp(false);
    }
  };

  const saveChoiceGroups = async () => {
    setIsSavingChoices(true);
    setError("");
    try {
      const res = await fetch("/api/admin/config/daily-menu-choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: draftGroups, operatorName }),
      });
      if (res.ok) {
        setIsEditingChoices(false);
        onChanged();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "No se pudieron guardar las opciones.");
      }
    } catch {
      setError("Error de conexión al guardar las opciones.");
    } finally {
      setIsSavingChoices(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
          <div>
            <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-amber-500" /> Menú de Hoy
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {activeCount === 0
                ? "Sin menús marcados — no se muestra nada al público."
                : `${activeCount} menú${activeCount === 1 ? "" : "s"} visible${activeCount === 1 ? "" : "s"} en la carta.`}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold rounded-lg p-2">
            {error}
          </div>
        )}

        {dailyMenuProducts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-zinc-600">
              Todavía no hay menús cargados. Puedo dejar la lista inicial lista de una vez
              ({STARTER_DISHES.length} menús a {formatCLP(DEFAULT_PRICE)} y{" "}
              {formatCLP(DEFAULT_PUBLIC_SERVICE_PRICE)} servicio público).
            </p>
            <p className="text-[10px] text-zinc-400 mt-1">
              Quedan todos desmarcados: tú eliges cuáles van cada día. Después puedes
              editarlos o agregar más desde Carta &amp; Precios.
            </p>
            <button
              onClick={runSetup}
              disabled={isSettingUp}
              className="mt-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2"
            >
              {isSettingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {isSettingUp ? "Preparando..." : "Cargar los menús iniciales"}
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 flex gap-2 border-b border-zinc-100">
              <button
                onClick={() => setAll(true)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-[11px] py-1.5 rounded-lg cursor-pointer"
              >
                Marcar todos
              </button>
              <button
                onClick={() => setAll(false)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-[11px] py-1.5 rounded-lg cursor-pointer"
              >
                Desmarcar todos
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {dailyMenuProducts.map((product) => {
                const isPending = pendingIds.includes(product.id);
                const isOn = Boolean(product.isAvailable);
                return (
                  <button
                    key={product.id}
                    onClick={() => toggleProduct(product)}
                    disabled={isPending}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isOn
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-white border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                        isOn ? "bg-emerald-600 border-emerald-600" : "bg-white border-zinc-300"
                      }`}
                    >
                      {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                      ) : isOn ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : null}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-xs font-bold ${isOn ? "text-emerald-900" : "text-zinc-700"}`}>
                        {product.name}
                      </span>
                      <span className="block text-[10px] text-zinc-500">
                        {formatCLP(product.price)}
                        {product.publicServicePrice
                          ? ` · ${formatCLP(product.publicServicePrice)} servicio público`
                          : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Accompaniment options, editable by the restaurant */}
        <div className="border-t border-zinc-100 bg-zinc-50 p-3">
          {!isEditingChoices ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wide text-zinc-500 block">
                  Incluye
                </span>
                <span className="text-[11px] text-zinc-600">
                  {(state.dailyMenuChoiceGroups || []).length === 0
                    ? "Sin opciones configuradas."
                    : (state.dailyMenuChoiceGroups || [])
                        .map((g) => `${g.name} (${g.options.length})`)
                        .join(" · ")}
                </span>
              </div>
              <button
                onClick={() => {
                  setDraftGroups(JSON.parse(JSON.stringify(state.dailyMenuChoiceGroups || [])));
                  setIsEditingChoices(true);
                }}
                className="shrink-0 flex items-center gap-1 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" /> Editar
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[38vh] overflow-y-auto">
              {draftGroups.map((group, groupIndex) => (
                <div key={group.id} className="bg-white border border-zinc-200 rounded-xl p-2.5">
                  <div className="flex gap-1.5 items-center">
                    <input
                      value={group.name}
                      placeholder="Nombre (ej: Jugo)"
                      onChange={(e) => {
                        const value = e.target.value;
                        setDraftGroups((prev) =>
                          prev.map((g, i) => (i === groupIndex ? { ...g, name: value } : g)),
                        );
                      }}
                      className="flex-1 min-w-0 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold text-zinc-800 outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => setDraftGroups((prev) => prev.filter((_, i) => i !== groupIndex))}
                      className="shrink-0 text-zinc-400 hover:text-red-600 cursor-pointer p-1"
                      title="Eliminar grupo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {group.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex gap-1.5 items-center">
                        <input
                          value={option}
                          placeholder="Opción"
                          onChange={(e) => {
                            const value = e.target.value;
                            setDraftGroups((prev) =>
                              prev.map((g, i) =>
                                i === groupIndex
                                  ? { ...g, options: g.options.map((o, j) => (j === optionIndex ? value : o)) }
                                  : g,
                              ),
                            );
                          }}
                          className="flex-1 min-w-0 border border-zinc-200 rounded-lg px-2 py-1 text-[11px] text-zinc-700 outline-none focus:border-amber-400"
                        />
                        <button
                          onClick={() =>
                            setDraftGroups((prev) =>
                              prev.map((g, i) =>
                                i === groupIndex
                                  ? { ...g, options: g.options.filter((_, j) => j !== optionIndex) }
                                  : g,
                              ),
                            )
                          }
                          className="shrink-0 text-zinc-400 hover:text-red-600 cursor-pointer p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setDraftGroups((prev) =>
                          prev.map((g, i) => (i === groupIndex ? { ...g, options: [...g.options, ""] } : g)),
                        )
                      }
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                    >
                      + Agregar opción
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setDraftGroups((prev) => [
                    ...prev,
                    { id: "grp_" + Math.random().toString(36).substring(2, 11), name: "", options: [""] },
                  ])
                }
                className="w-full flex items-center justify-center gap-1 bg-white border border-dashed border-zinc-300 hover:bg-zinc-50 text-zinc-600 font-bold text-[11px] py-2 rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar grupo (ej: Ensalada)
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setIsEditingChoices(false)}
                  className="flex-1 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-600 font-bold text-[11px] py-2 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveChoiceGroups}
                  disabled={isSavingChoices}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-bold text-[11px] py-2 rounded-lg cursor-pointer"
                >
                  {isSavingChoices ? "Guardando..." : "Guardar opciones"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
