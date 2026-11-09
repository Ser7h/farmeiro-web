# Clima regional usado na campanha

**Farmeiro E01 R01 · Cascavel, Paraná · recortes obtidos em 7 de novembro de 2026**

A campanha mantém a economia fictícia de 2026/27. O jogador escolhe a sequência regional de 2022/23 ou 2023/24 antes de contratar a terra. Os dois recortes vêm do [serviço diário da NASA POWER](https://power.larc.nasa.gov/docs/services/api/temporal/daily/), no ponto solicitado de latitude −24,96° e longitude −53,46°. A resposta identifica as fontes MERRA2 e POWER, API v2.10.3 e horário solar local (LST). São dados meteorológicos regionais de reanálise. Uma chuva isolada no talhão pode diferir substancialmente da estimativa regional. Não são leituras de pluviômetro da fazenda nem previsões emitidas naquelas datas.

| Recorte | Datas incluídas | Registros | Chuva em 180 dias, mm | Maior chuva diária nesses 180 dias, mm | Dias com pelo menos 25 mm |
|---|---|---:|---:|---:|---:|
| [2022/23: consulta original](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR%2CT2M_MAX%2CT2M_MIN%2CT2M%2CRH2M&community=AG&longitude=-53.46&latitude=-24.96&start=20220923&end=20230930&format=JSON&time-standard=LST) | 23/09/2022 a 30/09/2023 | 373 | 1.061,27 | 65,76 | 13 |
| [2023/24: consulta original](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR%2CT2M_MAX%2CT2M_MIN%2CT2M%2CRH2M&community=AG&longitude=-53.46&latitude=-24.96&start=20230923&end=20240930&format=JSON&time-standard=LST) | 23/09/2023 a 30/09/2024 | 374 | 923,77 | 59,30 | 7 |

Os 180 dias da tabela começam em **1º de outubro do ano de referência**, inclusive. A soma usa a precipitação diária corrigida (PRECTOTCORR, mm/dia); também foram conservadas temperatura máxima, mínima e média do ar a 2 m (T2M_MAX, T2M_MIN, T2M, °C) e umidade relativa média a 2 m (RH2M, %). O ponto devolvido informa elevação de 523,8 m. As propriedades e seus solos são fictícios.

## O que o jogador pode saber

Na abertura, 1º de outubro de 2026 ao meio-dia (dia 0), o registro regional completo mais recente é o de 30 de setembro do ano de referência. No dia 1 do jogo, ao meio-dia, fica disponível o de 1º de outubro. Antes do meio-dia permanece a emissão anterior. A associação avança por dias completos, inclusive em fevereiro bissexto na série de 2023/24. O boletim mostra a data da fonte e os últimos sete dias; o indicador considera os três dias completos mais recentes e compara sua classe de risco à da emissão anterior.

Os critérios de alerta são **regras do jogo**. Por exemplo, 25 mm no último dia ou 50 mm acumulados em três dias ativam alerta de chuva. O aviso orienta a vistoria. A decisão de passar com a máquina considera também o terreno e a umidade superficial simulada. A meteorologia futura só é incorporada ao avançar o calendário. O cenário histórico não atribui probabilidade de chuva ou hora de um pico com base no que depois aconteceu. O contador de 36 h pertence à missão didática, com sequência meteorológica fictícia.

O déficit de pressão de vapor exibido no histórico é uma aproximação com médias diárias: DPV ≈ 0,6108 × exp[17,27 × T/(T + 237,3)] × (1 − UR/100), em kPa. Ele não equivale à exposição horária da cultura. A demanda de água do motor é uma aproximação de cenário, max(0; 2,6 + 0,23 × (Tmáx − 23)) mm/dia, e não constitui evapotranspiração de referência calculada por método completo. Água nas camadas, infiltração, raízes, capacidade de tráfego e colheita são calculadas pelo jogo; a NASA não fornece essas observações para os talhões.

## Reprodução

Os JSON originais estão em [2022/23](../dados/clima/power-2022.json) e [2023/24](../dados/clima/power-2023.json). Rodar `python scripts/preparar-clima.py` confere os dias, unidades lógicas, limites físicos e valores ausentes e gera a série local, sem necessidade de rede. A opção `--baixar` volta à fonte e substitui o arquivo somente depois de conferir seu conteúdo. Rodar `node tests/clima-regional.test.cjs` compara as 747 linhas com os JSON originais e impede que a emissão de um boletim leia uma linha futura nos instantes testados. A reprodução do jogo utiliza a cópia distribuída.

| Arquivo original | SHA-256 dos bytes |
|---|---|
| power-2022.json | `506c1681b79adecb4404974f6548d8c27274269fa7e848587fba1000476c7a0d` |
| power-2023.json | `9b079a2b39b0989cac78af4c1ab8b8b026a8100dc022c73c5e3ede2126edf97e` |
