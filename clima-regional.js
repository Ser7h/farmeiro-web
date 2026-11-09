/* Reconstituição regional com dados diários anteriores à hora da decisão. */
(function (root) {
  "use strict";
  const data =
    typeof module !== "undefined" && module.exports ? require("./dados/clima/series.js") : root.PowerSeasons;
  const names = {
    didatico: "Clima didático",
    "power-2022": "Clima de 2022/23",
    "power-2023": "Clima de 2023/24",
  };
  const round = (v) => Math.round(v * 100) / 100;

  function forcing(id, day) {
    const season = data[id];
    // Ao meio-dia do dia 1 do jogo, o dia meteorológico inteiro de 1º de outubro já terminou.
    // A linha 0 do arquivo é 23/09; dia zero da campanha usa o registro de 30/09.
    const index = day + 7;
    if (!Number.isInteger(day) || !season || !season.rows[index])
      throw new Error("Dia fora da série regional.");
    const [rain, maxTemp, minTemp, meanTemp, meanRH] = season.rows[index];
    const sourceDate = new Date(Date.parse(season.start + "T00:00:00Z") + index * 86400000)
      .toISOString()
      .slice(0, 10);
    return {
      day,
      sourceDate,
      rain,
      maxTemp,
      minTemp,
      meanTemp,
      meanRH,
      vpd: round(0.6108 * Math.exp((17.27 * meanTemp) / (meanTemp + 237.3)) * (1 - meanRH / 100)),
      demand: Math.max(0, round(2.6 + (maxTemp - 23) * 0.23)),
    };
  }

  function describe(rows) {
    const last = rows.at(-1);
    const total = rows.reduce((a, w) => a + w.rain, 0);
    if (last.rain >= 25 || total >= 50)
      return { rank: 2, label: "Chuva acumulada", cause: "A entrada da máquina pode ficar comprometida." };
    if (last.maxTemp >= 33 && total < 5)
      return {
        rank: 2,
        label: "Calor com pouca chuva",
        cause: "Confira a fase das culturas e a água acessível às raízes.",
      };
    if (total >= 20)
      return { rank: 1, label: "Solo em observação", cause: "Confira se o talhão sustenta o próximo turno." };
    if (last.maxTemp >= 30 && total < 8)
      return { rank: 1, label: "Demanda de água", cause: "O calor recente aumenta a demanda da lavoura." };
    return { rank: 0, label: "Sem alerta regional", cause: "As condições podem mudar no próximo turno." };
  }

  function outlook(state) {
    const issued = state.day - (state.hour < 12 ? 1 : 0);
    const past = [3, 2, 1, 0].map((offset) => forcing(state.climate, issued - offset));
    const current = describe(past.slice(1)),
      previous = describe(past.slice(0, 3));
    const rain3 = round(past.slice(1).reduce((n, w) => n + w.rain, 0));
    const last = past.at(-1);
    return {
      level: ["baixo", "moderado", "alto"][current.rank],
      trend: current.rank > previous.rank ? "↑" : current.rank < previous.rank ? "↓" : "→",
      label: current.label,
      issued,
      rainChance: null,
      peakStatus: null,
      peakLabel: "",
      hoursToPeak: null,
      hoursSincePeak: null,
      detail: `Últimos três dias completos: ${rain3.toLocaleString("pt-BR")} mm de chuva. ${current.cause}`,
      reference: last.sourceDate,
      rain3,
    };
  }

  const api = { names, forcing, outlook, isHistorical: (id) => Object.hasOwn(data, id) };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FarmClimate = api;
})(globalThis);
