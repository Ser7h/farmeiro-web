"use strict";

function loadingPanel(requestedId) {
  if (!s.property || !FarmMarket.enabled(s)) return;
  const terms = FarmMarket.loadingTerms;
  const installed = s.loadingBay;
  const selected = s.plots.find(plot => plot.id === requestedId)
    || s.plots.find(plot => plot.id === installed?.plotId) || currPlot();
  const stock = s.plots.reduce((sum, plot) => sum + plot.stocks, 0);
  const location = s.plots.find(plot => plot.id === installed?.plotId);
  const discount = location && selected.id !== location.id ? terms.farDiscount : terms.nearDiscount;
  const positions = s.plots.map(plot => plotPoint(s.property, plot.id));
  const middle = positions[0].map((_, axis) => positions.reduce((sum, xy) => sum + xy[axis], 0) / positions.length);
  const scale = 2.7;
  const pins = s.plots.map((plot, index) => {
    const [x, y] = positions[index];
    const isBay = location?.id === plot.id;
    return `<button type="button" class="cargo-pin" style="left:${x}%;top:${y}%" data-action="escoamento" data-param="${plot.id}" aria-pressed="${plot.id === selected.id}">${ic(isBay ? "truck" : "field", 15)}${esc(plot.name)}${isBay ? " · ponto" : ""}</button>`;
  }).join("");
  const map = `<div class="cargo-map" aria-label="Escolha um talhão no mapa"><div class="cargo-map-terrain" style="width:${100 * scale}%;height:${100 * scale}%;left:${50 - middle[0] * scale}%;top:${50 - middle[1] * scale}%">${pins}</div></div>`;
  const open = ["plan", "season", "harvest"].includes(s.stage);
  const plan = installed
    ? `${kv("Ponto instalado", esc(location.name))}${kv("Capacidade livre hoje", sacks(FarmMarket.loadingRemaining(s)) + " de " + sacks(terms.capacity))}${kv("Economia no frete de " + esc(selected.name), brl(discount) + "/sc")}`
    : `${kv("Montagem para esta safra", brl(terms.cost))}${kv("Economia no talhão do ponto", brl(terms.nearDiscount) + "/sc")}${kv("Economia no outro talhão", brl(terms.farDiscount) + "/sc")}<p>Os dois talhões dividem ${sacks(terms.capacity)} de carga por dia. O restante segue pelo frete direto.</p>${open ? btn("montar-ponto", "Montar no " + esc(selected.name) + " · " + brl(terms.cost), "truck", "primary", selected.id) : ""}`;
  const lot = selected.stocks > 0 ? btn("sale", "Vender o lote do " + esc(selected.name), "truck", "secondary", selected.id) : "";
  openModal("escoamento", "Escoamento da safra",
    `${map}<p class="intro">Talhão ${esc(selected.name)} · ${sacks(selected.stocks)} em estoque</p>${plan}${stock > 0 ? kv("Estoque total da fazenda", sacks(stock)) : ""}<div class="row">${lot}</div><p class="footnote">Tarifas e capacidades simuladas do cenário.</p>`);
}
