"use strict";

(() => {
  const title = document.getElementById("entry-title");
  const form = document.getElementById("profile-form");
  const nickname = document.getElementById("nickname");
  const resume = document.getElementById("resume");
  const error = document.getElementById("form-error");
  const storageError = "O navegador não conseguiu guardar o perfil. Permita que o site salve dados ou abra-o em outro navegador.";

  function mostrarEntrada() {
    let perfil;
    try {
      perfil = window.FarmeiroPerfil.ler();
    } catch {
      error.textContent = storageError;
      return;
    }
    error.textContent = "";
    title.textContent = perfil ? `Bem-vindo, ${perfil.nickname}` : "Entre na fazenda";
    form.hidden = Boolean(perfil);
    resume.hidden = !perfil;
  }

  nickname.addEventListener("input", () => {
    nickname.removeAttribute("aria-invalid");
    error.textContent = "";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      window.FarmeiroPerfil.criar(nickname.value);
    } catch (cause) {
      if (cause instanceof RangeError) {
        error.textContent = cause.message;
        nickname.setAttribute("aria-invalid", "true");
        nickname.focus();
      } else {
        error.textContent = storageError;
      }
      return;
    }
    location.assign(resume.href);
  });
  window.addEventListener("pageshow", mostrarEntrada);
  mostrarEntrada();
})();
