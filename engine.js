/* Farmeiro | motor da primeira safra. Todos os valores são do cenário ficcional. */
(function (root) {
  "use strict";
  const VERSION = "farmeiro-safra/1.1.0";
  const CLASSIC = "farmeiro-safra/1.0.0";
  const supportedVersion = (version) => version === VERSION || version === CLASSIC;
  const marketStorage =
    typeof module !== "undefined" && module.exports ? require("./mercado.js") : root.FarmMarket;
  const knownClimate = (climate) => ["didatico", "power-2022", "power-2023"].includes(climate);
  const isHistorical = (s) => s.climate === "power-2022" || s.climate === "power-2023";
  function regionalClimate() {
    return typeof module !== "undefined" && module.exports
      ? require("./clima-regional.js")
      : root.FarmClimate;
  }
  const CAPITAL = 350000;
  const DUE = 180,
    PEAK = 65;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  const round = (n, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;
  const sum = (items, select) => items.reduce((total, item) => total + select(item), 0);
  const limit = (x, min, max) => Math.min(max, Math.max(min, x));
  function check(condition, message) {
    if (!condition) throw new Error(message);
  }
  function number(x, low, high, message) {
    check(
      x !== "" && x !== null && Number.isFinite(Number(x)) && Number(x) >= low && Number(x) <= high,
      message,
    );
    return Number(x);
  }
  function date(day) {
    return new Date(Date.UTC(2026, 9, 1 + Number(day))).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }
  function spec(id, name, ha, soil, depth, topCap, deepCap, fertility, recovery) {
    return { id, name, ha, soil, depth, topCap, deepCap, fertility, recovery };
  }
  const offers = [
    {
      id: "helena",
      name: "Santa Helena",
      total: 12,
      usable: 10,
      price: 119700,
      rent: 1450,
      fee: 0.01,
      water: 1000,
      terrain: "Encosta suave e baixada junto à sede.",
      access: "1,8 km de cascalho até a estrada principal.",
      infrastructure: "Galpão, reservatório de 1.000 m³ e conjunto de irrigação suplementar.",
      history: "Soja e milho em sucessão. A Grota recebeu tráfego na última colheita.",
      seller: "A família pede o mesmo preço por hectare útil nos dois talhões.",
      observation: "A rodagem deixou marcas na entrada da Grota. O reservatório atende 5 ha por turno.",
      lab: "Grota: camada mais densa a partir de 35 cm. Alto: perfil explorável até 85 cm.",
      plots: [
        spec("alto", "Alto", 5, "Argiloso, bem drenado", 0.85, 43, 78, 0.91, 0.06),
        spec("grota", "Grota", 5, "Argiloso, adensamento subsuperficial", 0.52, 36, 48, 0.86, 0.1),
      ],
    },
    {
      id: "vista",
      name: "Boa Vista",
      total: 34,
      usable: 26,
      price: 89000,
      rent: 1100,
      fee: 0.012,
      water: 0,
      terrain: "Lombadas amplas com dois talhões contínuos.",
      access: "4 km de estrada cascalhada.",
      infrastructure: "Pátio de manobra e barracão. Cultivo de sequeiro.",
      history: "Cobertura de inverno e rotação no Alto. Grota com soja recente.",
      seller: "A proprietária oferece contrato de uma safra e aceita área plantada menor.",
      observation: "Cobertura contínua no Alto. A entrada da Grota perde trafegabilidade depois de chuva.",
      lab: "Alto: maior reserva útil no subsolo. Grota: reserva intermediária e profundidade de 70 cm.",
      plots: [
        spec("alto", "Alto", 15, "Argiloso, cobertura preservada", 0.98, 47, 90, 1, 0.04),
        spec("grota", "Grota", 11, "Argiloso, drenagem moderada", 0.7, 42, 68, 0.93, 0.07),
      ],
    },
    {
      id: "clara",
      name: "Água Clara",
      total: 28,
      usable: 16,
      price: 64000,
      rent: 790,
      fee: 0.012,
      water: 0,
      terrain: "Vertente irregular com antiga pastagem e faixa protegida.",
      access: "6,5 km de estrada de terra.",
      infrastructure: "Cercas e bebedouro. Sem água disponível para irrigar lavoura.",
      history: "Antiga pastagem. A área útil exclui a mata e as faixas de proteção.",
      seller: "O arrendamento baixo reflete a necessidade de recuperar parte da área.",
      observation:
        "Falhas na cobertura e enxurradas antigas na Grota. O Alto oferece melhor ponto de partida.",
      lab: "Grota: perfil raso e menor armazenamento. Cobertura e menor revolvimento favorecem recuperação.",
      plots: [
        spec("alto", "Alto", 10, "Misto, cobertura descontínua", 0.68, 35, 60, 0.82, 0.08),
        spec("grota", "Grota", 6, "Raso, com sinais de erosão", 0.42, 25, 33, 0.68, 0.16),
      ],
    },
  ];
  const offer = (id) => {
    const result = offers.find((item) => item.id === id);
    check(result, "Propriedade desconhecida.");
    return result;
  };
  const example = Object.freeze({
    area: 10,
    pricePerHa: 119700,
    total: 1197000,
    down: 299250,
    cashAfterDown: 50750,
    annualPrincipal: 89775,
    principal: 897750,
    yield: 55,
    price: 132,
    revenue: 72600,
    gap: 17175,
  });
  const machines = {
    contract: {
      kind: "contract",
      name: "Patrulha contratada",
      capacity: 6,
      available: 8,
      perHa: 380,
      down: 0,
      owner: "João Batista",
    },
    own: {
      kind: "own",
      name: "Conjunto próprio usado",
      capacity: 12,
      available: 3,
      perHa: 135,
      down: 12000,
      owner: "Lia Ramos",
      price: 75000,
      rate: 0.065,
    },
  };
  const consultants = {
    field: {
      name: "Lia Ramos",
      price: 700,
      delay: 2,
      scope: "Visita de campo e indicação de risco por talhão.",
    },
    full: {
      name: "Nair Lopes",
      price: 1800,
      delay: 5,
      scope: "Visita, perfil do solo e leitura comparativa dos dois talhões.",
    },
  };
  const crews = {
    daily: {
      kind: "daily",
      name: "Equipe de diárias",
      person: "Celso Martins",
      role: "Encarregado de turma",
      scope: "Celso conhece as entradas da região e organiza diárias conforme a área reservada.",
      interest: "Quer confirmar o serviço antes de deslocar a turma.",
      available: 0,
      perHa: 135,
      mobilization: 0,
    },
    resident: {
      kind: "resident",
      name: "Funcionária de safra",
      person: "Teresa Alves",
      role: "Operadora assalariada",
      scope:
        "Teresa conhece semeadura em contorno e acompanha o preparo e a implantação até o fim do trabalho.",
      interest: "Busca continuidade na fazenda. Termina outro serviço no dia 5 e assume no dia 6.",
      available: 6,
      perHa: 70,
      mobilization: 1350,
    },
  };
  const blankIntel = () => ({ visit: false, lab: false, negotiated: false, refused: false });
  function create(seed = 17, version = VERSION, climate = "didatico") {
    check(supportedVersion(version), "Versão de cenário desconhecida.");
    check(
      knownClimate(climate) && (version !== CLASSIC || climate === "didatico"),
      "Clima incompatível com a edição.",
    );
    number(seed, 0, 2147483647, "A semente do cenário deve ser um inteiro positivo ou zero.");
    check(Number.isInteger(Number(seed)), "Semente inválida.");
    return {
      version,
      climate,
      seed: Number(seed),
      day: 0,
      hour: 12,
      stage: "visit",
      property: null,
      mode: null,
      mission: false,
      cash: CAPITAL,
      water: 0,
      reserveCapacity: 0,
      intel: Object.fromEntries(offers.map((o) => [o.id, blankIntel()])),
      plots: [],
      ledger: [{ day: 0, label: "Capital inicial", amount: CAPITAL, kind: "capital", expense: 0 }],
      debts: [],
      receivables: [],
      history: [],
      weatherLog: [],
      checkpoints: [],
      consultants: [],
      machine: null,
      climateChoice: null,
      contractPrice: 0,
      equipmentValue: 0,
      sales: [],
      crew: "daily",
      soilInvestment: 0,
      challengeReference: null,
    };
  }
  function quote(s, id, mode = "lease") {
    const o = offer(id);
    check(["buy", "lease"].includes(mode), "Modalidade inválida.");
    const discount = s.intel[id].negotiated ? s.intel[id].discount : 0;
    const price = money(o.usable * o.price * (1 - discount)),
      rent = money(o.usable * o.rent * (1 - discount));
    const buy = mode === "buy",
      down = buy ? money(price * 0.25) : money(rent * 0.5);
    const principal = buy ? money(price - down) : money(rent - down);
    const fees = buy ? money(price * o.fee) : 450;
    const annualPrincipal = buy ? money(principal / 10) : principal,
      interestRate = buy ? 0.045 : 0;
    const firstDue = DUE,
      firstInterest = money((principal * interestRate * Math.max(0, firstDue - s.day)) / 365);
    return {
      price,
      rent,
      fees,
      down,
      principal,
      interestRate,
      firstDue,
      annualPrincipal,
      firstInterest,
      firstPayment: money(annualPrincipal + firstInterest),
      cashAfter: money(s.cash - down - fees),
      discount,
      years: buy ? 10 : 1,
      graceDays: firstDue - s.day,
    };
  }
  function booking(s, label, amount, kind, expense = 0) {
    amount = money(amount);
    check(s.cash + amount >= -0.001, "Caixa insuficiente para " + label + ".");
    s.cash = money(s.cash + amount);
    s.ledger.push({ day: s.day, label, amount, kind, expense: money(expense) });
  }
  function spend(s, label, amount, kind = "operation", expense = amount) {
    booking(s, label, -amount, kind, expense);
  }
  function plotBy(s, id) {
    const plot = s.plots.find((p) => p.id === id);
    check(plot, "Selecione um talhão da propriedade.");
    return plot;
  }
  function initialPlot(p) {
    return {
      ...p,
      area: 0,
      crop: null,
      cycle: "normal",
      sowDay: 8,
      actualSowDay: null,
      seedRate: 0,
      fertilizer: 0,
      operation: "direta",
      phase: "Pousio",
      waterMm: round(p.topCap * 0.8),
      waterDeep: round(p.deepCap * 0.79),
      rootDepth: 0.12,
      production: 0,
      harvested: false,
      stocks: 0,
      stress: 0,
      weightedDays: 0,
      stageDays: 0,
      scheduledN: null,
      nApplied: false,
      nDeferred: false,
      irrigated: false,
      probe: null,
      matureDay: null,
      harvestDay: null,
      yieldSc: 0,
      soilChange: 0,
      committed: 0,
      budget: {
        rain: 0,
        irrigation: 0,
        runoff: 0,
        evaporation: 0,
        transpiration: 0,
        drainage: 0,
        opening: round(p.topCap * 0.8) + round(p.deepCap * 0.79),
      },
    };
  }
  /* Forçamento sintético por dia e semente, independente do histórico e da intervenção. */
  function noise(seed, day, channel) {
    let h = Math.imul(
      (seed ^ Math.imul(day + 101, 2654435761) ^ Math.imul(channel, 2246822519)) >>> 0,
      1597334677,
    );
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function weatherAt(seed, day) {
    const wave = Math.sin(day * 0.15);
    let rain = noise(seed, day, 1) < 0.33 ? round(8 + noise(seed, day, 2) * 19, 1) : 0;
    let temp = round(26 + wave * 2 + noise(seed, day, 3) * 3, 1);
    if (day >= 52 && day <= 67) {
      rain = 0;
      temp = round(30 + Math.max(0, 6 - Math.abs(day - 65)) * 0.95, 1);
    }
    if (day === 68) {
      rain = round(4 + noise(seed, day, 2) * 14, 1);
      temp = 30;
    }
    const minRH = Math.round(
      day >= 59 && day <= 67
        ? 31 + noise(seed, day, 5) * 8
        : rain > 0
          ? 64 + noise(seed, day, 5) * 12
          : 48 + noise(seed, day, 5) * 12,
    );
    const vpd = round(0.6108 * Math.exp((17.27 * temp) / (temp + 237.3)) * (1 - minRH / 100), 2);
    return { day, rain, maxTemp: temp, minRH, vpd, demand: round(2.6 + (temp - 23) * 0.23, 2) };
  }
  function forecast(s) {
    const issued = s.day - (s.hour < 12 ? 1 : 0);
    const near = issued >= 59 && issued <= 67,
      before = issued >= 53 && issued < 59;
    const delta = (PEAK - s.day) * 24 - s.hour;
    const peakStatus = !near ? null : delta > 0 ? "upcoming" : delta === 0 ? "now" : "past";
    const hoursToPeak = near && delta >= 0 ? delta : null,
      hoursSincePeak = near && delta < 0 ? -delta : null;
    let level = near ? "alto" : before ? "moderado" : "baixo";
    let trend = near ? (delta > 0 ? "↑" : delta === 0 ? "→" : "↓") : before ? "↑" : "→";
    const exposed = s.plots
      .filter((p) => p.crop && !p.harvested && p.phase !== "Maduro")
      .map((p) => {
        const active = p.actualSowDay !== null && s.day >= p.actualSowDay;
        const flowering = p.phase === "Florescimento";
        const store = p.waterMm + p.waterDeep * Math.min(1, p.rootDepth / p.depth);
        return {
          id: p.id,
          name: p.name,
          reason: !active
            ? "Plantio ainda não realizado."
            : flowering
              ? "Florescimento sensível; a água acessível depende das raízes."
              : p.rootDepth < 0.52
                ? "Raízes ainda pouco profundas."
                : "Perfil explorado e água disponível moderam a exposição.",
          vulnerability: !active
            ? "baixa"
            : (flowering && store < 20) || store < 12
              ? "alta"
              : store < 40
                ? "moderada"
                : "baixa",
        };
      });
    if (isHistorical(s)) return { ...regionalClimate().outlook(s), exposed };
    return {
      level,
      trend,
      label: near ? "Calor e ar seco" : before ? "Aquecimento regional" : "Condições estáveis",
      hoursToPeak,
      hoursSincePeak,
      peakStatus,
      peakLabel:
        peakStatus === "upcoming"
          ? hoursToPeak + " h até o pico"
          : peakStatus === "now"
            ? "Pico previsto agora"
            : peakStatus === "past"
              ? "Pico previsto há " + hoursSincePeak + " h"
              : "",
      detail: near
        ? s.day < 65
          ? "Pico regional previsto para 00h de " +
            date(PEAK) +
            ". Previsão de 33–37 °C e umidade relativa de 30–40%. Possibilidade de chuva depois do pico."
          : "Calor regional persistente; há possibilidade de chuva após o pico."
        : "Boletim regional sintético emitido às 12h de " + date(issued) + ".",
      rainChance: near ? 40 : before ? 25 : 45,
      issued,
      exposed,
    };
  }
  function snapshot(s) {
    const { checkpoints, challengeReference, ...rest } = s;
    return clone({ ...rest, checkpoints: [], challengeReference: null });
  }
  function log(s, type, label, before, details = {}) {
    s.history.push({ day: s.day, hour: s.hour, type, label, forecast: before, ...details });
  }
  function newDebt(s, id, label, balance, due, payment, rate, kind) {
    s.debts.push({
      id,
      label,
      balance: money(balance),
      due,
      payment: money(payment),
      rate,
      kind,
      lastInterestDay: s.day,
      accrued: 0,
      late: false,
      renegotiated: false,
    });
  }
  function interest(s, d) {
    return money(d.accrued + (d.balance * d.rate * Math.max(0, s.day - d.lastInterestDay)) / 365);
  }
  function collectDebt(s, d, principal, automatic = false) {
    const fee = interest(s, d);
    spend(
      s,
      (automatic ? "Vencimento · " : "Pagamento · ") + d.label,
      principal + fee,
      "debt",
      fee + (d.kind === "lease" ? principal : 0),
    );
    d.balance = money(d.balance - principal);
    d.accrued = 0;
    d.lastInterestDay = s.day;
    if (d.balance === 0) {
      d.late = false;
      return;
    }
    if (automatic) {
      d.due += 365;
      d.late = false;
    } else if (s.day >= d.due && principal >= d.payment) {
      d.due += 365;
      d.late = false;
    } else if (s.day >= d.due) {
      d.payment = money(d.payment - principal);
    }
  }
  function settleDay(s) {
    s.receivables
      .filter((r) => !r.paid && r.day <= s.day)
      .forEach((r) => {
        booking(s, "Recebimento · " + r.label, r.amount, "sale");
        r.paid = true;
      });
    s.debts
      .filter((d) => d.balance > 0 && d.due <= s.day)
      .forEach((d) => {
        const principal = Math.min(d.balance, d.payment);
        if (s.cash >= money(principal + interest(s, d))) collectDebt(s, d, principal, true);
        else d.late = true;
      });
    s.consultants
      .filter((c) => !c.delivered && c.due <= s.day)
      .forEach((c) => {
        c.delivered = true;
        s.intel[s.property].visit = true;
        if (c.kind === "full") s.intel[s.property].lab = true;
        c.result = c.kind === "full" ? offer(s.property).lab : offer(s.property).observation;
        s.history.push({
          day: s.day,
          type: "delivery",
          label: c.name + " entregou o parecer: " + c.result,
          forecast: forecast(s),
        });
      });
  }
  const duration = (crop, cycle) =>
    crop === "milho" ? (cycle === "precoce" ? 104 : 118) : cycle === "precoce" ? 103 : 119;
  function phaseFor(crop, age, days) {
    if (age < 0) return "Programado";
    if (age >= days) return "Maduro";
    if (age < 8) return "Emergência";
    const flower = crop === "milho" ? Math.round(days * 0.45) : Math.round(days * 0.38);
    if (age < flower) return "Vegetativo";
    if (age < flower + 19) return "Florescimento";
    return "Enchimento";
  }
  function phenology(crop, cycle, age) {
    check(
      ["milho", "soja"].includes(crop) && ["precoce", "normal"].includes(cycle),
      "Cultura ou ciclo desconhecido.",
    );
    const days = duration(crop, cycle),
      flowerStart = Math.round(days * (crop === "milho" ? 0.45 : 0.38));
    return { phase: phaseFor(crop, age, days), duration: days, flowerStart, flowerEnd: flowerStart + 18 };
  }
  function applyWater(p, mm) {
    p.budget.irrigation += mm;
    const top = p.waterMm + mm;
    p.waterMm = Math.min(top, p.topCap);
    const deep = p.waterDeep + Math.max(0, top - p.topCap);
    p.waterDeep = Math.min(p.deepCap, deep);
    p.budget.drainage += Math.max(0, deep - p.deepCap);
    p.irrigated = true;
  }
  /* Interface do simulador. Todos os fluxos em mm no talhão; intervenção datada,
     clima efetivamente realizado no dia. A saída não altera o estado inicial. */
  function infiltrationFraction(p) {
    return limit(
      0.9 +
        (p.operation === "direta" ? 0.035 : -0.07) -
        (p.depth < 0.6 ? 0.08 : 0) -
        0.08 * (p.trafficDamage || 0),
      0.55,
      0.99,
    );
  }
  function simulatePlot(initial, intervention, weather, version = VERSION) {
    const p = clone(initial),
      day = weather.day;
    check(
      Number.isInteger(day) &&
        Number.isFinite(weather.maxTemp) &&
        Number.isFinite(weather.rain) &&
        weather.rain >= 0 &&
        Number.isFinite(weather.demand) &&
        weather.demand >= 0,
      "Forçamento diário inválido.",
    );
    check(
      !intervention || intervention.day === undefined || intervention.day === day,
      "O dia da intervenção difere do período simulado.",
    );
    check(
      !intervention || intervention.hour === undefined || [0, 12].includes(intervention.hour),
      "A intervenção deve usar o turno de 00h ou 12h.",
    );
    const active = p.crop && p.actualSowDay !== null && day >= p.actualSowDay && !p.harvested;
    const age = active ? day - p.actualSowDay : -1;
    const durationDays = p.crop ? duration(p.crop, p.cycle) : 0;
    if (p.crop && !p.harvested) p.phase = phaseFor(p.crop, age, durationDays);
    const irrigation = number(
      intervention?.irrigationMm ?? 0,
      0,
      1000,
      "Lâmina líquida de irrigação inválida.",
    );
    const rain = Number(weather.rain);
    const opening = p.waterMm + p.waterDeep;
    const initialDrainage = p.budget.drainage;
    if (irrigation > 0 && intervention?.hour !== 12) applyWater(p, irrigation);
    const infiltration = infiltrationFraction(p);
    const runoff = rain * (1 - infiltration);
    let top = p.waterMm + rain - runoff;
    const percolation = Math.max(0, top - p.topCap);
    top -= percolation;
    let deep = p.waterDeep + percolation;
    const drainage = Math.max(0, deep - p.deepCap);
    deep -= drainage;
    const growing = active && age < durationDays;
    p.rootDepth = growing
      ? Math.min(
          p.depth * (1 - 0.12 * (p.trafficDamage || 0)),
          0.13 + age * (p.crop === "milho" ? 0.012 : 0.0105),
        )
      : p.rootDepth;
    const kc = !growing
      ? 0
      : p.phase === "Emergência"
        ? 0.35
        : p.phase === "Vegetativo"
          ? 0.72
          : p.phase === "Florescimento"
            ? 1.18
            : 0.94;
    const demand = weather.demand * kc;
    const evaporation = Math.min(
      top,
      weather.demand * (growing ? 0.17 : p.operation === "direta" ? 0.33 : 0.5),
    );
    top -= evaporation;
    const fromTop = Math.min(demand, top * Math.min(0.93, 0.5 + p.rootDepth * 0.38));
    top -= fromTop;
    const accessed = Math.pow(Math.min(1, p.rootDepth / p.depth), 1.45);
    const fromDeep = Math.min(demand - fromTop, deep * accessed * 0.25);
    deep -= fromDeep;
    const transpiration = fromTop + fromDeep,
      deficit = demand > 0 ? 1 - transpiration / demand : 0;
    p.waterMm = top;
    p.waterDeep = deep;
    Object.entries({ rain, runoff, evaporation, transpiration, drainage }).forEach(
      ([k, v]) => (p.budget[k] += v),
    );
    if (growing) {
      const weight = p.phase === "Florescimento" ? 2.7 : p.phase === "Enchimento" ? 1.45 : 0.65;
      p.stress +=
        deficit * weight +
        (weather.maxTemp > 33 ? weight * 0.05 * (weather.maxTemp - 33) * (0.4 + deficit) : 0);
      p.weightedDays += weight;
      p.stageDays++;
      if (p.crop === "milho" && day === p.scheduledN) {
        p.nApplied = true;
        p.nEfficiency = weather.maxTemp >= 33 && rain < 4 ? 0.62 : 0.95;
      }
    }
    if (irrigation > 0 && intervention?.hour === 12) applyWater(p, irrigation);
    const residual =
      opening +
      rain +
      irrigation -
      (p.waterMm + p.waterDeep + runoff + p.budget.drainage - initialDrainage + evaporation + transpiration);
    return {
      plot: p,
      version,
      indicators: { waterResidualMm: residual, deficit, actualTranspiration: transpiration },
    };
  }
  function planPrice(plan) {
    const machine = machines[plan.machine || "contract"],
      crew = crews[plan.crew || "daily"];
    const seed = (plan.crop === "milho" ? 5.1 : 0.76) * plan.seedRate;
    return money(
      plan.area *
        (seed +
          plan.fertilizer * 3.35 +
          machine.perHa +
          (plan.operation === "direta" ? 220 : 360) +
          crew.perHa),
    );
  }
  function yieldFor(p) {
    const base = p.crop === "milho" ? 108 : 64,
      desired = p.crop === "milho" ? 68 : 300;
    const seedFactor = limit(1 - (0.35 * Math.abs(p.seedRate - desired)) / desired, 0.62, 1);
    const nutrient = limit(
      0.64 + 0.34 * Math.min(p.fertilizer / (p.crop === "milho" ? 390 : 280), 1.12),
      0.64,
      1.02,
    );
    const stress = limit(1 - (0.94 * p.stress) / Math.max(1, p.weightedDays), 0.13, 1);
    const delay = Math.max(0, p.actualSowDay - 30);
    const nFactor = p.crop === "milho" ? (p.nApplied ? 0.9 + 0.1 * (p.nEfficiency || 0.6) : 0.88) : 1;
    return round(
      base *
        (p.cycle === "precoce" ? 0.94 : 1) *
        p.fertility *
        seedFactor *
        nutrient *
        nFactor *
        stress *
        Math.max(0.7, 1 - delay * 0.004) *
        Math.max(0.78, 1 - Math.max(0, p.harvestDay - p.matureDay - 8) * 0.009),
      2,
    );
  }
  function market(s, crop) {
    check(["soja", "milho"].includes(crop), "Escolha soja ou milho.");
    const price = round(
      (crop === "soja" ? 132 : 67) +
        Math.sin(s.day * 0.073) * 3 +
        (s.day - DUE) * 0.025 +
        noise(s.seed, s.day, 7) * 2,
      2,
    );
    return {
      price,
      freight: crop === "soja" ? 4.8 : 3.4,
      termPrice: round(price * 1.045, 2),
      termDays: 18,
      mass: 60,
    };
  }
  function refresh(s) {
    if (!["season", "harvest", "accounts"].includes(s.stage)) return;
    const crops = s.plots.filter((p) => p.crop);
    if (crops.every((p) => p.harvested && p.stocks === 0)) s.stage = "accounts";
    else if (crops.some((p) => p.phase === "Maduro" || p.harvested)) s.stage = "harvest";
    else s.stage = "season";
  }
  // Os limites e as respostas abaixo são hipóteses do cenário, sem calibração por solo local.
  function usesFieldwork(s) {
    return s.version === VERSION && !s.mission;
  }
  function fieldProfile(s, p) {
    const slow = p.id === "grota";
    return slow
      ? { drainage: "lenta", warnRain: 8, stopRain: 18, warnTotal: 19, stopTotal: 38 }
      : {
          drainage: s.property === "clara" ? "moderada" : "boa",
          warnRain: 14,
          stopRain: 24,
          warnTotal: 26,
          stopTotal: 47,
        };
  }
  function inspectSoil(s, p, weather) {
    const profile = fieldProfile(s, p);
    const rainTodayMm = weather.rain;
    const priorDays = isHistorical(s)
      ? [s.day - 2, s.day - 1, s.day].map((day) => regionalClimate().forcing(s.climate, day))
      : s.weatherLog.filter((w) => w.day > s.day - 3);
    const rain3dMm = round(
      sum(priorDays, (w) => w.rain),
      2,
    );
    const topFraction = Math.min(1, (p.waterMm + rainTodayMm * infiltrationFraction(p)) / p.topCap);
    let level = "livre";
    if (rainTodayMm >= profile.stopRain || (rain3dMm >= profile.stopTotal && topFraction >= 0.9))
      level = "interditado";
    else if (rainTodayMm >= profile.warnRain || (rain3dMm >= profile.warnTotal && topFraction >= 0.85))
      level = "marginal";
    const notes = {
      livre: "O acesso comporta o turno reservado.",
      marginal:
        "A roda pode marcar o solo. Há custo extra e risco de reduzir a infiltração e o alcance das raízes.",
      interditado: "O acesso não suporta o trator neste turno, mesmo com a política de entrada marginal.",
    };
    return {
      level,
      day: weather.day,
      rainTodayMm,
      rain3dMm,
      topFraction: round(topFraction, 3),
      drainage: profile.drainage,
      reason: notes[level],
    };
  }
  function traffic(s, id) {
    const p = plotBy(s, id);
    const empty = {
      level: "sem leitura",
      day: null,
      rainTodayMm: null,
      rain3dMm: null,
      topFraction: null,
      drainage: fieldProfile(s, p).drainage,
      reason: "Ainda não há observação de chuva para esta data.",
    };
    const reading = p.fieldReading || empty;
    const labels = {
      livre: "Entrada liberada",
      marginal: "Entrada marginal",
      interditado: "Entrada interditada",
      "sem leitura": "Aguardando observação",
    };
    return {
      ...reading,
      enabled: usesFieldwork(s),
      label: labels[reading.level],
      policy: p.fieldPolicy || "protect",
      extraPerHa: 75,
      damagePerHa: 0.045,
    };
  }
  function reschedulePlot(p, lastDay) {
    const delay = lastDay - p.actualSowDay;
    p.actualSowDay = lastDay;
    p.matureDay += delay;
    if (p.scheduledN !== null && !p.nApplied) p.scheduledN += delay;
  }
  function workShift(s, weather) {
    if (!usesFieldwork(s)) return false;
    for (const p of s.plots) p.fieldReading = inspectSoil(s, p, weather);
    if (s.stage !== "season" && s.stage !== "harvest") return false;
    const queue = s.plots
      .filter((p) => p.crop && p.workedHa < p.area)
      .sort((a, b) => a.slotOrder - b.slotOrder);
    const p = queue[0];
    if (!p || s.day < p.firstSlotDay) return false;
    const conditions = traffic(s, p.id);
    const capacity = machines[s.machine].capacity;
    const remaining = p.area - p.workedHa;
    const plannedHa = Math.min(capacity, remaining);
    const rough = conditions.level === "marginal";
    const charge = rough ? money(plannedHa * conditions.extraPerHa) : 0;
    let label,
      status = "trabalhado",
      hectares = 0;
    if (conditions.level === "interditado") {
      status = "interditado";
      label = "Acesso interditado pela chuva realizada.";
    } else if (rough && conditions.policy !== "press") {
      status = "aguardou";
      label = "A equipe preservou o solo e aguardou uma janela mais firme.";
    } else if (rough && s.cash < charge) {
      status = "sem caixa";
      label = "O caixa não cobre o adicional da passagem marginal. O serviço aguardou.";
    } else {
      hectares = plannedHa;
      p.workedHa = hectares === remaining ? p.area : Math.min(p.area, round(p.workedHa + hectares, 6));
      label = "Semeou " + hectares.toLocaleString("pt-BR") + " ha na janela disponível.";
      if (rough) {
        spend(s, "Passagem marginal · " + p.name, charge);
        const fraction = hectares / p.area;
        p.trafficDamage = Math.min(1, p.trafficDamage + fraction);
        p.soilChange -= fraction * conditions.damagePerHa;
        status = "passagem marginal";
        label =
          "Semeou " +
          hectares.toLocaleString("pt-BR") +
          " ha com solo marginal, por R$ " +
          charge.toLocaleString("pt-BR") +
          " adicionais.";
      }
    }
    if (!hectares) p.trafficDelays += 1;
    p.lastFieldwork = { day: s.day, status, label, ha: hectares, cost: hectares ? charge : 0 };
    log(s, "fieldwork", p.name + " · " + label, forecast(s), {
      id: p.id,
      result: { ...p.lastFieldwork },
      reading: { ...p.fieldReading },
    });
    let nextDay = s.day + 1;
    for (const queued of queue) {
      if (queued.workedHa >= queued.area) {
        reschedulePlot(queued, s.day);
        continue;
      }
      const first = Math.max(nextDay, queued.firstSlotDay);
      const finish = first + Math.max(1, Math.ceil(round(queued.area - queued.workedHa, 6) / capacity)) - 1;
      reschedulePlot(queued, finish);
      nextDay = finish + 1;
    }
    return true;
  }
  function blockedInCurrentTurn(s, plot) {
    return (
      plot.workedHa < plot.area &&
      plot.lastFieldwork?.day === s.day &&
      ["aguardou", "interditado", "sem caixa"].includes(plot.lastFieldwork.status)
    );
  }
  function rememberFieldWindow(s) {
    if (!usesFieldwork(s) || s.hour !== 12 || !["advance", "advanceHours"].includes(s.history.at(-1)?.type))
      return;
    for (const p of s.plots) {
      if (
        !blockedInCurrentTurn(s, p) ||
        s.checkpoints.some((c) => c.type === "fieldWindow" && c.plotId === p.id)
      )
        continue;
      const firstStop = s.history.find((h) => h.type === "fieldwork" && h.id === p.id && h.result?.ha === 0);
      if (!firstStop || firstStop.day !== s.day) continue;
      s.checkpoints.push({
        type: "fieldWindow",
        plotId: p.id,
        day: s.day,
        hour: s.hour,
        cashDelta: 0,
        label: "Primeiro turno impedido no talhão " + p.name + " em " + date(s.day),
        state: snapshot(s),
      });
    }
  }
  function dayStep(s) {
    const previousAlert = isHistorical(s) && forecast(s).level;
    if (s.hour === 12) s.day += 1;
    s.hour = 12;
    const weather = isHistorical(s) ? regionalClimate().forcing(s.climate, s.day) : weatherAt(s.seed, s.day);
    s.weatherLog.push(weather);
    const worked = workShift(s, weather);
    s.plots = s.plots.map((p) => simulatePlot(p, null, weather, s.version).plot);
    settleDay(s);
    marketStorage.accrueDay(s);
    refresh(s);
    return worked || (isHistorical(s) && previousAlert !== "alto" && forecast(s).level === "alto");
  }
  function advance(s, days) {
    check(
      !["visit", "closed"].includes(s.stage),
      "Primeiro escolha uma propriedade. A safra encerrada pode ser repetida.",
    );
    let count = number(days || 1, 1, 450, "Avance de 1 a 450 dias.");
    check(Number.isInteger(count), "Use dias inteiros.");
    check(s.day < 360, "O calendário desta primeira campanha chegou ao limite de 360 dias. Feche as contas.");
    const start = s.day;
    const stops = [
      ...(isHistorical(s) ? [] : [59, 63, 68]),
      DUE,
      ...s.consultants.filter((c) => !c.delivered).map((c) => c.due),
      ...s.plots
        .filter((p) => p.crop && !p.harvested)
        .flatMap((p) => [p.actualSowDay, p.matureDay, p.nApplied ? null : p.scheduledN]),
      ...s.receivables.filter((r) => !r.paid).map((r) => r.day),
      ...s.debts.filter((d) => d.balance > 0).map((d) => d.due),
    ].filter((d) => Number.isInteger(d) && d > start);
    const until = Math.min(360, start + count, ...stops);
    while (s.day < until || s.hour === 0) {
      if (dayStep(s)) break;
    }
  }
  function apply(s, type, a) {
    const before = forecast(s),
      pId = a.id;
    check(s.stage !== "closed", "A safra já foi encerrada. Volte a uma decisão para jogar novamente.");
    const checkpoint = [
      "sign",
      "start",
      "machine",
      "crew",
      "repay",
      "renegotiate",
      "irrigate",
      "defer",
      "preserve",
      "sell",
      "fieldPolicy",
    ].includes(type)
      ? snapshot(s)
      : null;
    let label,
      detail = {};
    switch (type) {
      case "visit":
      case "lab":
      case "negotiate":
      case "refuse": {
        const o = offer(pId),
          intel = s.intel[o.id];
        check(
          s.stage === "visit" || ((type === "visit" || type === "lab") && s.property === pId),
          "Esta proposta já foi encerrada.",
        );
        if (type === "visit") {
          check(!intel.visit || intel.refused, "A visita independente já consta do caderno.");
          if (!intel.visit) spend(s, "Visita independente · " + o.name, 320);
          intel.visit = true;
          intel.refused = false;
          label = "Visita independente a " + o.name + ". " + o.observation;
        } else if (type === "lab") {
          check(!intel.lab, "A análise já foi entregue.");
          spend(s, "Análise do perfil · " + o.name, 850);
          intel.lab = true;
          label = "Análise de " + o.name + ". " + o.lab;
        } else if (type === "negotiate") {
          check(!intel.negotiated, "A contraproposta já foi aceita.");
          check(
            intel.visit || intel.lab,
            "Obtenha uma observação independente ou análise para fundamentar sua proposta.",
          );
          intel.negotiated = true;
          intel.discount = intel.lab ? 0.06 : 0.03;
          intel.refused = false;
          label = "Contraproposta em " + o.name + " aceita com desconto de " + intel.discount * 100 + "%.";
        } else {
          check(!intel.refused, "Proposta já recusada.");
          intel.refused = true;
          label = "Recusou a proposta de " + o.name + ".";
        }
        break;
      }
      case "sign": {
        check(s.stage === "visit", "Já há contrato nesta safra.");
        const o = offer(pId),
          mode = a.mode;
        const q = quote(s, pId, mode);
        check(!s.intel[pId].refused, "Proposta recusada. Faça uma nova visita para reabrir a conversa.");
        check(q.cashAfter >= 0, "A entrada e as despesas excedem o caixa disponível.");
        s.property = pId;
        s.mode = mode;
        s.contractPrice = mode === "buy" ? q.price : 0;
        s.water = o.water;
        s.reserveCapacity = o.water;
        s.plots = o.plots.map((spec) => {
          const plot = initialPlot(spec);
          if (usesFieldwork(s))
            Object.assign(plot, {
              fieldPolicy: "protect",
              workedHa: 0,
              trafficDamage: 0,
              trafficDelays: 0,
              plannedSowDay: null,
              firstSlotDay: null,
              slotOrder: null,
              lastFieldwork: null,
              fieldReading: null,
            });
          return plot;
        });
        s.stage = "plan";
        spend(
          s,
          mode === "buy" ? "Entrada da terra" : "Primeira metade do arrendamento",
          q.down,
          mode === "buy" ? "land" : "rent",
          mode === "buy" ? 0 : q.down,
        );
        spend(s, "Despesas de contratação", q.fees);
        newDebt(
          s,
          mode === "buy" ? "land" : "lease",
          mode === "buy" ? "Financiamento da terra" : "Saldo do arrendamento",
          q.principal,
          q.firstDue,
          q.annualPrincipal,
          q.interestRate,
          mode === "buy" ? "land" : "lease",
        );
        label = (mode === "buy" ? "Compra financiada" : "Arrendamento") + " de " + o.name + ".";
        break;
      }
      case "consult": {
        check(s.property && s.day < 120, "Consultoria indisponível nesta data.");
        const c = consultants[a.kind];
        check(c, "Escolha o escopo da consultoria.");
        check(!s.consultants.some((x) => x.kind === a.kind), "Esta consultoria já foi contratada.");
        spend(s, "Consultoria · " + c.name, c.price);
        s.consultants.push({ ...c, kind: a.kind, due: s.day + c.delay, delivered: false });
        label = c.name + " contratada. Parecer previsto para " + date(s.day + c.delay) + ".";
        break;
      }
      case "machine": {
        check(s.stage === "plan", "A máquina deve ser escolhida no planejamento.");
        const m = machines[a.kind];
        check(m, "Escolha uma máquina disponível.");
        check(s.machine !== a.kind, "Esta máquina já está selecionada.");
        check(s.machine !== "own", "A compra do equipamento já foi registrada.");
        if (a.kind === "own") {
          spend(s, "Entrada do conjunto mecanizado", m.down, "equipment", 0);
          s.equipmentValue = m.price;
          const balance = m.price - m.down;
          newDebt(
            s,
            "equipment",
            "Financiamento de equipamento",
            balance,
            DUE,
            balance / 5,
            m.rate,
            "equipment",
          );
        }
        s.machine = a.kind;
        label = "Selecionou " + m.name + " (" + m.capacity + " ha/dia).";
        break;
      }
      case "crew": {
        check(s.stage === "plan", "A equipe deve ser contratada antes da implantação.");
        const crew = crews[a.kind];
        check(crew, "Escolha uma proposta de trabalho da equipe.");
        check((s.crew || "daily") !== a.kind, "Esta equipe já foi selecionada.");
        check(s.crew !== "resident", "Teresa já foi contratada para esta safra.");
        if (crew.mobilization) spend(s, "Mobilização de " + crew.person, crew.mobilization);
        s.crew = a.kind;
        label =
          "Contratou " +
          crew.person +
          " para " +
          crew.name.toLowerCase() +
          "; disponível em " +
          date(crew.available) +
          ".";
        break;
      }
      case "credit": {
        check(
          s.property && s.day < DUE,
          "A linha de custeio deve ser contratada antes do vencimento da safra.",
        );
        const amount = money(number(a.amount, 1, 120000, "Custeio entre R$ 1 e R$ 120.000."));
        const current = s.debts.find((d) => d.id === "operating");
        check((current?.balance || 0) + amount <= 120000, "O custeio ultrapassa o limite de R$ 120.000.");
        booking(s, "Crédito de custeio recebido", amount, "credit");
        if (current) {
          current.accrued = interest(s, current);
          current.lastInterestDay = s.day;
          current.balance = money(current.balance + amount);
          current.payment = current.balance;
        } else newDebt(s, "operating", "Custeio da safra", amount, DUE, amount, 0.09, "operating");
        label =
          "Recebeu R$ " + amount.toLocaleString("pt-BR") + " de custeio; principal adicionado à dívida.";
        break;
      }
      case "repay":
      case "renegotiate": {
        const d = s.debts.find((x) => x.id === pId && x.balance > 0);
        check(d, "Escolha uma dívida com saldo.");
        if (type === "repay") {
          const amount = money(
            number(a.amount, 0.01, d.balance, "Amortização acima do saldo ou valor inválido."),
          );
          collectDebt(s, d, amount);
          label = "Amortizou " + d.label + " com recursos do caixa.";
        } else {
          check(!d.renegotiated, "Este contrato já foi prorrogado nesta safra.");
          const fee = money(d.balance * 0.012);
          spend(s, "Taxa de prorrogação · " + d.label, fee, "finance");
          const accrued = interest(s, d);
          d.accrued = accrued;
          d.lastInterestDay = s.day;
          d.due = Math.max(s.day, d.due) + 180;
          d.renegotiated = true;
          d.late = false;
          label =
            "Renegociou " +
            d.label +
            ". Taxa de 1,2% sobre o saldo e novo vencimento em " +
            date(d.due) +
            ".";
        }
        break;
      }
      case "plan": {
        check(s.stage === "plan", "O plano só pode ser alterado antes de iniciar a safra.");
        const p = plotBy(s, pId);
        const area = number(a.area, 0, p.ha, "A área deve ficar entre zero e a área útil do talhão.");
        if (area === 0) {
          Object.assign(p, { area: 0, crop: null, phase: "Pousio", committed: 0 });
          label = "Manteve " + p.name + " em pousio.";
          break;
        }
        check(["soja", "milho"].includes(a.crop), "Escolha milho ou soja.");
        check(["normal", "precoce"].includes(a.cycle), "Escolha o ciclo.");
        check(["direta", "convencional"].includes(a.operation), "Escolha a operação de preparo.");
        const sowDay = number(a.sowDay, 0, 85, "A janela permite plantio desejado entre os dias 0 e 85.");
        check(Number.isInteger(sowDay), "Informe o dia inteiro do plantio.");
        const seedRate = number(
          a.seedRate,
          a.crop === "milho" ? 35 : 130,
          a.crop === "milho" ? 95 : 480,
          a.crop === "milho"
            ? "Milho exige 35 a 95 mil sementes/ha."
            : "Soja exige 130 a 480 mil sementes/ha.",
        );
        const fertilizer = number(a.fertilizer, 0, 700, "Use entre 0 e 700 kg de produto por hectare.");
        Object.assign(p, {
          area,
          crop: a.crop,
          cycle: a.cycle,
          sowDay,
          seedRate,
          fertilizer,
          operation: a.operation,
          phase: "Planejado",
          nutrientN: round(fertilizer * (a.crop === "milho" ? 0.2 : 0.02)),
          nutrientP2O5: round(fertilizer * (a.crop === "milho" ? 0.05 : 0.2)),
          nutrientK2O: round(fertilizer * (a.crop === "milho" ? 0.2 : 0.18)),
        });
        p.committed = planPrice({ ...p, machine: s.machine, crew: s.crew });
        label = "Planejou " + p.area + " ha de " + p.crop + " no " + p.name + ".";
        detail = { area, crop: p.crop, cycle: p.cycle, sowDay, seedRate, fertilizer, operation: p.operation };
        break;
      }
      case "fieldPolicy": {
        const p = plotBy(s, pId);
        check(
          usesFieldwork(s) &&
            (s.stage === "plan" ||
              (["season", "harvest"].includes(s.stage) && p.crop && p.workedHa < p.area)),
          "A política de passagem exige uma campanha operacional com semeadura em aberto.",
        );
        check(["protect", "press"].includes(a.policy), "Escolha uma política de passagem válida.");
        check(a.policy !== p.fieldPolicy, "Esta política já está em uso.");
        p.fieldPolicy = a.policy;
        label =
          p.name +
          (a.policy === "press" ? ": autorizou a entrada em condição marginal." : ": aguardar solo firme.");
        detail = { id: p.id, policy: a.policy, reading: traffic(s, p.id) };
        break;
      }
      case "start": {
        check(s.stage === "plan", "A safra já começou.");
        check(s.day <= 85, "A janela de implantação terminou.");
        const plans = s.plots
          .filter((p) => p.crop && p.area > 0)
          .sort((x, y) => x.sowDay - y.sowDay || x.id.localeCompare(y.id));
        check(plans.length, "Planeje ao menos um talhão antes de iniciar.");
        s.machine = s.machine || "contract";
        s.crew = s.crew || "daily";
        const m = machines[s.machine],
          crew = crews[s.crew];
        let available = Math.max(m.available, crew.available, s.day + 1);
        for (const p of plans) {
          const first = Math.max(available, p.sowDay);
          p.actualSowDay = first + Math.ceil(p.area / m.capacity) - 1;
          if (usesFieldwork(s)) {
            p.firstSlotDay = first;
            p.slotOrder = plans.indexOf(p);
            p.plannedSowDay = p.actualSowDay;
          }
          check(
            p.actualSowDay <= 85,
            "A capacidade de " + m.capacity + " ha/dia não permite cumprir a janela até o dia 85.",
          );
          available = p.actualSowDay + 1;
          p.matureDay = p.actualSowDay + duration(p.crop, p.cycle);
          p.scheduledN = p.crop === "milho" && p.fertilizer > 0 ? p.actualSowDay + 30 : null;
          p.phase = "Programado";
          p.committed = planPrice({ ...p, machine: s.machine, crew: s.crew });
          spend(s, "Reserva de insumos e operações · " + p.name, p.committed);
        }
        s.stage = "season";
        label =
          "Confirmou a implantação com " +
          m.name +
          " e " +
          crew.person +
          ". Insumos e serviço reservados no caixa.";
        detail = {
          calendar: plans.map((p) => ({
            id: p.id,
            desired: p.sowDay,
            actual: p.actualSowDay,
            mature: p.matureDay,
            cost: p.committed,
          })),
        };
        break;
      }
      case "advance": {
        advance(s, a.days);
        label = "Calendário avançado até " + date(s.day) + ".";
        break;
      }
      case "advanceHours": {
        check(
          !isHistorical(s) &&
            ["season", "harvest"].includes(s.stage) &&
            s.day >= 59 &&
            (s.day <= 67 || (s.day === 68 && s.hour === 0)),
          "O turno de 12 h está disponível durante o alerta climático.",
        );
        check(a.hours === undefined || a.hours === 12, "Use o turno operacional de 12 h.");
        if (s.hour === 12) {
          s.day += 1;
          s.hour = 0;
        } else {
          dayStep(s);
        }
        label = "Relógio da fazenda em " + date(s.day) + " às " + (s.hour === 0 ? "00" : "12") + "h.";
        break;
      }
      case "probe": {
        const p = plotBy(s, pId);
        check(!p.probe || p.probe.day !== s.day, "Já existe leitura de hoje neste talhão.");
        spend(s, "Sondagem de umidade · " + p.name, 180);
        p.probe = {
          day: s.day,
          top: round(p.waterMm, 1),
          deep: round(p.waterDeep, 1),
          rootDepth: round(p.rootDepth, 2),
        };
        label =
          "Sondou " +
          p.name +
          ". Camadas superficial/profunda: " +
          p.probe.top +
          " / " +
          p.probe.deep +
          " mm.";
        break;
      }
      case "irrigate": {
        check(["season", "harvest"].includes(s.stage), "A irrigação exige lavoura implantada.");
        const p = plotBy(s, pId);
        check(
          p.area > 0 && s.day >= p.actualSowDay && s.day < p.matureDay,
          "Esta área não está em crescimento.",
        );
        const gross = 20,
          net = 16,
          withdrawal = round(gross * 10 * p.area);
        check(s.reserveCapacity > 0, "A propriedade é de sequeiro e não possui sistema de irrigação.");
        check(
          s.water + 1e-8 >= withdrawal,
          "Água insuficiente: o turno exige " + withdrawal + " m³ e restam " + round(s.water) + " m³.",
        );
        spend(s, "Energia e operação de irrigação · " + p.name, 22 * p.area);
        s.water = round(s.water - withdrawal);
        applyWater(p, net);
        s.climateChoice = "irrigate-" + p.id;
        label = "Priorizou " + p.name + ": " + withdrawal + " m³ retirados; 16 mm líquidos no talhão.";
        detail = { id: p.id, withdrawal, lossM3: round(withdrawal - net * 10 * p.area), netMm: net };
        break;
      }
      case "defer": {
        const p = plotBy(s, pId);
        check(
          p.crop === "milho" &&
            p.scheduledN !== null &&
            !p.nApplied &&
            !p.nDeferred &&
            ["season", "harvest"].includes(s.stage),
          "Não há cobertura nitrogenada futura disponível para adiar.",
        );
        const previous = p.scheduledN;
        p.scheduledN = Math.max(p.scheduledN + 5, s.day + 1);
        p.nDeferred = true;
        s.climateChoice = "defer-" + p.id;
        label =
          "Adiou a cobertura nitrogenada de " +
          p.name +
          " de " +
          date(previous) +
          " para " +
          date(p.scheduledN) +
          ".";
        detail = { id: p.id, previous, due: p.scheduledN };
        break;
      }
      case "preserve": {
        check(
          ["season", "harvest"].includes(s.stage) && forecast(s).level === "alto",
          "Preservar reserva como decisão de missão exige alerta ativo.",
        );
        check(s.water > 0, "Não há reserva disponível para preservar.");
        check(
          !s.history.some((h) => h.type === "preserve" && h.day === s.day && h.hour === s.hour),
          "A preservação da reserva já foi registrada neste turno.",
        );
        s.climateChoice = "preserve";
        label = "Preservou a reserva de " + round(s.water) + " m³ durante o alerta.";
        break;
      }
      case "cover": {
        const p = plotBy(s, pId);
        check(
          s.stage === "plan" && !p.cover,
          "Cobertura deve ser implantada uma vez durante o planejamento.",
        );
        spend(s, "Cobertura e conservação · " + p.name, 180 * p.ha);
        s.soilInvestment += 180 * p.ha;
        p.cover = true;
        p.fertility = Math.min(1, p.fertility + p.recovery * 0.3);
        p.soilChange += p.recovery * 0.4;
        label = "Implantou cobertura no " + p.name + " para proteger o solo.";
        break;
      }
      case "harvest": {
        const p = plotBy(s, pId);
        check(
          p.crop && !p.harvested && p.matureDay !== null && s.day >= p.matureDay,
          "O talhão ainda não está pronto para colheita.",
        );
        spend(s, "Colheita · " + p.name, 165 * p.area);
        p.harvestDay = s.day;
        p.yieldSc = yieldFor(p);
        p.production = round(p.area * p.yieldSc, 3);
        p.stocks = p.production;
        p.harvested = true;
        p.phase = "Colhido";
        p.soilChange += p.operation === "direta" ? 0.012 : -0.025;
        label =
          "Colheu " +
          p.production.toLocaleString("pt-BR") +
          " sc de 60 kg em " +
          p.area +
          " ha no " +
          p.name +
          ".";
        detail = { id: p.id, yieldSc: p.yieldSc, kg: round(p.production * 60), stress: round(p.stress, 3) };
        break;
      }
      case "sell": {
        const p = plotBy(s, pId);
        check(p.stocks > 0, "O talhão não tem estoque colhido para vender.");
        check(["spot", "term"].includes(a.terms), "Escolha pagamento à vista ou a prazo.");
        const marketNow = market(s, p.crop),
          term = a.terms === "term";
        if (marketStorage.enabled(s)) {
          const sale = marketStorage.sellLot(s, p, a, marketNow);
          if (term)
            s.receivables.push({
              id: sale.saleId,
              saleId: sale.saleId,
              plotId: p.id,
              label: p.name,
              day: sale.payDay,
              amount: sale.net,
              paid: false,
            });
          else booking(s, "Venda à vista · " + p.name, sale.net, "sale");
          label =
            "Vendeu " +
            sale.units.toLocaleString("pt-BR") +
            " sc do " +
            p.name +
            ". Recebimento líquido em " +
            date(sale.payDay) +
            ".";
          break;
        }
        check(
          a.units === undefined || a.units === p.stocks,
          "A edição clássica usa o estoque integral do talhão.",
        );
        const price = term ? marketNow.termPrice : marketNow.price,
          units = p.stocks,
          freight = money(units * marketNow.freight);
        const gross = money(price * units),
          amount = money(gross - freight),
          payDay = s.day + (term ? marketNow.termDays : 0);
        s.sales.push({
          day: s.day,
          id: p.id,
          crop: p.crop,
          area: p.area,
          units,
          price,
          gross,
          freight,
          net: amount,
          payDay,
          terms: a.terms,
        });
        p.stocks = 0;
        if (term) s.receivables.push({ id: p.id, label: p.name, day: payDay, amount, paid: false });
        else booking(s, "Venda à vista · " + p.name, amount, "sale");
        label =
          "Vendeu " +
          units.toLocaleString("pt-BR") +
          " sc do " +
          p.name +
          ". Recebimento líquido em " +
          date(payDay) +
          ".";
        break;
      }
      case "writeoff": {
        const p = plotBy(s, pId);
        check(
          p.crop && !p.harvested && p.matureDay !== null && s.day >= p.matureDay,
          "A baixa exige talhão maduro ainda em campo.",
        );
        p.harvested = true;
        p.lost = true;
        p.harvestDay = s.day;
        p.phase = "Perdido";
        label =
          "Reconheceu perda integral do " + p.name + ". A área planejada ficou sem colheita nem estoque.";
        break;
      }
      case "close": {
        check(s.stage === "accounts", "Colha e venda todos os talhões planejados antes do fechamento.");
        check(
          s.receivables.every((r) => r.paid),
          "Há recebível em aberto. Avance até a data de recebimento.",
        );
        check(
          s.day >= DUE,
          "O fechamento inclui o vencimento do dia " + date(DUE) + ". Avance o calendário.",
        );
        s.stage = "closed";
        label = "Fechou a primeira safra.";
        break;
      }
      default:
        throw new Error("Ação desconhecida: " + type + ".");
    }
    if (type === "machine" || type === "crew")
      for (const p of s.plots.filter((p) => p.crop))
        p.committed = planPrice({ ...p, machine: s.machine, crew: s.crew });
    refresh(s);
    if (checkpoint)
      s.checkpoints.push({
        day: checkpoint.day,
        hour: checkpoint.hour,
        type,
        label,
        state: checkpoint,
        cashDelta: money(s.cash - checkpoint.cash),
      });
    log(s, type, label, before, { args: clone(a), ...detail });
    if (type === "advance" || type === "advanceHours") rememberFieldWindow(s);
    return s;
  }
  function alternativeContract(s) {
    const mode = s.mode === "buy" ? "lease" : "buy";
    const sign = s.checkpoints.find((c) => c.type === "sign");
    if (!sign) return null;
    let alt = clone(sign.state);
    const commands = s.history
      .slice(sign.state.history.length)
      .filter((h) => h.type !== "delivery" && h.type !== "fieldwork");
    try {
      for (const event of commands) {
        const args = event.type === "sign" ? { ...event.args, mode } : event.args;
        apply(alt, event.type, args);
      }
      const r = report(alt);
      return {
        mode,
        feasible: true,
        day: alt.day,
        production: r.production,
        cash: r.cash,
        debt: r.debt,
        equity: r.equity,
        margin: r.margin,
        continuity: r.continuity,
      };
    } catch (error) {
      return { mode, feasible: false, day: alt.day, reason: error.message };
    }
  }
  function act(original, type, args = {}) {
    const next = apply(clone(original), type, args);
    if (type === "close") next.alternative = alternativeContract(next);
    return next;
  }
  function decisionInfo(s) {
    if (!s.checkpoints.length) return { index: -1, label: "Ainda não há compromisso assumido.", amount: 0 };
    const labels = {
      sign: "A contratação da terra comprometeu",
      start: "As reservas de implantação comprometeram",
      machine: "A escolha do maquinário comprometeu",
      crew: "A contratação da equipe comprometeu",
      repay: "A amortização comprometeu",
      renegotiate: "A prorrogação comprometeu",
    };
    const entries = s.checkpoints.map((c, i) => ({
      index: i,
      label: labels[c.type] || c.label,
      amount: Math.max(0, -c.cashDelta),
    }));
    return entries.reduce((best, c) => (c.amount > best.amount ? c : best), entries[0]);
  }
  function report(s) {
    const warehouse = marketStorage.summary(s);
    const principal = money(sum(s.debts, (d) => d.balance)),
      accrued = money(sum(s.debts, (d) => interest(s, d)));
    const receivable = money(
      sum(
        s.receivables.filter((r) => !r.paid),
        (r) => r.amount,
      ),
    );
    const stockValue = money(sum(s.plots, (p) => p.stocks * (p.crop ? market(s, p.crop).price : 0)));
    const revenue = money(sum(s.sales, (sale) => sale.gross)),
      freight = money(sum(s.sales, (sale) => sale.freight));
    const operating = money(sum(s.ledger, (e) => e.expense));
    const costs = money(
      operating +
        warehouse.feesTotal +
        freight +
        accrued +
        sum(
          s.debts.filter((d) => d.kind === "lease"),
          (d) => d.balance,
        ),
    );
    const production = round(
        sum(s.plots, (p) => p.production),
        3,
      ),
      harvestedArea = round(
        sum(
          s.plots.filter((p) => p.harvested && !p.lost),
          (p) => p.area,
        ),
      );
    const required = money(Math.max(12000, sum(s.plots, (p) => p.committed) * 0.8));
    const current = s.debts.every((d) => !d.late);
    const continuity = s.stage === "closed" && current && s.cash >= required;
    const pick = decisionInfo(s);
    let decision =
      pick.amount > 0
        ? pick.label +
          " R$ " +
          pick.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) +
          " do caixa, o maior desembolso direto entre as decisões registradas."
        : pick.label;
    if (s.alternative) {
      const a = s.alternative,
        mode = a.mode === "lease" ? "arrendamento" : "compra";
      decision += a.feasible
        ? " Na simulação por " +
          mode +
          ", com as mesmas operações e o mesmo clima, o caixa final seria R$ " +
          a.cash.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) +
          " e o patrimônio, R$ " +
          a.equity.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) +
          "."
        : " A simulação por " + mode + " parou em " + date(a.day) + ": " + a.reason;
    }
    const soil = s.plots
      .map(
        (p) =>
          p.name +
          ": " +
          (p.soilChange >= 0 ? "+" : "") +
          round(p.soilChange * 100, 1) +
          " pontos no índice de condição do solo.",
      )
      .join(" ");
    return {
      cash: s.cash,
      debt: principal,
      accrued,
      equity: money(
        s.cash +
          receivable +
          stockValue +
          s.contractPrice +
          s.equipmentValue -
          principal -
          accrued -
          warehouse.feesOpen,
      ),
      margin: money(revenue - costs),
      revenue,
      costs,
      freight,
      receivable,
      stockValue,
      warehouse,
      production,
      harvestedArea,
      soil,
      decision,
      decisionIndex: pick.index,
      decisionAmount: pick.amount,
      continuity,
      requiredReserve: required,
      obligationsCurrent: current,
      reconciled: money(sum(s.ledger, (e) => e.amount)) === s.cash,
      modelVersion: s.version,
      condition: current
        ? s.cash >= required
          ? "Continuidade financiada"
          : "Caixa insuficiente para a próxima implantação"
        : "Obrigação vencida",
      ledgerBalance: money(sum(s.ledger, (e) => e.amount)),
      alternative: s.alternative || null,
    };
  }
  function mission(seed = 17, version = VERSION) {
    let s = create(seed, version);
    s.mission = true;
    s = act(s, "sign", { id: "helena", mode: "lease" });
    for (const [id, sowDay] of [
      ["grota", 8],
      ["alto", 35],
    ]) {
      s = act(s, "plan", {
        id,
        area: 5,
        crop: "milho",
        cycle: "normal",
        sowDay,
        seedRate: 68,
        fertilizer: 370,
        operation: "direta",
      });
    }
    s = act(s, "start");
    while (s.day < 63) s = act(s, "advance", { days: 63 - s.day });
    return s;
  }
  let lastComparison = null;
  function missionComparison(seed = 17, version = VERSION) {
    if (lastComparison && lastComparison.seed === seed && lastComparison.version === version)
      return clone(lastComparison.rows);
    const start = mission(seed, version);
    const choices = [
      ["grota", "Irrigar a Grota", "irrigate", { id: "grota" }],
      ["alto", "Irrigar o Alto", "irrigate", { id: "alto" }],
      ["preserve", "Preservar a reserva", "preserve", {}],
      ["defer", "Adiar o N no Alto", "defer", { id: "alto" }],
    ];
    const rows = choices.map(([choice, label, type, args]) => {
      const s = apply(clone(start), type, args);
      while (s.stage !== "accounts") {
        for (const p of s.plots.filter((p) => p.crop && !p.harvested && p.phase === "Maduro")) {
          apply(s, "harvest", { id: p.id });
          apply(s, "sell", { id: p.id, terms: "spot" });
        }
        if (s.stage !== "accounts") apply(s, "advance", { days: 180 });
      }
      while (s.day < DUE) apply(s, "advance", { days: DUE - s.day });
      apply(s, "close", {});
      const r = report(s);
      return { choice, label, production: r.production, cash: r.cash };
    });
    lastComparison = { seed, version, rows };
    return clone(rows);
  }
  function rewind(s, index = report(s).decisionIndex) {
    const c = s.checkpoints[index];
    check(c, "Este ponto de decisão não existe.");
    const restored = clone(c.state);
    restored.checkpoints = clone(s.checkpoints.slice(0, c.type === "fieldWindow" ? index + 1 : index));
    restored.challengeReference = {
      day: s.day,
      cash: s.cash,
      production: report(s).production,
      version: s.version,
      climate: s.climate,
      label: c.label,
    };
    return restored;
  }
  function serialize(s) {
    return JSON.stringify(s);
  }
  function restoreDefaults(s) {
    s.climate = s.climate ?? "didatico";
    s.crew = s.crew || "daily";
    s.hour = s.hour ?? 12;
    if (s.intel)
      for (const i of Object.values(s.intel)) {
        if (i?.negotiated && i.discount === undefined) i.discount = i.lab ? 0.06 : 0.03;
      }
    if (Array.isArray(s.checkpoints))
      for (const c of s.checkpoints) {
        if (!c.state) continue;
        restoreDefaults(c.state);
        c.hour = c.hour ?? c.state.hour;
        if (c.cashDelta === undefined) {
          const entries = s.ledger.slice(c.state.ledger.length).filter((e) => e.day === c.day);
          const matched =
            c.type === "sign"
              ? entries.filter(
                  (e) => e.kind === "land" || e.kind === "rent" || e.label === "Despesas de contratação",
                )
              : c.type === "start"
                ? entries.filter((e) => e.label.startsWith("Reserva de insumos e operações"))
                : [];
          c.cashDelta = money(sum(matched, (e) => e.amount));
        }
      }
  }
  function validateState(s) {
    check(
      s && supportedVersion(s.version),
      "A versão da partida é incompatível com o motor " + VERSION + ".",
    );
    check(
      knownClimate(s.climate) && (!(s.version === CLASSIC || s.mission) || !isHistorical(s)),
      "Cenário climático inválido.",
    );
    check(["daily", "resident"].includes(s.crew), "Proposta de equipe inválida.");
    check([null, "own", "contract"].includes(s.machine), "Maquinário inválido.");
    check(
      ["visit", "plan", "season", "harvest", "accounts", "closed"].includes(s.stage) &&
        Number.isInteger(s.day) &&
        s.day >= 0 &&
        s.day <= 360 &&
        [0, 12].includes(s.hour),
      "Data ou fase da partida inválida.",
    );
    check(
      Number.isInteger(s.seed) &&
        s.seed >= 0 &&
        s.seed <= 2147483647 &&
        Number.isFinite(s.cash) &&
        s.cash >= 0 &&
        Number.isFinite(s.water) &&
        s.water >= 0,
      "Caixa, cenário ou estoque de água inválido.",
    );
    check(
      Array.isArray(s.plots) &&
        Array.isArray(s.debts) &&
        Array.isArray(s.ledger) &&
        Array.isArray(s.sales) &&
        Array.isArray(s.receivables) &&
        Array.isArray(s.history) &&
        Array.isArray(s.checkpoints) &&
        Array.isArray(s.weatherLog) &&
        Array.isArray(s.consultants),
      "O arquivo está incompleto.",
    );
    check(
      s.weatherLog.every(
        (entry, index) =>
          entry &&
          entry.day === index + 1 &&
          entry.day <= s.day - (s.hour < 12 ? 1 : 0) &&
          Number.isFinite(entry.rain) &&
          entry.rain >= 0,
      ),
      "Observação meteorológica fora da sequência já transcorrida.",
    );
    if (s.challengeReference) {
      const ref = s.challengeReference;
      check(
        ref.version === s.version &&
          (ref.climate ?? "didatico") === s.climate &&
          (ref.seed === undefined || ref.seed === s.seed) &&
          Number.isInteger(ref.day) &&
          Number.isFinite(ref.cash) &&
          Number.isFinite(ref.production),
        "Referência do desafio inválida.",
      );
    }
    check(
      offers.every((o) => s.intel?.[o.id]) &&
        (s.property === null || offers.some((o) => o.id === s.property)),
      "Cadastro da propriedade inválido.",
    );
    if (s.property) {
      const o = offer(s.property);
      const phases = [
        "Pousio",
        "Planejado",
        "Programado",
        "Emergência",
        "Vegetativo",
        "Florescimento",
        "Enchimento",
        "Maduro",
        "Colhido",
        "Perdido",
      ];
      check(
        s.plots.length === o.plots.length &&
          s.plots.every((p) => {
            const q = o.plots.find((q) => q.id === p.id);
            return (
              q &&
              p.name === q.name &&
              p.ha === q.ha &&
              p.soil === q.soil &&
              p.budget &&
              [p.area, p.stocks, p.seedRate, p.fertilizer, p.sowDay].every(
                (v) => Number.isFinite(v) && v >= 0,
              ) &&
              p.area <= q.ha &&
              phases.includes(p.phase) &&
              [null, "milho", "soja"].includes(p.crop) &&
              ["direta", "convencional"].includes(p.operation) &&
              ["normal", "precoce"].includes(p.cycle)
            );
          }),
        "Talhões inválidos.",
      );
    }
    check(
      s.ledger.every((e) => Number.isFinite(e.amount) && Number.isFinite(e.expense)) &&
        money(sum(s.ledger, (e) => e.amount)) === s.cash,
      "O extrato não reconcilia com o caixa.",
    );
    check(
      s.debts.every((d) => Number.isFinite(d.balance) && d.balance >= 0 && Number.isInteger(d.due)),
      "Dívida inválida.",
    );
    check(
      s.checkpoints.every(
        (c) =>
          c.state &&
          c.state.checkpoints?.length === 0 &&
          c.state.seed === s.seed &&
          c.state.version === s.version &&
          c.state.climate === s.climate &&
          Number.isFinite(c.cashDelta),
      ),
      "Ponto de decisão inválido.",
    );
    if (usesFieldwork(s)) {
      check(
        s.plots.every((p) => validFieldState(p, s)),
        "Agenda de semeadura ou condição do solo inválida.",
      );
    }
    const fieldWindows = s.checkpoints.filter((c) => c.type === "fieldWindow");
    check(
      new Set(fieldWindows.map((c) => c.plotId)).size === fieldWindows.length &&
        fieldWindows.every((c) => {
          const p = c.state.plots.find((p) => p.id === c.plotId);
          return (
            p &&
            usesFieldwork(c.state) &&
            c.day === c.state.day &&
            c.hour === 12 &&
            c.state.hour === 12 &&
            c.cashDelta === 0 &&
            blockedInCurrentTurn(c.state, p)
          );
        }),
      "Ponto de retorno de campo inválido.",
    );
    marketStorage.validate(s);
  }
  function validFieldState(p, s) {
    const reading = p.fieldReading;
    if (
      reading &&
      (reading.day !== s.weatherLog.at(-1)?.day ||
        !["livre", "marginal", "interditado"].includes(reading.level) ||
        ![reading.rainTodayMm, reading.rain3dMm, reading.topFraction].every(
          (v) => Number.isFinite(v) && v >= 0,
        ) ||
        reading.rainTodayMm !== s.weatherLog.at(-1).rain ||
        reading.topFraction > 1)
    )
      return false;
    if (
      !["protect", "press"].includes(p.fieldPolicy) ||
      !Number.isFinite(p.workedHa) ||
      p.workedHa < 0 ||
      p.workedHa > p.area ||
      !Number.isFinite(p.trafficDamage) ||
      p.trafficDamage < 0 ||
      p.trafficDamage > 1 ||
      !Number.isInteger(p.trafficDelays) ||
      p.trafficDelays < 0
    )
      return false;
    if (!p.crop || s.stage === "plan") return true;
    return (
      Number.isInteger(p.firstSlotDay) &&
      Number.isInteger(p.slotOrder) &&
      Number.isInteger(p.plannedSowDay) &&
      Number.isInteger(p.actualSowDay) &&
      p.actualSowDay >= p.firstSlotDay &&
      p.matureDay === p.actualSowDay + duration(p.crop, p.cycle)
    );
  }
  function parseFile(text) {
    return JSON.parse(text, (key, value) => {
      check(!["__proto__", "prototype", "constructor"].includes(key), "Campo de partida inválido.");
      if (typeof value === "string") check(!/[<>]/.test(value), "Valor textual inválido na partida.");
      return value;
    });
  }
  function restore(text) {
    let s;
    try {
      s = parseFile(text);
    } catch {
      throw new Error("O arquivo não contém uma partida JSON válida.");
    }
    check(
      s && supportedVersion(s.version),
      "A versão da partida é incompatível com o motor " + VERSION + ".",
    );
    restoreDefaults(s);
    validateState(s);
    for (const c of s.checkpoints) validateState(c.state);
    rememberFieldWindow(s);
    return s;
  }
  function encode(string) {
    if (typeof Buffer !== "undefined") return Buffer.from(string, "utf8").toString("base64");
    const bytes = new TextEncoder().encode(string);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
  function decode(string) {
    if (typeof Buffer !== "undefined") return Buffer.from(string, "base64").toString("utf8");
    return new TextDecoder().decode(Uint8Array.from(atob(string), (c) => c.charCodeAt(0)));
  }
  function challenge(s, index) {
    if (index === undefined) {
      const climateIndex = s.checkpoints.findIndex(
        (c) => ["irrigate", "defer", "preserve"].includes(c.type) && c.day >= 59 && c.day <= 67,
      );
      if (climateIndex >= 0) index = climateIndex;
      else if (s.stage === "closed") index = report(s).decisionIndex;
    }
    const start = index === undefined ? snapshot(s) : clone(s.checkpoints[index]?.state);
    check(start, "Ponto de comparação indisponível.");
    const r = report(s),
      reference = {
        label: index === undefined ? "Decisão atual" : s.checkpoints[index].label,
        day: s.day,
        cash: r.cash,
        production: r.production,
        margin: r.margin,
        stage: s.stage,
        version: s.version,
        climate: s.climate,
        property: s.property,
        seed: s.seed,
      };
    return "FARM1." + encode(JSON.stringify({ version: s.version, start, reference }));
  }
  function fromChallenge(code) {
    try {
      check(typeof code === "string" && code.trim().startsWith("FARM1."), "Código inválido.");
      const payload = parseFile(decode(code.trim().slice(6)));
      check(
        supportedVersion(payload.version) &&
          payload.reference?.version === payload.version &&
          payload.start?.version === payload.version,
        "Versão incompatível.",
      );
      const s = restore(JSON.stringify(payload.start)),
        ref = payload.reference;
      check(
        Number.isInteger(ref.day) &&
          ref.day >= s.day &&
          ref.seed === s.seed &&
          (ref.climate ?? "didatico") === s.climate &&
          Number.isFinite(ref.production) &&
          Number.isFinite(ref.cash),
        "Referência inválida.",
      );
      s.challengeReference = ref;
      return s;
    } catch {
      throw new Error("Desafio inválido ou incompatível com esta versão.");
    }
  }
  const api = {
    VERSION,
    offers,
    offer,
    example,
    machines,
    consultants,
    crews,
    create,
    quote,
    act,
    date,
    forecast,
    traffic,
    market,
    report,
    planPrice,
    phenology,
    simulatePlot,
    mission,
    missionComparison,
    rewind,
    serialize,
    restore,
    challenge,
    fromChallenge,
  };
  root.Farm = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
