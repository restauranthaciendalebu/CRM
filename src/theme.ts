export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  primary: string;
  primaryHover: string;
  bgHeader: string;
  textHeader: string;
  badgeBg: string;
  badgeText: string;
  accentBorder: string;
  image: string;
}

export const themes: ThemeConfig[] = [
  {
    id: "amber",
    name: "Hacienda Tradicional (Ámbar)",
    description: "La calidez del campo chileno, con tonos ámbar, madera y negro rústico. El estilo campestre por excelencia.",
    primary: "#f59e0b",
    primaryHover: "#d97706",
    bgHeader: "#18181b",
    textHeader: "#f59e0b",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    badgeText: "#d97706",
    accentBorder: "rgba(245, 158, 11, 0.3)",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "emerald",
    name: "Valle de Curicó (Verde Viñedo)",
    description: "Inspirado en los valles vitivinícolas y la cordillera, con un verde esmeralda profundo y destellos dorados.",
    primary: "#10b981",
    primaryHover: "#059669",
    bgHeader: "#064e3b",
    textHeader: "#34d399",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeText: "#047857",
    accentBorder: "rgba(16, 185, 129, 0.3)",
    image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "crimson",
    name: "Copa de Cabernet (Rojo Rubí)",
    description: "El alma de los tintos chilenos más selectos, con tonos bordó intensos y fuego de fogón criollo.",
    primary: "#ef4444",
    primaryHover: "#dc2626",
    bgHeader: "#450a0a",
    textHeader: "#f87171",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    badgeText: "#b91c1c",
    accentBorder: "rgba(239, 68, 68, 0.3)",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "navy",
    name: "Pacífico Azul (Azul Mar)",
    description: "Inspirado en la inmensidad del Océano Pacífico chileno, con azules profundos y espumas plateadas.",
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    bgHeader: "#172554",
    textHeader: "#60a5fa",
    badgeBg: "rgba(59, 130, 246, 0.15)",
    badgeText: "#1d4ed8",
    accentBorder: "rgba(59, 130, 246, 0.3)",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "charcoal",
    name: "Piedra Volcánica (Gris Carbón)",
    description: "Estilo ultra moderno y minimalista, basado en rocas basálticas andinas con contrastes puros y elegantes.",
    primary: "#71717a",
    primaryHover: "#52525b",
    bgHeader: "#09090b",
    textHeader: "#f4f4f5",
    badgeBg: "rgba(113, 113, 122, 0.15)",
    badgeText: "#3f3f46",
    accentBorder: "rgba(113, 113, 122, 0.3)",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80"
  }
];
