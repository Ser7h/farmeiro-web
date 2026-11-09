"use strict";

(() => {
  const key = "farmeiro.pages.perfil.v1";
  const allowed = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} _-]{1,23}$/u;

  function normalizar(value) {
    if (typeof value !== "string") return null;
    const nickname = value.normalize("NFC").trim();
    return allowed.test(nickname) ? nickname : null;
  }

  function ler() {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      return null;
    }
    const nickname = normalizar(stored?.nickname);
    return nickname ? { nickname } : null;
  }

  function criar(value) {
    const nickname = normalizar(value);
    if (!nickname) {
      throw new RangeError("Use de 2 a 24 letras, números, espaços, hífens ou sublinhados. Comece com uma letra ou um número.");
    }
    const existente = ler();
    if (existente) return existente;
    const perfil = { nickname };
    localStorage.setItem(key, JSON.stringify(perfil));
    return perfil;
  }

  window.FarmeiroPerfil = Object.freeze({ ler, criar });
})();
