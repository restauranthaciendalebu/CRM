import React, { useState } from "react";
import { themes, ThemeConfig } from "../theme";
import { ChevronLeft, ChevronRight, Check, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ThemeCarouselProps {
  currentThemeId: string;
  onSelectTheme: (id: string) => void;
  onClose?: () => void;
}

export default function ThemeCarousel({
  currentThemeId,
  onSelectTheme,
  onClose,
}: ThemeCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = themes.findIndex((t) => t.id === currentThemeId);
    return idx >= 0 ? idx : 0;
  });

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % themes.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + themes.length) % themes.length);
  };

  const activeTheme = themes[currentIndex];
  const isApplied = activeTheme.id === currentThemeId;

  return (
    <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-2xl mx-auto my-4 overflow-hidden" id="theme-carousel-widget">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          <div>
            <h2 className="text-base font-black tracking-tight text-white font-sans">
              Explorador Visual de Colores y Temas
            </h2>
            <p className="text-zinc-500 text-[11px]">
              Explora y previsualiza el diseño antes de hacer cambios definitivos
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Carousel Area */}
      <div className="relative flex flex-col md:flex-row gap-6 items-center bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/60 min-h-[300px]">
        {/* Vibe Image / Background */}
        <div className="w-full md:w-1/2 h-44 rounded-xl overflow-hidden relative shadow-md flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={activeTheme.id}
              src={activeTheme.image}
              alt={activeTheme.name}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-white/90 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
              Vibración de Diseño
            </span>
          </div>
        </div>

        {/* Details & Live Preview */}
        <div className="flex-1 flex flex-col justify-between self-stretch min-w-0">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTheme.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full inline-block border border-white/20 shadow-xs"
                    style={{ backgroundColor: activeTheme.primary }}
                  />
                  {activeTheme.name}
                </h3>
                <p className="text-zinc-400 text-xs leading-relaxed min-h-[48px]">
                  {activeTheme.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Simulated mini components live preview */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2.5">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">
                Vista Previa de Componentes en Vivo
              </span>
              
              {/* Simulated header */}
              <div
                className="rounded-lg p-2 flex items-center justify-between text-[10px] transition-all"
                style={{ backgroundColor: activeTheme.bgHeader }}
              >
                <span className="font-extrabold" style={{ color: activeTheme.textHeader }}>
                  Restaurant Hacienda
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-full font-black text-[8px]"
                  style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText }}
                >
                  Mesa 5
                </span>
              </div>

              {/* Simulated Buttons */}
              <div className="flex gap-1.5">
                <button
                  className="flex-1 py-1 px-2 rounded font-bold text-[9px] flex items-center justify-center gap-1 cursor-default"
                  style={{
                    backgroundColor: activeTheme.primary,
                    color: activeTheme.id === "charcoal" ? "#18181b" : "#ffffff",
                  }}
                >
                  Confirmar Pedido
                </button>
                <button
                  className="flex-1 py-1 px-2 rounded font-bold text-[9px] flex items-center justify-center gap-1 border cursor-default"
                  style={{
                    borderColor: activeTheme.accentBorder,
                    color: activeTheme.primary,
                    backgroundColor: "transparent",
                  }}
                >
                  Llamar Mozo
                </button>
              </div>
            </div>
          </div>

          {/* Action apply button */}
          <div className="mt-4 pt-2 flex items-center justify-between gap-3">
            <button
              onClick={() => onSelectTheme(activeTheme.id)}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isApplied
                  ? "bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-default"
                  : "bg-white text-zinc-950 hover:bg-zinc-200 shadow-md"
              }`}
              disabled={isApplied}
            >
              {isApplied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                  <span>Tema Aplicado</span>
                </>
              ) : (
                <>
                  <span>Aplicar este Tema</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-1.5">
          <button
            onClick={prevSlide}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextSlide}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dot Indicators */}
        <div className="flex gap-1.5">
          {themes.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                currentIndex === idx ? "w-6 bg-amber-500" : "w-1.5 bg-zinc-800 hover:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
