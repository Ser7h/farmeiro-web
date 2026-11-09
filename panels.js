"use strict";
function visitOffer(id) {
  const it = s.intel[id];
  openModal(
    "visit",
    "Visita independente",
    `<p class="intro">Um produtor da região acompanha você pelo terreno de ${Farm.offer(id).name}. A caminhada verifica acesso, sinais no solo e infraestrutura.</p>${kv("Visita de campo", brl(it.visit ? 0 : 320))}${kv("Caixa depois da visita", brl(s.cash - (it.visit ? 0 : 320)))}<div class="row">${btn("take-visit", it.refused ? "Reabrir conversa" : "Fazer a visita", "field", "primary", id)}</div>`,
  );
}
function labOffer(id) {
  openModal(
    "lab",
    "Amostra de solo",
    `<p class="intro">O laboratório entrega a leitura das duas camadas e uma restrição de manejo por talhão. O resultado simulado sai nesta data e pode fundamentar uma contraproposta.</p>${kv("Amostragem e análise", brl(850))}<div class="row">${btn("take-lab", "Pagar e receber laudo", "dropper", "primary", id)}</div>`,
  );
}
function signReview() {
  const o = offer(),
    q = Farm.quote(s, o.id, mode);
  openModal(
    "sign",
    "Assinar contrato",
    `<p class="intro">${o.name} · ${o.usable} ha úteis. ${mode === "buy" ? "Compra financiada em dez amortizações anuais de principal." : "Arrendamento por uma safra com metade do aluguel na entrada."}</p>${kv("Entrada e despesas hoje", brl(q.down + q.fees))}${kv("Caixa após assinatura", brl(q.cashAfter), q.cashAfter < 0 ? "warn" : "good")}${kv("Principal da dívida", brl(q.principal))}${kv("Primeira cobrança", `${brl(q.firstPayment)} em ${Farm.date(q.firstDue)}`)}<div class="row">${btn("sign-go", mode === "buy" ? "Assinar financiamento" : "Assinar arrendamento", "check", "primary")}${btn("dismiss", "Continuar comparando")}</div>`,
  );
}
function arithmetic() {
  const a = Farm.example;
  openModal(
    "arithmetic",
    "A conta dos 10 hectares",
    `<p class="intro">Oferta de referência da Santa Helena. Os valores abaixo usam as premissas fixas do teste, antes de negociação, taxas e juros.</p>${kv("10 ha × R$ 119.700/ha", brl(a.total))}${kv("Entrada de 25%", brl(a.down))}${kv("R$ 350.000 menos a entrada", brl(a.cashAfterDown))}${kv("Principal financiado", brl(a.principal))}${kv("Principal por ano em dez parcelas", brl(a.annualPrincipal))}${kv("10 ha × 55 sc/ha × R$ 132/sc", brl(a.revenue))}${kv("Principal anual menos receita bruta", brl(a.gap), "warn")}<div class="callout warm">Mesmo vendendo toda essa colheita, faltam ${brl(a.gap)} para o principal anual. O contrato ainda tem juros, despesas e custos de produção. A colheita real da partida depende do seu manejo.</div>`,
  );
}
function plotsPanel() {
  if (!s.property) {
    const o = offer(),
      intel = s.intel[o.id];
    openModal(
      "plots",
      "Talhões em visita",
      `<p class="intro">${o.name} · ${o.usable} ha utilizáveis</p>${o.plots.map((p) => `<div class="mini-card"><h4>${p.name} · ${p.ha} ha</h4><p>${intel.lab ? esc(p.soil) + ", perfil de " + fmt(p.depth * 100) + " cm." : "A análise independente revela o perfil do solo."}</p></div>`).join("")}${btn("pick-return", "Voltar à propriedade", "map", "primary", o.id)}`,
    );
    return;
  }
  openModal(
    "plots",
    "Talhões da propriedade",
    `${s.plots.map((p) => `<div class="mini-card"><h4>${p.name} · ${fmt(p.ha)} ha</h4><p>${p.area ? `${p.area} ha de ${p.crop}, ciclo ${p.cycle}. ${esc(p.phase)}.` : "Área disponível para plantio ou pousio."}</p>${btn("pick-plot", "Inspecionar no mapa", "target", "secondary", p.id)} ${s.stage === "plan" ? btn("plan", "Planejar plantio", "sprout", "primary", p.id) : ""}</div>`).join("")}`,
  );
}
function choiceList(items, sel) {
  return items.map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v}</option>`).join("");
}
function planEditor(id) {
  const p = s.plots.find((v) => v.id === id),
    crop = p.crop || "soja",
    defaultDay = p.crop ? p.sowDay : 8;
  openModal(
    "plan",
    `Plantio do ${p.name}`,
    `<p class="intro">Defina a área que vai trabalhar. Deixe zero para manter o talhão em pousio.</p><form id="plan-form"><div class="form-grid">
<label>Área a plantar (ha)<input type="number" step="0.1" min="0" max="${p.ha}" id="pa" value="${p.crop ? p.area : p.ha}"></label>
<label>Cultura<select id="pc">${choiceList(
      [
        ["soja", "Soja"],
        ["milho", "Milho"],
      ],
      crop,
    )}</select></label>
<label>Ciclo da cultivar<select id="py">${choiceList(
      [
        ["normal", "Normal"],
        ["precoce", "Precoce"],
      ],
      p.cycle || "normal",
    )}</select></label>
<label>Data desejada<input type="date" id="pd" min="2026-10-01" max="2026-12-25" value="${new Date(Date.UTC(2026, 9, 1 + defaultDay)).toISOString().slice(0, 10)}"></label>
<label>Mil sementes/ha<input type="number" id="ps" step="1" value="${p.seedRate || (crop === "milho" ? 68 : 300)}"></label>
<label>Adubo (kg de produto/ha)<input type="number" min="0" max="700" id="pf" step="1" value="${p.crop ? p.fertilizer : 300}"></label>
<label>Operação<select id="po">${choiceList(
      [
        ["direta", "Semeadura direta"],
        ["convencional", "Preparo convencional"],
      ],
      p.operation,
    )}</select></label>
</div><div id="plan-price" class="callout"></div><div class="row">${btn("apply-plan", "Guardar plano do talhão", "check", "primary", id)}</div></form>${p.cover ? `<p class="footnote">Cobertura de conservação instalada neste talhão.</p>` : btn("cover", "Implantar cobertura · " + brl(180 * p.ha), "leaf", "secondary", id)}`,
  );
  $("pc").onchange = () => {
    $("ps").value = $("pc").value === "milho" ? 68 : 300;
    planPreview();
  };
  $("plan-form").oninput = planPreview;
  $("plan-form").onsubmit = (e) => {
    e.preventDefault();
    dispatch("apply-plan", id);
  };
  planPreview();
}
function planValues(id) {
  return {
    id,
    crop: $("pc").value,
    area: Number($("pa").value),
    cycle: $("py").value,
    sowDay: ($("pd").valueAsNumber - Date.UTC(2026, 9, 1)) / 864e5,
    seedRate: Number($("ps").value),
    fertilizer: Number($("pf").value),
    operation: $("po").value,
  };
}
function planPreview() {
  const a = planValues(plotId),
    maize = a.crop === "milho",
    cost = Farm.planPrice({ ...a, machine: s.machine || "contract", crew: s.crew || "daily" });
  $("plan-price").innerHTML =
    `<b>Reserva estimada · ${brl(cost)}</b><br>Formulação ${maize ? "20-05-20" : "02-20-18"}. Por hectare: ${fmt(a.fertilizer * (maize ? 0.2 : 0.02))} kg de N, ${fmt(a.fertilizer * (maize ? 0.05 : 0.2))} kg de P₂O₅ e ${fmt(a.fertilizer * (maize ? 0.2 : 0.18))} kg de K₂O. O serviço pode deslocar o dia efetivo de semeadura.`;
}
function machinesPanel() {
  openModal(
    "machines",
    "Máquinas e prestadores",
    `<p class="intro">A máquina atende um talhão por vez. A área e a capacidade determinam a data em que termina a semeadura.</p>${Object.entries(
      Farm.machines,
    )
      .map(
        ([k, m]) =>
          `<div class="mini-card"><h4>${esc(m.name)}</h4><p>${esc(m.owner)} · ${m.capacity} ha/dia · disponível em ${Farm.date(m.available)}.</p>${kv("Operação", brl(m.perHa) + "/ha")}${k === "own" ? kv("Compra · entrada", `${brl(m.price)} · ${brl(m.down)}`) + kv("Saldo financiado", `${brl(m.price - m.down)} · 6,5% a.a.`) : ""}${s.machine === k ? "<p>Selecionada para esta safra.</p>" : btn("take-machine", k === "own" ? "Comprar conjunto" : "Reservar serviço", "tractor", "secondary", k)}</div>`,
      )
      .join("")}`,
  );
}
function crewPanel() {
  openModal(
    "crew",
    "Quem vai trabalhar na safra",
    `<p class="intro">A equipe divide a agenda com a máquina. Compare a primeira data disponível e o custo para a área que pretende plantar.</p>${Object.entries(
      Farm.crews,
    )
      .map(
        ([k, c]) =>
          `<div class="mini-card"><h4>${esc(c.person)} · ${esc(c.name)}</h4><p>${esc(c.scope)}</p><p>${esc(c.interest)}</p>${kv("Disponível a partir de", Farm.date(c.available))}${kv("Mobilização hoje", brl(c.mobilization))}${kv("Equipe por hectare", brl(c.perHa))}${(s.crew || "daily") === k ? "<p>Responsável pela operação deste plano.</p>" : btn("take-crew", "Contratar " + esc(c.person), "person", "secondary", k)}</div>`,
      )
      .join(
        "",
      )}<h3>Consultoria independente</h3>${btn("consultants", "Ver pareceres, honorários e prazos", "book", "secondary")}`,
  );
}
function consultantsPanel() {
  openModal(
    "consultants",
    "Equipe e consultoria",
    `<p class="intro">Cada profissional tem agenda e entrega próprias. O parecer chega ao diário quando o calendário alcança o prazo.</p>${Object.entries(
      Farm.consultants,
    )
      .map(([k, c]) => {
        const hired = s.consultants.find((a) => a.kind === k);
        return `<div class="mini-card"><h4>${esc(c.name)}</h4><p>${esc(c.scope)}</p>${kv("Honorários", brl(c.price))}${kv("Prazo", `${c.delay} dias`)}${hired ? `<p>${hired.delivered ? "Parecer entregue: " + esc(hired.result) : "Em andamento até " + Farm.date(hired.due)}.</p>${!hired.delivered && s.stage === "plan" ? btn("wait-consult", "Aguardar o parecer", "clock", "secondary", k) : ""}` : btn("take-consult", "Contratar consultoria", "person", "secondary", k)}</div>`;
      })
      .join("")}`,
  );
}
function startPanel() {
  const plans = s.plots.filter((p) => p.area > 0);
  if (!plans.length) {
    plotsPanel();
    failure("Planeje pelo menos um talhão para iniciar.");
    return;
  }
  const machine = Farm.machines[s.machine || "contract"];
  openModal(
    "start",
    "Confirmar implantação",
    `<p class="intro">${machine.name} · ${machine.capacity} ha/dia. O valor é debitado ao reservar os insumos e operações.</p>${plans.map((p) => kv(p.name + " · " + p.area + " ha de " + p.crop, brl(Farm.planPrice({ ...p, machine: machine.kind, crew: s.crew || "daily" })))).join("")}${kv("Caixa disponível", brl(s.cash))}<div class="row">${btn("start-go", "Confirmar e iniciar", "sprout", "primary")}${btn("dismiss", "Rever plano")}</div>`,
  );
}
function calendarPanel() {
  const day = s.day,
    ready = s.plots.filter((p) => p.area && !p.harvested && p.phase === "Maduro");
  openModal(
    "calendar",
    "Calendário da fazenda",
    `<p class="intro">Hoje, ${Farm.date(day)}, às ${String(s.hour).padStart(2, "0")}h. O relógio anda por dias e pausa nos eventos de decisão.</p>${ready.length ? `<div class="callout warm"><b>Prontos para colher</b><br>${ready.map((p) => btn("harvest", p.name, "sprout", "secondary", p.id)).join(" ")}</div>` : ""}${s.plots
      .filter((p) => p.stocks > 0)
      .map(
        (p) =>
          `<div class="callout">${p.name}: ${fmt(p.stocks)} sc em estoque. ${btn("sale", "Vender estoque", "truck", "secondary", p.id)}</div>`,
      )
      .join("")}${s.receivables
      .filter((r) => !r.paid)
      .map((r) => kv("Recebível · " + Farm.date(r.day), brl(r.amount)))
      .join(
        "",
      )}${s.stage === "accounts" && day >= 180 && s.receivables.every((x) => x.paid) ? cta("close-review", "Fechar safra") : ""}<div class="row">${btn("advance", "1 dia", "clock", "secondary", "1")}${btn("advance", "7 dias", "calendar", "secondary", "7")}${btn("advance", "Até o próximo marco", "arrow", "primary", "180")}</div><label class="form-label">Avançar até uma data da campanha<input id="calendar-target" type="date" min="${gameISO(day + 1)}" max="${gameISO(360)}" value="${gameISO(Math.min(day + 7, 360))}"></label>${btn("advance-date", "Avançar até a data", "calendar", "secondary")}<p class="footnote">O relógio pode parar antes se surgir uma decisão. Escolha de novo a data para continuar.</p>${operationBulletin()}<div class="footnote">A chuva observada entra no registro apenas depois de transcorrida a data do evento.</div>`,
  );
}
function climatePanel() {
  const f = Farm.forecast(s),
    last = s.weatherLog.at(-1);
  const historical = FarmClimate.isHistorical(s.climate);
  const recent = historical ? FarmClimate.forcing(s.climate, f.issued) : last;
  const regional = historical
    ? `<p class="intro">${esc(climateName())} · referência regional até ${esc(f.reference.split("-").reverse().join("/"))}. Leitura de tendência a partir da reanálise. A chuva do próximo turno ainda é desconhecida.</p>`
    : `<p class="intro">Boletim simulado emitido às 12h de ${Farm.date(f.issued)}.</p>`;
  const sample = recent
    ? `<h3>Último dia completo</h3>${kv("Precipitação", fmt(recent.rain) + " mm")}${kv("Temperatura máxima", fmt(recent.maxTemp) + " °C")}${kv(historical ? "Umidade relativa média" : "Umidade relativa mínima", fmt(historical ? recent.meanRH : recent.minRH) + "%")}${kv(historical ? "DPV aproximado pelas médias" : "DPV no pico estimado", fmt(recent.vpd) + " kPa")}`
    : "";
  openModal(
    "climate",
    "Boletim climático",
    `${regional}<div class="callout ${f.level === "alto" ? "bad" : ""}"><b>RISCO ${esc(f.level.toUpperCase())} ${esc(f.trend)} · ${esc(f.label)}</b><br>${esc(f.detail)}${f.peakLabel ? `<br><b>${esc(f.peakLabel)}.</b>` : ""}</div>
    ${f.rainChance != null ? kv("Possibilidade de chuva", f.rainChance + "%") : ""}${!historical && s.day >= 59 && s.day <= 67 && ["season", "harvest"].includes(s.stage) ? btn("advance-hours", "Avançar 12 h", "clock", "secondary") : ""}
    ${rainfallChart()}<h3>Exposição dos talhões</h3>${f.exposed.length ? f.exposed.map((t) => `<div class="mini-card"><h4>${esc(t.name)} · vulnerabilidade ${esc(t.vulnerability)}</h4><p>${esc(t.reason)}</p>${btn("intervene", "Avaliar manejo", "water", "secondary", t.id)} ${fieldPolicyButton(s.plots.find((p) => p.id === t.id))}</div>`).join("") : `<p class="intro">A fase da cultura, as raízes e a água disponível entram na avaliação após a implantação.</p>${s.stage === "visit" ? btn("mission-review", "Jogar a missão da Grota", "bolt", "secondary") : ""}`}${sample}`,
  );
}
function waterPanel(id) {
  const p = s.plots.find((x) => x.id === id),
    b = p.budget,
    bal = b.opening + b.rain + b.irrigation - b.runoff - b.evaporation - b.transpiration - b.drainage;
  openModal(
    "waterbook",
    `Balanço hídrico · ${p.name}`,
    `<p class="intro">Lâminas acumuladas no perfil (mm). Em 1 ha, 1 mm equivale a 10 m³.</p>${Object.entries({
      opening: "Armazenamento inicial",
      rain: "Precipitação observada",
      irrigation: "Irrigação líquida",
      runoff: "Escoamento",
      evaporation: "Evaporação",
      transpiration: "Transpiração",
      drainage: "Drenagem",
    })
      .map(([k, v]) => kv(v, fmt(b[k]) + " mm"))
      .join(
        "",
      )}${kv("Saldo calculado", fmt(bal) + " mm")}${kv("Armazenamento nas camadas", fmt(p.waterMm + p.waterDeep) + " mm")}<p class="footnote">O balanço é contabilidade do modelo local. A sondagem mostra uma leitura simulada em uma data específica.</p>`,
  );
}
function intervene(id) {
  const p = s.plots.find((x) => x.id === id),
    need = 200 * p.area,
    can =
      s.water >= need && s.reserveCapacity > 0 && p.area && s.day >= p.actualSowDay && s.day < p.matureDay;
  openModal(
    "intervene",
    `Manejo do ${p.name}`,
    `<p class="intro">${p.phase} · ${p.area} ha de ${p.crop || "pousio"} · ${Farm.date(s.day)}</p>${p.probe ? `<div class="callout">Última sondagem em ${Farm.date(p.probe.day)}: ${fmt(p.probe.top)} mm na camada superior e ${fmt(p.probe.deep)} mm na profunda. Raízes a ${fmt(p.probe.rootDepth * 100)} cm.</div>` : ""}${btn("probe-open", "Sondar o perfil · R$ 180", "dropper", "secondary", id)}<h3>Turno de irrigação</h3>${kv("Retirada bruta para 20 mm", fmt(need) + " m³")}${kv("Reserva atual", fmt(s.water) + " m³")}${kv("Energia e operação", brl(22 * p.area))}<p class="footnote">Aplicação líquida de 16 mm. O alerta regional permanece ativo se você proteger um talhão.</p>${can ? btn("irrigate", "Priorizar " + p.name, "water", "primary", id) : `<div class="callout warm">${!s.reserveCapacity ? "Propriedade de sequeiro." : need > s.water ? "Reserva insuficiente para esse turno." : "A área precisa estar em crescimento."}</div>`}${p.crop === "milho" && p.scheduledN !== null ? `<h3>Cobertura nitrogenada</h3><p>${p.nApplied ? "Aplicada" : p.nDeferred ? "Adiada" : "Programada"} para ${Farm.date(p.scheduledN)}.</p>${!p.nApplied && !p.nDeferred ? btn("defer", "Adiar cinco dias", "calendar", "secondary", id) : ""}` : ""}${!FarmClimate.isHistorical(s.climate) && s.day >= 59 && s.day <= 67 && s.water > 0 ? btn("preserve", "Preservar a reserva hoje", "water", "secondary") : ""}`,
  );
}
function probePanel(id) {
  openModal(
    "probe",
    "Sondagem de umidade",
    `<p class="intro">O prestador mede as camadas superficial e profunda do ${s.plots.find((p) => p.id === id).name} e registra a profundidade atual das raízes.</p>${kv("Custo", brl(180))}<div class="row">${btn("probe", "Contratar sondagem", "dropper", "primary", id)}</div>`,
  );
}
function harvestPanel(id) {
  const p = s.plots.find((x) => x.id === id);
  openModal(
    "harvest",
    `Colheita do ${p.name}`,
    `${kv("Área madura", fmt(p.area) + " ha")}${kv("Custo da colheita", brl(165 * p.area))}${kv("Caixa disponível", brl(s.cash))}<div class="row">${btn("harvest-go", "Colher e estocar", "tractor", "primary", id)}${btn("loss-review", "Registrar perda integral", "", "text-btn", id)}</div>`,
  );
}
function saleQuantityArgs() {
  const input = document.getElementById("sale-quantity");
  if (!input) return {};
  if (!input.checkValidity())
    throw new Error("Informe uma quantidade positiva, com até três casas decimais e dentro do estoque.");
  return { units: input.valueAsNumber };
}
const sackNumber = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
function sacks(units) {
  return sackNumber.format(units) + " sc";
}
function saleTerms(plot, market, args, warehouseEnabled) {
  return ["spot", "term"]
    .map((terms) => {
      const atTerm = terms === "term";
      const price = atTerm ? market.termPrice : market.price;
      const payDay = s.day + (atTerm ? market.termDays : 0);
      const title = atTerm ? "Venda a prazo" : "Venda à vista";
      if (warehouseEnabled && payDay > 360) {
        return `<div class="mini-card"><h4>${title}</h4><p>O prazo ultrapassa a data final da campanha. A oferta à vista continua disponível.</p></div>`;
      }
      const sale = warehouseEnabled
        ? FarmMarket.quote(s, plot, { ...args, terms }, market)
        : {
            units: plot.stocks,
            freight: Math.round(plot.stocks * market.freight * 100) / 100,
            storageFee: 0,
            gross: Math.round(price * plot.stocks * 100) / 100,
          };
      const net = sale.net ?? sale.gross - sale.freight;
      return `<div class="mini-card"><h4>${title}</h4>${kv("Preço por saca", brl(price))}${kv("Receita bruta", brl(sale.gross))}${kv("Frete total", brl(sale.freight))}${sale.storageFee ? kv("Tarifa retida", brl(sale.storageFee)) : ""}${kv("Valor líquido", brl(net))}${kv("Pagamento", Farm.date(payDay))}${btn("sell", atTerm ? "Vender e criar recebível" : "Vender e receber", "truck", "primary", plot.id + "-" + terms)}</div>`;
    })
    .join("");
}
function storagePanel(plot, market) {
  const account = FarmMarket.summary(s, plot.id);
  const days = Math.min(7, 360 - s.day);
  const rates = FarmMarket.conditions;
  const contract = `O depósito cobra ${brl(rates.dailyFee)} por saca que fica de um dia para o outro. A quebra física simulada é de ${sackNumber.format(rates.dailyLossRate * 100)}% ao dia. A tarifa acumulada é retida de cada venda na proporção retirada.`;
  const totals =
    kv("Quebra física acumulada", sacks(account.lostUnits)) +
    kv("Tarifa a descontar do estoque", brl(account.feesOpen));
  if (days <= 0) return `<h3>Armazém</h3>${totals}<p class="footnote">${contract}</p>`;
  const future = FarmMarket.holdingEstimate(s, plot, market, days);
  const estimate =
    future.requiredPrice === null
      ? "O lote não tem quantidade vendável no prazo escolhido."
      : `Para igualar a venda à vista de hoje, seria preciso receber ao menos <b>${brl(future.requiredPrice)}/sc</b> em ${Farm.date(s.day + days)}, com o frete de hoje.`;
  return `<h3>Esperar para vender</h3>${totals}<p class="footnote">${contract}</p><div class="callout"><b>Se guardar todas as ${sacks(plot.stocks)} por ${days} dias</b><br>Tarifa adicional de ${brl(future.additionalFee)} e quebra de ${sacks(future.loss)}. ${estimate}</div>${btn("hold-grain", "Guardar e avançar até " + days + " dias", "calendar", "secondary", plot.id)} ${btn("calendar", "Escolher dia no calendário", "calendar", "secondary")}<p class="footnote">O calendário também pode parar em uma operação ou vencimento antes desse prazo.</p>`;
}
function salePanel(id) {
  const plot = s.plots.find((p) => p.id === id),
    market = Farm.market(s, plot.crop);
  const enabled = FarmMarket.enabled(s);
  const currentPrice = market.price;
  const nextDebt = s.debts.filter((d) => d.balance > 0).sort((a, b) => a.due - b.due)[0];
  let obligation = nextDebt
    ? `<p class="footnote">${nextDebt.late ? "Vencida" : "Próxima parcela"} em ${Farm.date(nextDebt.due)}: ${brl(Math.min(nextDebt.balance, nextDebt.payment))} de principal, mais juros do contrato. Caixa hoje: ${brl(s.cash)}.</p>`
    : "";
  const gap = enabled ? cashHorizon(s).firstGap : null;
  const coverage = gap ? FarmMarket.unitsForCash(s, plot, market, -gap.balance) : null;
  if (coverage) {
    const action =
      coverage.remainingGap > 0
        ? `Mesmo vendendo todo este talhão à vista, ainda faltariam ${brl(coverage.remainingGap)}.`
        : `A venda à vista de ${sacks(coverage.units)} cobre essa diferença, após frete e tarifa. <button type="button" class="text-btn" id="apply-coverage">Selecionar essa quantidade</button>`;
    obligation = `<div class="callout warm"><b>Compromisso em ${Farm.date(gap.day)}</b><br>Considerando o caixa e os recebíveis contratados, faltariam ${brl(-gap.balance)}. ${action}</div>`;
  }
  const chooser = enabled
    ? `<label class="form-label">Quantidade a vender (sc de 60 kg)<input id="sale-quantity" type="number" min="0.001" max="${plot.stocks}" step="0.001" required value="${plot.stocks}"></label><div class="row" id="sale-shares">${[25, 50, 100].map((value) => `<button class="secondary" type="button" data-share="${value}">${value}% do estoque</button>`).join("")}</div><p id="sale-balance" aria-live="polite" class="footnote"></p>`
    : "";
  openModal(
    "sale",
    `Venda do ${plot.name}`,
    `<p class="intro">${sacks(plot.stocks)} de 60 kg de ${plot.crop} em estoque. Oferta do comprador em ${Farm.date(s.day)}.</p>${kv("Preço à vista hoje", brl(currentPrice) + "/sc")}${kv("Frete", brl(market.freight) + "/sc")}${obligation}${chooser}<div id="sale-offers">${saleTerms(plot, market, {}, enabled)}</div>${enabled ? storagePanel(plot, market) : ""}`,
  );
  if (!enabled) return;
  const input = document.getElementById("sale-quantity");
  function refreshOffers() {
    const preview = document.getElementById("sale-offers"),
      balance = document.getElementById("sale-balance");
    try {
      const args = saleQuantityArgs();
      preview.innerHTML = saleTerms(plot, market, args, true);
      balance.textContent = "Ficam no depósito após esta venda: " + sacks(plot.stocks - args.units) + ".";
    } catch (error) {
      preview.innerHTML = "";
      balance.textContent = error.message;
    }
  }
  document.getElementById("sale-shares").onclick = (event) => {
    const button = event.target.closest("button[data-share]");
    if (!button) return;
    const available = Math.round(plot.stocks * 1000);
    input.value = Math.max(1, Math.round((available * Number(button.dataset.share)) / 100)) / 1000;
    refreshOffers();
  };
  const coverageButton = document.getElementById("apply-coverage");
  if (coverageButton)
    coverageButton.onclick = () => {
      input.value = coverage.units;
      refreshOffers();
    };
  input.oninput = refreshOffers;
  refreshOffers();
}
function financePanel() {
  const r = Farm.report(s);
  openModal(
    "finance",
    "Caixa e compromissos",
    `<div class="summary-stats">${[
      ["Disponível", brl(s.cash)],
      ["Principal da dívida", brl(r.debt)],
      ["A receber", brl(r.receivable)],
    ]
      .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`)
      .join(
        "",
      )}</div><div class="row">${btn("cash-horizon", "Projetar caixa até o vencimento", "calendar", "secondary")}</div><h3>Contratos</h3>${
      s.debts
        .filter((d) => d.balance > 0)
        .map(
          (d) =>
            `<div class="mini-card"><h4>${esc(d.label)}</h4>${kv("Principal", brl(d.balance))}${kv("Próximo vencimento", Farm.date(d.due))}${kv("Principal da parcela", brl(Math.min(d.balance, d.payment)))}${kv("Taxa anual", fmt(d.rate * 100) + "%")}${d.late ? `<div class="callout bad">Obrigação vencida.</div>` : ""}${s.stage !== "closed" ? btn("debt-form", "Amortizar ou renegociar", "wallet", "secondary", d.id) : ""}</div>`,
        )
        .join("") || `<p class="intro">Você ainda não assumiu dívida.</p>`
    }${s.property && s.day < 180 && s.stage !== "closed" ? btn("credit-form", "Contratar custeio", "wallet", "secondary") : ""}<h3>Recebíveis</h3>${s.receivables.map((v) => kv(Farm.date(v.day) + " · " + (v.paid ? "recebido" : "a receber"), brl(v.amount))).join("") || `<p class="intro">Nenhuma venda a prazo registrada.</p>`}<h3>Extrato por data</h3><div class="table-wrap"><table><thead><tr><th>Data</th><th>Lançamento</th><th>Valor</th></tr></thead><tbody>${s.ledger.map((e) => `<tr><td>${Farm.date(e.day)}</td><td>${esc(e.label)}</td><td class="number">${brl(e.amount)}</td></tr>`).join("")}</tbody></table></div>${kv("Saldo do extrato", brl(r.ledgerBalance), r.reconciled ? "good" : "warn")}`,
  );
}
function journalPanel() {
  openModal(
    "journal",
    "Diário da safra",
    `<p class="intro">Decisões na ordem em que ocorreram, com o boletim disponível antes de cada escolha.</p>${
      [...s.history]
        .reverse()
        .map(
          (h) =>
            `<div class="journal"><time>${Farm.date(h.day)}</time>${esc(h.label)}${h.forecast ? `<small>Boletim da decisão: risco ${esc(h.forecast.level)} ${esc(h.forecast.trend)} · ${esc(h.forecast.label)}${h.forecast.hoursToPeak > 0 ? ", " + h.forecast.hoursToPeak + " h até o pico" : ""}.</small>` : ""}${h.calendar ? h.calendar.map((c) => `<small>${esc(c.id)}: desejado ${Farm.date(c.desired)}, efetivo ${Farm.date(c.actual)}, maturação ${Farm.date(c.mature)}, ${brl(c.cost)}.</small>`).join("") : ""}</div>`,
        )
        .join("") ||
      `<div class="callout">Você começou em ${Farm.date(0)} com ${brl(350000)} e nenhuma terra. Selecione uma das três propriedades no mapa.</div>`
    }`,
  );
}
function harvestStory() {
  if (s.version !== Farm.VERSION || s.mission || s.stage !== "closed") return "";
  const point = s.checkpoints.findIndex((c) => c.type === "fieldWindow");
  if (point < 0) return "";
  const mark = s.checkpoints[point];
  const field = s.plots.find((p) => p.id === mark.plotId);
  if (!field) return "";
  const shifts = s.history.filter((e) => e.type === "fieldwork" && e.id === field.id);
  const extra = shifts.reduce((acc, e) => acc + e.result.cost, 0);
  const waited = shifts.filter((e) => e.result.ha === 0).length;
  const ending =
    field.workedHa >= field.area
      ? `A equipe terminou a semeadura em ${Farm.date(field.actualSowDay)}.`
      : "A equipe não terminou a semeadura.";
  const status = mark.state.plots.find((p) => p.id === field.id)?.lastFieldwork?.status;
  const reason =
    status === "interditado"
      ? "a chuva interditou a entrada"
      : status === "sem caixa"
        ? "faltou caixa para a passagem marginal"
        : "a equipe aguardou solo mais firme";
  return `<div class="mini-card"><h3>A primeira manhã de espera</h3><p>Em ${Farm.date(mark.day)}, ${reason} no talhão ${esc(field.name)}. No total, houve ${waited} ${waited === 1 ? "turno sem trabalho" : "turnos sem trabalho"} no talhão. ${ending} ${extra > 0 ? "As passagens com solo marginal custaram " + brl(extra) + " adicionais." : "Nenhuma passagem marginal foi cobrada."}</p><p>Volte ao fim daquele turno para mudar a ordem seguinte e comparar o fechamento sob o mesmo clima.</p>${btn("rewind-shift", "Rejogar o primeiro turno impedido", "rewind", "secondary", String(point))}</div>`;
}
function reportPanel() {
  const r = Farm.report(s),
    ref = s.challengeReference;
  openModal(
    "report",
    "Balanço da primeira safra",
    `<div class="callout ${r.continuity ? "" : "warm"}"><b>${esc(r.condition)}</b><br>Reserva para a próxima implantação: ${brl(r.requiredReserve)}.</div><div class="summary-stats">${[
      ["Área colhida", fmt(r.harvestedArea) + " ha"],
      ["Produção", fmt(r.production) + " sc"],
      ["Margem", brl(r.margin)],
      ["Caixa", brl(r.cash)],
      ["Dívida principal", brl(r.debt)],
      ["Patrimônio líquido", brl(r.equity)],
    ]
      .map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`)
      .join("")}</div>${harvestStory()}<h3>Produção e venda</h3>${s.plots
      .filter((p) => p.crop)
      .map(
        (p) =>
          `<div class="mini-card"><h4>${p.name} · ${p.crop}</h4><p>${fmt(p.area)} ha · ${fmt(p.yieldSc)} sc/ha · ${fmt(p.production)} sc de 60 kg.</p><p>Semeadura desejada ${Farm.date(p.sowDay)}, efetiva ${Farm.date(p.actualSowDay)}. ${esc(p.operation)} · ${fmt(p.seedRate)} mil sementes/ha · ${fmt(p.fertilizer)} kg de produto/ha.</p></div>`,
      )
      .join(
        "",
      )}${s.sales.map((v) => kv(`Venda ${Farm.date(v.day)} · ${esc(v.id)}`, `${fmt(v.units)} sc × ${brl(v.price)}; frete ${brl(v.freight)}. Recebimento ${Farm.date(v.payDay)}.`)).join("")}${kv("Receita bruta", brl(r.revenue))}${kv("Custos reconhecidos", brl(r.costs))}${kv("Juros acumulados", brl(r.accrued))}${kv("Caixa conciliado", r.reconciled ? "Sim" : "Revisar")}${kv("Condição do solo", esc(r.soil))}${seasonRecord(r)}<h3>Decisão com maior desembolso</h3><p>${esc(r.decision)}</p><div class="row">${btn("rewind", "Voltar àquela decisão", "rewind", "primary")} ${btn("replay-menu", "Escolher outra decisão", "calendar", "secondary")}${btn("challenge-export", "Exportar desafio", "compare", "secondary")}</div>${missionOutcomes()}${ref ? comparison(ref, r) : ""}<p class="footnote">Resultado simulado · ${esc(s.version)} · sequência climática ${s.seed}.</p>`,
  );
}
function missionOutcomes() {
  if (!s.mission || s.stage !== "closed") return "";
  const rows = Farm.missionComparison(s.seed, s.version);
  return `<h3>Quatro decisões para o mesmo alerta</h3><p class="footnote">Simulações da missão padrão, com o estado do início do dia 63, a mesma sequência meteorológica e a mesma política de colheita e venda para todos os ramos.</p><div class="table-wrap"><table><thead><tr><th>Decisão no dia 63</th><th>Produção</th><th>Caixa final</th></tr></thead><tbody>${rows.map((o) => `<tr><td>${esc(o.label)}</td><td class="number">${fmt(o.production)} sc</td><td class="number">${brl(o.cash)}</td></tr>`).join("")}</tbody></table></div>`;
}
function comparison(ref, r) {
  return `<h3>Desafio da Mesma Terra</h3>${ref.day === s.day ? `${kv("Diferença de produção", fmt(r.production - ref.production) + " sc")}${kv("Diferença de caixa", brl(r.cash - ref.cash))}` : `<p>Referência em ${Farm.date(ref.day)}: ${brl(ref.cash)} em caixa, ${fmt(ref.production)} sc. A comparação direta exige a mesma data.</p>`}`;
}
