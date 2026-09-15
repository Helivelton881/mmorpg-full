const API_URL = "http://localhost:2567";

export async function fetchClasses() {
  const res = await fetch(`${API_URL}/api/classes`);
  return res.json();
}

export async function apiRegister(username, password, className) {
  const res = await fetch(`${API_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, className }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao criar conta.");
  return data; // { token, character }
}

export async function apiLogin(username, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao entrar.");
  return data; // { token, character }
}
