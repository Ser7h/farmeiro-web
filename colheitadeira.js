"use strict";

// A área econômica de cada passada vem do talhão no motor. A cabine representa
// o trajeto em escala comprimida, para que possa ser dirigido na sessão da safra.
(function () {
  const comprimento = 96;
  const larguraFaixa = 7;
  const trechosPorFaixa = 32;
  const avancoPlataforma = 4.3;
  const tempoOperacional = 6;
  const metrosCabeceira = 6;
  const lados = { norte: "Norte", sul: "Sul" };
  const clamp = (valor, min, max) => Math.min(max, Math.max(min, valor));
  const formatar = (valor, casas = 1) => Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: casas });
  let fecharAtual;

  function painel() {
    const dialog = document.createElement("dialog");
    dialog.className = "cabine-farmeiro";
    dialog.setAttribute("aria-labelledby", "cab-titulo");
    dialog.innerHTML = `
      <div class="cab-estrutura">
        <div class="cab-topo">
          <div class="cab-identidade"><small>Colheitadeira</small><h2 id="cab-titulo"></h2></div>
          <button type="button" class="cab-saida" data-op="sair">Sair da cabine</button>
        </div>
        <div class="cab-vista">
          <canvas class="cab-campo" aria-label="Vista pela cabine da colheitadeira"></canvas>
          <div class="cab-infos"><strong data-led="tarefa"></strong><span class="cab-aviso" data-led="aviso" role="status"></span></div>
          <div class="cab-guia" aria-label="Mapa do talhão, colheitadeira e carreta"><span>Mapa do talhão</span><canvas aria-hidden="true"></canvas><span data-led="posicao"></span></div>
        </div>
        <div class="cab-painel">
          <div class="cab-instrumentos">
            <div><small>Velocidade</small><b data-led="velocidade">0 km/h</b></div>
            <div><small>Área colhida</small><b data-led="area"></b></div>
            <div class="cab-graneleiro"><small>Graneleiro</small><b data-led="graneleiro"></b><progress data-led="nivel" aria-label="Ocupação do graneleiro"></progress></div>
            <div><small>Estoque entregue</small><b data-led="estoque"></b></div>
          </div>
          <div class="cab-acoes">
            <button type="button" data-op="plataforma" aria-pressed="false">Baixar plataforma</button>
            <button type="button" data-op="alinhar">Alinhar na cabeceira</button>
          </div>
          <div class="cab-pedais" aria-label="Direção e pedais">
            <button type="button" data-move="esq" aria-label="Virar à esquerda">←</button>
            <button type="button" data-move="dir" aria-label="Virar à direita">→</button>
            <button type="button" data-move="freio">Freio / ré</button>
            <button type="button" data-move="gas">Acelerar</button>
          </div>
          <div class="cab-radio" role="group" aria-label="Rádio da carreta">
            <div class="cab-radio-info"><small>Rádio da carreta</small><b data-led="carreta" aria-live="off"></b></div>
            <div class="cab-chamada">
              <button type="button" data-op="chamar-norte">Chamar no norte</button>
              <button type="button" data-op="chamar-sul">Chamar no sul</button>
              <button type="button" data-op="descarregar">Descarregar</button>
            </div>
          </div>
          <div class="cab-teclas">W/S ou ↑/↓ aceleram e freiam · A/D ou ←/→ dirigem · Espaço move a plataforma · 1 chama no norte · 2 chama no sul · U descarrega.</div>
        </div>
      </div>`;
    document.body.append(dialog);
    return dialog;
  }

  function abrir(opcoes) {
    if (fecharAtual) fecharAtual();
    const n = Number(opcoes.faixas) || 8;
    const centro = (i) => (i - (n - 1) / 2) * larguraFaixa;
    const lateral = n * larguraFaixa / 2;
    let estado = opcoes.status();
    const passadas = Array.from({ length: n }, () => new Uint8Array(trechosPorFaixa));
    const contagens = new Array(n).fill(0);
    const maquina = { x: 0, z: -7, rumo: 0, velocidade: 0, plataforma: false, fase: 0, volante: 0, descargaAte: 0, ultimaCarga: 0 };
    const dialog = painel();
    const $ = (selector) => dialog.querySelector(selector);
    const leds = Object.fromEntries([...dialog.querySelectorAll("[data-led]")].map((el) => [el.dataset.led, el]));
    const botoes = Object.fromEntries([...dialog.querySelectorAll("[data-op]")].map((el) => [el.dataset.op, el]));
    $("#cab-titulo").textContent = [opcoes.nome, opcoes.cultura].filter(Boolean).join(" · ") || "Talhão";
    const canvas = $(".cab-campo");
    const mapa = $(".cab-guia canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    const mapaCtx = mapa.getContext("2d");
    const antes = document.activeElement;
    const eventos = new AbortController();
    const listen = (el, event, func) => el.addEventListener(event, func, { signal: eventos.signal });
    const teclas = new Set();
    const toques = new Map();
    let alvo = 0, encerrada = false, ultimaPosicaoSalva = 0;
    let quadro, anterior = 0, ultimoPainel = 0, largura = 0, altura = 0;
    const render = criarVista(ctx, n, passadas, opcoes.cultura);
    const chavePosicao = "farmeiro.posicao-cabine." + (opcoes.chave || opcoes.nome);
    const ladoAtual = () => maquina.z <= metrosCabeceira ? "sul" : maquina.z >= comprimento - metrosCabeceira ? "norte" : null;
    const cheio = () => estado.loadSc >= estado.capacitySc - 0.0001;
    const completo = () => estado.encerrado || contagens.every((valor) => valor === trechosPorFaixa);
    function sincronizar(novoEstado) {
      estado = novoEstado;
      for (let i = 0; i < n; i++) {
        passadas[i].set(estado.cells[i]);
        contagens[i] = passadas[i].reduce((total, celula) => total + celula, 0);
      }
    }
    sincronizar(estado);
    const assinaturaPosicao = () => [estado.cutAreaHa, estado.loadSc, estado.trailer?.readyAt].join("/");
    function guardarPosicao() {
      if (!estado.cutAreaHa && !estado.loadSc && !estado.trailer) return;
      const { x, z, rumo } = maquina;
      try { localStorage.setItem(chavePosicao, JSON.stringify({ x, z, rumo, alvo, safra: assinaturaPosicao() })); } catch {}
    }
    function restaurarPosicao() {
      if (!estado.cutAreaHa && !estado.loadSc && !estado.trailer) return false;
      try {
        const p = JSON.parse(localStorage.getItem(chavePosicao));
        if (!p || p.safra !== assinaturaPosicao() || ![p.x, p.z, p.rumo].every(Number.isFinite) || !Number.isInteger(p.alvo) || p.alvo < 0 || p.alvo >= n) return false;
        maquina.x = clamp(p.x, -lateral - 13, lateral + 13);
        maquina.z = clamp(p.z, -17, comprimento + 17);
        maquina.rumo = p.rumo;
        alvo = p.alvo;
        return true;
      } catch { return false; }
    }
    function mensagem(texto) {
      leds.aviso.textContent = texto;
    }
    function limparPedais() {
      teclas.clear();
      toques.clear();
      for (const el of dialog.querySelectorAll("[data-move]")) el.removeAttribute("data-acionado");
      maquina.velocidade = 0;
      anterior = 0;
    }
    function alinhar(inicial = false) {
      const lado = ladoAtual();
      if (!lado) return;
      const proxima = contagens.findIndex((contagem) => contagem < trechosPorFaixa);
      if (!completo() && !cheio() && proxima !== -1) alvo = proxima;
      limparPedais();
      if (!completo() && !cheio()) maquina.x = centro(alvo);
      maquina.z = lado === "sul" ? -avancoPlataforma - 2.5 : comprimento + avancoPlataforma + 2.5;
      maquina.rumo = lado === "sul" ? 0 : Math.PI;
      maquina.plataforma = false;
      maquina.volante = 0;
      mensagem(cheio() || completo() ? "Máquina virada para a outra cabeceira." : inicial ? "Baixe a plataforma, acelere e chame a carreta pelo rádio." : "Alinhada na faixa " + (alvo + 1) + ". Baixe a plataforma para colher.");
      if (!inicial) guardarPosicao();
    }
    function atualizarPainel() {
      const completou = completo();
      const lado = ladoAtual();
      const xRumo = Math.sin(maquina.rumo), zRumo = Math.cos(maquina.rumo);
      const rumo = Math.abs(xRumo) > Math.abs(zRumo) ? (xRumo > 0 ? "leste" : "oeste") : (zRumo >= 0 ? "norte" : "sul");
      const destino = estado.trailer?.side;
      const segundos = destino ? Math.max(0, Math.ceil((estado.trailer.readyAt - Date.now()) / 1000)) : 0;
      const podeDescarregar = destino && segundos === 0 && lado === destino && Math.abs(maquina.velocidade) * 3.6 <= 1 && estado.loadSc > 0;
      const percentual = Math.round(100 * contagens[alvo] / trechosPorFaixa);
      leds.tarefa.textContent = completou ? (estado.loadSc > 0 ? "Talhão cortado · última descarga" : "Colheita concluída") : cheio() ? "Graneleiro cheio · corte interrompido" : "Faixa " + (alvo + 1) + " de " + n + " · " + percentual + "% percorridos";
      leds.velocidade.textContent = formatar(Math.abs(maquina.velocidade) * 3.6, 0) + " km/h" + (maquina.velocidade < -0.02 ? " · ré" : "");
      leds.area.textContent = formatar(estado.cutAreaHa, 2) + " / " + formatar(opcoes.areaHa, 2) + " ha";
      leds.estoque.textContent = formatar(estado.estoqueSc, 2) + " sc";
      leds.graneleiro.textContent = formatar(estado.loadSc, 2) + " / " + formatar(estado.capacitySc, 2) + " sc";
      leds.nivel.max = estado.capacitySc;
      leds.nivel.value = estado.loadSc;
      leds.nivel.classList.toggle("cab-cheio", cheio());
      leds.posicao.textContent = (lado ? "Cabeceira " + lado : "Dentro do talhão") + " · rumo " + rumo;
      leds.posicao.dataset.lado = lado || "campo";
      leds.posicao.dataset.rumo = rumo;
      leds.carreta.textContent = !destino ? "Escolha a cabeceira" : segundos ? "A caminho · " + lados[destino] + " · " + segundos + " s" : "Aguardando · " + lados[destino];
      for (const ponta of Object.keys(lados)) {
        const botao = botoes["chamar-" + ponta];
        botao.disabled = Boolean(completou && !estado.loadSc);
        botao.setAttribute("aria-pressed", String(destino === ponta));
        botao.classList.toggle("cab-destino", destino === ponta);
      }
      botoes.descarregar.disabled = !podeDescarregar;
      botoes.descarregar.title = !estado.loadSc ? "Graneleiro vazio" : !destino ? "Chame a carreta em uma cabeceira" : segundos ? "Aguarde a chegada da carreta" : lado !== destino ? "Vá até a cabeceira " + destino : "Pare junto à carreta";
      botoes.descarregar.classList.toggle("cab-comando-ativo", Boolean(podeDescarregar));
      botoes.plataforma.textContent = maquina.plataforma ? "Erguer plataforma" : "Baixar plataforma";
      botoes.plataforma.classList.toggle("cab-comando-ativo", maquina.plataforma);
      botoes.plataforma.setAttribute("aria-pressed", String(maquina.plataforma));
      botoes.plataforma.disabled = completou || cheio();
      botoes.alinhar.disabled = !lado;
      botoes.alinhar.textContent = cheio() || completou ? "Virar na cabeceira" : "Alinhar na cabeceira";
      desenharMapa(mapaCtx, maquina, passadas, alvo, estado.trailer);
    }
    function plataforma() {
      if (completo() || cheio()) return;
      maquina.plataforma = !maquina.plataforma;
      mensagem(maquina.plataforma ? "Plataforma em corte. Mantenha o centro da faixa e siga até a cabeceira." : "Plataforma erguida. A máquina pode se deslocar sem cortar.");
      atualizarPainel();
    }
    const posicaoFrente = () => ({ x: maquina.x + avancoPlataforma * Math.sin(maquina.rumo), z: maquina.z + avancoPlataforma * Math.cos(maquina.rumo) });
    function colher(frenteAntes, frenteAgora) {
      if (!maquina.plataforma || maquina.velocidade <= 0 || completo() || cheio() || Math.abs(Math.cos(maquina.rumo)) < 0.85) return;
      const linha = Math.floor((frenteAgora.x + lateral) / larguraFaixa);
      if (linha < 0 || linha >= n || contagens[linha] === trechosPorFaixa || Math.abs(frenteAgora.x - centro(linha)) > larguraFaixa * 0.38) return;
      const de = Math.min(frenteAntes.z, frenteAgora.z), ate = Math.max(frenteAntes.z, frenteAgora.z);
      const tamanho = comprimento / trechosPorFaixa;
      const primeiro = Math.max(0, Math.ceil(de / tamanho - 0.5));
      const ultimo = Math.min(trechosPorFaixa - 1, Math.floor(ate / tamanho - 0.5));
      const norte = frenteAgora.z >= frenteAntes.z;
      for (let passo = 0; passo <= ultimo - primeiro; passo++) {
        const i = norte ? primeiro + passo : ultimo - passo;
        if (passadas[linha][i]) continue;
        try { sincronizar(opcoes.onCortar(linha, i)); } catch (erro) {
          maquina.plataforma = false;
          limparPedais();
          mensagem(erro.message || "O corte parou. Confira a operação antes de baixar a plataforma.");
          break;
        }
        alvo = linha;
        guardarPosicao();
        if (cheio() || contagens[linha] === trechosPorFaixa || completo()) {
          maquina.plataforma = false;
          mensagem(completo() ? "Última passada. Leve o restante do graneleiro até a carreta." : cheio() ? "Plataforma erguida. Chame a carreta, siga até a cabeceira escolhida, pare e descarregue." : "Faixa colhida. Alinhe na cabeceira para a próxima passada.");
          break;
        }
        if (contagens[linha] === 1) mensagem("Grãos entrando no graneleiro. Escolha no rádio a cabeceira de descarga.");
      }
    }
    function chamar(lado) {
      if (completo() && !estado.loadSc) return;
      try {
        sincronizar(opcoes.onChamar(lado));
        guardarPosicao();
        mensagem("Cabeceira " + lado + " confirmada pelo rádio. A carreta se alinha à sua faixa nessa ponta.");
      } catch (erro) { mensagem(erro.message); }
      atualizarPainel();
    }
    function descarregar() {
      if (botoes.descarregar.disabled) return;
      const carga = estado.loadSc;
      try {
        sincronizar(opcoes.onDescarregar(ladoAtual(), Math.abs(maquina.velocidade) * 3.6));
        maquina.ultimaCarga = carga;
        maquina.descargaAte = performance.now() + 2100;
        limparPedais();
        maquina.plataforma = false;
        guardarPosicao();
        mensagem(formatar(carga, 3) + " sc entregues. " + (completo() ? "Colheita e descarga concluídas." : "Alinhe na cabeceira e baixe a plataforma para retomar o corte."));
      } catch (erro) { mensagem(erro.message); }
      atualizarPainel();
    }
    const codigo = { ArrowUp: "gas", KeyW: "gas", ArrowDown: "freio", KeyS: "freio", ArrowLeft: "esq", KeyA: "esq", ArrowRight: "dir", KeyD: "dir" };
    function simular(segundos) {
      const ativo = (acao) => [...teclas].some((t) => codigo[t] === acao) || [...toques.values()].includes(acao);
      const gas = ativo("gas"), freio = ativo("freio");
      const direcao = Number(ativo("dir")) - Number(ativo("esq"));
      if (gas) maquina.velocidade = Math.min(2.85, maquina.velocidade + segundos * 2.4);
      else if (freio) maquina.velocidade = Math.max(-1.0, maquina.velocidade - segundos * (maquina.velocidade > 0 ? 5 : 1.5));
      else maquina.velocidade -= Math.sign(maquina.velocidade) * Math.min(Math.abs(maquina.velocidade), segundos * 2.8);
      maquina.volante += (direcao - maquina.volante) * Math.min(1, segundos * 7);
      const frenteAntes = posicaoFrente();
      maquina.rumo += maquina.volante * maquina.velocidade * segundos * 0.47;
      const distancia = maquina.velocidade * tempoOperacional * segundos;
      maquina.x = clamp(maquina.x + Math.sin(maquina.rumo) * distancia, -lateral - 13, lateral + 13);
      maquina.z = clamp(maquina.z + Math.cos(maquina.rumo) * distancia, -17, comprimento + 17);
      maquina.fase += segundos * (maquina.plataforma ? 5 : 0);
      colher(frenteAntes, posicaoFrente());
    }
    function dimensionar() {
      const caixa = canvas.getBoundingClientRect();
      largura = Math.max(caixa.width, 1);
      altura = Math.max(caixa.height, 1);
      const dpr = Math.min(devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mapa.width = 256; mapa.height = 136;
      atualizarPainel();
    }
    function animar(agora) {
      if (encerrada) return;
      const parada = !teclas.size && !toques.size && !maquina.plataforma && agora >= maquina.descargaAte && Math.abs(maquina.velocidade) < .01;
      if (anterior && agora - anterior < (parada ? 150 : 22)) { quadro = requestAnimationFrame(animar); return; }
      const dt = anterior ? Math.min((agora - anterior) / 1000, 0.12) : 0;
      anterior = agora;
      simular(dt);
      render(maquina, largura, altura, alvo, estado.trailer);
      if (!parada && agora - ultimaPosicaoSalva > 900) { guardarPosicao(); ultimaPosicaoSalva = agora; }
      if (agora - ultimoPainel > 140) { atualizarPainel(); ultimoPainel = agora; }
      quadro = requestAnimationFrame(animar);
    }
    function fechar() {
      if (encerrada) return;
      guardarPosicao();
      encerrada = true;
      cancelAnimationFrame(quadro);
      eventos.abort();
      resize.disconnect();
      dialog.close();
      dialog.remove();
      fecharAtual = undefined;
      if (antes?.isConnected) antes.focus({ preventScroll: true });
      opcoes.onSair?.();
    }
    listen(botoes.sair, "click", fechar);
    function comando(botao, executar) {
      listen(botao, "click", (e) => {
        executar();
        if (e.detail > 0) dialog.focus({ preventScroll: true });
      });
    }
    comando(botoes.alinhar, () => alinhar());
    comando(botoes.plataforma, plataforma);
    for (const lado of Object.keys(lados)) comando(botoes["chamar-" + lado], () => chamar(lado));
    comando(botoes.descarregar, descarregar);
    listen(dialog, "cancel", (e) => { e.preventDefault(); fechar(); });
    listen(window, "keydown", (e) => {
      if (!dialog.open) return;
      if (codigo[e.code]) { e.preventDefault(); e.stopPropagation(); teclas.add(e.code); dialog.focus({ preventScroll: true }); }
      if (e.code === "Space" && !e.target.closest("button")) {
        e.preventDefault(); e.stopPropagation();
        if (!e.repeat) plataforma();
      }
      const comandos = { Digit1: () => chamar("norte"), Digit2: () => chamar("sul"), KeyU: descarregar };
      if (comandos[e.code] && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault(); e.stopPropagation();
        if (!e.repeat) comandos[e.code]();
      }
    });
    listen(window, "keyup", (e) => { if (dialog.open && codigo[e.code]) { e.preventDefault(); teclas.delete(e.code); } });
    for (const el of dialog.querySelectorAll("[data-move]")) {
      listen(el, "pointerdown", (e) => {
        e.preventDefault(); el.setPointerCapture(e.pointerId); toques.set(e.pointerId, el.dataset.move); el.dataset.acionado = "sim";
      });
      const release = (e) => { toques.delete(e.pointerId); delete el.dataset.acionado; };
      listen(el, "pointerup", release); listen(el, "pointercancel", release); listen(el, "lostpointercapture", release);
    }
    listen(window, "blur", limparPedais);
    listen(document, "visibilitychange", () => { if (document.hidden) { limparPedais(); guardarPosicao(); } });
    listen(window, "pagehide", guardarPosicao);
    dialog.tabIndex = -1;
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    if (restaurarPosicao()) {
      mensagem(cheio() ? "Graneleiro cheio. Dirija até a cabeceira combinada e pare para descarregar." : completo() && estado.loadSc > 0 ? "Última carga a bordo. Chame a carreta para descarregar." : "Operação retomada. Confira o graneleiro e o rádio.");
    } else {
      alinhar(true);
    }
    const resize = new ResizeObserver(dimensionar);
    resize.observe(canvas);
    dimensionar();
    fecharAtual = fechar;
    quadro = requestAnimationFrame(animar);
    return { fechar };
  }

  function posicaoCarreta(carreta, maquinaX, metade) {
    if (!carreta) return null;
    const falta = clamp((carreta.readyAt - Date.now()) / 5000, 0, 1);
    const esperaX = clamp(maquinaX, -metade, metade) + 3;
    return { x: esperaX + (metade + 12 - esperaX) * falta, z: carreta.side === "sul" ? -9 : comprimento + 9 };
  }
  function desenharMapa(c, m, passadas, alvo, carreta) {
    const w = c.canvas.width, h = c.canvas.height;
    const left = 21, top = 15, largura = w - 2 * left, altura = h - top * 2;
    const fw = largura / passadas.length, fh = altura / trechosPorFaixa;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#e8efda"; c.font = "bold 15px sans-serif"; c.fillText("N", 1, 19); c.fillText("S", 1, h - 2);
    c.fillStyle = "#a08d5e"; c.fillRect(left, top, largura, altura);
    for (let i = 0; i < passadas.length; i++) {
      c.fillStyle = "#d9b768";
      c.fillRect(left + fw * i + 1, top, fw - 2, altura);
      c.fillStyle = "#806744";
      for (let j = 0; j < trechosPorFaixa; j++) {
        if (passadas[i][j]) c.fillRect(left + fw * i + 1, top + altura - (j + 1) * fh, fw - 2, fh + 0.4);
      }
    }
    c.strokeStyle = "#eef9c8"; c.lineWidth = 2;
    c.strokeRect(left + alvo * fw + 1, top, fw - 2, altura);
    const carro = posicaoCarreta(carreta, m.x, passadas.length * larguraFaixa / 2);
    if (carro) {
      const cx = clamp(w/2 + carro.x * fw / larguraFaixa, left, w - 15), cy = carreta.side === "sul" ? h - 8 : 7;
      c.fillStyle = "#edaa67"; c.fillRect(cx - 10, cy - 5, 15, 9);
      c.fillStyle = "#acc682"; c.fillRect(cx + 6, cy - 3, 6, 7);
      c.fillStyle = "#141f1a"; c.fillRect(cx - 7, cy + 3, 4, 3); c.fillRect(cx + 7, cy + 3, 4, 3);
    }
    const x = clamp(w / 2 + m.x * fw / larguraFaixa, 5, w - 5);
    const y = clamp(top + altura * (1 - m.z / comprimento), 5, h - 5);
    c.save(); c.translate(x, y); c.rotate(m.rumo); c.beginPath();
    c.moveTo(0, -10); c.lineTo(7, 6); c.lineTo(-7, 6); c.closePath();
    c.fillStyle = "#fff"; c.fill(); c.strokeStyle = "#182d29"; c.stroke(); c.restore();
  }

  function poligono(c, pontos, cor) {
    c.beginPath();
    pontos.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.fillStyle = cor; c.fill();
  }
  function linha(c, x, y, x2, y2, cor, grossura) {
    c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.strokeStyle = cor; c.lineWidth = grossura; c.stroke();
  }
  function elipse(c, x, y, rx, ry, cor) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = cor; c.fill();
  }
  function ruido(n) {
    const k = Math.sin(n * 127.1 + 91.7) * 43758.5453;
    return k - Math.floor(k);
  }
  function tela(w, h) {
    const el = document.createElement("canvas"); el.width = w; el.height = h;
    return el;
  }
  function arvore(versao) {
    const p = tela(120, 142), c = p.getContext("2d");
    c.fillStyle = "#625948"; c.fillRect(56, 78, 8, 62);
    linha(c, 60, 117, 34, 70, "#625948", 4);
    linha(c, 61, 111, 84, 71, "#70634b", 4);
    const cores = ["#435d41", "#526b44", "#5e7350", "#637e4c", "#718653", "#82925d"];
    for (let j = 0; j < 54; j++) {
      const a = ruido(j * 3 + versao) * Math.PI * 2;
      const r = Math.sqrt(ruido(j * 11 + versao)) * 35;
      const x = 60 + Math.sin(a) * r * 1.1, y = 54 + Math.cos(a) * r;
      const tam = 9 + ruido(j * 7 + versao) * 11;
      const luz = clamp(Math.floor(2.4 - (x - 60) / 30 - (y - 54) / 30 + ruido(j) * 1.8), 0, cores.length - 1);
      elipse(c, x, y, tam, tam * .88, cores[luz]);
    }
    return p;
  }
  function nuvem() {
    const p = tela(320, 85), c = p.getContext("2d");
    for (let i = 0; i < 32; i++) {
      const u = (i + .5) / 32, x = 16 + u * 280, amp = Math.sin(u * Math.PI);
      const y = 45 - amp * 11 - ruido(i + 11) * 13 * amp;
      const r = 7 + amp * (11 + ruido(i + 21) * 13);
      const grad = c.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, "rgba(255,249,225,.5)"); grad.addColorStop(.57, "rgba(250,246,229,.4)");
      grad.addColorStop(1, "rgba(232,235,222,0)"); c.fillStyle = grad; c.fillRect(x-r,y-r,2*r,2*r);
    }
    return p;
  }
  function panorama() {
    const p = tela(2048, 260), c = p.getContext("2d");
    // Serra, mata ciliar, quebra-vento e um conjunto de silos no horizonte.
    const crista = (x, amplitude, fase) => Math.cos(2 * Math.PI * x / 2048 + fase) * amplitude +
      Math.sin(6 * Math.PI * x / 2048 + fase) * amplitude / 2 + Math.sin(12 * Math.PI * x / 2048) * amplitude / 4;
    function morro(y, amplitude, fase, cor) {
      c.beginPath(); c.moveTo(0, 260);
      for (let x = 0; x <= 2048; x += 8) c.lineTo(x, y + crista(x, amplitude, fase));
      c.lineTo(2048, 260); c.closePath(); c.fillStyle = cor; c.fill();
    }
    morro(128, 21, 1.4, "#9da69a"); morro(154, 21, .3, "#839380"); morro(178, 12, .9, "#657d66");
    for (let i = 0; i < 215; i++) {
      const x = i * 9.65, y = 190 + crista(x, 8, 1.1), tam = 6 + ruido(i) * 12;
      c.fillStyle = "#665e41"; c.fillRect(x - 1, y - tam, 3, tam + 5);
      elipse(c, x, y - tam, tam * .73, tam * .8, i % 3 ? "#50684d" : "#58744e");
      elipse(c, x + tam * .22, y - tam * 1.2, tam * .51, tam * .48, "#65805e");
    }
    for (const x of [338, 892, 1620]) {
      c.fillStyle = "#aaafa0"; c.fillRect(x, 152, 18, 36);
      c.fillStyle = "#c6c9b7"; c.fillRect(x + 2, 152, 6, 36);
      poligono(c, [[x - 2, 152], [x + 9, 144], [x + 20, 152]], "#848f80");
      for (let k = 0; k < 6; k++) linha(c, x, 155 + k * 5, x + 18, 155 + k * 5, "#8b9583", 1);
      c.fillStyle = "#a58c65"; c.fillRect(x + 23, 173, 54, 15);
      poligono(c, [[x + 18, 174], [x + 32, 163], [x + 74, 164], [x + 82, 174]], "#986746");
      c.fillStyle = "#525947"; c.fillRect(x + 38, 175, 15, 12);
    }
    morro(197, 5, .7, "#718046"); morro(211, 3, 2, "#91905a"); morro(233, 2, 1, "#b59b64");
    return p;
  }
  function planta(milho, versao) {
    const p = tela(68, 92), c = p.getContext("2d");
    for (let i = 0; i < (milho ? 5 : 9); i++) {
      const x = 12 + i * (milho ? 10 : 5.2), ponta = x + (ruido(i + versao * 9) - .5) * 13;
      const y = 6 + ruido(i + 2 + versao) * 23;
      linha(c, x - 1, 90, ponta, y, "#8c652f", milho ? 2.3 : 1.6);
      linha(c, x, 88, ponta + .7, y, "#d4b064", milho ? 1.4 : .9);
      for (let j = 0; j < 4; j++) {
        const yp = y + 12 + j * 10, s = (i + j) % 2 ? 1 : -1;
        const px = ponta + (x - ponta) * ((yp - y) / (90 - y));
        if (milho) {
          poligono(c, [[px, yp + 6], [px + s * 9, yp - 1], [px + s * 17, yp + 4], [px + s * 8, yp + 2]], j % 2 ? "#b18c44" : "#d7b969");
          if (j === 1) elipse(c, px + 3, yp + 6, 2.5, 7, "#c09a4b");
        } else {
          linha(c, px, yp + 5, px + s * 8, yp - 4, "#9a7439", 1.4);
          elipse(c, px + s * 7, yp, 2.1, 4.9, j % 2 ? "#c7a254" : "#d7b76c");
          elipse(c, px + s * 4, yp + 3, 1.8, 3.8, "#aa863f");
        }
      }
      if (milho) for (let j = -2; j <= 2; j++) linha(c, ponta, y + 4, ponta + 2.1 * j, y - 4 - Math.abs(j), "#c5a45c", 1.4);
    }
    return p;
  }
  function criarVista(c, n, passadas, cultura) {
    const paisagem = panorama(), vapor = nuvem(), milho = String(cultura || "").toLowerCase().includes("milho");
    const plantas = [0, 1, 2].map((v) => planta(milho, v));
    const metade = n * larguraFaixa / 2;
    const pontos = [], terrenos = [];
    const arvores = [14, 29, 46].map(arvore);
    for (let i = 0; i < 22; i++) {
      const x = i < 11 ? -metade - 20 - 10 * ruido(i) : metade + 22 + 8 * ruido(i);
      terrenos.push({ x, z: 19 + (i % 11) * 12 + ruido(i + 4) * 7, altura: 6 + 3 * ruido(i + 8), arvore: i % 3 });
    }
    for (let i = 0; i < 22; i++)
      terrenos.push({ x: -metade - 6, z: -16 + i * 7.5, altura: .9 + .2 * ruido(i + 10), estaca: true });
    const restos = Array.from({ length: 380 }, (_, i) => {
      const z = ruido(i + 14) * (comprimento + 38) - 18;
      const x = (ruido(i + 341) * 2 - 1) * (metade + 20);
      return { x, z, r: ruido(i + 67) };
    }).filter((p) => p.z < 0 || p.z > comprimento || Math.abs(p.x) > metade + .3);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 7; j++) {
        for (let k = 0; k < 52; k++) {
          const idx = i * 499 + j * 53 + k, r = ruido(idx);
          const z = (k + .3 + r * .42) * comprimento / 52;
          pontos.push({ x: -metade + i * larguraFaixa + .45 + j + (r - .5) * .16,
            z, linha: i, trecho: Math.min(trechosPorFaixa - 1, Math.floor(z * trechosPorFaixa / comprimento)),
            tipo: idx % 3, escala: .84 + r * .28 });
        }
      }
    }
    const ordens = Array.from({ length: 8 }, (_, i) => {
      const a = i * Math.PI / 4, sx = Math.sin(a), sz = Math.cos(a);
      return [...pontos].sort((p, q) => (q.x - p.x) * sx + (q.z - p.z) * sz);
    });
    return function desenhar(m, w, h, alvo, carreta) {
      if (w < 2 || h < 2) return;
      const f = Math.min(w * .88, h * 1.06), horizonte = h * .36;
      const cs = Math.cos(m.rumo), sn = Math.sin(m.rumo), alturaOlho = 3.16;
      const vista = (x, z) => [(x - m.x) * cs - (z - m.z) * sn, (x - m.x) * sn + (z - m.z) * cs];
      const px = (x, z) => w / 2 + x * f / z;
      const py = (y, z) => horizonte + (alturaOlho - y) * f / z;
      function limite(points) {
        const input = points.map(([x, z]) => vista(x, z));
        const output = [];
        let a = input.at(-1);
        for (const b of input) {
          if ((b[1] > 1) !== (a[1] > 1)) {
            const prop = (1 - a[1]) / (b[1] - a[1]);
            output.push([a[0] + prop * (b[0] - a[0]), 1]);
          }
          if (b[1] > 1) output.push(b);
          a = b;
        }
        return output.map(([x, z]) => [px(x, z), py(0, z)]);
      }
      function solo(x1, z1, x2, z2, cor) {
        const pontos = limite([[x1, z1], [x2, z1], [x2, z2], [x1, z2]]);
        if (pontos.length > 2) poligono(c, pontos, cor);
      }
      let grad = c.createLinearGradient(0, 0, 0, horizonte + h * .08);
      grad.addColorStop(0, "#769eaa"); grad.addColorStop(.63, "#c0d0c8"); grad.addColorStop(1, "#eed8ae");
      c.fillStyle = grad; c.fillRect(0, 0, w, h);
      const ang = ((m.rumo % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const sol = Math.sin(-.54 - m.rumo);
      if (Math.cos(-.54 - m.rumo) > .5) {
        const sx = w * .5 + sol * f, sy = h * .147, rad = h * .22;
        const brilho = c.createRadialGradient(sx,sy,0,sx,sy,rad);
        brilho.addColorStop(0, "rgba(255,242,188,.84)"); brilho.addColorStop(.15, "rgba(255,234,181,.28)"); brilho.addColorStop(1, "rgba(255,234,180,0)");
        c.fillStyle = brilho; c.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
        elipse(c, sx, sy, h * .021, h * .021, "#f8e5b8");
      }
      const ceu = w * .94;
      for (let i = 0; i < 8; i++) {
        const pos = (3 * ceu + (i * .47 - ang * .62) * ceu) / (ceu * 1.7);
        const x = (pos - Math.floor(pos)) * ceu * 1.7 - ceu * .3;
        const y = h * (.10 + ruido(i + 61) * .13);
        const tam = ceu * (.07 + .10 * ruido(i + 31));
        c.drawImage(vapor, x - tam, y - h * .045, tam * 2.4, h * .11);
      }
      const panW = Math.max(w * 1.6, f * 3.5), panH = h * .24;
      const off = -ang / (Math.PI * 2) * panW * 3;
      const esquerda = ((off % panW) + panW) % panW - panW;
      for (let x = esquerda; x < w; x += panW) c.drawImage(paisagem, x, horizonte - panH * .86, panW + .5, panH);
      const linhaChao = horizonte + panH * .13;
      grad = c.createLinearGradient(0, linhaChao, 0, h);
      grad.addColorStop(0, "#b09c62"); grad.addColorStop(.4, "#a78751"); grad.addColorStop(1, "#6b4933");
      c.fillStyle = grad; c.fillRect(0, linhaChao, w, h - linhaChao);
      solo(-metade - 160, -32, -metade - 7, comprimento + 54, "#81935a");
      for (let i = 0; i < 26; i++)
        solo(-metade - 9 - i * 3.5, -32, -metade - 10 - i * 3.5, comprimento + 54, i % 3 ? "#7d8c50" : "#889858");
      solo(-metade - 3, -14, metade + 3, -2, "#997344");
      solo(-metade - 3, comprimento + 1.5, metade + 3, comprimento + 13, "#937148");
      solo(-metade, 0, metade, comprimento, "#a78648");
      for (const terra of restos) {
        const [vx, vz] = vista(terra.x, terra.z);
        if (vz < 1.8) continue;
        const e = f / vz, x = px(vx, vz), y = py(0, vz);
        if (x < -5 || x > w + 5 || y > h) continue;
        linha(c, x, y, x + e * (.04 + terra.r * .12), y - .035 * e, terra.r > .5 ? "#b8a073" : "#8e754f", Math.max(.45, .014 * e));
      }
      for (let i = 0; i < n; i++) {
        const a = -metade + i * larguraFaixa;
        for (let j = 0; j < 7; j++)
          solo(a + j + .20, 0, a + j + .63, comprimento, (j + i) % 2 ? "#b69a54" : "#ae914d");
        const stripe = passadas[i];
        for (let j = 0; j < trechosPorFaixa; j++) {
          if (!stripe[j]) continue;
          const de = j;
          while (j + 1 < stripe.length && stripe[j + 1]) j++;
          const z0 = de * comprimento / trechosPorFaixa, z1 = (j + 1) * comprimento / trechosPorFaixa;
          solo(a, z0, a + larguraFaixa, z1, "#947647");
          for (let k = 0; k < 7; k++) solo(a + k + .23, z0, a + k + .4, z1, "#b19963");
          solo(a + 1.06, z0, a + 1.38, z1, "#7e6640");
          solo(a + 5.68, z0, a + 6.0, z1, "#7e6640");
        }
      }
      const arredores = terrenos.map((objeto) => ({ ...objeto, v: vista(objeto.x, objeto.z) })).filter((p) => p.v[1] > 2).sort((a, b) => b.v[1] - a.v[1]);
      for (const o of arredores) {
        const [xRel, zRel] = o.v, x = px(xRel, zRel), y = py(0, zRel), e = f / zRel, alt = e * o.altura;
        if (x < -alt || x > w + alt) continue;
        if (o.estaca) {
          c.fillStyle = "#686444"; c.fillRect(x - .045 * e, y - alt, Math.max(.8, .09 * e), alt);
          const [nx, nz] = vista(o.x, o.z + 7.5);
          if (nz > 2) for (const ay of [.36, .7]) linha(c, x, py(ay,zRel), px(nx,nz), py(ay,nz), "#827e60", Math.max(.4, .01 * e));
        } else {
          elipse(c, x + alt * .12, y, alt * .35, alt * .032, "#72805d");
          c.drawImage(arvores[o.arvore], x - alt * .42, y - alt, alt * .84, alt);
        }
      }
      const carro = posicaoCarreta(carreta, m.x, metade);
      if (carro) {
        const [cx, cz] = vista(carro.x, carro.z);
        if (cz > 2 && Math.abs(cx) < cz * w / (2 * f) + 9)
          desenharCarreta(c, px(cx, cz), py(0, cz), f / cz, cs < 0);
      }
      const lista = ordens[Math.round(ang / (Math.PI / 4)) % 8];
      for (const pt of lista) {
        if (passadas[pt.linha][pt.trecho]) continue;
        const dx = pt.x - m.x, dz = pt.z - m.z, profund = dx * sn + dz * cs;
        if (profund < 2) continue;
        const escala = f / profund, x = w / 2 + (dx * cs - dz * sn) * escala;
        if (x < -escala || x > w + escala) continue;
        const y = horizonte + alturaOlho * escala;
        const alt = (milho ? 1.94 : 1.15) * escala * pt.escala, larg = escala * (milho ? 1.18 : 1.55);
        if (y - alt >= h) continue;
        c.drawImage(plantas[pt.tipo], x - larg / 2, y - alt, larg, alt);
      }
      // Balizas físicas identificam as extremidades da faixa em atendimento.
      for (const z of [-.4, comprimento + .4]) {
        const [lx, prof] = vista(-metade + alvo * larguraFaixa + .05, z);
        if (prof < 2) continue;
        const x = px(lx, prof), y = py(0, prof), e = f / prof;
        linha(c, x, y, x, y - 1.7 * e, "#5f5636", Math.max(.8, .041 * e));
        poligono(c, [[x, y - 1.7 * e], [x + .47 * e, y - 1.63 * e], [x, y - 1.28 * e]], "#e9e7b1");
      }
      desenharMaquina(c, m, w, h);
      if (performance.now() < m.descargaAte) desenharDescarga(c, m, w, h);
    };
  }

  function desenharCarreta(c, x, y, escala, espelhar) {
    c.save(); c.translate(x, y); c.scale(espelhar ? -escala : escala, escala);
    elipse(c, .8, -.04, 6.7, .30, "rgba(54,48,33,.33)");
    linha(c, -4.6, -.81, 2.2, -.81, "#4e5145", .18);
    poligono(c, [[-4.95,-2.85],[.63,-2.85],[.17,-1.58],[-.45,-1.02],[-4.11,-1.02]], "#a54d29");
    poligono(c, [[-4.95,-2.85],[-4.54,-3.03],[1.0,-3.03],[.63,-2.85]], "#eed3a0");
    poligono(c, [[.63,-2.85],[1.0,-3.03],[.58,-1.56],[.17,-1.58]], "#703c27");
    for (const pos of [-4.27,-3.28,-2.3,-1.32,-.34]) linha(c,pos,-2.79,pos+.14,-1.55,"#cd7748",.075);
    linha(c,-4.75,-2.6,.5,-2.6,"#df955a",.07);
    linha(c, .4,-.86,2.2,-.73,"#62604a",.17);
    poligono(c, [[1.65,-1.68],[3.16,-1.74],[3.4,-2.02],[4.77,-1.87],[4.96,-1.22],[4.67,-.87],[1.65,-.87]], "#627d43");
    poligono(c, [[1.83,-1.71],[1.97,-2.88],[3.02,-2.91],[3.3,-1.72]], "#344e49");
    poligono(c, [[2.05,-1.8],[2.13,-2.73],[2.46,-2.75],[2.44,-1.8]], "#a2b9b0");
    poligono(c, [[2.56,-1.82],[2.6,-2.74],[2.95,-2.74],[3.18,-1.82]], "#8eaaa4");
    linha(c,1.8,-2.91,3.19,-2.91,"#d2d0a3",.13);
    linha(c,4.14,-2,4.14,-2.44,"#4c5143",.09);
    for (const [px,raio] of [[-3.59,.62],[-2.12,.62],[2.32,.82],[4.52,.52]]) {
      elipse(c,px,-raio,raio,raio,"#30342e");
      elipse(c,px,-raio,raio*.52,raio*.52,px>1 ? "#aba05b" : "#8d8870");
      elipse(c,px,-raio,raio*.23,raio*.23,"#666852");
    }
    c.restore();
  }

  function desenharDescarga(c, m, largura, altura) {
    const tempo = clamp(1 - (m.descargaAte - performance.now()) / 2100, 0, 1);
    const escala = Math.min(1, largura / 480, altura / 270);
    c.save(); c.translate(largura - 18 - 172 * escala, altura * .64 - 50 * escala); c.scale(escala, escala);
    c.globalAlpha = Math.min(1, (1 - tempo) * 8);
    c.fillStyle = "#162420ee"; c.fillRect(0, 0, 172, 82);
    c.fillStyle = "#edaa67"; c.fillRect(0, 0, 3, 82);
    c.fillStyle = "#f4efd8"; c.font = "bold 13px sans-serif"; c.fillText("Descarga · " + formatar(m.ultimaCarga, 2) + " sc", 12, 19);
    linha(c,14,55,68,32,"#a6ae69",6); linha(c,67,32,77,36,"#c2c38b",6);
    for (let k = 0; k < 14; k++) {
      const f = (tempo * 4.6 + k / 14) % 1, dx = (ruido(k + 1) - .5) * 8;
      elipse(c, 77 + dx * f + f * 4, 38 + f * 22, 1.5, 1.9, k % 2 ? "#dec070" : "#f3d797");
    }
    poligono(c,[[46,54],[131,54],[122,70],[53,70]],"#b8643a");
    poligono(c,[[47,55],[80,54-Math.min(1,tempo*1.5)*8],[129,55]],"#e4bf70");
    elipse(c,64,72,6,6,"#313832"); elipse(c,113,72,6,6,"#313832");
    c.restore();
  }

  function desenharMaquina(c, m, w, h) {
    const y = h * (m.plataforma ? .75 : .65), sx = w / 1000;
    const e = Math.min(sx, h / 510), yReel = y + 6 * e;
    c.save();
    // Carcaça com cantoneiras, sem-fim, divisores laterais e molinete rotativo.
    poligono(c, [[w * .055, y + 13 * e], [w * .945, y + 13 * e], [w * .98, y + 73 * e], [w * .015, y + 73 * e]], "#333a2e");
    const casco = c.createLinearGradient(0, y, 0, y + 86 * e);
    casco.addColorStop(0, "#a5a949"); casco.addColorStop(.25, "#75853b"); casco.addColorStop(.62, "#435b37"); casco.addColorStop(1, "#263b2b");
    poligono(c, [[w * .039, y + 21 * e], [w * .961, y + 21 * e], [w * .98, y + 72 * e], [w * .024, y + 72 * e]], casco);
    for (let i = 0; i < 55; i++) {
      const x = w * (.056 + i * .0164);
      poligono(c, [[x, y + 19 * e], [x + .001 * w, y + 10 * e], [x + .006 * w, y + 19 * e]], "#c4c2a0");
    }
    const semFim = c.createLinearGradient(0, y + 26 * e, 0, y + 47 * e);
    semFim.addColorStop(0, "#576149"); semFim.addColorStop(.3, "#9c9e6b"); semFim.addColorStop(.6, "#748058"); semFim.addColorStop(1, "#384532");
    c.fillStyle = semFim; c.fillRect(w * .05, y + 26 * e, w * .90, 21 * e);
    c.save(); c.beginPath(); c.rect(w * .05, y + 26 * e, w * .9, 21 * e); c.clip();
    for (let i = -1; i < 18; i++) {
      const x = w * (.055 + i * .055 + (m.fase % 1) * .008);
      c.beginPath(); c.moveTo(x, y + 23 * e); c.bezierCurveTo(x + w * .018, y + 30 * e, x - w * .018, y + 40 * e, x - w * .021, y + 50 * e);
      c.strokeStyle = "#424e37"; c.lineWidth = 3 * e; c.stroke();
    }
    c.restore();
    for (const lado of [-1, 1]) {
      const x = lado < 0 ? w * .045 : w * .955;
      poligono(c, [[x, y - 16 * e], [x + lado * w * .035, y - 27 * e], [x + lado * w * .040, y + 42 * e], [x, y + 65 * e]], "#657e40");
      linha(c, x, y - 13 * e, x + lado * w * .035, y - 27 * e, "#d5c168", 3 * e);
    }
    const rx = w * .013, ry = 22 * e;
    for (let j = 0; j < 5; j++) {
      const a = m.fase + j * Math.PI * 2 / 5, dy = Math.sin(a) * ry, shift = Math.cos(a) * rx;
      const p = w * .047 + shift, q = w * .953 + shift;
      linha(c, p, yReel + dy, q, yReel + dy, j % 2 ? "#4d5141" : "#353e33", Math.max(1.2, 2.3 * e));
      if (Math.sin(a) > -.4) {
        for (let k = 0; k < 39; k++) {
          const x = p + (q - p) * k / 38;
          linha(c, x, yReel + dy, x - 2.2 * e, yReel + dy + (9 + Math.sin(a) * 4) * e, "#484c3c", Math.max(.7, e));
        }
      }
      for (const frac of [.05, .258, .5, .742, .95])
        linha(c, w * frac, yReel, w * frac + shift, yReel + dy, "#313a32", 3 * e);
    }
    linha(c, w * .045, yReel, w * .955, yReel, "#464e41", 5 * e);
    for (const frac of [.046, .954]) {
      elipse(c, w * frac, yReel, 5 * e, 6 * e, "#9ca082");
      linha(c, w * frac, yReel, w * (frac < .5 ? .10 : .90), y + 57 * e, "#526a3f", 7 * e);
    }
    // Longarinas do para-brisa e volante permanecem fixos no referencial do operador.
    poligono(c, [[0, 0], [w * .022, 0], [w * .055, h], [0, h]], "#293832");
    poligono(c, [[w, 0], [w * .982, 0], [w * .937, h], [w, h]], "#263730");
    linha(c, w * .023, 0, w * .056, h, "#8e9984", Math.max(1.4, 3 * e));
    linha(c, w * .982, 0, w * .937, h, "#738473", Math.max(1.4, 3 * e));
    poligono(c, [[0, h * .951], [w * .28, h * .896], [w * .65, h * .908], [w, h * .854], [w, h], [0, h]], "#333e35");
    linha(c, 0, h * .949, w * .28, h * .896, "#7c8168", 3 * e);
    const vx = w * .48, vy = h * 1.08, vr = Math.min(w * .128, h * .245);
    c.save(); c.translate(vx, vy); c.scale(1, .87); c.rotate(m.volante * .72);
    for (let j = 0; j < 3; j++) {
      const a = -Math.PI / 2 + j * Math.PI * 2 / 3;
      linha(c, 0, 0, Math.cos(a) * vr, Math.sin(a) * vr, "#1f2925", Math.max(5, vr * .095));
    }
    c.beginPath(); c.arc(0, 0, vr, 0, Math.PI * 2); c.strokeStyle = "#1d2621"; c.lineWidth = Math.max(9, vr * .14); c.stroke();
    c.beginPath(); c.arc(0, 0, vr * 1.017, Math.PI, Math.PI * 1.89); c.strokeStyle = "#51584a"; c.lineWidth = Math.max(1.2, vr * .027); c.stroke();
    c.restore(); c.restore();
  }

  window.FarmeiroCabine = Object.freeze({ abrir });
})();
