import * as T from "three";

const volta = Math.PI * 2;
const limitar = T.MathUtils.clamp;

function aleatorio(seed) {
  return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;};
}
function textura(w,h,pintar) {
  const tela=document.createElement("canvas"); tela.width=w; tela.height=h;
  pintar(tela.getContext("2d"),w,h);
  const mapa=new T.CanvasTexture(tela); mapa.colorSpace=T.SRGBColorSpace; return mapa;
}
function material(cor,extra={}) {
  return new T.MeshStandardMaterial({color:cor,roughness:.82,...extra});
}
function mover(obj,pai,x,y,z) {
  obj.position.set(x,y,z); pai.add(obj); return obj;
}
function grupo(pai,nome,x=0,y=0,z=0) {
  const g=new T.Group(); g.name=nome; return mover(g,pai,x,y,z);
}

function construir(estrada) {
  const cena=new T.Scene(), rnd=aleatorio(41534);
  cena.fog=new T.Fog("#dddcc4",130,510);
  const caixa=new T.BoxGeometry(1,1,1), cilindro=new T.CylinderGeometry(1,1,1,20);
  const rolo=new T.CylinderGeometry(1,1,1,12), plano=new T.PlaneGeometry(1,1);
  const barro=material("#a58c68"), concreto=material("#c6bda5");
  const estrutura=material("#435b50",{metalness:.22});
  const metal=material("#a9afa1",{metalness:.33,roughness:.53});
  const sombra=material("#716c53"), escuro=material("#262e2c");
  const branco=material("#f5ecce"), amarelo=material("#e1b74d");
  function malha(pai,geom,mat,x,y,z) {return mover(new T.Mesh(geom,mat),pai,x,y,z);}
  function bloco(pai,x,y,z,w,h,d,mat) {const a=malha(pai,caixa,mat,x,y,z);a.scale.set(w,h,d);return a;}
  function redondo(pai,x,y,z,r,h,mat,geom=cilindro) {const a=malha(pai,geom,mat,x,y,z);a.scale.set(r,h,r);return a;}
  function chao(pai,x,z,w,d,mat,y=.005) {const a=malha(pai,plano,mat,x,y,z);a.scale.set(w,d,1);a.rotation.x=-Math.PI/2;return a;}
  function haste(pai,inicio,fim,raio,mat) {
    const a=new T.Vector3(...inicio), b=new T.Vector3(...fim), meio=a.clone().lerp(b,.5), dif=b.sub(a);
    const tubo=redondo(pai,meio.x,meio.y,meio.z,raio,dif.length(),mat,rolo);
    tubo.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dif.normalize());return tubo;
  }
  function painelPlaca(pai,x,y,z,w,h,titulo,sub,angulo=0,tinta="#204635") {
    const face=textura(768,192,(c,W,H)=>{
      c.fillStyle=tinta;c.fillRect(0,0,W,H);c.strokeStyle="#ede8c5";c.lineWidth=4;c.strokeRect(7,7,W-14,H-14);
      c.fillStyle="#f7f3dc";c.textAlign="center";c.textBaseline="middle";
      c.font="bold "+(sub ? 75 : 86)+"px Arial";c.fillText(titulo,W/2,sub ? H*.42 : H*.52,W-45);
      if(sub){c.font="bold 38px Arial";c.fillText(sub,W/2,H*.76,W-45);}
    });
    const obj=malha(pai,plano,new T.MeshBasicMaterial({map:face,side:T.DoubleSide}),x,y,z);
    obj.scale.set(w,h,1);obj.rotation.y=angulo;return obj;
  }
  // Formas repetidas (rodado, armazéns, árvores, postes) compartilham malha e material.
  function instanciar(pai) {
    pai.updateWorldMatrix(true,true);
    const base=pai.matrixWorld.clone().invert(), porTipo=new Map();
    pai.traverse(a=>{
      if (!a.isMesh || a.isInstancedMesh || a.name) return;
      const chave=a.geometry.uuid+a.material.uuid;
      if (!porTipo.has(chave)) porTipo.set(chave,[]);
      porTipo.get(chave).push(a);
    });
    for(const serie of porTipo.values()) {
      if(serie.length<3) continue;
      const lote=new T.InstancedMesh(serie[0].geometry,serie[0].material,serie.length);
      serie.forEach((a,i)=>{lote.setMatrixAt(i,base.clone().multiply(a.matrixWorld));a.removeFromParent();});
      pai.add(lote);lote.computeBoundingSphere();
    }
  }

  const horizonte=textura(512,256,(c,w,h)=>{
    const grad=c.createLinearGradient(0,0,0,h);
    [[0,"#537f9e"],[.26,"#75a0ba"],[.46,"#bdd0cf"],[.52,"#efdec1"],[1,"#d3c6a6"]].forEach(([p,cor])=>grad.addColorStop(p,cor));
    c.fillStyle=grad;c.fillRect(0,0,w,h);
    for(let i=0;i<46;i++){
      const x=rnd()*w,y=57+rnd()*49;
      for(let j=0;j<9;j++){
        c.save();c.translate(x+(rnd()-.5)*42,y+rnd()*3);c.scale(7+rnd()*16,1.5+rnd()*3);
        const nuvem=c.createRadialGradient(0,0,0,0,0,1);nuvem.addColorStop(0,"rgba(255,248,221,.26)");nuvem.addColorStop(1,"rgba(255,255,252,0)");
        c.fillStyle=nuvem;c.fillRect(-1,-1,2,2);c.restore();
      }
    }
  });
  const ceu=malha(cena,new T.SphereGeometry(558,24,16),new T.MeshBasicMaterial({map:horizonte,side:T.BackSide,depthWrite:false,fog:false,toneMapped:false}),0,0,0);
  ceu.renderOrder=-5;
  const luz=new T.HemisphereLight("#f5f7ea","#a69a71",2.1);
  cena.add(luz); const sol=new T.DirectionalLight("#fff0ce",2.4);sol.position.set(-95,109,-55);cena.add(sol);
  const mundo=grupo(cena,"EstabelecimentosEEstrada");
  const pasto=material("#9ca474"), terra=material("#9e895b");
  chao(mundo,65,-108,1050,850,pasto,-.10);
  const fim=estrada.pose(estrada.comprimento);

  function faixa(inicio,termino,lado1,lado2,y,mat) {
    const pos=[], uv=[], idx=[], passos=Math.max(1,Math.ceil((termino-inicio)/3));
    for(let i=0;i<=passos;i++){
      const s=inicio+(termino-inicio)*i/passos;
      for(const [j,l] of [lado1,lado2].entries()) {
        const p=estrada.pose(s,l);pos.push(p.x,y,p.z);uv.push(j,s/8);
      }
      const k=i*2;if(i<passos)idx.push(k,k+1,k+2,k+1,k+3,k+2);
    }
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    malha(mundo,g,mat,0,0,0);
  }
  const piso=textura(160,160,(c,w,h)=>{
    c.fillStyle="#b0b2a7";c.fillRect(0,0,w,h);
    for(let i=0;i<2600;i++){c.fillStyle=i%3?"#8f9289":"#c8c6b5";c.fillRect(rnd()*w,rnd()*h,rnd()*1.8+1,rnd()*1.4+1);}
  });piso.wrapS=piso.wrapT=T.RepeatWrapping;
  const asfalto=material("#62665e",{map:piso}), borda=material("#dddac1"), eixo=material("#e3c878");
  faixa(-30,estrada.comprimento+16,-6.7,6.7,-.035,barro);
  faixa(-30,estrada.comprimento+16,-4.75,4.75,.016,asfalto);
  for(const l of [-4.2,4.2]) faixa(20,estrada.comprimento-23,l,l+.11,.028,borda);
  for(let s=23;s<estrada.comprimento-25;s+=14) faixa(s,s+5,-.07,.07,.03,eixo);

  const terraArada=textura(160,160,(c,w,h)=>{
    c.fillStyle="#b59f6b";c.fillRect(0,0,w,h);
    for(let i=0;i<12;i++){c.fillStyle=i%2?"#987e4b":"#a58e59";c.fillRect(i*14,0,3,h);}
    for(let i=0;i<1350;i++){c.fillStyle=i%2?"#c3ae6c":"#a38e54";c.fillRect(rnd()*w,rnd()*h,2,2);}
  });terraArada.wrapS=terraArada.wrapT=T.RepeatWrapping;terraArada.repeat.set(12,10);
  const talhao=material("#d6c28a",{map:terraArada});
  for(const [x,z,w,d] of [[68,-56,105,110],[-70,-114,90,94],[71,fim.z-79,140,114],[fim.x+65,-70,75,108]]) chao(mundo,x,z,w,d,talhao,-.075);
  const folha=[material("#526f45"),material("#68874d"),material("#74894e")], tronco=material("#736246");
  const copa=new T.IcosahedronGeometry(1,1);
  function arvore(x,z,h){
    redondo(mundo,x,h*.30,z,h*.055,h*.56,tronco,rolo);
    const a=malha(mundo,copa,folha[Math.floor(rnd()*folha.length)],x,h*.70,z);a.scale.set(h*.31,h*.39,h*.30);a.rotation.y=rnd()*volta;
  }
  for(let i=0;i<92;i++) {
    const x=i%3===0 ? -52-rnd()*76 : -60+rnd()*(fim.x+151);
    const z=i%3===0 ? -rnd()*240 : i%3===1 ? fim.z-45-rnd()*82 : 24+rnd()*65;
    arvore(x,z,5+rnd()*7);
  }
  const longe=new T.SphereGeometry(1,12,8), morro=material("#91a080");
  for(let i=0;i<20;i++){
    const a=volta*i/20, x=75+340*Math.sin(a),z=-90+290*Math.cos(a);
    const m=malha(mundo,longe,morro,x,-6,z);m.scale.set(51+rnd()*38,17+rnd()*20,47+rnd()*31);
  }
  for(let s=21;s<estrada.comprimento-33;s+=31){
    const p=estrada.pose(s,-8.8);
    redondo(mundo,p.x,2.8,p.z,.105,5.6,tronco,rolo);
    const braco=bloco(mundo,p.x,5.5,p.z,2.1,.14,.12,tronco);braco.rotation.y=-p.angulo;
    if(s+31<estrada.comprimento-33){
      const q=estrada.pose(s+31,-8.8), ponto=[(p.x+q.x)/2,4.85,(p.z+q.z)/2];
      haste(mundo,[p.x,5.58,p.z],ponto,.026,escuro);haste(mundo,ponto,[q.x,5.58,q.z],.026,escuro);
    }
  }
  const paredeSilo=textura(96,192,(c,w,h)=>{
    c.fillStyle="#c8c9bd";c.fillRect(0,0,w,h);
    for(let j=0;j<h;j+=5){c.fillStyle="#85938a";c.fillRect(0,j,w,1);c.fillStyle="#e4e0c9";c.fillRect(0,j+1,w,1);}
    for(let i=0;i<w;i+=24){c.fillStyle="rgba(80,90,76,.50)";c.fillRect(i,0,1,h);}
  });
  const chapa=material("#c0c5b3",{map:paredeSilo,metalness:.38,roughness:.54});
  const cone=new T.ConeGeometry(1,1,28), telha=material("#4e7264",{metalness:.22});
  function silo(pai,x,z,r,h){
    redondo(pai,x,.23,z,r*1.07,.44,concreto);
    redondo(pai,x,.4+h/2,z,r,h,chapa);
    for(const y of [.55,h*.55,h+.4])redondo(pai,x,y,z,r*1.013,.12,metal);
    const teto=malha(pai,cone,telha,x,h+1.68,z);teto.scale.set(r*1.09,2.6,r*1.09);
    redondo(pai,x,h+3.08,z,.42,.26,metal);
    for(const xx of [-.34,.34]) bloco(pai,x+xx,h*.5+1,z+r+.12,.07,h+1,.08,estrutura);
    for(let y=.8;y<h+.6;y+=.83)bloco(pai,x,y,z+r+.14,.77,.065,.12,estrutura);
  }
  const origem=grupo(mundo,"SiloDaFazenda");
  chao(origem,-7,-1,47,38,concreto,-.02);
  silo(origem,-13,-4,5.1,10);silo(origem,-23,-11,5.1,10);
  haste(origem,[-12,8,-4],[-1.2,7.4,3],.32,estrutura);
  haste(origem,[-1.2,7.4,3],[0,6.65,3],.34,metal);
  haste(origem,[-10.5,4,-3],[-3.3,7.5,2],.08,estrutura);
  redondo(origem,0,6.4,3,.38,.70,estrutura);
  painelPlaca(origem,-9,3.7,3.2,5.6,1.45,"SILO DA FAZENDA","EXPEDIÇÃO");

  const coop=grupo(mundo,"RecepcaoCooperativa",fim.x,0,fim.z);
  chao(coop,1,0,65,50,concreto,-.021);
  for(const x of [-16,-2,12]) silo(coop,x,-20,5.6,13.7);
  // Armazém em chapa, área coberta de recepção e plataforma vazada de descarga.
  bloco(coop,6,3.4,-9.5,29,6.8,7.6,metal);
  bloco(coop,6,7.12,-9.5,31,.55,9.3,telha);
  for(const x of [-8.7,9.6]) for(const z of [-6,5.2]) bloco(coop,x,3.52,z,.38,7.04,.4,estrutura);
  bloco(coop,.45,7.27,-.6,19.6,.39,13.7,telha);
  bloco(coop,.45,6.96,6.05,19.6,.57,.22,estrutura);
  painelPlaca(coop,.5,6.68,6.25,13.5,1.55,"COOPERATIVA","RECEPÇÃO DE GRÃOS",0);
  painelPlaca(coop,-9.55,6.45,0,8.3,1.5,"RECEPÇÃO","BALANÇA E DESCARGA",-Math.PI/2);
  bloco(coop,0,.06,0,19,.11,5.1,sombra);
  for(let i=0;i<37;i++) bloco(coop,-8.7+i*.48,.13,0,.14,.13,4.66,escuro);
  for(const z of [-2.55,2.55]) {
    bloco(coop,0,.13,z,19,.17,.26,amarelo);
    for(let x=-9;x<9;x+=1.5) bloco(coop,x,.23,z,.68,.025,.23,escuro);
  }
  for(let j=0;j<2;j++){
    const x=-24-j*2, lado=fim.z+5; redondo(mundo,fim.x+x,1.7,lado,.09,3.4,estrutura);
  }
  painelPlaca(mundo,fim.x-24,3.25,fim.z+5,5.2,1.3,"COOPERATIVA","RECEPÇÃO  →",-Math.PI/2);
  const curva=estrada.pose(estrada.inicioCurva-16,6.3);
  redondo(mundo,curva.x,1.45,curva.z,.085,2.9,estrutura);
  painelPlaca(mundo,curva.x,2.85,curva.z,5.5,1.4,"COOPERATIVA  →","",0);
  for(let i=0;i<4;i++){
    const p=estrada.pose(estrada.inicioCurva+(estrada.fimCurva-estrada.inicioCurva)*i/3,-6);
    redondo(mundo,p.x,.83,p.z,.09,1.65,estrutura);
    const placa=bloco(mundo,p.x,1.55,p.z,.85,.55,.09,amarelo);placa.rotation.y=-p.angulo;
    const tarja=bloco(mundo,p.x,1.55,p.z+.055,.24,.43,.045,escuro);tarja.rotation.z=-.45;tarja.rotation.y=-p.angulo;
  }
  instanciar(mundo);

  const caminhao=grupo(cena,"CaminhaoGraneleiro");
  const cabine=grupo(caminhao,"CabineDoCaminhao");
  const tracao=material("#a83d2b",{metalness:.18,roughness:.49}), friso=material("#d16b45",{metalness:.15});
  const vidro=material("#405d66",{metalness:.37,roughness:.34}), pneu=material("#292d29"), roda=material("#adafa5",{metalness:.53});
  const carroceria=material("#316753",{metalness:.25,roughness:.58}), reforco=material("#588371",{metalness:.30});
  const vermelho=material("#aa3725"), farol=material("#f8eab8",{emissive:"#b3a15c",emissiveIntensity:.22});
  const moldura=material("#363d38");
  bloco(cabine,0,1.0,.7,.91,.36,12.82,moldura);
  bloco(cabine,0,1.64,-3.93,2.36,.75,2.7,tracao);
  bloco(cabine,0,2.23,-3.90,2.39,.65,2.37,tracao);
  bloco(cabine,0,2.90,-3.82,2.20,.91,2.13,tracao);
  bloco(cabine,0,3.41,-3.91,2.42,.21,2.46,tracao);
  const frente=bloco(cabine,0,2.96,-4.94,2.08,.72,.07,vidro);frente.rotation.x=-.11;
  bloco(cabine,0,2.97,-5.00,.045,.67,.035,moldura);
  bloco(cabine,0,3.42,-5.14,2.31,.10,.28,moldura);
  bloco(cabine,0,1.60,-5.31,1.80,.61,.1,escuro);
  for(let i=0;i<4;i++) bloco(cabine,0,1.36+.14*i,-5.375,1.71,.055,.06,roda);
  bloco(cabine,0,1.04,-5.34,2.55,.31,.23,roda);
  const tanque=new T.CylinderGeometry(.32,.32,1.25,14);
  for(const a of [-1,1]) {
    bloco(cabine,a*1.115,2.95,-3.98,.047,.65,1.58,vidro);
    bloco(cabine,a*1.19,2.15,-3.88,.025,.09,1.8,friso);
    bloco(cabine,a*1.22,2.46,-3.34,.055,.075,.25,moldura);
    haste(cabine,[a*1.1,2.75,-4.68],[a*1.51,2.93,-4.69],.05,moldura);
    bloco(cabine,a*1.52,2.98,-4.69,.135,.36,.2,moldura);
    bloco(cabine,a*.94,1.68,-5.34,.4,.22,.095,farol);
    bloco(cabine,a*1.04,1.68,-5.4,.11,.14,.03,amarelo);
    bloco(cabine,a*1.14,1.10,-3.65,.35,.13,.93,escuro);
    const diesel=malha(cabine,tanque,roda,a*.84,.85,-2.02);diesel.rotation.x=Math.PI/2;
  }
  bloco(cabine,0,1.72,-.24,2.35,.2,2.56,moldura);
  const centroRoda=new T.CylinderGeometry(1,1,1,24);
  const rodas=[];
  for(const [z,r] of [[-4.51,.58],[-1.08,.57],[.23,.57],[4.1,.56],[5.37,.56],[6.64,.56]]) {
    for(const a of [-1,1]) {
      const rodaG=grupo(caminhao,"Rodado",a*1.12,r+.035,z);rodas.push(rodaG);
      const borracha=redondo(rodaG,0,0,0,r,.345,pneu,centroRoda);borracha.rotation.z=Math.PI/2;
      const aro=redondo(rodaG,a*.182,0,0,r*.66,.042,roda,centroRoda);aro.rotation.z=Math.PI/2;
      const cubo=redondo(rodaG,a*.216,0,0,r*.31,.055,moldura,rolo);cubo.rotation.z=Math.PI/2;
      for(let f=0;f<6;f++){
        const p=volta*f/6, porca=redondo(rodaG,a*.224,.26*Math.sin(p),.26*Math.cos(p),.036,.03,escuro,rolo);porca.rotation.z=Math.PI/2;
      }
      instanciar(rodaG);
    }
  }
  bloco(cabine,0,1.5,3.29,1.92,.25,8.34,moldura);
  for(const a of [-1,1]){
    bloco(cabine,a*.78,.66,1.38,.16,1.17,.16,moldura);
    bloco(cabine,a*.78,.15,1.38,.34,.08,.41,moldura);
    bloco(cabine,a*1.06,.75,2.18,.1,.42,1.82,roda);
    bloco(cabine,a*1.07,1.01,7.28,.57,.56,.10,pneu);
  }
  bloco(cabine,0,.80,7.22,2.35,.20,.15,roda);
  for(let j=0;j<6;j++) bloco(cabine,-.98+j*.37,.80,7.31,.21,.12,.03,j%2 ? vermelho : branco);
  bloco(cabine,0,1.03,7.29,.53,.16,.04,branco);
  const bascula=grupo(caminhao,"CacambaBasculante",0,1.62,7.03);
  const caixaGraos=grupo(bascula,"CarroceriaGraneleira",0,0,-4.02);
  bloco(caixaGraos,0,.11,0,2.49,.24,8.18,carroceria);
  for(const a of [-1,1]){
    bloco(caixaGraos,a*1.24,1.02,0,.12,1.93,8.18,carroceria);
    for(let j=0;j<14;j++) bloco(caixaGraos,a*1.32,.97,-3.89+j*.60,.07,1.79,.080,reforco);
    for(const y of [.21,1.15,1.95]) bloco(caixaGraos,a*1.31,y,0,.16,.095,8.26,reforco);
    for(let j=0;j<11;j++) bloco(caixaGraos,a*1.40,.35,-3.7+j*.73,.015,.084,.36,j%2?branco:vermelho);
  }
  bloco(caixaGraos,0,1.02,-4.04,2.5,1.9,.13,carroceria);
  const lona=redondo(caixaGraos,-1.23,2.05,0,.12,8.23,escuro);lona.rotation.x=Math.PI/2;
  const portao=grupo(bascula,"TampaTraseira",0,1.96,.077);
  bloco(portao,0,-.96,0,2.50,1.9,.15,carroceria);
  for(const x of [-1.13,-.68,0,.68,1.13])bloco(portao,x,-.97,.105,.065,1.77,.078,reforco);
  for(const y of [-1.81,-.96,-.1])bloco(portao,0,y,.10,2.49,.065,.10,reforco);
  for(const a of [-1,1])bloco(portao,a*.96,-1.72,.168,.24,.11,.035,vermelho);

  const graos=textura(192,192,(c,w,h)=>{
    c.fillStyle="#c29b59";c.fillRect(0,0,w,h);
    for(let j=0;j<2800;j++){
      c.fillStyle=["#d9b66e","#b19050","#ecd191","#b18b4f"][j%4];
      c.beginPath();c.ellipse(rnd()*w,rnd()*h,.8+rnd()*1.8,.65+rnd()*1.5,rnd()*3,0,volta);c.fill();
    }
  });
  const soja=material("#dfbe82",{map:graos}), carga=grupo(caixaGraos,"SojaNoCaminhao");
  const monte=new T.SphereGeometry(1,20,10);
  const monteGrao=malha(carga,monte,soja,0,0,0);monteGrao.scale.set(1.19,.46,4.08);
  const fluxo=grupo(cena,"DescargaSoja");
  const particulas=new T.InstancedMesh(new T.IcosahedronGeometry(.07,0),soja,60);
  particulas.instanceMatrix.setUsage(T.DynamicDrawUsage);particulas.frustumCulled=false;fluxo.add(particulas);
  const sombraMapa=textura(96,96,(c,w,h)=>{
    c.save();c.translate(w/2,h/2);c.scale(w*.5,h*.5);
    const grad=c.createRadialGradient(0,0,.47,0,0,1);grad.addColorStop(0,"rgba(39,40,27,.62)");grad.addColorStop(1,"rgba(39,40,27,0)");c.fillStyle=grad;c.fillRect(-1,-1,2,2);c.restore();
  });
  const sombraMovel=chao(caminhao,.36,1.12,4.65,16.3,new T.MeshBasicMaterial({map:sombraMapa,transparent:true,depthWrite:false}),.15);
  sombraMovel.renderOrder=1;
  instanciar(cabine);instanciar(caixaGraos);instanciar(portao);
  return {cena,ceu,caminhao,carga,bascula,portao,rodas,fluxo,particulas};
}

export function criarCenaCaminhao(canvas,contexto,estrada) {
  const render=new T.WebGLRenderer({canvas,context:contexto,alpha:false,antialias:true});
  render.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.35));
  render.outputColorSpace=T.SRGBColorSpace;render.toneMapping=T.ACESFilmicToneMapping;render.toneMappingExposure=1.10;
  const {cena,ceu,caminhao,carga,bascula,portao,rodas,fluxo,particulas}=construir(estrada);
  const camera=new T.PerspectiveCamera(53,1,.18,630);camera.name="CameraCaminhao";
  const olhando=new T.Vector3(), alvo=new T.Vector3(), ponto=new T.Vector3(), eixoVertical=new T.Vector3(0,1,0), mat=new T.Matrix4();
  let wAnt=0,hAnt=0,tempoAnt=0,primeiro=true;
  function desenhar({w,h,posicao,distancia,velocidade,tempo,carga:sc,capacidade,noFinal,carregando,descarregando}) {
    if (w!==wAnt || h!==hAnt) {
      render.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.9 ? 65 : 53;camera.updateProjectionMatrix();wAnt=w;hAnt=h;
    }
    const dt=Math.min(.2,Math.max(0,(tempo-tempoAnt)/1000));tempoAnt=tempo;
    const {x,z,angulo}=posicao, frenteX=Math.sin(angulo),frenteZ=-Math.cos(angulo),ladoX=Math.cos(angulo),ladoZ=Math.sin(angulo);
    caminhao.position.set(x,0,z);caminhao.rotation.y=-angulo;
    for(const r of rodas)r.rotation.x-=velocidade*dt/.57;
    const sojaPresente=sc>0 || descarregando>.13;
    carga.visible=sojaPresente;
    const nivel=sc>0 ? .92+.47*Math.sqrt(limitar(sc/(capacidade||sc),0,1)) : .58+descarregando*.7;
    carga.position.y=nivel-Math.max(0,carregando)*.3;
    const pulso=descarregando>0 ? Math.sin(Math.PI*(1-descarregando)) : 0;
    bascula.rotation.x=pulso*.40;portao.rotation.x=-pulso*.90;
    fluxo.visible=(carregando>.015 && distancia<2) || descarregando>.04;
    if(fluxo.visible) {
      for(let i=0;i<particulas.count;i++) {
        const fracao=(tempo*.00125+i/particulas.count)%1, a=i*2.39996;
        const r=(.10+.23*fracao)*(.35+(i%13)/17);
        if (descarregando>0) {
          ponto.set(Math.sin(a)*r,(1-fracao*fracao)*1.98+.23,7.39+.45*fracao+Math.cos(a)*r);
          ponto.applyAxisAngle(eixoVertical,-angulo);ponto.x+=x;ponto.z+=z;
        } else ponto.set(Math.cos(a)*r,6.1-fracao*fracao*2.75,3+Math.sin(a)*r);
        mat.makeTranslation(ponto.x,ponto.y,ponto.z);particulas.setMatrixAt(i,mat);
      }
      particulas.instanceMatrix.needsUpdate=true;
    }
    if(noFinal) {
      const longe=w/h<.95?1.28:1;
      ponto.set(x-9.8*longe,6.35*longe,z+17.4*longe);
      alvo.set(x-.7,2.15,z-.9);
    } else {
      const abertura=1-limitar(distancia/25,0,1), estreita=w/h<.94?1.22:1;
      const recuo=(16.3-abertura*2.3)*estreita, lado=(2.3+abertura*7.1)*estreita;
      ponto.set(x-frenteX*recuo+ladoX*lado,7.1*estreita,z-frenteZ*recuo+ladoZ*lado);
      alvo.set(x+frenteX*(3.1-abertura*2.6),2.25,z+frenteZ*(3.1-abertura*2.6));
    }
    const mistura=primeiro ? 1 : 1-Math.exp(-dt*5);primeiro=false;
    camera.position.lerp(ponto,mistura);olhando.lerp(alvo,mistura);camera.lookAt(olhando);
    ceu.position.copy(camera.position);
    render.render(cena,camera);
  }
  function fechar() {
    const geometrias=new Set(),materiais=new Set(),texturas=new Set();
    cena.traverse(obj=>{
      if(obj.geometry)geometrias.add(obj.geometry);
      if(obj.material)materiais.add(obj.material);
      if(obj.isInstancedMesh)obj.dispose();
    });
    for(const m of materiais){if(m.map)texturas.add(m.map);m.dispose();}
    for(const g of geometrias)g.dispose();for(const mapa of texturas)mapa.dispose();
    render.dispose();
  }
  return {desenhar,fechar};
}
