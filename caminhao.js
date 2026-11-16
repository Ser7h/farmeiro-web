"use strict";

(function () {
  const limitar = (n, a, b) => Math.max(a, Math.min(b, n));
  const formatoSacas = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 3});
  const formatoReais = new Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL"});
  const sacas = n => formatoSacas.format(n || 0) + " sc";
  const reais = n => formatoReais.format(n || 0);
  let fecharAtual;

  // Uma reta, um arco e o acesso à balança. Distância e lateral são as mesmas no mapa, no 3D e no save.
  function construirEstrada(comprimento) {
    const inicioCurva = comprimento * .38, fimCurva = comprimento * .49;
    const raio = (fimCurva - inicioCurva) / (Math.PI / 2);
    function pose(distancia, lateral = 0) {
      let angulo = 0, x = 0, z = -distancia;
      if (distancia > inicioCurva) {
        angulo = Math.min(Math.PI / 2, (distancia - inicioCurva) / raio);
        x = raio * (1 - Math.cos(angulo)) + Math.max(0, distancia - fimCurva);
        z = -inicioCurva - raio * Math.sin(angulo);
      }
      return {x: x + lateral * Math.cos(angulo), z: z + lateral * Math.sin(angulo), angulo};
    }
    return {comprimento, inicioCurva, fimCurva, pose};
  }

  function criarDialogo() {
    const dialog = document.createElement("dialog");
    dialog.className = "caminhao-farmeiro";
    dialog.setAttribute("aria-labelledby", "cam-titulo");
    dialog.innerHTML = `
      <div class="cam-estrutura">
        <header class="cam-topo"><div><span>Caminhão graneleiro</span><h2 id="cam-titulo">Silo à cooperativa</h2></div>
          <button type="button" data-op="sair">Voltar ao mapa</button></header>
        <div class="cam-vista">
          <canvas class="cam-cena-2d" aria-label="Mapa da condução do caminhão"></canvas>
          <canvas class="cam-cena-3d" aria-label="Vista externa do caminhão graneleiro" hidden></canvas>
          <div class="cam-instrucao"><strong data-led="tarefa"></strong><span data-led="aviso" role="status"></span><span class="cam-oferta" data-led="oferta"></span></div>
          <div class="cam-roteiro"><span data-led="trajeto">Rota da cooperativa</span><canvas class="cam-mapa" aria-hidden="true"></canvas><b data-led="restante"></b></div>
        </div>
        <section class="cam-comandos" aria-label="Condução e carga">
          <div class="cam-instrumentos">
            <div><small>Velocidade</small><b data-led="velocidade"></b></div>
            <div><small>No caminhão</small><b data-led="carga"></b></div>
            <div><small>No silo</small><b data-led="estoque"></b></div>
            <div><small data-led="rotulo-valor"></small><b data-led="valor"></b></div>
            <div><small>Caixa</small><b data-led="caixa"></b></div>
          </div>
          <div class="cam-botoes">
            <button class="cam-principal" type="button" data-op="carregar-caminhao">Carregar caminhão</button>
            <button class="cam-principal" type="button" data-op="entregar-cooperativa">Entregar na cooperativa</button>
            <div class="cam-pedais" aria-label="Direção e pedais">
              <button type="button" data-move="esq" aria-label="Virar à esquerda">←</button>
              <button type="button" data-move="dir" aria-label="Virar à direita">→</button>
              <button type="button" data-move="freio">Frear</button>
              <button type="button" data-move="gas">Acelerar</button>
            </div>
          </div>
          <div class="cam-teclas">W ou ↑ acelera · S ou ↓ freia · A/D ou ←/→ dirigem · U entrega na cooperativa</div>
        </section>
      </div>`;
    document.body.append(dialog);
    return dialog;
  }

  function desenharMapa(ctx, w, h, rota, posicao, mini) {
    const fim = rota.pose(rota.comprimento);
    const margem = mini ? 8 : Math.min(52, w * .10, h * .12);
    const escala = Math.min((w - margem * 2) / fim.x, (h - margem * 2) / -fim.z);
    const px = x => (w - fim.x * escala) / 2 + x * escala;
    const py = z => (h - fim.z * escala) / 2 + z * escala;
    ctx.fillStyle = mini ? "#203a32" : "#8c9c64";
    ctx.fillRect(0, 0, w, h);
    if (!mini) {
      for (let i=0;i<2;i++) {
        ctx.fillStyle = i ? "#c9b16d" : "#b49b5e";
        ctx.fillRect(px(rota.comprimento * (.09 + i*.23)),py(-rota.comprimento*.355),rota.comprimento*.19*escala,rota.comprimento*.3*escala);
      }
    }
    ctx.beginPath();
    for (let i=0; i<=80; i++) {
      const p = rota.pose(rota.comprimento * i/80);
      if (i) ctx.lineTo(px(p.x),py(p.z)); else ctx.moveTo(px(p.x),py(p.z));
    }
    ctx.lineWidth = mini ? 3 : 13;
    ctx.strokeStyle = mini ? "#b6bfa2" : "#62675e"; ctx.stroke();
    const terminal = (p, nome) => {
      ctx.fillStyle = mini ? "#dcebb3" : "#253d33";
      ctx.fillRect(px(p.x)-3,py(p.z)-3,6,6);
      if (!mini) {
        ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(nome, limitar(px(p.x),45,w-55),py(p.z)+(p.x ? -14 : 23));
      }
    };
    terminal(rota.pose(0),"Silo"); terminal(fim,"Cooperativa");
    ctx.save(); ctx.translate(px(posicao.x),py(posicao.z)); ctx.rotate(posicao.angulo);
    if (mini) {
      ctx.fillStyle="#ffd271"; ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(4,3);ctx.lineTo(-4,3);ctx.closePath();ctx.fill();
    } else {
      ctx.fillStyle="#e5b554";ctx.fillRect(-6,-10,12,7);
      ctx.fillStyle="#325748";ctx.fillRect(-6,-2,12,15);
      ctx.fillStyle="#bc9959";ctx.fillRect(-4,0,8,10);
    }
    ctx.restore();
  }

  function abrir(opcoes) {
    if (fecharAtual) fecharAtual();
    let estado = opcoes.status();
    const rota = construirEstrada(Number(estado.percursoM) || 340);
    let distancia = estado.distancia || 0, lateral = estado.lateral || 0, velocidade = 0;
    let salvo = distancia, lateralSalva = lateral, ultimoSave = 0;
    let cena, gl, encerrado = false, quadro, anterior = 0, ultimoPainel = -Infinity;
    let cargaAte = 0, descargaAte = 0, erro = "", erroAte = 0;
    const dialog = criarDialogo(), antes = document.activeElement;
    const selecionar = s => dialog.querySelector(s);
    const leds = Object.fromEntries([...dialog.querySelectorAll("[data-led]")].map(e=>[e.dataset.led,e]));
    const botaoCarregar = selecionar("[data-op=carregar-caminhao]"), botaoEntregar = selecionar("[data-op=entregar-cooperativa]");
    const canvas3D = selecionar(".cam-cena-3d"), canvas2D = selecionar(".cam-cena-2d"), minimapa = selecionar(".cam-mapa");
    const ctx = canvas2D.getContext("2d"), miniCtx = minimapa.getContext("2d");
    const teclas = new Set(), toques = new Map(), eventos = new AbortController();
    const ouvir = (elemento, evento, fn) => elemento.addEventListener(evento, fn, {signal:eventos.signal});
    const apertado = s => teclas.has(s) || [...toques.values()].includes(s);
    const naCurva = () => distancia >= rota.inicioCurva && distancia < rota.fimCurva;
    const fim = () => distancia >= rota.comprimento - .01;
    const tratarErro = e => { erro = e.message || String(e); erroAte = performance.now()+5000; };
    const atualizar = novo => { estado = novo || opcoes.status(); };
    function salvarPosicao() {
      if (!estado.cargaSc || estado.entregue) return;
      const d = Math.round(distancia * 100) / 100, l = Math.round(lateral * 100) / 100;
      if (d === salvo && l === lateralSalva) return;
      try {
        atualizar(opcoes.onMover(d, l)); salvo = d; lateralSalva = l;
      } catch (e) {
        atualizar(); distancia = salvo = estado.distancia || 0; lateral = lateralSalva = estado.lateral || 0;
        velocidade = 0; teclas.clear(); toques.clear(); tratarErro(e);
      }
    }

    function carregar() {
      if (estado.entregue || estado.cargaSc || botaoCarregar.disabled) return;
      try {
        atualizar(opcoes.onCarregar()); cargaAte = performance.now()+2200;
        distancia = salvo = estado.distancia || 0; lateral = lateralSalva = estado.lateral || 0;
      } catch (e) { tratarErro(e); }
      painel(performance.now());
    }
    function entregar() {
      if (botaoEntregar.disabled || estado.entregue) return;
      salvarPosicao();
      try {
        atualizar(opcoes.onEntregar(velocidade*3.6));
        descargaAte = performance.now()+3200; velocidade = 0; teclas.clear(); toques.clear();
      } catch (e) { tratarErro(e); }
      painel(performance.now());
    }
    function pausar() { salvarPosicao(); velocidade=0; teclas.clear(); toques.clear(); anterior=0; }
    function liberar3D() {
      const atual = cena; cena = null;
      try { atual?.fechar(); } finally {
        if (gl && !gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
        gl = null; canvas3D.hidden = true; dialog.dataset.vista = "2d";
      }
    }
    function fechar() {
      if (encerrado) return;
      pausar(); encerrado = true; cancelar(); liberar3D(); dialog.close(); dialog.remove();
      fecharAtual = null; antes?.focus?.({preventScroll:true}); opcoes.onSair?.();
    }
    function cancelar() { cancelAnimationFrame(quadro); eventos.abort(); }
    function mover(dt) {
      if (!estado.cargaSc || estado.entregue || fim()) { velocidade=0; return; }
      const direita=apertado("dir"), esquerda=apertado("esq"), gas=apertado("gas"), freio=apertado("freio");
      const curva = naCurva(), conduzCurva = direita && !esquerda;
      if (curva && !conduzCurva) { velocidade=0; return; }
      const acelerando = gas || (curva && conduzCurva);
      const limite = curva ? 7 : 15;
      if (freio) velocidade = Math.max(0, velocidade - 9*dt);
      else if (acelerando) velocidade = Math.min(limite, velocidade + 5*dt);
      else velocidade = Math.max(0,velocidade-2.7*dt);
      let proxima = Math.min(rota.comprimento, distancia + velocidade*dt);
      if (distancia < rota.inicioCurva && proxima >= rota.inicioCurva && !conduzCurva) {
        proxima = rota.inicioCurva; velocidade = 0;
      }
      if (!curva && velocidade > .05) {
        const direcao = Number(direita)-Number(esquerda);
        lateral = limitar(lateral + direcao*Math.min(2.3,velocidade*.55)*dt,-2,2);
      }
      // Os guias de roda alinham o caminhão nos últimos metros da balança.
      if (proxima > rota.comprimento-12) {
        const restante = rota.comprimento-distancia;
        if (restante > 0) lateral *= (rota.comprimento-proxima)/restante;
      }
      distancia=proxima;
      if (fim()) {distancia=rota.comprimento; velocidade=0; salvarPosicao();}
    }
    function painel(tempo) {
      const temCarga = estado.cargaSc > 0, recebido = Boolean(estado.entregue), prazo=estado.termos==="term";
      const local = fim() || recebido ? "cooperativa" : distancia < 4 ? "silo" : "estrada";
      leds.trajeto.dataset.local = local; leds.trajeto.dataset.manobra = naCurva() && temCarga ? "direita" : "";
      leds.trajeto.dataset.distancia = String(Math.round(distancia*10)/10);
      let tarefa, aviso;
      if (recebido) {
        tarefa = prazo ? "Venda a prazo entregue" : "Entrega concluída";
        aviso = prazo ? "A cooperativa recebeu a carga. Pagamento em "+estado.diaPagamento+"." : reais(estado.valorLiquido)+" entraram no caixa da fazenda.";
      } else if (!temCarga) {
        tarefa = "Carregue no silo";
        aviso = "O lote para esta viagem é de "+sacas(estado.quantidadeSc ?? Math.min(estado.estoqueSc || 0,estado.capacidadeSc || Infinity))+".";
      } else if (fim()) {
        tarefa = "Entregue a carga";
        aviso = "O caminhão está parado na recepção. Acione a entrega para descarregar.";
      } else if (naCurva()) {
        tarefa = "Vire à direita"; aviso = "Segure D ou a seta direita até entrar na estrada da cooperativa.";
      } else if (distancia < 6) {
        tarefa = "Saia do silo"; aviso = "Acelere pela estrada. A entrada da cooperativa fica à direita.";
      } else if (distancia > rota.comprimento-45) {
        tarefa = "Recepção de grãos"; aviso = "Siga até a balança e pare para entregar.";
      } else {
        tarefa = "Siga para a cooperativa"; aviso = distancia < rota.inicioCurva ? "Siga até a curva sinalizada à direita." : "Continue até a recepção de grãos.";
      }
      leds.tarefa.textContent=tarefa; leds.aviso.textContent=erroAte>tempo ? erro : aviso;
      leds.oferta.hidden=temCarga && !fim();
      const condicoes=[];
      if (Number.isFinite(estado.precoSc)) condicoes.push(reais(estado.precoSc)+"/sc");
      if (Number.isFinite(estado.custoTransporte)) condicoes.push("Transporte "+reais(estado.custoTransporte));
      if (estado.tarifa>0) condicoes.push("Armazenagem "+reais(estado.tarifa));
      if (prazo && !recebido && estado.diaPagamento) condicoes.push("Vencimento "+estado.diaPagamento);
      leds.oferta.textContent=condicoes.join(" · ");
      leds.restante.textContent = recebido ? "Carga entregue" : fim() ? "Na balança" : Math.ceil(rota.comprimento-distancia)+" m até a recepção";
      leds.velocidade.textContent=Math.round(velocidade*3.6)+" km/h"; leds.carga.textContent=sacas(estado.cargaSc);
      leds.estoque.textContent=sacas(estado.estoqueSc); leds.caixa.textContent=reais(estado.caixa);
      leds["rotulo-valor"].textContent = prazo ? "A receber a prazo" : recebido ? "Recebido na entrega" : "Líquido na entrega";
      leds.valor.textContent=reais(estado.valorLiquido);
      botaoCarregar.hidden=temCarga || recebido; botaoCarregar.disabled=temCarga || recebido || !(estado.estoqueSc>0);
      botaoEntregar.hidden=!temCarga && !recebido; botaoEntregar.disabled=!temCarga || !fim() || velocidade*3.6>1 || recebido;
      botaoEntregar.textContent=recebido ? "Carga entregue" : "Entregar na cooperativa";
      for (const botao of dialog.querySelectorAll("[data-move]")) botao.disabled=!temCarga || recebido || fim();
    }
    function desenhar(tempo) {
      const w=canvas2D.clientWidth, h=canvas2D.clientHeight;
      if (!w || !h) return;
      const posicao=rota.pose(distancia,lateral);
      if (cena) {
        try {
          cena.desenhar({w,h,posicao,distancia,velocidade,tempo,carga:estado.cargaSc||0, capacidade:estado.capacidadeSc||0,
            noFinal:fim() || Boolean(estado.entregue),carregando:Math.max(0,(cargaAte-tempo)/2200),
            descarregando:Math.max(0,(descargaAte-tempo)/3200)});
        } catch(e) { console.warn("A condução do caminhão passou ao mapa.",e); liberar3D(); }
      }
      if (!cena) {
        if (canvas2D.width!==w || canvas2D.height!==h) {canvas2D.width=w; canvas2D.height=h;}
        desenharMapa(ctx,w,h,rota,posicao,false);
      }
      const mw=minimapa.clientWidth*2, mh=minimapa.clientHeight*2;
      if (mw && mh) {
        if (minimapa.width!==mw || minimapa.height!==mh) {minimapa.width=mw; minimapa.height=mh;}
        desenharMapa(miniCtx,mw,mh,rota,posicao,true);
      }
    }
    async function iniciar3D() {
      if (location.protocol==="file:" || !window.WebGL2RenderingContext || !HTMLScriptElement.supports?.("importmap")) return;
      try {
        gl = canvas3D.getContext("webgl2",{alpha:false,antialias:true,powerPreference:"high-performance"});
        if (!gl) return;
        dialog.dataset.vista="carregando";
        const {criarCenaCaminhao}=await import("farmeiro/caminhao");
        if (encerrado || !gl || gl.isContextLost()) return;
        cena=criarCenaCaminhao(canvas3D,gl,rota);
        desenhar(performance.now());
        if (cena) { canvas3D.hidden=false; dialog.dataset.vista="3d"; }
      } catch(e) { if (!encerrado) {console.warn("A estrada será mostrada no mapa.",e); liberar3D();} }
    }
    function animar(tempo) {
      if (encerrado) return;
      const dt = anterior ? limitar((tempo-anterior)/1000,0,.2) : 0; anterior=tempo;
      mover(dt);
      if (tempo-ultimoSave>550) {salvarPosicao(); ultimoSave=tempo;}
      if (tempo-ultimoPainel>90) {painel(tempo); ultimoPainel=tempo;}
      desenhar(tempo); quadro=requestAnimationFrame(animar);
    }
    const comandos = {KeyW:"gas",ArrowUp:"gas",KeyS:"freio",ArrowDown:"freio",KeyA:"esq",ArrowLeft:"esq",KeyD:"dir",ArrowRight:"dir"};
    ouvir(window,"keydown",e=>{
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const comando=comandos[e.code];
      if (comando) {e.preventDefault(); teclas.add(comando);}
      else if (e.code==="KeyU" && !e.repeat) {e.preventDefault(); entregar();}
    });
    ouvir(window,"keyup",e=>{if (comandos[e.code]) {e.preventDefault(); teclas.delete(comandos[e.code]);}});
    for (const btn of dialog.querySelectorAll("[data-move]")) {
      ouvir(btn,"pointerdown",e=>{
        if (btn.disabled) return;
        e.preventDefault(); btn.setPointerCapture(e.pointerId); toques.set(e.pointerId,btn.dataset.move);
      });
      for (const evento of ["pointerup","pointercancel","lostpointercapture"]) ouvir(btn,evento,e=>toques.delete(e.pointerId));
    }
    ouvir(botaoCarregar,"click",carregar); ouvir(botaoEntregar,"click",entregar);
    ouvir(selecionar("[data-op=sair]"),"click",fechar);
    ouvir(dialog,"cancel",e=>{e.preventDefault(); fechar();});
    ouvir(canvas3D,"webglcontextlost",liberar3D);
    ouvir(window,"pagehide",pausar); ouvir(window,"blur",pausar);
    ouvir(document,"visibilitychange",()=>{if(document.hidden) pausar();});
    dialog.dataset.vista="2d"; dialog.showModal(); fecharAtual=fechar;
    painel(performance.now()); desenhar(performance.now()); iniciar3D(); quadro=requestAnimationFrame(animar);
  }
  window.FarmeiroCaminhao=Object.freeze({abrir});
})();
