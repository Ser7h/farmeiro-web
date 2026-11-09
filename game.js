"use strict";
const $ = (id) => document.getElementById(id),
  nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }),
  fmt = (n) => nf.format(Number(n) || 0),
  brl = (n) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
      minimumFractionDigits: Number.isInteger(Math.round(Number(n) * 100) / 100) ? 0 : 2,
    }).format(Number(n) || 0);
const esc = (t) =>
  String(t ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );
const btn = (action, label, icon = "", cls = "secondary", param = "") =>
  `<button type="button" class="${cls}" data-action="${action}" data-param="${esc(param)}">${icon ? ic(icon, 16) : ""}${label}</button>`;
const cta = (action, label, param = "") =>
  `<button type="button" class="primary wide" data-action="${action}" data-param="${esc(param)}">${label}${ic("arrow", 16)}</button>`;
const kv = (label, v, cls = "") => `<div class="keyval ${cls}"><span>${label}</span><b>${v}</b></div>`;
const info = (i, k, v) => `<div class="info-line">${ic(i, 16)}<div><b>${k}</b>${esc(v)}</div></div>`;
const dates = { helena: "santa-helena", vista: "boa-vista", clara: "agua-clara" };
const pinPos = { helena: [42, 50], vista: [65, 26], clara: [71, 76] };
const phaseNames = {
  visit: "Exploração",
  plan: "Planejamento",
  season: "Lavoura",
  harvest: "Colheita",
  accounts: "Comercialização",
  closed: "Safra encerrada",
};
const people = {
  helena: {
    owner: "Dona Alzira",
    guide: "João Batista",
    voice: "O pessoal colheu com o chão úmido na Grota. Olhe as marcas de roda antes de fechar.",
  },
  vista: {
    owner: "Rosa Tavares",
    guide: "Lia Ramos",
    voice:
      "O Alto guarda palhada. Na Grota eu esperaria a estrada firmar antes de prometer uma data à máquina.",
  },
  clara: {
    owner: "Rui Antunes",
    guide: "Nair Lopes",
    voice:
      "Ali a enxurrada tirou terra. Eu começaria pelo Alto e reservaria parte do dinheiro para cobertura.",
  },
};
const propertyType = {
  helena: "Propriedade irrigável",
  vista: "Lavoura de sequeiro",
  clara: "Área em recuperação",
};
const saveKey = "farmeiro.safra.v1",
  uiKey = saveKey + ".ui";
const pagesGame = Boolean(document.querySelector("script[data-perfil-local]"));
const hostedGame = !pagesGame && location.protocol !== "file:" && (
  /^\/jogar\/?$/.test(location.pathname) || Boolean(document.querySelector('script[src="/nuvem.js"]'))
);
let pagesProfile = null,
  limitsVisible = true,
  inSideTrip = false;
let s = Farm.create(17, Farm.VERSION, "power-2022"),
  picked = "helena",
  plotId = "alto",
  bookTab = "overview",
  mode = "lease",
  modal = "",
  zoom = 1,
  pan = [0, 0],
  sound = false,
  toastTimer,
  saveError = "",
  ambience = null,
  animation = 0;
function restoreScreen(prev, ui = {}) {
  if (prev) s = Farm.restore(prev);
  picked = s.property || (Farm.offers.some((o) => o.id === ui.picked) ? ui.picked : "helena");
  plotId = ui.plotId || "alto";
  inSideTrip = Boolean(ui.sideTrip || s.mission);
}
if (pagesGame) {
  try { pagesProfile = window.FarmeiroPerfil?.ler(); } catch { /* A entrada orienta sobre o armazenamento. */ }
}
if (!hostedGame && (!pagesGame || pagesProfile)) {
  try { restoreScreen(localStorage.getItem(saveKey), JSON.parse(localStorage.getItem(uiKey) || "{}")); }
  catch { saveError = "Não foi possível restaurar a partida local. Use Partida para importar uma cópia."; }
}
function storedCampaign() {
  return hostedGame ? FarmCloud.campaign : localStorage.getItem(saveKey + ".campanha");
}
function storeCampaign(value) {
  if (hostedGame) FarmCloud.campaign = value;
  else localStorage.setItem(saveKey + ".campanha", value);
}
function save() {
  try {
    const game = Farm.serialize(s);
    const ui = { picked, plotId, sideTrip: inSideTrip };
    if (hostedGame) FarmCloud.update(game, ui);
    else {
      localStorage.setItem(saveKey, game);
      localStorage.setItem(uiKey, JSON.stringify(ui));
    }
    saveError = "";
  } catch (e) {
    saveError = "O navegador não conseguiu salvar. Exporte uma cópia pelo menu Partida.";
    notify(saveError);
  }
}
function notify(msg) {
  $("toast").textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").textContent = ""), 4200);
}
function failure(msg) {
  const box = document.querySelector("dialog[open] .inline-error");
  if (box) {
    box.textContent = msg;
    box.scrollIntoView({ block: "nearest" });
  } else notify(msg);
}
function perform(type, args = {}, message = "") {
  try {
    s = Farm.act(s, type, args);
    save();
    render();
    if (message) notify(message);
    return true;
  } catch (e) {
    failure(e.message);
    return false;
  }
}
function bookHeader(k, number) {
  return `<div class="book-head">${ic("book", 18)} Caderno de campo <span class="folio">${number}</span></div><div class="book-body"><span class="book-kicker">${ic("field", 14)} ${k}</span>`;
}
function offer() {
  return Farm.offer(s.property || picked);
}
function currPlot() {
  return s.plots.find((p) => p.id === plotId) || s.plots[0];
}
function tab(k, label, target) {
  return `<button type="button" class="${k === target ? "on" : ""}" data-action="tab" data-param="${k}">${label}</button>`;
}
function drawHeader() {
  const displayDate = Farm.date(s.day);
  $("top").innerHTML =
    `<div class="brand"><img src="assets/marca.svg" alt="">Farmeiro</div><span class="top-line"></span><div class="edition"><small>Campanha</small>Primeira safra</div><div class="top-metrics"><div class="top-metric">${ic("calendar", 19)}<span><small>Data da fazenda</small><b>${displayDate}</b></span></div><span class="top-line"></span><div class="top-metric">${ic("wallet", 20)}<span><small>Caixa disponível</small><b>${brl(s.cash)}</b></span></div>${btn("audio", sound ? ic("sound") : ic("mute"), "", "top-icon")}</div>`;
  $("top")
    .querySelector(".top-icon")
    .setAttribute("aria-label", sound ? "Desligar som ambiente" : "Ligar som ambiente");
  if (hostedGame) {
    const stateButton = document.createElement("button");
    stateButton.type = "button";
    stateButton.className = "cloud-status";
    stateButton.dataset.action = "session";
    stateButton.dataset.cloudStatus = "";
    stateButton.textContent = FarmCloud.status;
    stateButton.setAttribute("title", "Abrir partida e conta");
    $("top").querySelector(".top-metrics").append(stateButton);
  }
  const nav = (action, label, icon, on) =>
    `<button type="button" class="rail-btn ${on ? "on" : ""}" title="${label}" data-action="${action}">${ic(icon, 21)}<span>${label}</span></button>`;
  $("rail").innerHTML =
    nav("map", "Mapa", "map", !modal) +
    nav("plots", "Talhões", "field", modal === "plots") +
    nav("finance", "Caixa", "wallet", modal === "finance") +
    nav("journal", "Diário", "book", modal === "journal") +
    `<div class="rail-space"></div><div class="rail-divider"></div>` +
    nav("guide", "Guia", "help", modal === "guide") +
    nav("session", "Partida", "save", modal === "session");
  $("heading").innerHTML =
    `<div><div class="location">${ic("pin", 14)} Cascavel, Paraná</div><h1 class="heading-title">${s.stage === "visit" ? "Mapa da região" : s.mission ? "Missão da Grota" : offer().name}</h1></div><div class="heading-controls">${btn(freshClimate() ? "clima-escolher" : "climate", esc(climateName()) + (freshClimate() ? " " + ic("down", 13) : ""), "calendar", "season-chip")}<span class="phase status-pill"><i class="dot"></i>${phaseNames[s.stage] || s.stage}</span></div>`;
}
function mapUI() {
  const f = Farm.forecast(s);
  $("map-caption").innerHTML =
    `<button type="button" data-action="limits" aria-pressed="${limitsVisible}" title="Mostrar ou ocultar limites dos talhões" class="map-tag">${ic("layers", 15)} Limites dos talhões</button>`;
  $("weather").innerHTML =
    `<button type="button" data-action="climate" class="risk-chip ${f.level === "alto" ? "high" : f.level === "moderado" ? "medium" : "low"}" aria-label="Abrir previsão climática"><span>${ic("bolt", 17)}</span><span><strong>Risco ${esc(f.level)} ${esc(f.trend)}</strong><small>${FarmClimate.isHistorical(s.climate) ? esc(f.label) : f.level === "alto" ? esc(f.label) + " · " + (f.peakStatus === "upcoming" ? f.hoursToPeak + " h" : f.peakStatus === "now" ? "pico agora" : "após o pico") : "Clima regional"}</small></span></button>`;
  $("cartography").innerHTML =
    `<span class="north">N</span><span class="scale" style="--scale-width:${((Math.max($("viewport").clientWidth, $("viewport").clientHeight * 1.5) * zoom) / 10).toFixed(0)}px">100 m</span>`;
  $("map-tools").innerHTML =
    `<div class="map-box">${ctl("zoom-in", "plus", "Aproximar")}${ctl("zoom-out", "minus", "Afastar")}</div><div class="map-box">${ctl("view3d", "cube", "Vistoria em três dimensões")}${ctl("center", "target", "Centralizar mapa")}</div>`;
  const off = offer();
  if (!s.property) {
    $("pins").innerHTML = Farm.offers
      .map((o) => pinButton("pick", o.id, o.name, pinPos[o.id], o.id === picked, "farm"))
      .join("");
  } else {
    $("pins").innerHTML = s.plots
      .map((p) => {
        const pos = plotPoint(off.id, p.id);
        return pinButton("plot", p.id, p.name, pos, p.id === plotId, "sprout");
      })
      .join("");
  }
  transformMap();
  drawField();
}
function ctl(act, icon, label) {
  return `<button type="button" class="map-ctl" data-action="${act}" aria-label="${label}" title="${label}">${ic(icon, 15)}</button>`;
}
function pinButton(act, id, title, pos, selected, i) {
  return `<button type="button" data-action="${act}" data-param="${id}" class="map-pin ${selected ? "selected" : ""}" style="left:${pos[0]}%;top:${pos[1]}%">${ic(i, 14)}${esc(title)}</button>`;
}
function plotPoint(id, field) {
  const [x, y] = pinPos[id],
    custom = window.FarmGeometry?.[id]?.[field]?.center;
  return custom || [x + (field === "alto" ? -11 : 8), y + (field === "alto" ? -8 : 7)];
}
function transformMap() {
  $("world").style.transform = `translate(${pan[0]}px,${pan[1]}px) scale(${zoom})`;
  $("viewport").style.cursor = zoom > 1 ? "grab" : "default";
}
function zoomMap(delta) {
  zoom = Math.min(2.4, Math.max(1, zoom + delta));
  if (zoom === 1) pan = [0, 0];
  clampPan();
  mapUI();
}
function clampPan() {
  const r = $("viewport").getBoundingClientRect();
  pan = pan.map((v, i) =>
    Math.max(
      (-(zoom - 1) * (i ? r.height : r.width)) / 2,
      Math.min(v, ((zoom - 1) * (i ? r.height : r.width)) / 2),
    ),
  );
}
function drawField(t = 0) {
  cancelAnimationFrame(animation);
  const canvas = $("crops"),
    W = canvas.clientWidth,
    H = canvas.clientHeight;
  if (!W || !H) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  const cx = canvas.getContext("2d");
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, W, H);
  if (!s.property) {
    if (!limitsVisible) return;
    cx.save();
    for (const area of Object.values(window.FarmGeometry?.[picked] || {})) {
      cx.beginPath();
      area.outline.forEach(([u, v], i) =>
        i ? cx.lineTo((u * W) / 100, (v * H) / 100) : cx.moveTo((u * W) / 100, (v * H) / 100),
      );
      cx.closePath();
      cx.strokeStyle = "#fff0acbf";
      cx.lineWidth = 1.5;
      cx.setLineDash([5, 4]);
      cx.stroke();
      cx.fillStyle = "#f9db6824";
      cx.fill();
    }
    cx.restore();
    return;
  }
  let moving = false;
  for (const p of s.plots) {
    const [x, y] = plotPoint(s.property, p.id);
    const points = window.FarmGeometry?.[s.property]?.[p.id]?.outline || [
      [x - 7, y - 2],
      [x + 2, y - 6],
      [x + 9, y],
      [x, y + 5],
    ];
    const map = points.map(([u, v]) => [(u * W) / 100, (v * H) / 100]);
    cx.save();
    cx.beginPath();
    map.forEach(([u, v], i) => (i ? cx.lineTo(u, v) : cx.moveTo(u, v)));
    cx.closePath();
    const cropTint = p.harvested
      ? "#aa865a8c"
      : p.area
        ? {
            Planejado: "#b3a17a60",
            Programado: "#aa795a83",
            Emergência: "#a39b6375",
            Vegetativo: "#4c853b99",
            Florescimento: "#a0b83c95",
            Enchimento: "#7a9a417f",
            Maduro: "#d6ad4d9c",
          }[p.phase] || "#507b3675"
        : "#f4e1ae24";
    cx.fillStyle = "#f4e1ae20";
    cx.fill();
    cx.lineWidth = p.id === plotId ? 2 : 1;
    cx.strokeStyle = p.id === plotId ? "#fff1b3" : "#efe9c089";
    cx.setLineDash([5, 4]);
    if (limitsVisible) cx.stroke();
    cx.clip();
    const xs = map.map(([u]) => u),
      ys = map.map(([, v]) => v);
    const left = Math.min(...xs),
      right = Math.max(...xs),
      top = Math.min(...ys),
      bottom = Math.max(...ys);
    const sown = trafficEnabled(p) ? p.workedHa || 0 : s.day >= (p.actualSowDay ?? Infinity) ? p.area : 0;
    if (p.area) {
      const plannedWidth = ((right - left) * p.area) / p.ha;
      cx.fillStyle = "#a887644d";
      cx.fillRect(left, top, plannedWidth, bottom - top);
    }
    if (sown > 0) {
      cx.beginPath();
      cx.rect(left, top, ((right - left) * sown) / p.ha, bottom - top);
      cx.clip();
      cx.fillStyle = cropTint;
      cx.fillRect(left, top, right - left, bottom - top);
      cx.strokeStyle = p.harvested ? "#b49356aa" : "#384e2c77";
      cx.lineWidth = 1;
      cx.setLineDash([]);
      const b = Math.min(...map.map(([a]) => a));
      for (let i = b - 100; i < b + 240; i += 6) {
        cx.beginPath();
        cx.moveTo(i, (y * H) / 100 - 80);
        cx.lineTo(i + 70, (y * H) / 100 + 80);
        cx.stroke();
      }
    }
    cx.restore();
    if (p.area && !p.harvested && s.stage !== "plan" && s.stage !== "closed") {
      const operating =
        (p.lastFieldwork?.day === s.day && p.lastFieldwork.ha > 0) ||
        (s.day === p.actualSowDay && (!trafficEnabled(p) || p.workedHa >= p.area)) ||
        s.day === p.scheduledN ||
        p.phase === "Maduro";
      const u = (x * W) / 100 + Math.sin(s.day * 0.35) * 9,
        v = (y * H) / 100 + 20 + Math.cos(s.day * 0.27) * 7;
      cx.save();
      cx.translate(u + (operating ? Math.sin(t / 2600 + s.day) * 16 : 4), v);
      cx.scale(1.35, 1.35);
      if (operating) {
        moving = true;
        cx.fillStyle = "#d5a837";
        cx.fillRect(-6, -3, 10, 5);
        cx.fillStyle = "#2e4333";
        cx.fillRect(-2, -6, 5, 4);
        cx.fillStyle = "#252d25";
        cx.fillRect(-6, 1, 3, 4);
        cx.fillRect(2, 1, 3, 4);
      }
      cx.fillStyle = "#e5cb9e";
      cx.beginPath();
      cx.arc(8, -2, 2.4, 0, Math.PI * 2);
      cx.fill();
      cx.fillStyle = "#364b48";
      cx.fillRect(6, 0, 4, 5);
      cx.fillStyle = "#d0af68";
      cx.fillRect(5, -4, 6, 2);
      cx.restore();
    }
  }
  if (moving && !matchMedia("(prefers-reduced-motion: reduce)").matches)
    animation = requestAnimationFrame(drawField);
}
function below() {
  if (!s.property) {
    $("below").innerHTML =
      `<div class="section-head"><h2>Propriedades da região</h2><small>3 propriedades</small></div><div class="properties">${Farm.offers.map((o) => `<button class="property ${picked === o.id ? "active" : ""}" data-action="pick" data-param="${o.id}" aria-pressed="${picked === o.id}"><img class="photo" src="assets/${dates[o.id]}.webp" alt="">${picked === o.id ? `<span class="check">${ic("check", 13)}</span>` : ""}<span class="data"><b>${o.name}</b><small>${fmt(o.usable)} ha úteis · ${o.water ? "Irrigável" : "Sequeiro"}</small></span></button>`).join("")}</div>`;
    return;
  }
  $("below").innerHTML =
    `<div class="section-head"><h2>Talhões da fazenda</h2><small>${fmt(offer().usable)} ha úteis</small></div><div class="plotstrip">${s.plots.map((p) => `<button class="plotcard ${p.id === plotId ? "on" : ""}" data-action="plot" data-param="${p.id}"><b>${ic("field", 16)}${p.name}</b><small>${fmt(p.area || 0)} de ${fmt(p.ha)} ha · ${p.crop ? esc(p.crop) + " · " : ""}${esc(p.phase)}</small></button>`).join("")}</div>
<div class="agenda"><div><strong>${s.stage === "plan" ? "Monte o plano de safra" : s.stage === "closed" ? "Balanço da primeira safra" : "Calendário da fazenda"}</strong><span>${s.stage === "plan" ? "Escolha área, insumos e máquina." : s.stage === "closed" ? "Decisões e resultados disponíveis." : esc(fieldActivity())}</span></div>${btn(s.stage === "plan" ? "start" : s.stage === "closed" ? "report" : "next-map", s.stage === "plan" ? "Iniciar safra" : s.stage === "closed" ? "Ver balanço" : "Próximo marco", "calendar", "primary")}</div>`;
}
function fieldActivity() {
  const fieldwork = s.plots.find((p) => p.lastFieldwork?.day === s.day);
  if (fieldwork) return fieldwork.lastFieldwork.label;
  const job = s.plots.find((p) => p.crop && (p.actualSowDay === s.day || p.scheduledN === s.day));
  if (job) {
    const person = Farm.crews[s.crew || "daily"].person;
    return (
      person +
      " · " +
      (job.actualSowDay === s.day ? "semeadura" : "cobertura nitrogenada") +
      " no " +
      job.name +
      "."
    );
  }
  const ready = s.plots.find((p) => p.phase === "Maduro" && !p.harvested);
  if (ready) return ready.name + " atingiu a maturidade e está pronto para colher.";
  if (!FarmClimate.isHistorical(s.climate) && s.day >= 59 && s.day <= 67)
    return "Alerta regional de calor. Inspecione a reserva e os talhões.";
  return "Avance até a próxima janela de decisão.";
}
const mobileDesk = matchMedia("(max-width: 690px)");
const shortDesktop = matchMedia("(min-width: 691px) and (max-height: 820px)");

function arrangeDesk() {
  const notebook = $("notebook"),
    stories = $("home-stories");
  if (mobileDesk.matches && stories.nextElementSibling !== notebook) notebook.before(stories);
  if (!mobileDesk.matches && notebook.nextElementSibling !== stories) notebook.after(stories);
}

function offerFacts(o) {
  const details =
    info("hill", "Relevo", o.terrain) +
    info("road", "Acesso", o.access) +
    info("water", "Infraestrutura e água", o.infrastructure);
  if (!shortDesktop.matches) return details;
  return `<details class="offer-facts"><summary>Relevo, acesso e água</summary>${details}</details>`;
}

mobileDesk.addEventListener("change", arrangeDesk);
shortDesktop.addEventListener("change", () => {
  if (s.stage === "visit") renderBook();
});

function render() {
  drawHeader();
  mapUI();
  below();
  if (s.property) $("below").insertAdjacentHTML("beforeend", operationBulletin());
  else
    $("below").insertAdjacentHTML(
      "beforeend",
      `<div class="arrival-note">${ic("sprout", 18)}<p>É outubro e você ainda não tem terra. Escolha uma propriedade que deixe dinheiro para semear.</p></div>`,
    );
  arrangeDesk();
  const stories = $("home-stories");
  stories.hidden = Boolean(s.property);
  stories.innerHTML = stories.hidden ? "" : storyShelf();
  renderBook();
}
function renderBook() {
  if (s.stage !== "visit") {
    renderFarmBook();
    return;
  }
  const o = offer(),
    i = Farm.offers.indexOf(o) + 1,
    it = s.intel[o.id];
  $("notebook").innerHTML =
    bookHeader("Propriedade em oferta", `0${i} / 03`) +
    `<h2 class="book-title">${o.name}</h2><p class="book-desc">${propertyType[o.id]} no oeste do Paraná.</p><div class="tabs">${tab("overview", "Visão geral", bookTab)}${tab("proposal", "Proposta", bookTab)}</div>${bookTab === "proposal" ? proposal(o) : `<div class="stats"><div><span>Área total</span><strong>${fmt(o.total)} <small>ha</small></strong></div><div><span>Área utilizável</span><strong>${fmt(o.usable)} <small>ha</small></strong></div></div>${offerFacts(o)}<div class="quote"><b>Relato do vendedor · ${people[o.id].owner}</b>“${esc(o.seller)}”</div>${it.visit ? `<div class="callout"><b>Observação da visita · ${people[o.id].guide}</b><br>${esc(o.observation)}<p class="footnote">“${people[o.id].voice}”</p></div><p class="footnote"><b>Histórico de uso.</b> ${esc(o.history)}</p>` : ""}${it.lab ? `<div class="callout"><b>Laudo de solo</b><br>${esc(o.lab)}</div>` : ""}<div class="book-actions">${it.refused ? cta("visit", "Reabrir conversa", o.id) : it.visit ? cta("tab", "Examinar proposta", "proposal") : cta("visit", "Visitar propriedade", o.id)}${it.visit && !it.lab ? btn("lab", "Solicitar análise do solo", "dropper", "secondary", o.id) : ""}${it.visit ? btn("view3d", "Vistoria em 3D", "cube", "text-btn") : ""}</div>`}</div>`;
}
function proposal(o) {
  const it = s.intel[o.id],
    q = Farm.quote(s, o.id, mode);
  return `<div class="pair">${btn("mode", "Arrendar", "", mode === "lease" ? "primary" : "secondary", "lease")}${btn("mode", "Financiar", "", mode === "buy" ? "primary" : "secondary", "buy")}</div>${kv(mode === "buy" ? "Valor da terra" : "Arrendamento da safra", brl(mode === "buy" ? q.price : q.rent))}${kv("Entrada hoje", brl(q.down))}${kv("Despesas do contrato", brl(q.fees))}${kv("Caixa após assinatura", brl(q.cashAfter), q.cashAfter < 0 ? "warn" : "good")}${kv("Principal a vencer", brl(q.principal))}${kv("Juros anuais", fmt(q.interestRate * 100) + "%")}${kv("Primeiro vencimento", Farm.date(q.firstDue))}${kv("Parcela com juros", brl(q.firstPayment), "warn")}<p class="footnote">${q.graceDays} dias até o primeiro vencimento. ${mode === "buy" ? "Dez amortizações anuais iguais de principal." : "O restante do arrendamento vence nesta safra."}</p>${o.id === "helena" ? `<div class="callout warm"><b>Referência de compra dos 10 ha</b><br>A 55 sc/ha e R$ 132/sc, faltam <b>R$ 17.175</b> para a amortização anual, antes dos juros. ${btn("arithmetic", "Ver cálculo", "", "text-btn")}</div>` : ""}${it.refused ? `<p class="footnote">Você recusou esta proposta. Pode reabrir a conversa.</p>` : ""}<div class="book-actions">${cta("review-sign", "Revisar e assinar")}${it.negotiated ? `<p class="footnote">Desconto negociado de ${fmt(q.discount * 100)}% incluído.</p>` : btn("negotiate", "Negociar condições", "compare", "secondary", o.id)}${btn("refuse", "Recusar proposta", "", "text-btn", o.id)}</div>`;
}
function renderFarmBook() {
  const p = currPlot(),
    o = offer(),
    f = Farm.forecast(s);
  if (!p) return;
  $("notebook").innerHTML =
    bookHeader(o.name, s.stage === "plan" ? "Planejamento" : "Na fazenda") +
    `<h2 class="book-title">Talhão ${p.name}</h2><p class="book-desc">${p.ha} ha disponíveis · ${s.mode === "buy" ? "Terra financiada" : "Terra arrendada"}</p><div class="tabs">${tab("overview", "Manejo", bookTab === "soil" ? "soil" : "overview")}${tab("soil", "Perfil do solo", bookTab)}</div>${bookTab === "soil" ? soilPanel(p) : s.stage === "plan" ? planPanel(p) : seasonPanel(p, f)}</div>`;
}
function planPanel(p) {
  return `${info("sprout", "Plano do talhão", p.area ? `${p.area} ha de ${p.crop} · ciclo ${p.cycle}` : "Área em pousio. Defina o que plantar.")}${info("tractor", "Máquina", s.machine ? Farm.machines[s.machine].name + " · " + Farm.machines[s.machine].capacity + " ha/dia" : "Escolha entre patrulha contratada e conjunto próprio.")}<div class="book-actions">${cta("plan", p.area ? "Editar plantio" : "Planejar plantio", p.id)}${fieldPolicyButton(p)}${btn("machines", "Máquinas e prestadores", "tractor", "secondary")}${btn("crew-panel", "Equipe e consultoria", "person", "secondary")}</div>`;
}
function soilPanel(p) {
  const known = s.intel[s.property].lab || s.consultants?.some((c) => c.delivered && c.kind === "full");
  return `${info("field", "Perfil do talhão", known ? p.soil : "Descrição detalhada depende de análise ou consultoria.")}${known ? info("layers", "Profundidade explorável", fmt(p.depth * 100) + " cm") : ""}${info("sprout", "Raízes atuais", fmt(p.rootDepth * 100) + " cm")}${p.probe ? `<div class="callout"><b>Última sondagem</b><br>${Farm.date(p.probe.day) + ": " + fmt(p.probe.top) + " mm superficiais e " + fmt(p.probe.deep) + " mm profundos. Raízes a " + fmt(100 * p.probe.rootDepth) + " cm."}</div>` : `<p class="footnote">Uma sondagem revela a água das duas camadas no dia da medição.</p>`}<div class="book-actions">${s.stage !== "closed" ? btn("probe-open", "Investigar umidade", "dropper", "secondary", p.id) : ""}${btn("waterbook", "Balanço de água", "water", "secondary", p.id)}</div>`;
}
function seasonPanel(p, f) {
  const stock = Number(p.stocks) || 0;
  return `${info("sprout", "Lavoura", p.crop ? `${p.area} ha de ${p.crop} · ${p.phase}` : "Talhão em pousio")}${info("water", "Reserva da propriedade", `${fmt(s.water)} m³ disponíveis`)}${p.crop ? info("calendar", trafficEnabled(p) && (p.workedHa || 0) < p.area ? "Semeadura prevista" : "Semeadura efetiva", Farm.date(p.actualSowDay ?? p.sowDay)) : ""}${f.level === "alto" ? `<div class="callout warm"><b>Alerta regional ${f.trend}</b><br>${esc(f.detail)} ${btn("climate", "Examinar previsão", "", "text-btn")}</div>` : ""}<div class="book-actions">${s.stage === "closed" ? cta("report", "Abrir balanço da safra") : stock > 0 ? cta("sale", "Vender estoque", p.id) : p.crop && !p.harvested && p.phase === "Maduro" ? cta("harvest", "Colher talhão", p.id) : s.stage === "accounts" ? cta("close-review", "Fechar safra") : cta("calendar", "Avançar calendário")}${fieldPolicyButton(p)}${s.stage !== "closed" && p.crop && !p.harvested ? btn("intervene", "Manejo e reserva", "water", "secondary", p.id) : ""}${btn("finance", "Consultar caixa", "wallet", "secondary")}${s.stage !== "closed" && s.day < 120 ? btn("consultants", "Consultar equipe", "person", "text-btn") : ""}${s.stage === "accounts" ? btn("calendar", "Ver calendário", "calendar", "secondary") : ""}</div>`;
}
function openModal(name, title, body) {
  modal = name;
  const d = $("dialog");
  $("dialog-content").innerHTML =
    `<div class="modal-head"><h2>${title}</h2>${btn("dismiss", ic("close", 18), "", "modal-close")}</div><div class="modal-body"><div class="inline-error" role="alert"></div>${body}</div>`;
  $("dialog-content").querySelector(".modal-close").setAttribute("aria-label", "Fechar");
  if (!d.open) d.showModal();
  d.scrollTop = 0;
  drawHeader();
}
function dismiss() {
  if ($("dialog").open) $("dialog").close();
  modal = "";
  drawHeader();
}
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function setAudio() {
  if (sound) {
    ambience?.close();
    ambience = null;
    sound = false;
    drawHeader();
    return;
  }
  try {
    ambience = new AudioContext();
    const ac = ambience;
    const chirp = () => {
      if (ambience !== ac) return;
      const t = ac.currentTime;
      for (let i = 0; i < 3; i++) {
        const o = ac.createOscillator(),
          g = ac.createGain(),
          a = t + i * 0.17;
        o.type = "sine";
        o.frequency.setValueAtTime(2100 + i * 130, a);
        o.frequency.exponentialRampToValueAtTime(2940 + i * 120, a + 0.07);
        g.gain.setValueAtTime(0.0001, a);
        g.gain.exponentialRampToValueAtTime(0.022, a + 0.026);
        g.gain.exponentialRampToValueAtTime(0.0001, a + 0.12);
        o.connect(g).connect(ac.destination);
        o.start(a);
        o.stop(a + 0.14);
      }
      setTimeout(chirp, 7400);
    };
    chirp();
    sound = true;
    drawHeader();
    notify("Ambiente da fazenda ligado.");
  } catch (e) {
    failure("Áudio indisponível neste navegador.");
  }
}
