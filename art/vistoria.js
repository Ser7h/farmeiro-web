/* Visor ortográfico do GLB da campanha. Sem dependências de rede ou bibliotecas. */
"use strict";
(async function () {
  const canvas = document.getElementById("map"),
    status = document.getElementById("msg");
  if (window.self !== window.top) document.getElementById("back").hidden = true;
  const selected = document.getElementById("selected"),
    menu = document.getElementById("place");
  const places = {
    regiao: [0.5, 0.5, 1000],
    helena: [0.42, 0.5, 210],
    vista: [0.65, 0.26, 238],
    clara: [0.71, 0.76, 230],
  };
  const names = {
    "02-03": "Alto · Santa Helena",
    "01-04": "Grota · Santa Helena",
    "03-02": "Alto · Boa Vista",
    "03-03": "Grota · Boa Vista",
    "03-04": "Alto · Água Clara",
    "03-05": "Grota · Água Clara",
  };
  const cam = { theta: 0, elev: 0.925, width: 1000, at: [0, 0, 0] };
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: true, preserveDrawingBuffer: false });
  if (!gl) {
    status.innerHTML =
      'Este navegador precisa de WebGL 2 para a vistoria. <a href="../jogar/">Voltar ao mapa da safra</a>.';
    return;
  }
  const clamped = (v, min, max) => Math.max(min, Math.min(max, v));
  const get = (tag) => document.getElementById(tag);
  let renderItems = [],
    currentId = 0,
    picking = false,
    shadow = false,
    program,
    uni,
    lightTex,
    fbo,
    ready = false;
  const vs = `#version 300 es
  layout(location=0) in vec3 pos; uniform vec3 rightAxis,upAxis,eyeAxis,center;
  uniform vec2 halfSize; uniform bool lightPass;
  out vec3 world; out vec3 shadowPoint;
  void main(){
    world=pos; vec3 light=normalize(vec3(-.55,.81,.68));
    vec3 lx=normalize(cross(vec3(0,1,0),light));vec3 ly=cross(light,lx);
    shadowPoint=vec3(dot(pos,lx)/920.,dot(pos,ly)/850.,-dot(pos,light)/1450.);
    vec3 p=pos-center;
    gl_Position=vec4(lightPass?shadowPoint:vec3(dot(p,rightAxis)/halfSize.x,dot(p,upAxis)/halfSize.y,-dot(p,eyeAxis)/1450.),1.);
  }`;
  const fs = `#version 300 es
  precision highp float;
  in vec3 world;in vec3 shadowPoint;
  uniform vec3 base;uniform float code;uniform bool lightPass,pick,highlighted,withShadows;uniform sampler2D depthTex;
  out vec4 color;
  void main(){
    if(lightPass){color=vec4(1);return;}
    if(pick){color=vec4(code/255.,0,0,1);return;}
    vec3 n=normalize(cross(dFdx(world),dFdy(world)));
    vec3 light=normalize(vec3(-.55,.81,.68));float diff=max(dot(n,light),0.);
    float shadowing=1.;
    if(withShadows){
      vec3 sp=shadowPoint*.5+.5;float blocked=0.;
      for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
        float depth=texture(depthTex,sp.xy+vec2(x,y)/2048.).r;
        blocked+=step(depth+.00070,sp.z);
      }
      shadowing=1.-.67*blocked/9.;
    }
    vec3 surface=highlighted?mix(base,vec3(.72,.48,.08),.66):base;
    vec3 value=surface*(vec3(.49,.54,.59)+1.22*diff*shadowing*vec3(1.,.94,.82));
    color=vec4(pow(max(value,vec3(0)),vec3(1./2.2)),1);
  }`;
  function compile(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  async function localFile() {
    if (location.protocol !== "file:") {
      const response = await fetch("../assets/regiao.glb");
      if (!response.ok) throw Error("Não foi possível abrir regiao.glb.");
      return response.arrayBuffer();
    }
    await new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.onload = ok;
      s.onerror = fail;
      s.src = "../assets/regiao-local.js";
      document.head.append(s);
    });
    const raw = atob(window.farmeiroGzip);
    delete window.farmeiroGzip;
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    return new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer();
  }
  function loadGeometry(array) {
    const view = new DataView(array),
      n = view.getUint32(12, true),
      baseOffset = 28 + n;
    if (view.getUint32(0, true) !== 0x46546c67) throw Error("Arquivo GLB inválido.");
    const data = JSON.parse(new TextDecoder().decode(new Uint8Array(array, 20, n)));
    const buffers = data.bufferViews.map((v) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(v.target, buffer);
      gl.bufferData(
        v.target,
        new Uint8Array(array, baseOffset + (v.byteOffset || 0), v.byteLength),
        gl.STATIC_DRAW,
      );
      return buffer;
    });
    for (const [i, mesh] of data.meshes.entries()) {
      for (const p of mesh.primitives) {
        const pos = data.accessors[p.attributes.POSITION],
          indices = data.accessors[p.indices];
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[pos.bufferView]);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, pos.componentType, false, 0, pos.byteOffset || 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[indices.bufferView]);
        const rgb = data.materials[p.material].pbrMetallicRoughness.baseColorFactor.slice(0, 3);
        renderItems.push({
          id: i + 1,
          name: mesh.name,
          vao,
          count: indices.count,
          type: indices.componentType,
          at: indices.byteOffset || 0,
          rgb,
        });
      }
    }
    gl.bindVertexArray(null);
  }
  function shadowMap() {
    lightTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, lightTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT24,
      2048,
      2048,
      0,
      gl.DEPTH_COMPONENT,
      gl.UNSIGNED_INT,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, lightTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    shadow = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindTexture(gl.TEXTURE_2D, null);
    if (shadow) {
      gl.viewport(0, 0, 2048, 2048);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.uniform1i(uni.lightPass, 1);
      drawItems();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, lightTex);
    gl.uniform1i(uni.lightPass, 0);
    gl.uniform1i(uni.withShadows, shadow ? 1 : 0);
  }
  function drawItems() {
    for (const item of renderItems) {
      gl.uniform3fv(uni.base, item.rgb);
      gl.uniform1f(uni.code, item.id);
      gl.uniform1i(uni.highlighted, item.id === currentId ? 1 : 0);
      gl.bindVertexArray(item.vao);
      gl.drawElements(gl.TRIANGLES, item.count, item.type, item.at);
    }
  }
  function render() {
    if (!ready) return;
    const dpi = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpi)),
      h = Math.max(1, Math.round(canvas.clientHeight * dpi));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const t = cam.theta,
      e = cam.elev,
      ct = Math.cos(t),
      st = Math.sin(t),
      ce = Math.cos(e),
      se = Math.sin(e);
    gl.uniform3fv(uni.rightAxis, [ct, 0, -st]);
    gl.uniform3fv(uni.upAxis, [-st * se, ce, -ct * se]);
    gl.uniform3fv(uni.eyeAxis, [st * ce, se, ct * ce]);
    gl.uniform3fv(uni.center, cam.at);
    gl.uniform2fv(uni.halfSize, [cam.width / 2, (cam.width * h) / w / 2]);
    gl.uniform1i(uni.pick, picking ? 1 : 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(...(picking ? [0, 0, 0, 1] : [0.35, 0.44, 0.3, 1]));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawItems();
  }
  function viewpoint(place) {
    const values = places[place] || places.regiao;
    const [u, v, width] = values;
    const z =
      13 * Math.sin(u * 5.2 + v * 3.1) +
      6 * Math.cos(v * 7 - 0.7 * u) +
      4 * Math.cos(u * 12 + v * 5) +
      10 * Math.exp(-((u - 0.3) ** 2 / 0.045 + (v - 0.27) ** 2 / 0.047));
    const elev = (53 * Math.PI) / 180;
    cam.at =
      place === "regiao"
        ? [0, 0, 0]
        : [
            (u - 0.5) * 1000,
            z,
            (-(0.5 - v) * (1000 / 1.5)) / Math.sin(elev) + (z * Math.cos(elev)) / Math.sin(elev),
          ];
    cam.width = width;
    cam.elev = place === "regiao" ? 0.925 : 0.64;
    cam.theta = place === "regiao" ? 0 : 0.25;
    currentId = 0;
    selected.textContent = menu.selectedOptions[0].textContent;
    render();
  }
  function zoom(f) {
    cam.width = clamped(cam.width * f, 90, 1250);
    render();
  }
  let start = null;
  function pick(x, y) {
    const rect = canvas.getBoundingClientRect();
    const pixel = new Uint8Array(4);
    picking = true;
    render();
    gl.readPixels(
      Math.floor(((x - rect.left) / rect.width) * canvas.width),
      canvas.height - 1 - Math.floor(((y - rect.top) / rect.height) * canvas.height),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel,
    );
    currentId = pixel[0];
    const model = renderItems.find((i) => i.id === currentId);
    if (model) {
      const id = /Talhão (\d+-\d+)/.exec(model.name);
      selected.textContent = id && names[id[1]] ? names[id[1]] : model.name;
    } else selected.textContent = "Região de Cascavel";
    picking = false;
    render();
  }
  canvas.addEventListener("pointerdown", (ev) => {
    canvas.focus();
    canvas.setPointerCapture(ev.pointerId);
    start = { x: ev.clientX, y: ev.clientY, t: cam.theta, e: cam.elev, changed: false };
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!start) return;
    const dx = ev.clientX - start.x,
      dy = ev.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) start.changed = true;
    if (start.changed) {
      cam.theta = start.t - dx * 0.006;
      cam.elev = clamped(start.e + dy * 0.004, 0.3, 1.52);
      render();
    }
  });
  canvas.addEventListener("pointerup", (ev) => {
    if (start && !start.changed && ready) pick(ev.clientX, ev.clientY);
    start = null;
  });
  canvas.addEventListener("pointercancel", () => {
    start = null;
  });
  canvas.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      zoom(ev.deltaY > 0 ? 1.12 : 0.89);
    },
    { passive: false },
  );
  canvas.addEventListener("keydown", (ev) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-"].includes(ev.key)) return;
    ev.preventDefault();
    if (ev.key === "ArrowLeft") cam.theta -= 0.12;
    if (ev.key === "ArrowRight") cam.theta += 0.12;
    if (ev.key === "ArrowUp") cam.elev = clamped(cam.elev + 0.1, 0.3, 1.52);
    if (ev.key === "ArrowDown") cam.elev = clamped(cam.elev - 0.1, 0.3, 1.52);
    if (ev.key === "+" || ev.key === "=") zoom(0.85);
    else if (ev.key === "-") zoom(1.15);
    else render();
  });
  get("out").onclick = () => zoom(1.22);
  get("in").onclick = () => zoom(0.82);
  get("reset").onclick = () => viewpoint(menu.value);
  menu.onchange = () => viewpoint(menu.value);
  window.addEventListener("resize", render);
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    uni = {};
    for (const key of [
      "rightAxis",
      "upAxis",
      "eyeAxis",
      "center",
      "halfSize",
      "lightPass",
      "pick",
      "base",
      "code",
      "highlighted",
      "depthTex",
      "withShadows",
    ]) {
      uni[key] = gl.getUniformLocation(program, key);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.DITHER);
    loadGeometry(await localFile());
    shadowMap();
    ready = true;
    const param = new URLSearchParams(location.search).get("fazenda");
    menu.value = Object.hasOwn(places, param) ? param : "regiao";
    viewpoint(menu.value);
    status.textContent = "";
    document.documentElement.dataset.modelo = "pronto";
  } catch (err) {
    status.textContent = "Falha ao abrir a vistoria 3D. " + (err.message || String(err));
    console.error(err);
  }
})();
