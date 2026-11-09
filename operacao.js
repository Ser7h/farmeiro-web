"use strict";
function gameISO(day) {
  return new Date(Date.UTC(2026, 9, 1 + day)).toISOString().slice(0, 10);
}
function climateName(state = s) {
  return FarmClimate.names[state.climate || "didatico"] || "Clima didático";
}
function freshClimate() {
  return s.stage === "visit" && !s.history.length && !s.challengeReference;
}
function climateOptions(selected) {
  return [
    ["power-2022", "Reconstituição de 2022/23"],
    ["power-2023", "Reconstituição de 2023/24"],
    ["didatico", "Campanha didática"],
  ]
    .map(([id, name]) => `<option value="${id}" ${id === selected ? "selected" : ""}>${name}</option>`)
    .join("");
}
function seasonChoice() {
  if (!freshClimate()) {
    climatePanel();
    return;
  }
  openModal(
    "seasons",
    "Qual safra você quer enfrentar?",
    `<p class="intro">Comece com a mesma terra, caixa e preços do cenário. O que muda entre as duas reconstituições é a sequência diária de chuva, temperatura e umidade na região de Cascavel.</p>
    ${["power-2022", "power-2023", "didatico"].map((id) => `<div class="mini-card season-option"><div><h4>${FarmClimate.names[id]}</h4><p>${id === "didatico" ? "Sequência simulada com missão de calor e alerta de 36 horas." : "Série regional diária NASA POWER. O boletim mostra apenas dias já transcorridos."}</p></div>${btn("clima-trocar", id === s.climate ? "Manter" : "Escolher", "", id === s.climate ? "secondary" : "primary", id)}</div>`).join("")}
    <p class="footnote">As datas financeiras seguem o calendário fictício de 2026/27. O boletim mostra a data histórica correspondente a cada leitura regional.</p>`,
  );
}
function trafficEnabled(p) {
  return p && s.property && s.version === Farm.VERSION && !s.mission;
}
function fieldPolicyButton(p) {
  return trafficEnabled(p) && p.crop && ((p.workedHa || 0) < p.area || s.stage === "plan")
    ? btn("trafego", "Entrada da máquina", "tractor", "secondary", p.id)
    : "";
}
function trafficPanel(id) {
  const p = s.plots.find((x) => x.id === id),
    t = Farm.traffic(s, id);
  const pending = t.enabled && p.crop && ((p.workedHa || 0) < p.area || s.stage === "plan");
  const policy = t.policy === "press" ? "Entrar em condição marginal" : "Esperar solo firme";
  openModal(
    "traffic",
    `Entrada da máquina · ${p.name}`,
    `<div class="callout ${["marginal", "interditado"].includes(t.level) ? "warm" : ""}"><b>${esc(t.label)}</b><p>${esc(t.reason)}</p></div>
  ${kv("Chuva do último dia completo", t.rainTodayMm === null ? "Sem leitura" : fmt(t.rainTodayMm) + " mm")}${kv("Chuva acumulada na janela de três dias", t.rain3dMm === null ? "Sem leitura" : fmt(t.rain3dMm) + " mm")}${kv("Ocupação estimada da reserva superficial", t.topFraction === null ? "Sem leitura" : fmt(t.topFraction * 100) + "%")}${kv("Drenagem do talhão", esc(t.drainage))}
  <h3>Ordem para o próximo turno</h3>${kv("Orientação em vigor", policy)}${kv("Trabalho concluído", fmt(p.workedHa || 0) + " de " + fmt(p.area) + " ha")}${p.plannedSowDay != null ? kv("Fim previsto na contratação", Farm.date(p.plannedSowDay)) : ""}${p.actualSowDay != null ? kv((p.workedHa || 0) < p.area ? "Fim reestimado" : "Conclusão efetiva", Farm.date(p.actualSowDay)) : ""}${p.lastFieldwork ? `<p class="footnote">${Farm.date(p.lastFieldwork.day)} · ${esc(p.lastFieldwork.label)}</p>` : ""}
  <p class="intro">Esperar preserva o perfil, mas pode atrasar os talhões na fila. Entrar em solo marginal custa mais ${brl(t.extraPerHa)}/ha e afeta a condição física na área trabalhada. Se o acesso está interditado, a máquina fica parada.</p>
  ${pending ? `<div class="row">${t.policy === "protect" ? '<button class="secondary" disabled>Esperar solo firme · em vigor</button>' : btn("trafego-politica", "Esperar solo firme", "", "primary", id + "|protect")}${t.policy === "press" ? '<button class="secondary" disabled>Entrada marginal · em vigor</button>' : btn("trafego-politica", "Autorizar entrada marginal", "", "primary", id + "|press")}</div>` : ""}${s.stage === "season" && pending ? btn("next-shift", "Avançar um dia e ver o turno", "calendar", "secondary", id) : ""}
  <p class="footnote">A equipe usa regras experimentais do cenário. O limite seguro em campo depende do solo, da umidade, da carga e do equipamento.</p>`,
  );
}
function cashHorizon(state) {
  const toCents = (x) => Math.round(100 * x),
    rows = new Map(),
    horizon = Math.max(180, state.day);
  const rowAt = (day) => {
    if (!rows.has(day)) rows.set(day, { day, incoming: 0, outgoing: 0, items: [] });
    return rows.get(day);
  };
  for (const d of state.debts.filter((d) => d.balance > 0 && d.due <= horizon)) {
    const day = Math.max(state.day, d.due),
      row = rowAt(day);
    const interest = toCents(d.accrued + (d.balance * d.rate * Math.max(0, day - d.lastInterestDay)) / 365);
    const cents = toCents(Math.min(d.payment, d.balance)) + interest;
    row.outgoing += cents;
    row.items.push(d.label);
  }
  for (const r of state.receivables.filter((r) => !r.paid && r.day <= horizon)) {
    const row = rowAt(Math.max(state.day, r.day));
    row.incoming += toCents(r.amount);
    row.items.push("Venda de " + r.label);
  }
  let cents = toCents(state.cash),
    minimum = cents,
    firstGap = null;
  const schedule = [...rows.values()].sort((a, b) => a.day - b.day);
  for (const row of schedule) {
    cents += row.incoming - row.outgoing;
    row.balance = cents / 100;
    minimum = Math.min(minimum, cents);
    if (cents < 0 && !firstGap) firstGap = row;
  }
  return { schedule, minimum: minimum / 100, firstGap, horizon };
}
function cashPanel() {
  const flow = cashHorizon(s);
  openModal(
    "runway",
    "O caixa chega ao vencimento?",
    `<p class="intro">Prévia até ${Farm.date(flow.horizon)}. Entram o saldo de hoje, as vendas já contratadas e as parcelas com os juros previstos para cada vencimento. Colheitas futuras e estoque sem comprador ficam fora da conta.</p>
    ${kv("Caixa de hoje", brl(s.cash))}${kv("Menor saldo após os compromissos", brl(flow.minimum), flow.minimum < 0 ? "warn" : "good")}
    ${flow.firstGap ? `<div class="callout warm">Em ${Farm.date(flow.firstGap.day)}, faltariam <b>${brl(-flow.firstGap.balance)}</b> para cumprir os compromissos conhecidos.</div>` : ""}
    ${flow.schedule.map((r) => `<div class="mini-card"><h4>${Farm.date(r.day)}</h4><p>${esc(r.items.join(" · "))}</p>${kv("Entradas contratadas", brl(r.incoming / 100))}${kv("Parcelas e juros", brl(r.outgoing / 100))}${kv("Saldo projetado", brl(r.balance), r.balance < 0 ? "warn" : "good")}</div>`).join("") || `<p>Ainda não há parcelas ou recebíveis nesse período.</p>`}
    <p class="footnote">Parcelas vencidas aparecem hoje. Um saldo projetado negativo indica a falta a cobrir; o motor mantém a obrigação em atraso se o caixa não bastar. Custos operacionais futuros ficam fora desta prévia.</p>${btn("finance", "Examinar contratos e extrato", "wallet", "secondary")}`,
  );
}
function rainfallChart() {
  const historical = FarmClimate.isHistorical(s.climate);
  const issued = s.day - (s.hour < 12 ? 1 : 0);
  const days = historical
    ? Array.from({ length: 7 }, (_, i) => FarmClimate.forcing(s.climate, issued - 6 + i))
    : s.weatherLog.slice(-7);
  if (!days.length) return "";
  const max = Math.max(5, ...days.map((d) => d.rain));
  return `<h3>Chuva nos últimos dias completos</h3><div class="rain-chart" aria-label="Chuva por dia em milímetros">${days
    .map((d) => {
      const day = d.sourceDate
        ? d.sourceDate.slice(8) + "/" + d.sourceDate.slice(5, 7)
        : Farm.date(d.day).slice(0, 5);
      return `<div><b>${fmt(d.rain)}</b><span style="--bar:${Math.max(d.rain > 0 ? 2 : 0, (60 * d.rain) / max)}px"></span><small>${day}</small></div>`;
    })
    .join(
      "",
    )}</div><p class="footnote">${historical ? "Chuva regional reconstituída pela NASA POWER, em mm." : "Chuva simulada, em mm."}</p>`;
}
function operationBulletin() {
  if (!s.property || s.stage === "closed") return "";
  const delayed = (s.plots || []).find(
    (p) => p.lastFieldwork?.day === s.day && p.lastFieldwork.status !== "trabalhado",
  );
  if (delayed) {
    return `<div class="dispatch-note">${ic("tractor", 19)}<div><strong>${esc(Farm.crews[s.crew || "daily"].person)} · ${esc(delayed.name)}</strong><p>${esc(delayed.lastFieldwork.label)}</p></div>${btn("trafego", "Ver turno", "", "secondary", delayed.id)}</div>`;
  }
  const debt = cashHorizon(s).firstGap;
  if (debt)
    return `<div class="dispatch-note">${ic("wallet", 19)}<div><strong>Compromisso em ${Farm.date(debt.day)}</strong><p>O caixa e os recebíveis contratados deixam ${brl(-debt.balance)} a cobrir.</p></div>${btn("cash-horizon", "Ver contas", "", "secondary")}</div>`;
  return "";
}
function seasonRecord(report) {
  if (s.version !== Farm.VERSION) return "";
  const wh = report.warehouse;
  let html = `<h3>O que mudou nesta safra</h3>${kv("Clima da partida", esc(climateName()))}`;
  for (const p of s.plots.filter((p) => p.area > 0 && p.plannedSowDay != null)) {
    html +=
      kv(
        p.name + " · término da semeadura",
        `Reservado ${Farm.date(p.plannedSowDay)} · efetivo ${Farm.date(p.actualSowDay)}`,
      ) + kv(p.name + " · turnos impedidos", String(p.trafficDelays || 0));
  }
  if (wh)
    html +=
      kv("Quebra física no depósito", fmt(wh.lostUnits) + " sc") +
      kv("Tarifa de guarda reconhecida", brl(wh.feesTotal));
  return html;
}
function replayMenu() {
  const replayable = s.checkpoints
    .map((c, i) => ({ c, i }))
    .filter(({ c }) =>
      ["fieldWindow", "fieldPolicy", "sell", "start", "sign", "irrigate", "preserve", "defer"].includes(
        c.type,
      ),
    );
  openModal(
    "replay",
    "Qual decisão você mudaria?",
    `<p class="intro">Volte ao instante anterior à escolha. A referência do fechamento fica guardada, com o mesmo clima, para comparar os resultados em uma segunda partida.</p>${replayable.map(({ c, i }) => `<div class="mini-card"><h4>${Farm.date(c.day)}</h4><p>${esc(c.label)}</p>${btn("rewind-choice", "Rejogar deste ponto", "rewind", "secondary", String(i))}</div>`).join("")}`,
  );
}
function storyShelf() {
  const cards = Object.entries(FarmStories.descriptions).map(
    ([id, n]) =>
      `<button type="button" class="story-card" data-action="story-review" data-param="${id}">${ic(n.icon, 19)}<span><b>${esc(n.name)}</b><small>${esc(n.location)}</small></span>${ic("right", 13)}</button>`,
  );
  return `<div class="story-shelf"><div class="section-head"><h2>Entrar numa decisão</h2></div><div class="story-grid">${cards.join("")}</div></div>`;
}
function storyReview(id) {
  const item = FarmStories.descriptions[id];
  if (!item) return;
  openModal(
    "story",
    esc(item.name),
    `<p class="intro">${esc(item.location)}</p><p>${esc(item.text)}</p><div class="callout">Você entra no dia da escolha e recebe uma referência para comparar ao fechar a safra. A campanha atual fica guardada em Partida.</div>${btn("story-go", "Assumir a fazenda", item.icon, "primary", id)}`,
  );
}
function startStory(id) {
  const next = Farm.fromChallenge(FarmStories.code(id));
  if (!inSideTrip) storeCampaign(Farm.serialize(s));
  setState(next, true);
  plotId = id === "passagem" ? "grota" : "alto";
  save();
  render();
  if (id === "passagem") trafficPanel(plotId);
  else salePanel(plotId);
}
