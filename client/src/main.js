import Phaser from "phaser";
import { fetchClasses, apiRegister, apiLogin } from "./net/api.js";
import { GameScene } from "./scenes/GameScene.js";

const authScreen = document.getElementById("auth-screen");
const gameContainer = document.getElementById("game-container");
const chatOverlay = document.getElementById("chat-overlay");
const hint = document.getElementById("hint");
const errorBox = document.getElementById("auth-error");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const classGrid = document.getElementById("class-grid");

let selectedClass = null;

// --- Abas login/registro -------------------------------------------------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll("form").forEach((f) => f.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`${btn.dataset.tab}-form`).classList.add("active");
    errorBox.textContent = "";
  });
});

// --- Grade de classes ------------------------------------------------------
fetchClasses().then((classes) => {
  classGrid.innerHTML = "";
  classes.forEach((c) => {
    const div = document.createElement("div");
    div.className = "class-option";
    div.textContent = c.label;
    div.style.color = `#${c.color.toString(16).padStart(6, "0")}`;
    div.addEventListener("click", () => {
      document.querySelectorAll(".class-option").forEach((el) => el.classList.remove("selected"));
      div.classList.add("selected");
      selectedClass = c.key;
    });
    classGrid.appendChild(div);
  });
});

// --- Login -----------------------------------------------------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";
  try {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const { token, character } = await apiLogin(username, password);
    enterWorld(token, character);
  } catch (err) {
    errorBox.textContent = err.message;
  }
});

// --- Registro ----------------------------------------------------------------
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";
  if (!selectedClass) {
    errorBox.textContent = "Escolha uma classe.";
    return;
  }
  try {
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;
    const { token, character } = await apiRegister(username, password, selectedClass);
    enterWorld(token, character);
  } catch (err) {
    errorBox.textContent = err.message;
  }
});

// --- Transição para o jogo -----------------------------------------------
function enterWorld(token, character) {
  localStorage.setItem("mmorpg_token", token);

  authScreen.style.display = "none";
  gameContainer.style.display = "block";
  chatOverlay.style.display = "block";
  hint.style.display = "block";

  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: "game-container",
    backgroundColor: "#1c2b1c",
    scene: [GameScene],
  };

  const game = new Phaser.Game(config);
  game.registry.set("token", token);
  game.registry.set("character", character);
}

// Se já existe um token salvo, tenta reconectar direto (sem repetir a IU de login).
// Simplificação: ainda pedimos confirmação, então deixamos o token disponível
// só para preencher o campo de usuário automaticamente, sem pular a tela.
