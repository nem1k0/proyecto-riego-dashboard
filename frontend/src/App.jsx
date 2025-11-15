// --- Pega este código en frontend/src/App.jsx ---

import React, { useState, useEffect } from "react";
import axios from "axios"; // Importamos axios para hablar con el backend
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";

// --- Datos de Ejemplo (Provisionales) ---
// (Los moveremos al backend después, pero los dejamos para que el gráfico funcione)
const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const humedadData = meses.map((m, i) => ({
  mes: m,
  Antes: Math.round(40 + Math.sin(i / 2) * 6 + Math.random() * 4),
  Despues: Math.round(55 + Math.cos(i / 1.7) * 5 + Math.random() * 3),
}));
const activacionesMock = [
  { id: 1, fecha: "2025-01-12", hora: "06:15", duracion_min: 30, sector: "Norte" },
  { id: 2, fecha: "2025-02-03", hora: "05:50", duracion_min: 45, sector: "Sur" },
];

// --- Configuración de la API ---
// La dirección de tu servidor backend
const API_URL = "http://localhost:3001/api";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para los datos (ahora vacíos por defecto)
  const [data, setData] = useState(humedadData); // (Usamos mock por ahora)
  const [activaciones, setActivaciones] = useState(activacionesMock); // (Usamos mock por ahora)
  const [filterMonth, setFilterMonth] = useState("");

  // Efecto para verificar si ya hay un token guardado
  useEffect(() => {
    const token = localStorage.getItem("token_riego");
    const savedUser = localStorage.getItem("user_riego");

    if (token && savedUser) {
      // Si tenemos token, asumimos que está logueado
      // (En producción, deberíamos re-validar el token contra el backend)
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // --- Función de Login (¡La importante!) ---
  async function handleLogin({ username, password }) {
    setLoading(true);

    try {
      // 1. Llamada al backend real (http://localhost:3001/api/login)
      const response = await axios.post(`${API_URL}/login`, {
        username: username,
        password: password,
      });

      // 2. Si llegamos aquí, el login fue exitoso
      const { token, user } = response.data;

      // 3. Guardamos el token y el usuario en el navegador
      localStorage.setItem("token_riego", token);
      localStorage.setItem("user_riego", JSON.stringify(user));
      setUser(user); // Actualiza el estado para mostrar el dashboard

      // (En un futuro, aquí llamaríamos a la función para cargar datos)
      // fetchDashboardData(token);

    } catch (error) {
      // 4. Si el backend responde con error (401, 500, etc.)
      console.error("Error en el login:", error);
      alert("Credenciales incorrectas. (Prueba admin / riego123)");
    } finally {
      setLoading(false); // Detiene el spinner de carga
    }
  }

  // --- Función de Logout ---
  function handleLogout() {
    localStorage.removeItem("token_riego");
    localStorage.removeItem("user_riego");
    setUser(null);
    setData([]); // Limpiamos los datos
    setActivaciones([]); // Limpiamos los datos
  }
  
  // Filtro simple de la tabla por mes (lógica de tu código)
  const activacionesFiltradas = activaciones.filter((a) => {
    if (!filterMonth) return true;
    const fecha = new Date(a.fecha);
    const mesIndex = fecha.getMonth();
    return meses[mesIndex] === filterMonth;
  });

  // --- El resto de tu código JSX (HTML) va aquí ---
  // (Cambié 'className' por 'style' para que funcione sin Tailwind)
  
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", padding: "24px" }}>
      <div style={{ maxWidth: "1152px", margin: "auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>Dashboard - Sistema de Riego</h1>
          <div>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "14px", color: "#4B5563" }}>Usuario: {user.username}</span>
                <button
                  style={{ padding: "4px 12px", borderRadius: "4px", backgroundColor: "#EF4444", color: "white", fontSize: "14px", border: "none", cursor: "pointer" }}
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <span style={{ fontSize: "14px", color: "#374151" }}>No has ingresado</span>
            )}
          </div>
        </header>

        {!user ? (
          // --- VISTA DE LOGIN ---
          <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "24px" }}>
            <div style={{ padding: "24px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Iniciar sesión</h2>
              <LoginForm onLogin={handleLogin} loading={loading} />
              <div style={{ marginTop: "16px", fontSize: "12px", color: "#6B7281" }}>
                Credenciales demo: <strong>admin</strong> / <strong>riego123</strong>
              </div>
            </div>

            <div style={{ padding: "24px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Características principales</h2>
              <ul style={{ listStyleType: "disc", paddingLeft: "20px", gap: "8px", color: "#374151" }}>
                <li>Visualización de datos: gráficos, tablas y elementos visuales claros.</li>
                <li>Centralización de información: reúne datos de múltiples fuentes.</li>
                <li>Seguimiento en tiempo real: datos actualizados al instante.</li>
                <li>Toma de decisiones: detecta tendencias y problemas para decisiones estratégicas.</li>
              </ul>
            </div>
          </div>
        ) : (
          // --- VISTA DEL DASHBOARD (SI ESTÁ LOGUEADO) ---
          <main style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <section style={{ padding: "24px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Humedad del suelo (Antes vs Después)</h2>
              <p style={{ fontSize: "14px", color: "#6B7281", marginBottom: "16px" }}>Valores promedio mensuales (% de humedad).</p>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis domain={[20, 80]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Antes" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="Despues" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            {/* Aquí iría el resto de tu dashboard (tabla, etc.) */}
          </main>
        )}
      </div>
    </div>
  );
}

// --- Componentes auxiliares (igual que en tu código) ---
function LoginForm({ onLogin, loading }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function submit(e) {
    e.preventDefault();
    onLogin({ username, password });
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <label style={{ display: "block", fontSize: "14px", color: "#374151" }}>Usuario</label>
        <input
          style={{ boxSizing: "border-box", marginTop: "4px", display: "block", width: "100%", border: "1px solid #D1D5DB", borderRadius: "4px", padding: "8px" }}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: "14px", color: "#374151" }}>Contraseña</label>
        <input
          type="password"
          style={{ boxSizing: "border-box", marginTop: "4px", display: "block", width: "100%", border: "1px solid #D1D5DB", borderRadius: "4px", padding: "8px" }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <button
          type="submit"
          style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", color: "white", backgroundColor: loading ? "#9CA3AF" : "#16A34A", border: "none", cursor: "pointer" }}
          disabled={loading}
        >
          {loading ? "Validando..." : "Ingresar"}
        </button>
      </div>
    </form>
  );
}