import React, { useState, useEffect, useRef } from "react";
import { Table } from "../types";
import { QrCode, Download, Printer, Copy, CheckCircle, ExternalLink } from "lucide-react";
import QRCode from "qrcode";

interface QRGeneratorProps {
  tables: Table[];
  restaurantName?: string;
}

const BASE_URL = "https://restauranthaciendalebu.github.io/CRM/";

export default function QRGenerator({ tables, restaurantName = "Restaurant Hacienda" }: QRGeneratorProps) {
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Generate QR codes for all tables
  useEffect(() => {
    const generateAll = async () => {
      setIsGenerating(true);
      const urls: Record<string, string> = {};
      
      // Generate a general QR for the whole menu
      try {
        urls["general"] = await QRCode.toDataURL(BASE_URL, {
          width: 512,
          margin: 2,
          color: { dark: "#18181b", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });
      } catch (err) {
        console.error("Error generating general QR:", err);
      }

      // Generate QR for each table
      for (const table of tables) {
        const tableUrl = `${BASE_URL}?mesa=${table.number}`;
        try {
          urls[table.id] = await QRCode.toDataURL(tableUrl, {
            width: 512,
            margin: 2,
            color: { dark: "#18181b", light: "#ffffff" },
            errorCorrectionLevel: "H",
          });
        } catch (err) {
          console.error(`Error generating QR for table ${table.number}:`, err);
        }
      }
      setQrDataUrls(urls);
      setIsGenerating(false);
    };
    generateAll();
  }, [tables]);

  const downloadQR = (dataUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const copyUrl = (tableNumber?: number) => {
    const url = tableNumber ? `${BASE_URL}?mesa=${tableNumber}` : BASE_URL;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(tableNumber ? `t${tableNumber}` : "general");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const downloadAllQRs = async () => {
    // Download all as individual files with slight delay
    const allEntries = [
      { key: "general", name: `${restaurantName.replace(/\s/g, "_")}_Carta_General.png` },
      ...tables.map(t => ({ key: t.id, name: `${restaurantName.replace(/\s/g, "_")}_Mesa_${t.number}.png` })),
    ];

    for (const entry of allEntries) {
      if (qrDataUrls[entry.key]) {
        downloadQR(qrDataUrls[entry.key], entry.name);
        await new Promise(r => setTimeout(r, 300));
      }
    }
  };

  const printAllQRs = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Códigos QR - ${restaurantName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: white; padding: 20px; }
          .qr-print-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
          .qr-print-card { 
            border: 2px solid #e4e4e7; border-radius: 16px; padding: 20px;
            text-align: center; page-break-inside: avoid;
          }
          .qr-print-card img { width: 200px; height: 200px; margin: 8px auto; }
          .qr-label { font-size: 18px; font-weight: 900; color: #18181b; margin-bottom: 4px; }
          .qr-sublabel { font-size: 11px; color: #71717a; }
          .qr-zone { font-size: 10px; color: #a1a1aa; margin-top: 2px; }
          .qr-url { font-size: 8px; color: #a1a1aa; word-break: break-all; margin-top: 6px; }
          .brand { text-align: center; margin-bottom: 24px; }
          .brand h1 { font-size: 22px; font-weight: 900; color: #18181b; }
          .brand p { font-size: 11px; color: #71717a; }
          @media print {
            .qr-print-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
            .qr-print-card { border-width: 1px; }
          }
        </style>
      </head>
      <body>
        <div class="brand">
          <h1>🏠 ${restaurantName}</h1>
          <p>Códigos QR para Mesas — Carta Digital</p>
        </div>
        ${printContent}
        <script>window.onload = () => { window.print(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="font-bold text-sm">Generando códigos QR...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="qr-generator-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-500" /> Códigos QR para Mesas
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Descarga e imprime los QR para que tus clientes accedan a la carta digital desde su mesa.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadAllQRs}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Descargar Todos
          </button>
          <button
            onClick={printAllQRs}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Todos
          </button>
        </div>
      </div>

      {/* General Menu QR Card */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-shrink-0">
          {qrDataUrls["general"] && (
            <img
              src={qrDataUrls["general"]}
              alt="QR Carta General"
              className="w-40 h-40 rounded-xl shadow-lg border-4 border-white"
            />
          )}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <span className="text-[10px] uppercase tracking-widest font-black text-amber-700 block">QR Principal</span>
          <h4 className="text-lg font-black text-zinc-900 mt-1">📋 Carta Digital General</h4>
          <p className="text-xs text-zinc-500 mt-1">
            Este código QR enlaza directamente a la carta digital completa. Ideal para la entrada del local, redes sociales o publicidad.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
            <button
              onClick={() => downloadQR(qrDataUrls["general"], `${restaurantName.replace(/\s/g, "_")}_Carta_General.png`)}
              className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition-all cursor-pointer"
            >
              <Download className="w-3 h-3" /> Descargar PNG
            </button>
            <button
              onClick={() => copyUrl()}
              className="flex items-center gap-1 bg-white hover:bg-zinc-50 text-zinc-700 font-bold py-1.5 px-3 rounded-lg text-[11px] transition-all cursor-pointer border border-zinc-200"
            >
              {copiedId === "general" ? (
                <><CheckCircle className="w-3 h-3 text-green-500" /> ¡Copiado!</>
              ) : (
                <><Copy className="w-3 h-3" /> Copiar Link</>
              )}
            </button>
            <a
              href={BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-white hover:bg-zinc-50 text-zinc-700 font-bold py-1.5 px-3 rounded-lg text-[11px] transition-all cursor-pointer border border-zinc-200"
            >
              <ExternalLink className="w-3 h-3" /> Abrir
            </a>
          </div>
          <p className="text-[9px] text-zinc-400 mt-2 font-mono break-all">{BASE_URL}</p>
        </div>
      </div>

      {/* Individual Table QRs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`bg-white border rounded-2xl p-4 shadow-sm text-center transition-all hover:shadow-md hover:border-amber-300 cursor-pointer ${
              selectedTable === table.id ? "border-amber-500 ring-2 ring-amber-200 bg-amber-50/30" : "border-zinc-200"
            }`}
            onClick={() => setSelectedTable(selectedTable === table.id ? null : table.id)}
          >
            {qrDataUrls[table.id] && (
              <img
                src={qrDataUrls[table.id]}
                alt={`QR Mesa ${table.number}`}
                className="w-full max-w-[140px] mx-auto rounded-lg"
              />
            )}
            <div className="mt-3">
              <span className="font-black text-zinc-900 text-sm block">Mesa {table.number}</span>
              <span className="text-[10px] text-zinc-400 block">{table.zone} · {table.seats} asientos</span>
            </div>

            {/* Expanded actions */}
            {selectedTable === table.id && (
              <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadQR(qrDataUrls[table.id], `Hacienda_Mesa_${table.number}.png`);
                  }}
                  className="w-full flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Descargar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyUrl(table.number);
                  }}
                  className="w-full flex items-center justify-center gap-1 bg-white hover:bg-zinc-50 text-zinc-700 font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all cursor-pointer border border-zinc-200"
                >
                  {copiedId === `t${table.number}` ? (
                    <><CheckCircle className="w-3 h-3 text-green-500" /> ¡Copiado!</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copiar Link</>
                  )}
                </button>
                <p className="text-[8px] text-zinc-400 font-mono break-all">{BASE_URL}?mesa={table.number}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hidden print template */}
      <div className="hidden">
        <div ref={printRef}>
          <div className="qr-print-grid">
            {/* General QR */}
            <div className="qr-print-card">
              <div className="qr-label">📋 Carta Digital</div>
              <div className="qr-sublabel">{restaurantName}</div>
              {qrDataUrls["general"] && (
                <img src={qrDataUrls["general"]} alt="QR Carta" />
              )}
              <div className="qr-url">{BASE_URL}</div>
            </div>

            {/* Per-table QR */}
            {tables.map((table) => (
              <div key={table.id} className="qr-print-card">
                <div className="qr-label">Mesa {table.number}</div>
                <div className="qr-sublabel">{table.zone} · {table.seats} asientos</div>
                {qrDataUrls[table.id] && (
                  <img src={qrDataUrls[table.id]} alt={`QR Mesa ${table.number}`} />
                )}
                <div className="qr-url">{BASE_URL}?mesa={table.number}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-4 text-center">
        <p className="text-[11px] text-zinc-500 font-semibold">
          💡 <strong>Tip:</strong> Imprime los QR de las mesas, plastifícalos y colócalos sobre cada mesa.
          Los clientes podrán escanear con su cámara para ver la carta y hacer pedidos directamente.
        </p>
      </div>
    </div>
  );
}
