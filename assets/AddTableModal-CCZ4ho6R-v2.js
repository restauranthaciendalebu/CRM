import{c as g,P as h,r as z,j as e}from"./index-CTEFwmI_-v2.js";import{X as Q}from"./x-BZgXRFAg-v2.js";import{P as W}from"./plus-jU_ckyR9-v2.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]],rt=g("dollar-sign",K);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tt=[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]],ct=g("printer",tt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const et=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],dt=g("trash-2",et);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const at=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]],lt=g("user-plus",at);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const st=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],pt=g("users",st);function ut({order:o,state:b,payments:n,waiterName:f,accountSubtotal:y,accountDiscount:l,accountTip:L,accountTotal:c,previouslyPaid:m=0,remainingBalance:d=0}){var O,H;const p=b.tables.find(t=>t.id===o.tableId),$=p?`Mesa ${p.number} — ${p.zone}`:"Sin mesa",r=new Date(((O=n[0])==null?void 0:O.createdAt)||(o.status==="CLOSED"?o.updatedAt:new Date().toISOString())),C=r.toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}),N=r.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}),a=`${r.getFullYear()}${String(r.getMonth()+1).padStart(2,"0")}${String(r.getDate()).padStart(2,"0")}`,v=(((H=n[0])==null?void 0:H.id)||o.id).replace(/[^a-zA-Z0-9]/g,"").slice(-8).toUpperCase().padStart(8,"0"),A=`B-${a}-${v}`,_=o.items.map(t=>{var j;const s=b.products.find(i=>i.id===t.productId);if(!s)return"";const w=((j=t.selectedModifiers)==null?void 0:j.reduce((i,P)=>i+P.extraPrice,0))||0,S=(s.price+w)*t.quantity,u=t.selectedModifiers&&t.selectedModifiers.length>0?t.selectedModifiers.map(i=>{const P=i.extraPrice>0?"+":i.extraPrice<0?"-":"",Y=i.extraPrice!==0?` (${i.extraPrice>0?"+":"-"}$${Math.abs(i.extraPrice).toLocaleString("es-CL")})`:"";return`  ${P} ${i.name}${Y}`}).join("<br/>"):"";return`
        <tr>
          <td class="item-name">
            ${t.quantity}x ${s.name}
            ${u?`<br/><span class="mod">${u}</span>`:""}
            ${t.notes?`<br/><span class="mod">📝 ${t.notes}</span>`:""}
          </td>
          <td class="item-price">$${S.toLocaleString("es-CL")}</td>
        </tr>`}).join(""),B=o.items.reduce((t,s)=>{var S;const w=b.products.find(u=>u.id===s.productId);if(!w)return t;const U=((S=s.selectedModifiers)==null?void 0:S.reduce((u,j)=>u+j.extraPrice,0))||0;return t+(w.price+U)*s.quantity},0),q=n.reduce((t,s)=>t+(s.discount||0),0),X=n.reduce((t,s)=>t+(s.tip||0),0),k=n.reduce((t,s)=>t+s.amount,0),F=y??B,D=l??q,E=L??X,R=c??k,M=m>0||d>0||k<R,G=t=>({[h.CASH]:"Efectivo",[h.CREDIT]:"T. Crédito",[h.DEBIT]:"T. Débito",[h.TRANSFER]:"Transferencia",[h.ACCOUNT]:"Cuenta autorizada"})[t]||t,J=n.map(t=>`<tr><td>${G(t.method)}</td><td class="item-price">$${t.amount.toLocaleString("es-CL")}</td></tr>`).join(""),V=`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Boleta ${A}</title>
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
  <div class="info-row"><span>Boleta N°</span><span class="bold">${A}</span></div>
  <div class="info-row"><span>Fecha</span><span>${C}  ${N}</span></div>
  <div class="info-row"><span>Mesa</span><span class="bold">${$}</span></div>
  ${f?`<div class="info-row"><span>Garzón</span><span>${f}</span></div>`:""}
  <div class="info-row"><span>Comensales</span><span>${o.customerCount}</span></div>

  <hr class="sep" />

  <!-- Items -->
  <table>
    <tbody>
      ${_}
    </tbody>
  </table>

  <hr class="sep" />

  <!-- Totals -->
  <table>
    <tr><td>Consumo total</td><td class="item-price">$${F.toLocaleString("es-CL")}</td></tr>
    ${D>0?`<tr><td>Descuento cuenta</td><td class="item-price" style="color:#c00">-$${D.toLocaleString("es-CL")}</td></tr>`:""}
    ${E>0?`<tr><td>Propina cuenta</td><td class="item-price">$${E.toLocaleString("es-CL")}</td></tr>`:""}
    ${M?`<tr><td>Total cuenta</td><td class="item-price">$${R.toLocaleString("es-CL")}</td></tr>`:""}
    ${m>0?`<tr><td>Pagado anteriormente</td><td class="item-price">$${m.toLocaleString("es-CL")}</td></tr>`:""}
  </table>

  <hr class="double-sep" />

  <table>
    <tr class="total-row"><td>${M?"PAGO ESTA BOLETA":"TOTAL"}</td><td class="item-price">$${k.toLocaleString("es-CL")}</td></tr>
    ${M?`<tr><td>Saldo pendiente</td><td class="item-price">$${d.toLocaleString("es-CL")}</td></tr>`:""}
  </table>

  <hr class="sep" />

  <!-- Payment methods -->
  <div class="center bold" style="font-size:10px; margin-bottom:3px;">FORMA DE PAGO</div>
  <table>
    ${J}
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
</html>`,Z=new Blob([V],{type:"text/html;charset=utf-8"}),I=URL.createObjectURL(Z),T=window.open(I,"_blank");T&&(T.onload=()=>{setTimeout(()=>{T.print()},500)}),setTimeout(()=>URL.revokeObjectURL(I),1e4)}function bt({tables:o,operatorName:b,onClose:n,onAdded:f}){const y=Array.from(new Set(o.map(a=>a.zone))).sort(),[l,L]=z.useState(y[0]||"Salón Principal"),[c,m]=z.useState(4),[d,p]=z.useState(!1),[$,r]=z.useState(""),C=o.reduce((a,x)=>Math.max(a,x.number),0)+1,N=async a=>{if(a.preventDefault(),!(!l.trim()||c<1||c>30)){p(!0),r("");try{const x=await fetch("/api/tables/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({zone:l.trim(),seats:c,operatorName:b})}),v=await x.json().catch(()=>({}));if(!x.ok){r(v.error||"No se pudo agregar la mesa.");return}f(v.table),n()}catch{r("No se pudo conectar con el sistema.")}finally{p(!1)}}};return e.jsx("div",{className:"fixed inset-0 z-[100] bg-zinc-950/60 p-4 flex items-center justify-center",role:"dialog","aria-modal":"true","aria-labelledby":"add-table-title",children:e.jsxs("form",{onSubmit:N,className:"w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl",children:[e.jsxs("div",{className:"flex items-start justify-between gap-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{id:"add-table-title",className:"text-base font-extrabold text-zinc-950",children:["Agregar Mesa ",C]}),e.jsx("p",{className:"mt-1 text-xs text-zinc-500",children:"La nueva mesa quedará disponible inmediatamente."})]}),e.jsx("button",{type:"button",onClick:n,className:"h-9 w-9 shrink-0 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 flex items-center justify-center","aria-label":"Cerrar",children:e.jsx(Q,{className:"h-4 w-4"})})]}),e.jsxs("div",{className:"mt-5 space-y-4",children:[e.jsxs("label",{className:"block text-xs font-bold text-zinc-700",children:["Zona",e.jsx("input",{value:l,onChange:a=>L(a.target.value),list:"table-zones",className:"mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-500",placeholder:"Ej: Salón Principal",disabled:d}),e.jsx("datalist",{id:"table-zones",children:y.map(a=>e.jsx("option",{value:a},a))})]}),e.jsxs("label",{className:"block text-xs font-bold text-zinc-700",children:["Cantidad de asientos",e.jsx("input",{type:"number",min:"1",max:"30",value:c,onChange:a=>m(Number(a.target.value)),className:"mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-500",disabled:d})]})]}),$&&e.jsx("p",{className:"mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700",children:$}),e.jsxs("div",{className:"mt-5 flex justify-end gap-2",children:[e.jsx("button",{type:"button",onClick:n,disabled:d,className:"rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50",children:"Cancelar"}),e.jsxs("button",{type:"submit",disabled:d||!l.trim()||c<1||c>30,className:"rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5",children:[e.jsx(W,{className:"h-4 w-4"})," ",d?"Agregando...":"Agregar mesa"]})]})]})})}export{bt as A,rt as D,ct as P,dt as T,pt as U,lt as a,ut as p};
