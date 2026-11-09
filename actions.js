"use strict";
function guidePanel() {
  openModal(
    "guide",
    "Guia da primeira safra",
    `<p class="intro">Você chega a Cascavel com R$ 350.000 e nenhuma terra. Seu objetivo é terminar com fôlego para plantar de novo e com os compromissos pagos ou renegociados.</p>
<div class="mini-card"><h4>Conheça a terra</h4><p>Selecione uma sede no mapa. Compare a fala do vendedor com a visita independente e, se fizer sentido, encomende o laudo. A aba Proposta mostra o que sobra no caixa.</p></div>
<div class="mini-card"><h4>Planeje antes de semear</h4><p>Escolha pelo menos um talhão, área, cultura, ciclo e quantidade de insumos. A patrulha contratada só começa em 9 de outubro; o conjunto próprio trabalha mais cedo e cria outra dívida.</p></div>
<div class="mini-card"><h4>Leia o calendário</h4><p>O relógio para entre as decisões. Aproxime o mapa com + e arraste para percorrer a propriedade. Toque no raio para ler o boletim. A equipe pode esperar o solo firmar ou entrar em condição marginal. Essa escolha muda a data de semeadura e o estado do solo.</p></div>
<div class="mini-card"><h4>Colha, venda e acerte as contas</h4><p>Ao amadurecer, cada talhão vai para estoque. Venda apenas as sacas necessárias, compare prazo e frete e acompanhe o restante no depósito. Cada noite de espera custa tarifa e pode reduzir a quantidade disponível.</p></div>
${storyShelf()}<h3>Missão da Grota</h3><p>Comece no dia do alerta, com milho em florescimento na Grota, milho vegetativo no Alto e 1.000 m³ para um turno. Sua campanha fica guardada enquanto você compara decisões.</p><div class="row">${btn("mission-review", "Abrir missão climática", "bolt", "primary")}${btn("technical", "Ficha do cenário", "file", "secondary")}${btn("audio", sound ? "Desligar ambiente" : "Ouvir ambiente", sound ? "mute" : "sound", "text-btn")}</div>`,
  );
}
function technicalPanel() {
  openModal(
    "technical",
    "Ficha do cenário",
    `<p class="intro">Cascavel, Paraná · economia simulada de 2026/27 · ${esc(climateName())} · ${esc(s.version)} · semente ${s.seed}.</p>
<h3>Referências regionais</h3><p>O DERAL registrou R$ 119.700/ha na classe A-II de Cascavel em 2026. A série do IDR-Paraná para a estação 02453023 registra média histórica de 227,5 mm em outubro e 181,9 mm em novembro no período 1973–1998.</p>
<h3>Confronto com campo</h3><p>Em três ciclos do milho DINA 766 reservados para teste em Cascavel, o calendário genérico do jogo teve erro médio absoluto de 10 dias para a floração. A soma térmica ajustada só no primeiro ano errou 8 dias e o calendário de 66 dias daquele híbrido errou 3. Por isso o modelo térmico continua experimental. A produtividade e o balanço hídrico da campanha ainda não têm calibração local.</p>
<h3>Tempo regional e solo do talhão</h3><p>Nas reconstituições de 2022/23 e 2023/24, o jogo usa dados diários NASA POWER para a região de Cascavel. O boletim descreve dias já concluídos. A umidade do talhão, as condições de entrada e os efeitos de passar com o trator são simulados. A missão da Grota usa sua própria sequência climática didática.</p><h3>Condições da partida</h3><p>As três propriedades, financiamentos, compradores, trabalhadores, reservas e boletins meteorológicos pertencem ao cenário fictício. Cada saca equivale a 60 kg. A água usa mm no solo e m³ no reservatório. A dose de produto é convertida em kg/ha de N, P₂O₅ e K₂O.</p>
<p>As culturas avançam em passos diários. A missão climática permite avançar de 12 em 12 horas durante o alerta. Os dossiês AnandaTec orientam os mecanismos. O simulador SPAC opera separadamente.</p>
<div class="row"><a href="docs/Clima-regional-R01.md" target="_blank" rel="noopener">Dados das duas safras</a> · <a href="docs/Fenologia-DINA-766-R01.md" target="_blank" rel="noopener">Teste do florescimento</a> · <a href="docs/Cenario-e-fontes.md" target="_blank" rel="noopener">Fontes e limitações</a></div>`,
  );
}
function sessionPanel() {
  const localIntro = (pagesProfile ? "Perfil de " + pagesProfile.nickname + ". " : "") +
    "A partida é salva neste navegador a cada decisão.";
  openModal(
    "session",
    "Partida e desafios",
    `<p class="intro">${esc(saveError || (hostedGame ? "Você está jogando como " + FarmCloud.user.nickname + "." : localIntro))}</p>${kv("Data da fazenda", Farm.date(s.day))}${kv("Cenário", s.property ? offer().name : "Exploração regional")}<div class="row">${btn("save-file", "Exportar partida", "save", "secondary")}${btn("import", "Importar partida ou desafio", "file", "secondary")}</div>${hostedGame ? `<div class="cloud-account"><p role="status" data-cloud-status>${esc(FarmCloud.status)}</p>${btn("cloud-sync","Sincronizar partida","save","secondary")} ${btn("cloud-logout","Salvar e sair da conta","","text-btn")}</div>` : ""}<h3>Desafio da Mesma Terra</h3><p>Exporte o ponto de decisão com a versão do modelo, o clima e o resultado de referência. Outra pessoa pode reabrir esse arquivo no próprio computador.</p><div class="row">${btn("challenge-export", "Exportar desafio", "compare", "secondary")}${btn("code", "Usar código", "", "text-btn")}</div>${s.challengeReference ? comparison(s.challengeReference, Farm.report(s)) : ""}<h3>Campanha</h3><div class="row">${btn("new-review", "Nova safra", "sprout", "secondary")}${inSideTrip && storedCampaign() ? btn("resume-campaign", "Retomar campanha guardada", "rewind", "secondary") : btn("mission-review", "Missão da Grota", "bolt", "secondary")}${btn("technical", "Ficha técnica", "file", "text-btn")}</div>`,
  );
}
function fileImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,.txt,.farmeiro";
  input.onchange = async () => {
    try {
      if (!input.files.length) return;
      const file = input.files[0];
      if (file.size > 12e6) throw Error("O arquivo ultrapassa 12 MB.");
      const raw = (await file.text()).trim();
      loadText(raw);
    } catch (e) {
      failure(e.message);
    }
  };
  input.click();
}
function loadText(raw) {
  const imported = raw.startsWith("FARM1.") ? Farm.fromChallenge(raw) : Farm.restore(raw);
  if (/[<>]/.test(JSON.stringify(imported)))
    throw Error("O arquivo contém caracteres incompatíveis com uma partida.");
  setState(imported);
  notify("Arquivo carregado. Data, estoque e compromissos restaurados.");
}
function setState(next, sideTrip = false) {
  inSideTrip = sideTrip;
  clearTimeout(toastTimer);
  $("toast").textContent = "";
  s = next;
  picked = s.property || "helena";
  plotId = s.plots[0]?.id || "alto";
  bookTab = "overview";
  zoom = 1;
  pan = [0, 0];
  dismiss();
  save();
  render();
}
function missionReview() {
  openModal(
    "mission",
    "Missão da Grota",
    `<p class="intro">O milho da Grota está em florescimento. O Alto ainda cresce e tem cobertura nitrogenada programada. Há água para irrigar um só talhão antes do pico de calor.</p><div class="callout">Você entra em Santa Helena, em ${Farm.date(63)} às 12h, com uma campanha de missão preparada. A campanha atual fica disponível no menu Partida.</div><div class="row">${btn("mission-go", "Entrar na missão", "bolt", "primary")}${btn("dismiss", "Voltar")}</div>`,
  );
}
function debtPanel(id) {
  const d = s.debts.find((x) => x.id === id);
  openModal(
    "debt",
    "Ajustar compromisso",
    `<p class="intro">${esc(d.label)} · principal ${brl(d.balance)}.</p><label class="form-label">Principal a amortizar (R$)<input id="debt-amount" type="number" step="0.01" min="0.01" max="${d.balance}" value="${Math.min(d.balance, d.payment)}"></label><p class="footnote">Os juros corridos também saem do caixa no pagamento.</p><div class="row">${btn("repay", "Amortizar com o caixa", "wallet", "primary", id)}</div><h3>Renegociação</h3>${kv("Taxa de 1,2% hoje", brl(d.balance * 0.012))}${kv("Novo vencimento", Farm.date(Math.max(s.day, d.due) + 180))}${btn("renegotiate", "Pagar taxa e prorrogar", "calendar", "secondary", id)}`,
  );
}
function view3d() {
  openModal(
    "view3d",
    "Vistoria em 3D",
    `<iframe class="vr-frame" title="Inspeção do modelo da fazenda em três dimensões" src="art/vistoria-3d.html?fazenda=${s.property || picked}"></iframe><p class="footnote">Modelo original do Blender. A seleção de talhões e o calendário ficam no mapa estratégico.</p>`,
  );
}
function done(type, args, label) {
  if (perform(type, args, label)) {
    dismiss();
    render();
    return true;
  }
  return false;
}
function choose(id) {
  picked = id;
  bookTab = "overview";
  save();
  render();
}
function jumpPlot(id) {
  plotId = id;
  bookTab = "overview";
  save();
  render();
  if (innerWidth < 691) $("notebook").scrollIntoView({ behavior: "smooth", block: "start" });
}
function dispatch(action, id = "") {
  switch (action) {
    case "cloud-logout":
      if (hostedGame) FarmCloud.logout().catch((error) => failure(error.message));
      break;
    case "cloud-sync":
      if (hostedGame) FarmCloud.flush().catch((error) => failure(error.message));
      break;
    case "story-review":
      storyReview(id);
      break;
    case "story-go":
      startStory(id);
      break;
    case "clima-escolher":
      seasonChoice();
      break;
    case "clima-trocar":
      if (!freshClimate() || !Object.hasOwn(FarmClimate.names, id)) {
        failure("Escolha o clima antes da primeira decisão.");
        break;
      }
      setState(Farm.create(s.seed, Farm.VERSION, id));
      notify("Clima da campanha: " + climateName() + ".");
      break;
    case "trafego":
      trafficPanel(id);
      break;
    case "trafego-politica": {
      const [field, policy] = id.split("|");
      if (perform("fieldPolicy", { id: field, policy })) trafficPanel(field);
      break;
    }
    case "next-shift":
      if (perform("advance", { days: 1 })) trafficPanel(id);
      break;
    case "hold-grain":
      if (perform("advance", { days: 7 })) salePanel(id);
      break;
    case "cash-horizon":
      cashPanel();
      break;
    case "replay-menu":
      replayMenu();
      break;
    case "rewind-shift": {
      const index = Number(id);
      const mark = s.checkpoints[index];
      if (mark?.type !== "fieldWindow") break;
      setState(Farm.rewind(s, index), inSideTrip);
      plotId = mark.plotId;
      save();
      render();
      trafficPanel(plotId);
      break;
    }
    case "rewind-choice":
      setState(Farm.rewind(s, Number(id)), inSideTrip);
      notify("Decisão reaberta. O clima é o da partida de referência.");
      break;
    case "dismiss":
      dismiss();
      break;
    case "audio":
      setAudio();
      if (modal === "guide") guidePanel();
      break;
    case "map":
      dismiss();
      $("map").scrollIntoView({ block: "nearest" });
      break;
    case "pick":
      choose(id);
      if (innerWidth < 691) $("notebook").scrollIntoView({ behavior: "smooth", block: "start" });
      break;
    case "pick-return":
      dismiss();
      choose(id);
      break;
    case "plot":
      jumpPlot(id);
      break;
    case "pick-plot":
      dismiss();
      jumpPlot(id);
      break;
    case "tab":
      bookTab = id;
      renderBook();
      break;
    case "mode":
      mode = id;
      renderBook();
      break;
    case "limits":
      limitsVisible = !limitsVisible;
      mapUI();
      break;
    case "zoom-in":
      zoomMap(0.25);
      break;
    case "zoom-out":
      zoomMap(-0.25);
      break;
    case "center":
      zoom = 1;
      pan = [0, 0];
      mapUI();
      break;
    case "visit":
      visitOffer(id);
      break;
    case "take-visit":
      done("visit", { id }, "Visita registrada no caderno.");
      break;
    case "lab":
      labOffer(id);
      break;
    case "take-lab":
      done("lab", { id }, "Laudo entregue no caderno.");
      break;
    case "negotiate":
      if (perform("negotiate", { id }, "Contraproposta aceita. A cotação foi atualizada.")) renderBook();
      break;
    case "refuse":
      if (perform("refuse", { id }, "Proposta recusada e registrada no diário.")) {
        picked = Farm.offers.find((o) => !s.intel[o.id].refused)?.id || id;
        bookTab = "overview";
        save();
        render();
      }
      break;
    case "review-sign":
      signReview();
      break;
    case "sign-go":
      if (done("sign", { id: picked, mode }, "Contrato assinado. Planeje o primeiro talhão.")) {
        bookTab = "overview";
        render();
      }
      break;
    case "arithmetic":
      arithmetic();
      break;
    case "plots":
      plotsPanel();
      break;
    case "view3d":
      view3d();
      break;
    case "plan":
      plotId = id;
      planEditor(id);
      break;
    case "apply-plan":
      done("plan", planValues(id), "Plano do talhão guardado.");
      break;
    case "cover":
      if (perform("cover", { id }, "Cobertura implantada.")) planEditor(id);
      break;
    case "machines":
      machinesPanel();
      break;
    case "take-machine":
      if (perform("machine", { kind: id }, "Máquina selecionada.")) machinesPanel();
      break;
    case "crew-panel":
      crewPanel();
      break;
    case "take-crew":
      if (perform("crew", { kind: id }, "Contratação registrada.")) crewPanel();
      break;
    case "consultants":
      consultantsPanel();
      break;
    case "wait-consult": {
      const c = s.consultants.find((v) => v.kind === id && !v.delivered);
      if (c && perform("advance", { days: Math.max(1, c.due - s.day) })) consultantsPanel();
      break;
    }
    case "take-consult":
      if (perform("consult", { kind: id }, "Consultoria contratada.")) consultantsPanel();
      break;
    case "start":
      startPanel();
      break;
    case "start-go":
      done("start", {}, "Implantação reservada. O calendário da lavoura está ativo.");
      break;
    case "next-map": {
      const ready = s.plots.find((p) => (p.phase === "Maduro" && !p.harvested) || p.stocks > 0);
      if (ready) {
        jumpPlot(ready.id);
        if (ready.stocks > 0) salePanel(ready.id);
        else harvestPanel(ready.id);
        break;
      }
      if (s.stage === "accounts" && s.day >= 180 && s.receivables.every((r) => r.paid)) {
        dispatch("close-review");
        break;
      }
      if (perform("advance", { days: 180 })) {
        if (!FarmClimate.isHistorical(s.climate) && s.day === 63) climatePanel();
        else notify(Farm.date(s.day) + " · " + fieldActivity());
      }
      break;
    }
    case "advance-date": {
      const target = Math.round(($("calendar-target").valueAsNumber - Date.UTC(2026, 9, 1)) / 864e5);
      if (!Number.isInteger(target) || target <= s.day || target > 360) {
        failure("Selecione uma data futura da campanha.");
        break;
      }
      dispatch("advance", String(target - s.day));
      break;
    }
    case "calendar":
      calendarPanel();
      break;
    case "advance":
      if (perform("advance", { days: Number(id) })) {
        calendarPanel();
        if (!FarmClimate.isHistorical(s.climate) && s.day === 63 && s.stage !== "accounts") {
          climatePanel();
          notify("Boletim de calor: pico previsto em 36 h.");
        }
      }
      break;
    case "advance-hours":
      if (perform("advanceHours", { hours: 12 })) climatePanel();
      break;
    case "climate":
      climatePanel();
      break;
    case "waterbook":
      waterPanel(id);
      break;
    case "intervene":
      intervene(id);
      break;
    case "probe-open":
      probePanel(id);
      break;
    case "probe":
      if (perform("probe", { id })) {
        intervene(id);
        notify("Leitura do perfil disponível.");
      }
      break;
    case "irrigate":
    case "defer":
      if (
        done(
          action,
          { id },
          action === "irrigate" ? "Turno aplicado e reserva atualizada." : "Cobertura adiada.",
        )
      )
        climatePanel();
      break;
    case "preserve":
      done("preserve", {}, "Reserva preservada.");
      break;
    case "harvest":
      harvestPanel(id);
      break;
    case "harvest-go":
      if (done("harvest", { id }, "Produção registrada no estoque.")) salePanel(id);
      break;
    case "loss-review":
      openModal(
        "loss",
        "Reconhecer perda integral",
        `<p>Registrar a perda encerra a colheita deste talhão com estoque zero.</p><div class="row">${btn("loss", "Registrar perda", "field", "danger", id)}${btn("dismiss", "Manter a lavoura")}</div>`,
      );
      break;
    case "loss":
      done("writeoff", { id }, "Perda registrada.");
      break;
    case "sale":
      salePanel(id);
      break;
    case "sell": {
      const [field, terms] = id.split("-");
      done(
        "sell",
        { id: field, terms, ...saleQuantityArgs() },
        terms === "term"
          ? "Venda a prazo registrada. Acompanhe o recebível no caixa."
          : "Venda recebida no caixa.",
      );
      break;
    }
    case "finance":
      financePanel();
      break;
    case "debt-form":
      debtPanel(id);
      break;
    case "repay":
      if (perform("repay", { id, amount: Number($("debt-amount").value) }, "Amortização lançada no extrato."))
        financePanel();
      break;
    case "renegotiate":
      if (perform("renegotiate", { id }, "Obrigação renegociada.")) financePanel();
      break;
    case "credit-form":
      openModal(
        "credit",
        "Crédito de custeio",
        `<p class="intro">Linha de até R$ 120.000, a 9% ao ano, com vencimento em ${Farm.date(180)}. O valor entra no caixa e no principal da dívida.</p><label class="form-label">Custeio a receber (R$)<input type="number" id="credit-amount" min="1" max="120000" step=".01" value="20000"></label><div class="row">${btn("credit", "Contratar custeio", "wallet", "primary")}</div>`,
      );
      break;
    case "credit":
      if (
        perform(
          "credit",
          { amount: Number($("credit-amount").value) },
          "Crédito recebido e dívida registrada.",
        )
      )
        financePanel();
      break;
    case "close-review": {
      const r = Farm.report(s);
      openModal(
        "close",
        "Fechamento da safra",
        `${kv("Data da fazenda", Farm.date(s.day))}${kv("Caixa disponível", brl(r.cash))}${kv("Obrigações", r.obligationsCurrent ? "Em dia" : "Há parcela vencida", "warn")}${kv("Valor a receber", brl(r.receivable))}<div class="row">${btn("close-go", "Fechar e ver balanço", "check", "primary")}${btn("finance", "Examinar dívidas", "wallet", "secondary")}${btn("calendar", "Ver calendário", "calendar", "secondary")}</div>`,
      );
      break;
    }
    case "close-go":
      if (perform("close", {})) reportPanel();
      break;
    case "report":
      reportPanel();
      break;
    case "rewind":
      setState(Farm.rewind(s), inSideTrip);
      notify("Decisão reaberta com a mesma sequência climática.");
      break;
    case "journal":
      journalPanel();
      break;
    case "guide":
      guidePanel();
      break;
    case "technical":
      technicalPanel();
      break;
    case "session":
      sessionPanel();
      break;
    case "mission-review":
      missionReview();
      break;
    case "mission-go":
      if (!inSideTrip) storeCampaign(Farm.serialize(s));
      setState(Farm.mission(s.seed), true);
      plotId = "grota";
      save();
      render();
      climatePanel();
      break;
    case "resume-campaign": {
      const old = storedCampaign();
      if (!old) {
        failure("Não há campanha guardada neste navegador.");
        break;
      }
      setState(Farm.restore(old));
      notify("Campanha recuperada.");
      break;
    }
    case "save-file":
      download(Farm.serialize(s), "Farmeiro-partida-dia-" + s.day + ".json");
      break;
    case "challenge-export":
      download(Farm.challenge(s), "Farmeiro-desafio-dia-" + s.day + ".farmeiro");
      notify("Arquivo do Desafio da Mesma Terra preparado.");
      break;
    case "code":
      openModal(
        "code",
        "Código de desafio",
        `<p class="intro">Cole um código FARM1 para abrir a decisão de outra pessoa. O arquivo de desafio evita copiar códigos longos.</p><label class="form-label">Código<textarea id="challenge-code" spellcheck="false"></textarea></label><div class="row">${btn("load-code", "Abrir desafio", "compare", "primary")}${btn("show-code", "Mostrar meu código", "", "secondary")}</div>`,
      );
      break;
    case "load-code":
      loadText($("challenge-code").value.trim());
      break;
    case "show-code":
      $("challenge-code").value = Farm.challenge(s);
      $("challenge-code").select();
      break;
    case "import":
      fileImport();
      break;
    case "new-review":
      openModal(
        "new",
        "Começar outra safra",
        `<p>O novo cenário começa com R$ 350.000 e nenhuma terra. Exporte a partida atual para guardá-la.</p><label class="form-label">Clima da nova safra<select id="new-climate">${climateOptions(s.climate || "didatico")}</select></label><div class="row">${btn("save-file", "Exportar atual", "save", "secondary")}${btn("new", "Iniciar nova safra", "sprout", "primary")}</div>`,
      );
      break;
    case "new":
      setState(Farm.create(17, Farm.VERSION, $("new-climate")?.value || "power-2022"));
      notify("Nova safra iniciada.");
      break;
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-action]");
  if (b) {
    try {
      dispatch(b.dataset.action, b.dataset.param ?? "");
    } catch (err) {
      failure(err.message);
    }
  }
});
$("dialog").addEventListener("close", () => {
  if (!$("dialog").open) {
    modal = "";
    drawHeader();
  }
});
$("dialog").addEventListener("click", (e) => {
  if (e.target === $("dialog")) {
    const r = $("dialog").getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dismiss();
  }
});
let drag = null,
  skipMapClick = false;
const vp = $("viewport");
vp.addEventListener("pointerdown", (e) => {
  skipMapClick = false;
  if (zoom <= 1 || e.target.closest("button")) return;
  drag = { x: e.clientX, y: e.clientY, pan: [...pan] };
  vp.setPointerCapture(e.pointerId);
});
vp.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) skipMapClick = true;
  pan = [drag.pan[0] + e.clientX - drag.x, drag.pan[1] + e.clientY - drag.y];
  clampPan();
  transformMap();
});
vp.addEventListener("pointerup", () => (drag = null));
vp.addEventListener("pointercancel", () => (drag = null));
new ResizeObserver(() => {
  mapSize();
  drawField();
}).observe(vp);
function mapSize() {
  const W = vp.clientWidth,
    H = vp.clientHeight,
    world = $("world");
  const wid = Math.max(W, H * 1.5),
    hei = wid / 1.5;
  world.style.width = wid + "px";
  world.style.height = hei + "px";
  world.style.left = (W - wid) / 2 + "px";
  world.style.top = (H - hei) / 2 + "px";
}
vp.addEventListener("click", (e) => {
  if (e.target.closest("button") || skipMapClick) return;
  const r = $("world").getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 100,
    y = ((e.clientY - r.top) / r.height) * 100;
  for (const [site, plots] of Object.entries(window.FarmGeometry || {})) {
    if (s.property && site !== s.property) continue;
    for (const [field, area] of Object.entries(plots)) {
      if (insideField(x, y, area.outline)) {
        if (s.property) jumpPlot(field);
        else choose(site);
        return;
      }
    }
  }
});
function insideField(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function startGame() {
  if (saveError) notify(saveError);
  render();
  mapSize();
}
if (hostedGame) {
  const shell = $("shell");
  shell.hidden = true;
  $("top").textContent = "Carregando sua fazenda…";
  if (window.FarmCloud) {
    FarmCloud.open().then((remote) => {
      if (remote) restoreScreen(remote.game, remote.ui);
      shell.hidden = false;
      startGame();
    }).catch(FarmCloud.startFailed);
  } else $("top").textContent = "O acesso à conta não carregou. Atualize esta página.";
} else if (pagesGame && !pagesProfile) {
  $("shell").hidden = true;
  location.replace(new URL("./", document.baseURI));
} else startGame();
