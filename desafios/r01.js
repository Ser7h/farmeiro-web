"use strict";
(function (root) {
  const node = typeof module !== "undefined" && module.exports;
  const F = node ? require("../engine.js") : root.Farm;
  const descriptions = {
    colheita: {
      name: "Dirigir a colheitadeira",
      location: "Alto da Santa Helena",
      text: "A soja amadureceu. Baixe a plataforma e comece a colher. Pelo rádio, mande a carreta esperar na cabeceira norte ou sul. Quando o graneleiro encher, dirija até ela e pare para descarregar.",
      icon: "tractor",
    },
    passagem: {
      name: "A máquina entra?",
      location: "Grota da Boa Vista",
      text: "O talhão recebeu chuva e a máquina está reservada. Celso precisa saber se pode trabalhar quando o acesso passar de interditado a marginal.",
      icon: "tractor",
    },
    deposito: {
      name: "Quanto vender hoje?",
      location: "Armazém da Santa Helena",
      text: "A soja está colhida e o comprador aceita uma remessa parcial. Examine o próximo vencimento e o que a guarda exige do preço de venda.",
      icon: "wallet",
    },
  };
  function reference(key) {
    const pass = key === "passagem";
    if (!Object.hasOwn(descriptions, key)) throw Error("Desafio desconhecido.");
    let state = F.create(17, F.VERSION, pass ? "power-2023" : "power-2022");
    const go = (action, args = {}) => {
      state = F.act(state, action, args);
    };
    const plotId = pass ? "grota" : "alto";
    go("sign", { id: pass ? "vista" : "helena", mode: pass ? "lease" : "buy" });
    go("plan", {
      id: plotId,
      crop: "soja",
      area: pass ? 11 : 5,
      cycle: "normal",
      sowDay: 8,
      seedRate: 300,
      fertilizer: 300,
      operation: "direta",
    });
    go("start");
    let point = -1;
    while (state.stage !== "accounts") {
      const plot = state.plots.find((p) => p.id === plotId);
      if (pass && point < 0 && plot.lastFieldwork?.status === "interditado") {
        point = state.checkpoints.length;
        go("fieldPolicy", { id: plotId, policy: "press" });
      }
      if (plot.phase === "Maduro" && !plot.harvested) {
        if (key === "colheita") return F.challenge(state);
        go("harvest", { id: plotId });
        if (!pass) point = state.checkpoints.length;
        go("sell", { id: plotId, terms: "spot" });
      }
      if (state.stage !== "accounts") go("advance", { days: 180 });
    }
    while (state.day < 180) go("advance", { days: 180 - state.day });
    go("close");
    if (point < 0) throw Error("O cenário não alcançou sua decisão de referência.");
    return F.challenge(state, point);
  }
  const cache = new Map();
  function code(key) {
    if (!cache.has(key)) cache.set(key, reference(key));
    return cache.get(key);
  }
  const api = { descriptions, code };
  if (node) module.exports = api;
  else root.FarmStories = api;
})(globalThis);
