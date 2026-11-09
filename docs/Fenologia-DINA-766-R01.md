# Florescimento do DINA 766 em Cascavel

**Protocolo prévio ao cálculo da série térmica.** Pergunta: para o híbrido DINA 766, uma soma térmica calibrada apenas no plantio de 1994 prevê melhor o número de dias até a floração nos plantios de 1995, 1996 e 1997 que os calendários de 53 e 66 dias? O desfecho é a idade em dias corridos desde a semeadura até o critério do estudo, mais de 50% dos estigmas ou pendões abertos. A unidade de comparação é a safra do híbrido no local.

O ponto do estudo é 24°53′ S e 53°23′ W. Para todos os anos, a entrada meteorológica será a mínima e a máxima diária do ar a 2 m do NASA POWER, em horário solar local. O dia 1 usa as temperaturas da data civil da semeadura. Um evento após n dias completos é datado como semeadura mais n dias. O incremento diário, em °C·dia, será a média das duas temperaturas limitadas individualmente a [10, 30] °C, menos 10 °C. A soma usará inteiros em milésimos de °C·dia.

O limiar será a soma dos primeiros 66 dias da safra de 1994. A regra prevê a idade como o primeiro dia em que o acumulado alcançar esse limiar. As três previsões serão produzidas a partir da data de semeadura e da temperatura de cada safra. Só depois se calcularão as diferenças para os desfechos observados. O calendário de 53 dias pertence ao milho normal da campanha e o calendário de 66 dias toma como referência o primeiro ano do híbrido.

O indicador será o erro absoluto médio (EAM) exclusivamente nas três safras retidas. O critério adotado para considerar um perfil experimental opcional no jogo será EAM ≤ 3 dias, equivalente ao calendário de 66 dias no conjunto retido, sem alterar o limiar após inspecionar os erros. Em caso contrário o resultado ficará restrito ao laboratório retrospectivo. Os desfechos históricos já eram públicos e foram transcritos na primeira edição do jogo. A separação aqui é computacional e temporal.

## Resultado do ensaio retrospectivo

A safra de 1994 atingiu **856,810 °C·dia** em 66 dias pela reanálise. A tabela do artigo informa **863,7 °C·dia** para a mesma floração usando os dados da estação do estudo. A discrepância corresponde a 6,890 °C·dia. Os três anos retidos foram processados com 856,810 °C·dia como limiar fixo.

| Semeadura | Floração observada | Floração pela soma térmica | Idade observada, dias | Idade prevista, dias | Erro térmico em dias | GD de reanálise na idade observada, °C·dia |
|---|---|---|---:|---:|---:|---:|
| 19/10/1995 | 19/12/1995 | 29/12/1995 | 61 | 71 | +10 | 721,475 |
| 08/10/1996 | 10/12/1996 | 20/12/1996 | 63 | 73 | +10 | 745,075 |
| 13/10/1997 | 17/12/1997 | 21/12/1997 | 65 | 69 | +4 | 813,305 |

As datas observadas da tabela acima foram calculadas somando a idade informada pelo estudo à data de semeadura. O erro é previsão menos observação. As somas calculadas na idade observada dos anos retidos servem à inspeção posterior. A previsão de cada ano foi calculada sem esses totais.

| Método | Diferenças em 1995, 1996 e 1997, dias | EAM nas três safras, dias |
|---|---|---:|
| Calendário genérico do milho normal, 53 dias | −8, −10, −12 | 10 |
| Soma térmica calibrada em 1994 | +10, +10, +4 | 8 |
| Calendário de 66 dias do primeiro ciclo | +5, +3, +1 | 3 |

**Decisão de integração.** O calendário fixo de 66 dias teve o menor erro no conjunto retido. O modelo térmico atrasou a floração nos três testes e excedeu o critério predefinido. A soma térmica permanece no laboratório retrospectivo. O resultado também não autoriza aplicar 66 dias a todos os híbridos e locais.

**Limites.** O artigo trata de um híbrido sob plantio direto e utiliza dados meteorológicos da estação IAPAR/COODETEC. A reanálise diária POWER representa a região e tem horários e suporte espacial próprios. Diferenças entre a temperatura do talhão, a estação e a reanálise, a escolha da janela de integração e a variação biológica podem influenciar o erro. O estudo define floração por mais de 50% dos estigmas ou pendões abertos. Em sua tabela, “colheita” foi definida pela maturidade fisiológica de mais de 50% das plantas. O presente confronto examinou exclusivamente a floração. Há um ciclo de ajuste, três safras de teste no mesmo local e nenhuma validação de água, produção ou cultivares atuais. [Silva et al., métodos e tabela 1](https://ojs.ceres.ufv.br/ceres/article/download/3235/1122/4851).

## Origem e reprodução

As idades estão transcritas em [ciclos-cascavel.csv](ciclos-cascavel.csv). O arquivo [power-cascavel-dina.json](../dados/fenologia/power-cascavel-dina.json) preserva a resposta original de 44.199 bytes, com 1.295 dias e duas variáveis de temperatura a 2 m em °C. O serviço informa API v2.10.3, fontes MERRA2 e POWER, tempo LST e ponto devolvido de longitude −53,383°, latitude −24,883° e elevação 612,33 m. O artigo informa 682 m para o local do estudo. A janela cobre os quatro ciclos, de 14/10/1994 a 30/04/1998. O arquivo não contém lacunas no período. [Consulta original à NASA POWER](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MIN%2CT2M_MAX&community=AG&latitude=-24.883333&longitude=-53.383333&start=19941014&end=19980430&format=JSON&time-standard=LST) e [documentação do serviço diário](https://power.larc.nasa.gov/docs/services/api/temporal/daily/).

SHA-256 do JSON recuperado: `20fcaa78ce0ea7d609c9bc2a753354e91c96584b46eb2ecb656cae3cfd857dbe`. Para conferir o arquivo local, execute `python scripts/preparar-dina.py`. Para reproduzir as previsões e os três erros, execute `node tests/fenologia-termica.cjs`. A opção explícita `--baixar` do script Python atualiza o arquivo pela API oficial.
