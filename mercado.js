/* Contrato de depósito de grãos e liquidação de vendas da campanha. */
(function (root) {
  "use strict";
  // Valores do contrato fictício de depósito da primeira campanha, por saca de 60 kg.
  const conditions = Object.freeze({ dailyFee: 0.02, dailyLossRate: 0.00012 });
  const enabled = (state) => state.version === "farmeiro-safra/1.1.0";
  const cents = (value) => Math.round((value + Number.EPSILON) * 100);
  const millisacks = (value) => Math.round(value * 1000);
  function requireThat(condition, message) {
    if (!condition) throw new Error(message);
  }
  function emptyAccount(harvestDay) {
    return {
      lastDay: harvestDay,
      feeCents: 0,
      retainedCents: 0,
      lossMillisacks: 0,
      feeCarry: 0,
      lossCarry: 0,
    };
  }
  // O custo se acumula no depósito e é descontado do crédito da venda.
  // O resíduo preserva as frações de centavo e de milésimo de saca entre diárias.
  function accrueNight(account, units) {
    const rawFee = units * conditions.dailyFee * 100 + account.feeCarry;
    const feeCents = Math.floor(rawFee + 1e-9);
    account.feeCents += feeCents;
    account.feeCarry = Math.max(0, rawFee - feeCents);
    const inventory = millisacks(units);
    const rawLoss = inventory * conditions.dailyLossRate + account.lossCarry;
    const loss = Math.min(inventory, Math.floor(rawLoss + 1e-9));
    account.lossMillisacks += loss;
    account.lossCarry = Math.max(0, rawLoss - loss);
    return (inventory - loss) / 1000;
  }
  function accrueDay(state) {
    if (!enabled(state)) return;
    for (const plot of state.plots) {
      if (!plot.harvested || plot.stocks <= 0 || state.day <= plot.harvestDay) continue;
      const account = plot.warehouse || (plot.warehouse = emptyAccount(plot.harvestDay));
      while (account.lastDay < state.day && plot.stocks > 0) {
        plot.stocks = accrueNight(account, plot.stocks);
        account.lastDay++;
      }
    }
  }
  function selectedQuantity(plot, requested) {
    const units = requested === undefined ? plot.stocks : requested;
    requireThat(
      Number.isFinite(units) &&
        units > 0 &&
        units <= plot.stocks &&
        Math.abs(millisacks(units) / 1000 - units) < 1e-9,
      "Informe uma quantidade positiva, com até três casas decimais, dentro do estoque disponível.",
    );
    return units;
  }
  function quote(state, plot, args, market) {
    requireThat(enabled(state), "Venda parcial indisponível nesta edição da campanha.");
    requireThat(plot.stocks > 0, "O talhão não tem estoque para vender.");
    requireThat(["spot", "term"].includes(args.terms), "Escolha venda à vista ou a prazo.");
    const units = selectedQuantity(plot, args.units);
    const term = args.terms === "term";
    const payDay = state.day + (term ? market.termDays : 0);
    requireThat(payDay <= 360, "O recebimento excederia o último dia desta campanha. Escolha venda à vista.");
    const price = term ? market.termPrice : market.price;
    const account = plot.warehouse;
    const openCents = account ? account.feeCents - account.retainedCents : 0;
    // No último lote o armazém retém todo o saldo, inclusive sobra de rateio.
    const retainedCents = units === plot.stocks ? openCents : Math.round((openCents * units) / plot.stocks);
    const freightCents = cents(units * market.freight);
    const grossCents = cents(units * price);
    return {
      saleId: "V" + (state.sales.length + 1),
      day: state.day,
      id: plot.id,
      crop: plot.crop,
      area: plot.area,
      units,
      price,
      gross: grossCents / 100,
      freight: freightCents / 100,
      storageFee: retainedCents / 100,
      net: (grossCents - freightCents - retainedCents) / 100,
      payDay,
      terms: args.terms,
    };
  }
  function sellLot(state, plot, args, market) {
    const sale = quote(state, plot, args, market);
    plot.stocks = (millisacks(plot.stocks) - millisacks(sale.units)) / 1000;
    if (plot.warehouse) plot.warehouse.retainedCents += cents(sale.storageFee);
    state.sales.push(sale);
    return sale;
  }
  function summary(state, fieldId) {
    const totals = { feesTotal: 0, feesOpen: 0, feesRetained: 0, lostUnits: 0, stockUnits: 0, soldUnits: 0 };
    const plots = fieldId ? state.plots.filter((p) => p.id === fieldId) : state.plots;
    totals.stockUnits = plots.reduce((sum, p) => sum + millisacks(p.stocks), 0) / 1000;
    totals.soldUnits =
      state.sales
        .filter((sale) => !fieldId || sale.id === fieldId)
        .reduce((sum, sale) => sum + millisacks(sale.units), 0) / 1000;
    if (!enabled(state)) return totals;
    for (const plot of plots) {
      const account = plot.warehouse;
      if (!account) continue;
      totals.feesTotal += account.feeCents;
      totals.feesRetained += account.retainedCents;
      totals.lostUnits += account.lossMillisacks;
    }
    totals.feesOpen = (totals.feesTotal - totals.feesRetained) / 100;
    totals.feesTotal /= 100;
    totals.feesRetained /= 100;
    totals.lostUnits /= 1000;
    return totals;
  }
  function holdingEstimate(state, plot, market, days) {
    requireThat(
      Number.isInteger(days) && days > 0 && state.day + days <= 360,
      "Prazo de guarda fora da campanha.",
    );
    const spot = quote(state, plot, { terms: "spot" }, market);
    const account = { ...(plot.warehouse || emptyAccount(plot.harvestDay)) };
    let stock = plot.stocks;
    for (let day = 0; day < days; day++) stock = accrueNight(account, stock);
    const additionalFee = (account.feeCents - (plot.warehouse?.feeCents || 0)) / 100;
    const open = (account.feeCents - account.retainedCents) / 100;
    // Menor cotação, em centavos inteiros por saca, cujo líquido empata com vender hoje.
    const targetGrossCents = cents(spot.net) + cents(open) + cents(stock * market.freight);
    let requiredPrice = null;
    if (stock > 0) {
      let priceCents = Math.max(0, Math.ceil((targetGrossCents - 0.5) / stock - 1e-9));
      if (cents((stock * priceCents) / 100) < targetGrossCents) priceCents++;
      requiredPrice = priceCents / 100;
    }
    return {
      stock,
      loss: (millisacks(plot.stocks) - millisacks(stock)) / 1000,
      additionalFee,
      requiredPrice,
      days,
    };
  }
  function unitsForCash(state, plot, market, shortfall) {
    const target = cents(shortfall);
    requireThat(Number.isFinite(shortfall) && target >= 0, "Falta de caixa inválida.");
    if (target === 0) return { units: 0, remainingGap: 0 };
    const all = quote(state, plot, { terms: "spot" }, market);
    if (cents(all.net) < target) {
      return { units: plot.stocks, remainingGap: (target - cents(all.net)) / 100 };
    }
    let low = 1,
      high = millisacks(plot.stocks);
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const net = quote(state, plot, { terms: "spot", units: mid / 1000 }, market).net;
      if (cents(net) >= target) high = mid;
      else low = mid + 1;
    }
    return { units: low / 1000, remainingGap: 0 };
  }
  function validate(state) {
    if (!enabled(state)) return;
    requireThat(
      state.sales.every((sale, index) => sale.saleId === "V" + (index + 1)),
      "Identificador de venda inválido.",
    );
    const creditSales = state.sales.filter((sale) => sale.terms === "term");
    requireThat(
      creditSales.length === state.receivables.length &&
        creditSales.every((sale) => {
          const matches = state.receivables.filter((r) => r.saleId === sale.saleId);
          return (
            matches.length === 1 &&
            matches[0].id === sale.saleId &&
            matches[0].plotId === sale.id &&
            matches[0].amount === sale.net &&
            matches[0].day === sale.payDay &&
            typeof matches[0].paid === "boolean"
          );
        }),
      "Recebível fora das condições da venda.",
    );
    for (const plot of state.plots) {
      const account = plot.warehouse;
      const sold = state.sales.filter((sale) => sale.id === plot.id);
      requireThat(
        sold.every(
          (sale) =>
            Number.isFinite(sale.units) &&
            sale.units > 0 &&
            Number.isFinite(sale.storageFee) &&
            sale.storageFee >= 0 &&
            cents(sale.net) === cents(sale.gross) - cents(sale.freight) - cents(sale.storageFee),
        ),
        "Liquidação de venda inconsistente.",
      );
      if (account) {
        requireThat(
          plot.harvested &&
            Number.isInteger(account.lastDay) &&
            account.lastDay >= plot.harvestDay &&
            account.lastDay <= state.day &&
            [account.feeCents, account.retainedCents, account.lossMillisacks].every(
              (v) => Number.isSafeInteger(v) && v >= 0,
            ) &&
            account.retainedCents <= account.feeCents &&
            [account.feeCarry, account.lossCarry].every((v) => Number.isFinite(v) && v >= 0 && v < 1),
          "Registro de armazenagem inválido.",
        );
      }
      requireThat(
        millisacks(plot.production) ===
          millisacks(plot.stocks) +
            sold.reduce((sum, sale) => sum + millisacks(sale.units), 0) +
            (account?.lossMillisacks || 0),
        "O estoque do talhão não concilia com o colhido, o vendido e a quebra física.",
      );
      requireThat(
        sold.reduce((sum, sale) => sum + cents(sale.storageFee), 0) === (account?.retainedCents || 0),
        "Tarifas de depósito sem conciliação.",
      );
    }
  }
  const api = {
    enabled,
    conditions,
    accrueDay,
    quote,
    sellLot,
    summary,
    holdingEstimate,
    unitsForCash,
    validate,
  };
  root.FarmMarket = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
