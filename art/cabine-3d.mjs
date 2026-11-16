import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Um metro da cabine corresponde a um metro no terreno desenhado.
// O norte do talhão é -Z em Three.js e +z no modelo de condução.
const larguraFaixa = 7, comprimento = 96, alturaOlhos = 3.05;
const tau = Math.PI * 2;
const limitar = T.MathUtils.clamp;
const maquinas = new URL("../assets/maquinas/", import.meta.url);

function sorteio(semente) {
  return () => {
    semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0;
    return semente / 4294967296;
  };
}

function textura(largura, altura, pintar) {
  const imagem = document.createElement("canvas");
  imagem.width = largura;
  imagem.height = altura;
  pintar(imagem.getContext("2d"), largura, altura);
  const mapa = new T.CanvasTexture(imagem);
  mapa.colorSpace = T.SRGBColorSpace;
  return mapa;
}

function ceu(cena) {
  const mapa = textura(1024, 256, (c, w, h) => {
    const ceu = c.createLinearGradient(0, 0, 0, h);
    for (const [p, cor] of [[0,"#447da2"],[.27,"#76a2bd"],[.45,"#bbcfce"],[.53,"#ecdab6"],[.73,"#b3ac90"],[1,"#a9aa88"]]) ceu.addColorStop(p,cor);
    c.fillStyle = ceu;
    c.fillRect(0, 0, w, h);
    const rnd = sorteio(48);
    function pluma(x, y, rx, ry, opacidade) {
      c.save();
      c.translate(x, y);
      c.scale(rx, ry);
      const gr = c.createRadialGradient(0,0,0,0,0,1);
      gr.addColorStop(0,"rgba(255,249,225," + opacidade + ")");
      gr.addColorStop(1,"rgba(255,250,230,0)");
      c.fillStyle = gr;
      c.fillRect(-1,-1,2,2);
      c.restore();
    }
    for (let i=0;i<30;i++) {
      const x=rnd()*w, y=53+rnd()*65, escala=.45+rnd(), n=9+Math.floor(rnd()*15);
      for (let j=0;j<n;j++) {
        const dx=(rnd()-.5)*110*escala, dy=(rnd()-.5)*7*escala;
        const rx=6+rnd()*20*escala, ry=1.4+rnd()*4*escala;
        for (const offset of [-w,0,w]) pluma(x+dx+offset,y+dy,rx,ry,.24);
      }
    }
  });
  const domo = new T.Mesh(new T.SphereGeometry(355, 36, 20), new T.MeshBasicMaterial({map:mapa, side:T.BackSide, depthWrite:false, fog:false, toneMapped:false}));
  domo.renderOrder = -4;
  cena.add(domo);
  return domo;
}

function material(cor, extra={}) {
  return new T.MeshStandardMaterial({color:cor, roughness:.88, ...extra});
}

function plano(pai, w, h, x, y, z, mat) {
  const obj = new T.Mesh(new T.PlaneGeometry(w,h),mat);
  obj.rotation.x = -Math.PI/2;
  obj.position.set(x,y,z);
  pai.add(obj);
  return obj;
}

function solo(cena, metade) {
  const rnd = sorteio(848);
  const terra = textura(192,192,(c,w,h) => {
    c.fillStyle="#9c734f"; c.fillRect(0,0,w,h);
    for(let i=0;i<3400;i++) {
      c.fillStyle = i%3 ? "rgba(67,46,27,.12)" : "rgba(241,210,156,.27)";
      c.fillRect(rnd()*w,rnd()*h,1+rnd()*3,1+rnd()*1.8);
    }
    for(let i=0;i<8;i++) {
      c.fillStyle="rgba(107,75,48,.15)";
      c.fillRect(i*w/8,0,2,h);
    }
  });
  terra.wrapS=terra.wrapT=T.RepeatWrapping;
  terra.repeat.set(220,220);
  plano(cena,850,850,0,-.09,-48,material("#afbd86",{map:terra}));
  const rodado=terra.clone();
  rodado.repeat.set(21,31);
  plano(cena,metade*2+16,comprimento+32,0,-.036,-comprimento/2,material("#efbf96",{map:rodado}));
  const palha=textura(192,192,(c,w,h)=>{
    c.fillStyle="#9c7950"; c.fillRect(0,0,w,h);
    for(let i=0;i<8;i++) {
      c.fillStyle=i%2?"#998057":"#a58b5d"; c.fillRect(i*w/8,0,5,h);
    }
    for(let i=0;i<1750;i++) {
      const x=rnd()*w,y=rnd()*h;
      c.strokeStyle=i%3===0?"#795a39":i%3===1?"#b5a06f":"#c5ac75";
      c.lineWidth=.6+rnd()*1.2;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+(rnd()-.5)*4,y+1+rnd()*7);c.stroke();
    }
  });
  palha.wrapS=palha.wrapT=T.RepeatWrapping;
  palha.repeat.set(metade*2/4,comprimento/4);
  plano(cena,metade*2,comprimento,0,-.01,-comprimento/2,material("#fff3d2",{map:palha}));
}

function montes(cena) {
  for(let camada=0;camada<3;camada++) {
    const vertices=[],indices=[];
    const raio=112+camada*45;
    for(let i=0;i<=100;i++) {
      const a=i*tau/100;
      const ondulacao=4*Math.sin(3*a+camada*.9)+3*Math.sin(8*a+camada*2)+1.7*Math.cos(12*a);
      const x=Math.cos(a)*raio, z=-48+Math.sin(a)*raio;
      vertices.push(x,-.14,z,x,5+camada*4+ondulacao,z);
      if(i>0){const k=i*2;indices.push(k-2,k-1,k,k,k-1,k+1);}
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
    geo.setIndex(indices);
    cena.add(new T.Mesh(geo,new T.MeshBasicMaterial({color:["#82916b","#8e9a84","#9eaa99"][camada],side:T.DoubleSide})));
  }
}

function entorno(cena,metade) {
  const rnd=sorteio(92);
  const arvores=[];
  for(let i=0;i<94;i++) {
    const a=i*tau/94+rnd()*.03, r=72+rnd()*26;
    arvores.push([Math.cos(a)*r,-48+Math.sin(a)*r,4+rnd()*4.6]);
  }
  for(let i=0;i<13;i++) arvores.push([-metade-16-rnd()*7,8-i*9,5+rnd()*2.3]);
  const dummy=new T.Object3D();
  const troncos=new T.InstancedMesh(new T.CylinderGeometry(.14,.23,1,5),material("#76674d"),arvores.length);
  const copas=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),material("#ffffff",{flatShading:true}),arvores.length*4);
  const cores=["#617e4d","#798c55","#6a7b45","#496741","#8d965a"];
  arvores.forEach(([x,z,h],i)=>{
    dummy.position.set(x,h*.29,z);dummy.scale.set(1,h*.58,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();
    troncos.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<4;j++){
      const d=j===0?0:h*.18,a=j*2.1+rnd()*.5;
      dummy.position.set(x+d*Math.cos(a),h*(j===0?.76:.58),z+d*Math.sin(a));
      dummy.scale.set(h*(.22+rnd()*.08),h*(.23+rnd()*.08),h*(.23+rnd()*.08));
      dummy.rotation.set(.3*rnd(),rnd()*tau,rnd()*.25); dummy.updateMatrix();
      copas.setMatrixAt(i*4+j,dummy.matrix);copas.setColorAt(i*4+j,new T.Color(cores[Math.floor(rnd()*cores.length)]));
    }
  });
  cena.add(troncos,copas);
  const arame=[],estacas=[];
  for(const lado of [-1,1]) {
    const x=lado*(metade+12);
    for(let z=-112;z<=24;z+=6) estacas.push([x,z]);
    for(const h of [.47,.83]) arame.push(x,h,-112,x,h,20);
  }
  const postes=new T.InstancedMesh(new T.BoxGeometry(.14,1.15,.14),material("#806a4a"),estacas.length);
  estacas.forEach(([x,z],i)=>{
    dummy.scale.set(1,1,1);dummy.rotation.set(0,rnd()*.3,(rnd()-.5)*.11);dummy.position.set(x,.57,z);dummy.updateMatrix();postes.setMatrixAt(i,dummy.matrix);
  });
  const linhas = new T.BufferGeometry().setAttribute("position",new T.Float32BufferAttribute(arame,3));
  cena.add(postes,new T.LineSegments(linhas,new T.LineBasicMaterial({color:"#706e57",transparent:true,opacity:.66})));

  const sitio = new T.Group();
  sitio.position.set(13,0,-137);
  sitio.rotation.y=-.19;
  cena.add(sitio);
  const zinco=textura(72,72,(c,w,h)=>{
    c.fillStyle="#b6bab4";c.fillRect(0,0,w,h);
    for(let i=0;i<h;i+=6){c.fillStyle="#949b99";c.fillRect(0,i,w,1);c.fillStyle="#d1d2c8";c.fillRect(0,i+1,w,1);}
  });
  zinco.wrapS=zinco.wrapT=T.RepeatWrapping;zinco.repeat.set(2,5);
  for(const x of [-8,-2.5]){
    const corpo=new T.Mesh(new T.CylinderGeometry(2.55,2.55,8.1,30),material("#d7dbcf",{map:zinco,metalness:.18,roughness:.56}));
    corpo.position.set(x,4.05,0);
    const teto=new T.Mesh(new T.ConeGeometry(2.78,1.8,30),material("#b8c2be",{metalness:.22}));
    teto.position.set(x,9,0);sitio.add(corpo,teto);
  }
  const galpao=new T.Mesh(new T.BoxGeometry(13,3.7,8),material("#b08a65"));
  galpao.position.set(9,1.85,0);sitio.add(galpao);
  for(const lado of [-1,1]) {
    const telha=new T.Mesh(new T.BoxGeometry(14,.18,4.8),material("#955d46"));
    telha.rotation.x=lado*.27;telha.position.set(9,4.35,lado*2.2);sitio.add(telha);
  }
  for(const x of [6.3,10.7]){
    const porta=new T.Mesh(new T.BoxGeometry(3.7,3,.08),material("#544e3d"));
    porta.position.set(x,1.52,4.06);sitio.add(porta);
  }
}

// Cada instância contém as plantas de um trecho da passada. Quando o motor
// registra o corte, some apenas aquele trecho, inclusive ao retomar a partida.
function lavoura(cena,faixas,passadas,cultura) {
  const milho=String(cultura).toLowerCase().includes("milho"),rnd=sorteio(milho?651:143);
  const folhagem=textura(128,160,(c,w,h)=>{
    function folha(x,y,dx,dy,largura,cor) {
      c.fillStyle=cor;c.beginPath();c.moveTo(x,y);
      c.quadraticCurveTo(x+dx*.5-dy*largura,y+dy*.5+dx*largura,x+dx,y+dy);
      c.quadraticCurveTo(x+dx*.45+dy*largura,y+dy*.45-dx*largura,x,y);c.fill();
    }
    const paleta=milho?["#b19a52","#d3b56d","#b1a05e","#d1bd7c"]:["#9b8646","#ad8c46","#b49e56","#c3a75c","#9b9150"];
    for(let k=0;k<(milho?3:7);k++) {
      const bx=13+k*(milho?48:17), topo=4+rnd()*27, desvio=(rnd()-.5)*19;
      c.strokeStyle=milho?"#b7a06a":"#9b7b41";c.lineWidth=milho?3.3:1.75;c.beginPath();c.moveTo(bx,h);c.lineTo(bx+desvio,topo);c.stroke();
      for(let n=0;n<(milho?8:12);n++) {
        const p=(n+.6)/(milho?9:13), y=h-(h-topo)*p, x=bx+p*desvio, lado=(n%2)*2-1;
        const dx=lado*(milho?31:13)*(.35+Math.sin(p*Math.PI)*.65),dy=milho?-9-rnd()*23:-4-rnd()*14;
        const cor=paleta[Math.floor(rnd()*paleta.length)];
        folha(x,y,dx,dy,milho?.16:.22,cor);
        if(!milho){
          c.fillStyle="#d4ad66";c.beginPath();c.ellipse(x+dx*.45,y+dy*.45+2.4,1.7+rnd(),3+rnd()*2,lado*.45,0,tau);c.fill();
        }
      }
      if(milho) for(let j=-3;j<=3;j++){
        c.strokeStyle="#c8aa70";c.lineWidth=1.45;c.beginPath();c.moveTo(bx+desvio,topo+13);c.lineTo(bx+desvio+j*3,topo-2+Math.abs(j));c.stroke();
      }
    }
  });
  const pos=[],uv=[],indices=[],cores=[];
  const fileiras=milho?6:8, porLinha=milho?3:4, tamanho=comprimento/passadas[0].length;
  for(let col=0;col<fileiras;col++) for(let planta=0;planta<porLinha;planta++){
    const x=(col+.5)*larguraFaixa/fileiras+(rnd()-.5)*.19;
    const z=-(planta+.48+(rnd()-.5)*.56)*tamanho/porLinha;
    const alt=(milho?1.84:.88)*(.8+.35*rnd()), raio=(milho?.72:.64)*(.8+.35*rnd()), a=.3+.27*rnd();
    const tom=.80+.2*rnd();
    for(let plano=0;plano<2;plano++){
      const ang=a+plano*Math.PI/2, dx=raio*Math.cos(ang), dz=raio*Math.sin(ang);
      const i=pos.length/3;
      pos.push(x-dx,0,z-dz,x+dx,0,z+dz,x+dx,alt,z+dz,x-dx,alt,z-dz);
      uv.push(0,0,1,0,1,1,0,1);indices.push(i,i+1,i+2,i,i+2,i+3);
      for(const luz of [.64,.64,1,1]) cores.push(tom*luz,tom*luz,tom*luz);
    }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute("position",new T.Float32BufferAttribute(pos,3));
  geo.setAttribute("uv",new T.Float32BufferAttribute(uv,2));
  geo.setAttribute("color",new T.Float32BufferAttribute(cores,3));
  geo.setIndex(indices);
  const mat=new T.MeshBasicMaterial({map:folhagem,vertexColors:true,alphaTest:.42,side:T.DoubleSide,toneMapped:false});
  const quantidade=faixas*passadas[0].length;
  const plantas=new T.InstancedMesh(geo,mat,quantidade);
  plantas.frustumCulled=false;
  plantas.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const visto=new Int8Array(quantidade).fill(-1),matriz=new T.Matrix4();
  cena.add(plantas);
  return () => {
    let mudou=false;
    for(let f=0;f<faixas;f++) for(let t=0;t<passadas[f].length;t++){
      const i=f*passadas[f].length+t,corte=Number(passadas[f][t]);
      if(visto[i]===corte)continue;
      visto[i]=corte;mudou=true;
      // Escala nula produziria uma inversa indefinida em shaders de instâncias.
      matriz.makeTranslation((f-faixas/2)*larguraFaixa,corte?-12:0,-t*tamanho);
      plantas.setMatrixAt(i,matriz);
    }
    if(mudou) plantas.instanceMatrix.needsUpdate=true;
  };
}

function iluminar(cena) {
  const ambiente = new T.HemisphereLight(0xfff2da,0xa19773,1.50);
  const sol = new T.DirectionalLight(0xffe2b0,2.3);
  sol.position.set(-70,68,-56);
  const reflexoDoCeu = new T.DirectionalLight(0xdce8e7,.48);
  reflexoDoCeu.position.set(23,32,42);
  cena.add(ambiente,sol,reflexoDoCeu);
}

function balizas(cena) {
  const grupo=new T.Group();
  const madeira=material("#756345"),branca=material("#ede6c8"),laranja=material("#d17932");
  for (const z of [.15,-comprimento-.15]) {
    for(const lado of [-1,1]) {
      const p=new T.Mesh(new T.BoxGeometry(.075,1.14,.075),madeira);
      p.position.set(lado*(larguraFaixa*.5-.10),.57,z);
      const ponta=new T.Mesh(new T.BoxGeometry(.12,.24,.12),laranja);
      ponta.position.set(p.position.x,1.18,z);
      const fita=new T.Mesh(new T.BoxGeometry(.125,.075,.125),branca);
      fita.position.set(p.position.x,1.16,z);
      grupo.add(p,ponta,fita);
    }
  }
  cena.add(grupo);
  return grupo;
}

function prepararDescarga(cena, cabine, carreta) {
  // A câmera de transbordo enquadra o bocal e o interior da caçamba, inclusive
  // quando a carreta já saiu do campo de visão do para-brisa.
  cena.background=new T.Color("#c5d6d2");
  iluminar(cena);
  plano(cena,70,70,0,-.04,0,material("#ad936f"));
  const carro=carreta.clone(true), interior=cabine.clone(true);
  cena.add(carro,interior);
  const tubo=interior.getObjectByName("TuboDescarga"), bocal=interior.getObjectByName("Bocal");
  if (tubo) tubo.rotateY(-1.86);
  const monte=carro.getObjectByName("Graos");
  const centro=monte ? new T.Box3().setFromObject(monte).getCenter(new T.Vector3()) : new T.Vector3(0,2.9,0);
  const boca=centro.clone().add(new T.Vector3(.13,1.45,.06));
  if(bocal){
    const atual=bocal.getWorldPosition(new T.Vector3());
    interior.position.copy(boca).sub(atual);
  } else interior.visible=false;
  const grãos=72;
  const xyz=new Float32Array(grãos*3), destino=centro.y+.04;
  const geometry=new T.BufferGeometry();
  const pos=new T.BufferAttribute(xyz,3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute("position",pos);
  const nuvem=new T.Points(geometry,new T.PointsMaterial({color:"#e8b55e",size:.053}));
  nuvem.frustumCulled=false;
  cena.add(nuvem);
  const camera=new T.PerspectiveCamera(36,1.8,.10,50);
  camera.position.copy(centro).add(new T.Vector3(-5.5,3.3,6.2));
  camera.lookAt(centro.clone().add(new T.Vector3(.1,.50,0)));
  const rnd=sorteio(84);
  const pontos=Array.from({length:grãos},()=>[rnd()-.5,rnd()-.5,rnd()]);
  return (renderer,tempo,w,h) => {
    const largura=Math.min(w*.40,Math.max(125,w*.26)), altura=largura/1.8;
    const margem=Math.max(6,Math.min(16,w*.025));
    pontos.forEach(([x,z,atraso],i)=>{
      const t=(tempo*3.1+atraso)%1;
      xyz[i*3]=boca.x+x*(.06+.23*t)-.13*t;
      xyz[i*3+1]=boca.y-(boca.y-destino)*t*t;
      xyz[i*3+2]=boca.z+z*(.08+.22*t);
    });
    pos.needsUpdate=true;
    renderer.setScissorTest(true);
    renderer.setViewport(w-largura-margem,margem,largura,altura);
    renderer.setScissor(w-largura-margem,margem,largura,altura);
    renderer.render(cena,camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0,0,w,h);
  };
}

function liberar(cenas) {
  const geometrias=new Set(),materiais=new Set(),texturas=new Set();
  for(const cena of cenas) cena.traverse(obj=>{
    if(obj.geometry)geometrias.add(obj.geometry);
    if(obj.isInstancedMesh)obj.dispose();
    if(obj.material){
      for(const mat of Array.isArray(obj.material)?obj.material:[obj.material]) materiais.add(mat);
    }
  });
  for(const mat of materiais){
    for(const value of Object.values(mat)) if(value?.isTexture)texturas.add(value);
    mat.dispose();
  }
  for(const t of texturas)t.dispose();
  for(const g of geometrias)g.dispose();
  for(const cena of cenas)cena.clear();
}

async function lerModelos(cena, signal) {
  const loader=new GLTFLoader();
  const modelos=await Promise.allSettled(["cabine","plataforma","carreta"].map(async nome=>{
    const caminho=new URL(nome+".glb",maquinas);
    caminho.search=new URL(import.meta.url).search;
    const resposta=await fetch(caminho,{signal});
    if(!resposta.ok)throw new Error("Modelo da colheita indisponível: "+nome+" ("+resposta.status+").");
    const bytes=await resposta.arrayBuffer();
    signal?.throwIfAborted();
    const gltf=await loader.parseAsync(bytes,maquinas.href);
    cena.add(gltf.scene);
    return gltf.scene;
  }));
  const falha=modelos.find(resultado=>resultado.status==="rejected");
  if(falha)throw falha.reason;
  signal?.throwIfAborted();
  return modelos.map(resultado=>resultado.value);
}

export async function criarVista3D(canvas,{faixas,cultura,passadas,posicaoCarreta,contexto,signal}) {
  signal?.throwIfAborted();
  const renderer=new T.WebGLRenderer({canvas,context:contexto,alpha:false,antialias:true,powerPreference:"high-performance"});
  const cena = new T.Scene(), transbordo = new T.Scene();
  let fechou=false;
  function fechar() {
    if(fechou)return;
    fechou=true;
    liberar([cena,transbordo]);
    renderer.dispose();
    renderer.forceContextLoss();
  }
  try {
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.05;
    const [cabine,plataforma,carreta]=await lerModelos(cena,signal);
    const metade=faixas*larguraFaixa/2;
    const camera=new T.PerspectiveCamera(66,1,.055,400);
    const corpo=new T.Group();
    cena.fog=new T.FogExp2("#c4c9b1",.0062);
    iluminar(cena);
    const horizonte=ceu(cena);
    montes(cena);solo(cena,metade);entorno(cena,metade);
    const atualizarCorte=lavoura(cena,faixas,passadas,cultura);
    const limites=balizas(cena);
    const mostrarDescarga=prepararDescarga(transbordo,cabine,carreta);
    corpo.add(cabine,plataforma,camera);
    cena.add(corpo);
    cabine.position.y=alturaOlhos;
    plataforma.position.set(0,0,-2.17);
    camera.position.set(0,alturaOlhos+.16,-.11);
    camera.rotation.x=-.235;
    carreta.rotation.y=Math.PI/2;
    const volante=cabine.getObjectByName("Volante"),molinete=plataforma.getObjectByName("Molinete"),tubo=cabine.getObjectByName("TuboDescarga");
    const baseVolante=volante?.quaternion.clone(),baseMolinete=molinete?.quaternion.clone(),baseTubo=tubo?.quaternion.clone();
    let ultimoW=0,ultimoH=0,alturaCabecote=.34;
    function desenhar(m,w,h,alvo,carro) {
      if(fechou || w<1 || h<1)return;
      if(w!==ultimoW || h!==ultimoH) {
        ultimoW=w;ultimoH=h;
        // Limitar a resolução mantém a visão utilizável em telas de alta densidade.
        const dpr=Math.min(window.devicePixelRatio || 1,1.35,Math.sqrt(1250000/(w*h)));
        renderer.setPixelRatio(dpr);
        renderer.setSize(w,h,false);
        camera.aspect=w/h;
        camera.fov=camera.aspect<1 ? 78 : 66;
        camera.updateProjectionMatrix();
      }
      corpo.position.set(m.x,0,-m.z);
      corpo.rotation.y=-m.rumo;
      horizonte.position.set(m.x,0,-m.z);
      limites.position.x=(alvo-(faixas-1)/2)*larguraFaixa;
      alturaCabecote += ((m.plataforma?0:.37)-alturaCabecote)*.34;
      plataforma.position.y=alturaCabecote;
      if(volante) {
        volante.quaternion.copy(baseVolante);
        volante.rotateZ(-m.volante*.9);
      }
      if(molinete) {
        molinete.quaternion.copy(baseMolinete);
        molinete.rotateX(-m.fase);
      }
      const restante=m.descargaAte-performance.now();
      if(tubo){
        tubo.quaternion.copy(baseTubo);
        if(restante>0)tubo.rotateY(-1.86*Math.min(1,(2100-restante)/260,restante/260));
      }
      const chegada=carro && posicaoCarreta(carro,m.x,metade);
      carreta.visible=Boolean(chegada);
      if(chegada)carreta.position.set(chegada.x,0,-chegada.z);
      atualizarCorte();
      renderer.render(cena,camera);
      if(restante>0)mostrarDescarga(renderer,(2100-restante)/1000,w,h);
    }
    return {desenhar,fechar};
  } catch(erro) {
    fechar();
    throw erro;
  }
}
