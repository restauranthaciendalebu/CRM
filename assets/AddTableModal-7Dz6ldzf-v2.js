import{c as E,P as b,r as k,j as a}from"./index-1tmtwnbU-v2.js";import{X as Q}from"./x-DzW62NLv-v2.js";import{P as W}from"./plus-C2g8eirJ-v2.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]],nt=E("dollar-sign",K);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tt=[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]],dt=E("printer",tt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const et=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],ct=E("trash-2",et);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const at=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]],lt=E("user-plus",at);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ot=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],pt=E("users",ot);function mt({order:s,state:f,payments:n,waiterName:y,accountSubtotal:u,accountDiscount:d,accountTip:x,accountTotal:p,previouslyPaid:h=0,remainingBalance:c=0}){var _,X;const g=f.tables.find(t=>t.id===s.tableId),C=g?`Mesa ${g.number} — ${g.zone}`:"Sin mesa",l=new Date(((_=n[0])==null?void 0:_.createdAt)||(s.status==="CLOSED"?s.updatedAt:new Date().toISOString())),$=l.toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}),L=l.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}),o=`${l.getFullYear()}${String(l.getMonth()+1).padStart(2,"0")}${String(l.getDate()).padStart(2,"0")}`,v=(((X=n[0])==null?void 0:X.id)||s.id).replace(/[^a-zA-Z0-9]/g,"").slice(-8).toUpperCase().padStart(8,"0"),T=`B-${o}-${v}`,R=s.items.map(t=>{var N;const r=f.products.find(m=>m.id===t.productId);if(!r)return"";const j=((N=t.selectedModifiers)==null?void 0:N.reduce((m,O)=>m+O.extraPrice,0))||0,D=(r.price+j)*t.quantity,w=t.selectedModifiers&&t.selectedModifiers.length>0?t.selectedModifiers.map(m=>{const O=m.extraPrice>0?"+":m.extraPrice<0?"-":"",Y=m.extraPrice!==0?` (${m.extraPrice>0?"+":"-"}$${Math.abs(m.extraPrice).toLocaleString("es-CL")})`:"";return`  ${O} ${m.name}${Y}`}).join("<br/>"):"";return`
        <tr>
          <td class="item-name">
            ${t.quantity}x ${r.name}
            ${w?`<br/><span class="mod">${w}</span>`:""}
            ${t.notes?`<br/><span class="mod">📝 ${t.notes}</span>`:""}
          </td>
          <td class="item-price">$${D.toLocaleString("es-CL")}</td>
        </tr>`}).join(""),M=s.items.reduce((t,r)=>{var D;const j=f.products.find(w=>w.id===r.productId);if(!j)return t;const q=((D=r.selectedModifiers)==null?void 0:D.reduce((w,N)=>w+N.extraPrice,0))||0;return t+(j.price+q)*r.quantity},0),z=n.reduce((t,r)=>t+(r.discount||0),0),A=n.reduce((t,r)=>t+(r.tip||0),0),e=n.reduce((t,r)=>t+r.amount,0),i=u??M,U=d??z,F=x??A,H=p??e,P=h>0||c>0||e<H,V=t=>({[b.CASH]:"Efectivo",[b.CREDIT]:"T. Crédito",[b.DEBIT]:"T. Débito",[b.TRANSFER]:"Transferencia",[b.ACCOUNT]:"Cuenta autorizada"})[t]||t,Z=n.map(t=>`<tr><td>${V(t.method)}</td><td class="item-price">$${t.amount.toLocaleString("es-CL")}</td></tr>`).join(""),G=`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Boleta ${T}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      width: 302px;
      margin: 0 auto;
      padding: 8px 4px;
      font-size: 11px;
      color: #000;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .sep {
      border: none;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .double-sep {
      border: none;
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    .header h1 {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .header p {
      font-size: 9px;
      color: #333;
      line-height: 1.3;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 2px 0;
      vertical-align: top;
      font-size: 11px;
    }
    .item-name { width: 72%; }
    .item-price { width: 28%; text-align: right; font-weight: 700; }
    .mod { font-size: 9px; color: #555; }
    .total-row td {
      font-size: 14px;
      font-weight: 700;
      padding: 4px 0;
    }
    .footer {
      text-align: center;
      font-size: 9px;
      color: #555;
      margin-top: 8px;
      line-height: 1.4;
    }
    .footer .big {
      font-size: 12px;
      font-weight: 700;
      color: #000;
    }
    @media print {
      body { width: 100%; padding: 0; }
      .no-print { display: none !important; }
    }
    .print-btn {
      display: block;
      width: 100%;
      margin: 12px 0;
      background: #000;
      color: #fff;
      border: none;
      padding: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header center">
    <h1>🏠 HACIENDA</h1>
    <p>
      Restaurant & Parrilla<br/>
      Dirección: Av. Ejemplo 1234, Lebu<br/>
      RUT: 76.XXX.XXX-X<br/>
      Giro: Restaurant y Servicios de Alimentación
    </p>
  </div>

  <hr class="double-sep" />

  <!-- Receipt info -->
  <div class="info-row"><span>Boleta N°</span><span class="bold">${T}</span></div>
  <div class="info-row"><span>Fecha</span><span>${$}  ${L}</span></div>
  <div class="info-row"><span>Mesa</span><span class="bold">${C}</span></div>
  ${y?`<div class="info-row"><span>Garzón</span><span>${y}</span></div>`:""}
  <div class="info-row"><span>Comensales</span><span>${s.customerCount}</span></div>

  <hr class="sep" />

  <!-- Items -->
  <table>
    <tbody>
      ${R}
    </tbody>
  </table>

  <hr class="sep" />

  <!-- Totals -->
  <table>
    <tr><td>Consumo total</td><td class="item-price">$${i.toLocaleString("es-CL")}</td></tr>
    ${U>0?`<tr><td>Descuento cuenta</td><td class="item-price" style="color:#c00">-$${U.toLocaleString("es-CL")}</td></tr>`:""}
    ${F>0?`<tr><td>Propina cuenta</td><td class="item-price">$${F.toLocaleString("es-CL")}</td></tr>`:""}
    ${P?`<tr><td>Total cuenta</td><td class="item-price">$${H.toLocaleString("es-CL")}</td></tr>`:""}
    ${h>0?`<tr><td>Pagado anteriormente</td><td class="item-price">$${h.toLocaleString("es-CL")}</td></tr>`:""}
  </table>

  <hr class="double-sep" />

  <table>
    <tr class="total-row"><td>${P?"PAGO ESTA BOLETA":"TOTAL"}</td><td class="item-price">$${e.toLocaleString("es-CL")}</td></tr>
    ${P?`<tr><td>Saldo pendiente</td><td class="item-price">$${c.toLocaleString("es-CL")}</td></tr>`:""}
  </table>

  <hr class="sep" />

  <!-- Payment methods -->
  <div class="center bold" style="font-size:10px; margin-bottom:3px;">FORMA DE PAGO</div>
  <table>
    ${Z}
  </table>

  <hr class="sep" />

  <!-- Footer -->
  <div class="footer">
    <p class="big">¡Gracias por su visita!</p>
    <p>Esperamos verle pronto de vuelta</p>
    <p style="margin-top:4px;">
      www.restauranthaciendalebu.github.io/CRM<br/>
      Carta Digital — Escanea el QR de tu mesa
    </p>
    <p style="margin-top:6px; font-size:8px; color:#999;">
      Documento tributario simplificado<br/>
      Boleta electrónica de venta
    </p>
  </div>

  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir Boleta</button>
</body>
</html>`,J=new Blob([G],{type:"text/html;charset=utf-8"}),B=URL.createObjectURL(J),I=window.open(B,"_blank");I&&(I.onload=()=>{setTimeout(()=>{I.print()},500)}),setTimeout(()=>URL.revokeObjectURL(B),1e4)}function bt({shift:s,operatorName:f,payments:n}){const y=new Date(s.openedAt),u=s.closedAt?new Date(s.closedAt):new Date,d=n.filter(e=>{if(!e.createdAt)return!1;const i=new Date(e.createdAt);return i>=y&&i<=u}),x=d.filter(e=>e.method===b.CASH).reduce((e,i)=>e+i.amount,0),p=d.filter(e=>e.method===b.DEBIT||e.method===b.CREDIT).reduce((e,i)=>e+i.amount,0),h=d.filter(e=>e.method===b.TRANSFER).reduce((e,i)=>e+i.amount,0),c=d.filter(e=>e.method===b.ACCOUNT).reduce((e,i)=>e+i.amount,0),g=d.reduce((e,i)=>e+(i.tip||0),0),C=x+p+h+c,l=s.initialCash||0,$=l+x,L=s.finalCash??$,o=L-$,S=y.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}),v=u.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}),T=u.toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}),R=`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Cierre de Caja Zeta - ${T}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body { font-family: monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 11px; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .header { margin-bottom: 8px; }
    .header h2 { margin: 0; font-size: 15px; }
    hr.sep { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    hr.double-sep { border: none; border-top: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; font-size: 11px; }
    .item-price { text-align: right; }
    .total-row { font-weight: bold; font-size: 12px; }
    .diff-box { border: 1px solid #000; padding: 4px; margin-top: 6px; font-weight: bold; text-align: center; }
    .no-print { margin-top: 12px; text-align: center; }
    .print-btn { background: #000; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="header center">
    <h2>RESTAURANT HACIENDA</h2>
    <p style="margin:2px 0;">REPORT DE CIERRE DE CAJA (ZETA)</p>
    <p style="margin:2px 0; font-size:10px;">Fecha: ${T}</p>
    <p style="margin:2px 0; font-size:10px;">Apertura: ${S} | Cierre: ${v}</p>
    <p style="margin:2px 0; font-size:10px;">Cajero: ${f}</p>
  </div>

  <hr class="double-sep" />

  <div class="bold center" style="margin-bottom:4px;">DESGLOSE DE VENTAS</div>
  <table>
    <tr><td>Efectivo (+)</td><td class="item-price">$${x.toLocaleString("es-CL")}</td></tr>
    <tr><td>Tarjetas Débito/Crédito (+)</td><td class="item-price">$${p.toLocaleString("es-CL")}</td></tr>
    <tr><td>Transferencias (+)</td><td class="item-price">$${h.toLocaleString("es-CL")}</td></tr>
    ${c>0?`<tr><td>Cuentas Fiadas (+)</td><td class="item-price">$${c.toLocaleString("es-CL")}</td></tr>`:""}
    <tr><td>Propinas (+)</td><td class="item-price">$${g.toLocaleString("es-CL")}</td></tr>
  </table>

  <hr class="sep" />

  <table>
    <tr class="total-row"><td>TOTAL VENTAS</td><td class="item-price">$${C.toLocaleString("es-CL")}</td></tr>
  </table>

  <hr class="double-sep" />

  <div class="bold center" style="margin-bottom:4px;">ARQUEO DE EFECTIVO</div>
  <table>
    <tr><td>Fondo Inicial de Caja</td><td class="item-price">$${l.toLocaleString("es-CL")}</td></tr>
    <tr><td>Ventas en Efectivo</td><td class="item-price">+$${x.toLocaleString("es-CL")}</td></tr>
    <tr class="total-row"><td>Efectivo Esperado</td><td class="item-price">$${$.toLocaleString("es-CL")}</td></tr>
    <tr><td>Efectivo Declarado</td><td class="item-price">$${L.toLocaleString("es-CL")}</td></tr>
  </table>

  <div class="diff-box">
    DIFERENCIA DE CAJA: $${o.toLocaleString("es-CL")}
    ${o===0?" (EXACTA ✅)":o<0?" (FALTANTE ⚠️)":" (SOBRANTE ℹ️)"}
  </div>

  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir Reporte Zeta</button>
  </div>
</body>
</html>`,M=new Blob([R],{type:"text/html;charset=utf-8"}),z=URL.createObjectURL(M),A=window.open(z,"_blank");A&&(A.onload=()=>{setTimeout(()=>{A.print()},500)}),setTimeout(()=>URL.revokeObjectURL(z),1e4)}function ut({tables:s,operatorName:f,onClose:n,onAdded:y}){const u=Array.from(new Set(s.map(o=>o.zone))).sort(),[d,x]=k.useState(u[0]||"Salón Principal"),[p,h]=k.useState(4),[c,g]=k.useState(!1),[C,l]=k.useState(""),$=s.reduce((o,S)=>Math.max(o,S.number),0)+1,L=async o=>{if(o.preventDefault(),!(!d.trim()||p<1||p>30)){g(!0),l("");try{const S=await fetch("/api/tables/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({zone:d.trim(),seats:p,operatorName:f})}),v=await S.json().catch(()=>({}));if(!S.ok){l(v.error||"No se pudo agregar la mesa.");return}y(v.table),n()}catch{l("No se pudo conectar con el sistema.")}finally{g(!1)}}};return a.jsx("div",{className:"fixed inset-0 z-[100] bg-zinc-950/60 p-4 flex items-center justify-center",role:"dialog","aria-modal":"true","aria-labelledby":"add-table-title",children:a.jsxs("form",{onSubmit:L,className:"w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl",children:[a.jsxs("div",{className:"flex items-start justify-between gap-4",children:[a.jsxs("div",{children:[a.jsxs("h2",{id:"add-table-title",className:"text-base font-extrabold text-zinc-950",children:["Agregar Mesa ",$]}),a.jsx("p",{className:"mt-1 text-xs text-zinc-500",children:"La nueva mesa quedará disponible inmediatamente."})]}),a.jsx("button",{type:"button",onClick:n,className:"h-9 w-9 shrink-0 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 flex items-center justify-center","aria-label":"Cerrar",children:a.jsx(Q,{className:"h-4 w-4"})})]}),a.jsxs("div",{className:"mt-5 space-y-4",children:[a.jsxs("label",{className:"block text-xs font-bold text-zinc-700",children:["Zona",a.jsx("input",{value:d,onChange:o=>x(o.target.value),list:"table-zones",className:"mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-500",placeholder:"Ej: Salón Principal",disabled:c}),a.jsx("datalist",{id:"table-zones",children:u.map(o=>a.jsx("option",{value:o},o))})]}),a.jsxs("label",{className:"block text-xs font-bold text-zinc-700",children:["Cantidad de asientos",a.jsx("input",{type:"number",min:"1",max:"30",value:p,onChange:o=>h(Number(o.target.value)),className:"mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-500",disabled:c})]})]}),C&&a.jsx("p",{className:"mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700",children:C}),a.jsxs("div",{className:"mt-5 flex justify-end gap-2",children:[a.jsx("button",{type:"button",onClick:n,disabled:c,className:"rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50",children:"Cancelar"}),a.jsxs("button",{type:"submit",disabled:c||!d.trim()||p<1||p>30,className:"rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5",children:[a.jsx(W,{className:"h-4 w-4"})," ",c?"Agregando...":"Agregar mesa"]})]})]})})}export{ut as A,nt as D,dt as P,ct as T,pt as U,lt as a,bt as b,mt as p};
