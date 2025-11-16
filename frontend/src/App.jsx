// --- Pega este código en frontend/src/App.jsx ---

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios"; // Importamos axios para hablar con el backend
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import gavePlantLogo from "./assets/gaveplant-logo.svg";

// --- Datos y configuración ---
const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const POLLING_INTERVAL_MS = 15000;
const API_URL = "http://44.222.108.5:3001/api";
const palette = {
  forest: "#184d47",
  leaf: "#45b649",
  lime: "#a3d562",
  mist: "#eff6ee",
  clay: "#f0ede0",
  text: "#0f2e1d",
  muted: "#5f746c",
  accent: "#1aa37a",
};
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sensorData, setSensorData] = useState([]);
  const [filterMonth, setFilterMonth] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [rangeHours] = useState(24);
  const [anchorTimestamp, setAnchorTimestamp] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

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

  const fetchSensorData = useCallback(async () => {
    try {
      setIsFetching(true);
      const response = await axios.get(`${API_URL}/sensor-data`);
      const payload = Array.isArray(response.data?.data) ? response.data.data : [];
      setSensorData(payload);
      setFetchError("");
      setAnchorTimestamp(response.data?.anchorTimestamp || payload[0]?.timestamp || null);
      setUsedFallback(Boolean(response.data?.usedFallback));
    } catch (error) {
      console.error("Error al obtener datos de sensores:", error);
      setFetchError("No se pudieron obtener los datos más recientes. Revisa la conexión.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setSensorData([]);
      return;
    }

    fetchSensorData();
    const interval = setInterval(fetchSensorData, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, fetchSensorData]);

  useEffect(() => {
    if (user) {
      fetchSensorData();
    }
  }, [user, fetchSensorData]);
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
    setSensorData([]);
    setFilterMonth("");
  }
  
  const filteredByRange = useMemo(() => {
    if (!sensorData.length) return [];
    const anchor = anchorTimestamp ? new Date(anchorTimestamp) : new Date(sensorData[0].timestamp);
    const anchorMs = anchor.getTime();
    const cutoffMs = anchorMs - rangeHours * 60 * 60 * 1000;
    return sensorData.filter((registro) => {
      const registroMs = new Date(registro.timestamp).getTime();
      return registroMs >= cutoffMs && registroMs <= anchorMs;
    });
  }, [sensorData, rangeHours, anchorTimestamp]);

  const chartData = useMemo(() => (
    filteredByRange
      .slice()
      .reverse()
      .map((registro) => {
        const fecha = new Date(registro.timestamp);
        return {
          etiqueta: `${fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} ${fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`,
          humedad: Number(registro.humedad),
        };
      })
  ), [filteredByRange]);

  const ultimaLectura = useMemo(() => (
    filteredByRange.length ? new Date(filteredByRange[0].timestamp) : (anchorTimestamp ? new Date(anchorTimestamp) : null)
  ), [filteredByRange, anchorTimestamp]);

  const registrosFiltrados = useMemo(() => filteredByRange.filter((registro) => {
    if (!filterMonth) return true;
    const fecha = new Date(registro.timestamp);
    const mesNombre = meses[fecha.getMonth()];
    return mesNombre === filterMonth;
  }), [filteredByRange, filterMonth]);

  const ultimaLecturaTexto = ultimaLectura
    ? ultimaLectura.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Sin datos disponibles";
  const selectedRangeLabel = "24 horas";
  const bombaActual = filteredByRange.length
    ? Number(filteredByRange[0].bomba)
    : (sensorData.length ? Number(sensorData[0].bomba) : null);
  const bombaActiva = bombaActual === 1;

  const baseCardStyle = {
    padding: "28px",
    background: "rgba(255,255,255,0.95)",
    borderRadius: "24px",
    border: "1px solid rgba(24, 77, 71, 0.08)",
    boxShadow: "0 25px 60px rgba(15, 46, 29, 0.08)",
    backdropFilter: "blur(4px)",
  };

  // --- El resto de tu código JSX (HTML) va aquí ---
  // (Cambié 'className' por 'style' para que funcione sin Tailwind)
  
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px",
        background: "linear-gradient(135deg, #f5fdf6 0%, #e4f1e4 45%, #f9f5e9 100%)",
        color: palette.text,
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "24px",
                background: "rgba(255,255,255,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 25px rgba(24, 77, 71, 0.12)",
              }}
            >
              <img src={gavePlantLogo} alt="Logo de GavePlant" style={{ width: "64px", height: "64px" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "14px", letterSpacing: "0.08em", color: palette.muted }}>
                Sistema Inteligente de Riego
              </p>
              <h1 style={{ margin: "4px 0 0", fontSize: "32px", color: palette.forest, fontWeight: 700 }}>
                GavePlant Dashboard
              </h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {user ? (
              <>
                <span style={{ fontSize: "14px", color: palette.muted }}>Hola, {user.username}</span>
                <button
                  style={{
                    padding: "10px 18px",
                    borderRadius: "999px",
                    border: "none",
                    background: palette.forest,
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 10px 20px rgba(24, 77, 71, 0.25)",
                  }}
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <span style={{ fontSize: "14px", color: palette.muted }}>Ingresa para ver tus cultivos</span>
            )}
          </div>
        </header>

        {!user ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div style={{ ...baseCardStyle }}>
              <h2 style={{ fontSize: "22px", marginBottom: "8px", color: palette.forest }}>Accede a tu invernadero</h2>
              <p style={{ marginBottom: "20px", color: palette.muted }}>
                Ingresa para monitorear la humedad del suelo y el estado de la bomba en tiempo real.
              </p>
              <LoginForm onLogin={handleLogin} loading={loading} palette={palette} />
              <div style={{ marginTop: "18px", fontSize: "13px", color: palette.muted }}>
                Demo: <strong>admin</strong> / <strong>riego123</strong>
              </div>
            </div>

            <div style={{ ...baseCardStyle, background: "rgba(255,255,255,0.97)" }}>
              <h2 style={{ fontSize: "20px", marginBottom: "12px", color: palette.forest }}>¿Por qué GavePlant?</h2>
              <ul style={{ margin: 0, paddingLeft: "20px", color: palette.text, lineHeight: 1.7 }}>
                <li>Alertas inmediatas si baja la humedad del suelo.</li>
                <li>Historial completo para planear riegos.</li>
                <li>Datos seguros y accesibles desde cualquier dispositivo.</li>
                <li>Paleta inspirada en la naturaleza para jornadas más amables.</li>
              </ul>
            </div>
          </div>
        ) : (
          <main style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <section style={{ ...baseCardStyle }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "22px", color: palette.forest }}>Lectura en tiempo real</h2>
                <p style={{ margin: 0, color: palette.muted }}>
                  Humedad (%) y estado de la bomba provenientes de la tabla <code>datos_sensores</code>.
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "15px", color: palette.text, fontWeight: 600 }}>
                      Última lectura: {ultimaLecturaTexto}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", color: palette.text }}>Estado de la bomba:</span>
                      <span
                        className={`pump-pill ${bombaActiva ? "pump-pill--on" : "pump-pill--off"}`}
                      >
                        {bombaActual === null ? "Sin datos" : bombaActiva ? "Encendida" : "Apagada"}
                      </span>
                    </div>
                    {fetchError ? (
                      <div style={{ fontSize: "13px", color: "#c0392b" }}>{fetchError}</div>
                    ) : (
                      <div style={{ fontSize: "13px", color: palette.muted }}>
                        Periodo mostrado fijo: últimas 24 horas (actualización cada {POLLING_INTERVAL_MS / 1000} s).
                      </div>
                    )}
                    {usedFallback && (
                      <div style={{ fontSize: "12px", color: "#b45309" }}>
                        Sin datos en las últimas {selectedRangeLabel}. Mostrando lecturas hasta {ultimaLecturaTexto}.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={fetchSensorData}
                    disabled={isFetching}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "18px",
                      border: "none",
                      background: isFetching ? "#aabfb3" : palette.accent,
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      cursor: isFetching ? "not-allowed" : "pointer",
                      boxShadow: "0 15px 30px rgba(26, 163, 122, 0.3)",
                    }}
                  >
                    {isFetching ? "Actualizando..." : "Actualizar ahora"}
                  </button>
                </div>
              </div>
              <div style={{ width: "100%", height: 340 }}>
                {chartData.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: palette.muted }}>
                    Aún no hay datos para graficar.
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,77,71,0.2)" />
                      <XAxis
                        dataKey="etiqueta"
                        stroke={palette.muted}
                        angle={-35}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke={palette.forest} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="humedad"
                        stroke={palette.leaf}
                        strokeWidth={3}
                        dot={false}
                        name="Humedad (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section style={{ ...baseCardStyle }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "22px", color: palette.forest }}>Historial de lecturas</h2>
                  <p style={{ margin: "4px 0 0", color: palette.muted }}>
                    Mostrando {filteredByRange.length || 0} registros de las últimas {selectedRangeLabel}, ordenados por ID DESC.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ fontSize: "14px", color: palette.text, display: "flex", alignItems: "center", gap: "8px" }}>
                    Filtrar por mes:
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        border: "1px solid rgba(15,46,29,0.2)",
                        background: palette.mist,
                      }}
                    >
                      <option value="">Todos</option>
                      {meses.map((mes) => (
                        <option key={mes} value={mes}>{mes}</option>
                      ))}
                    </select>
                  </label>
                  {filterMonth && (
                    <button
                      onClick={() => setFilterMonth("")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "999px",
                        border: "1px solid rgba(15,46,29,0.2)",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Limpiar filtro
                    </button>
                  )}
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: palette.muted }}>
                      <th style={{ padding: "12px", fontSize: "12px", letterSpacing: "0.08em" }}>ID</th>
                      <th style={{ padding: "12px", fontSize: "12px", letterSpacing: "0.08em" }}>Humedad (%)</th>
                      <th style={{ padding: "12px", fontSize: "12px", letterSpacing: "0.08em" }}>Bomba (estado)</th>
                      <th style={{ padding: "12px", fontSize: "12px", letterSpacing: "0.08em" }}>Fecha y hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: "24px", textAlign: "center", color: palette.muted }}>
                          No hay registros para el filtro seleccionado.
                        </td>
                      </tr>
                    ) : (
                      registrosFiltrados.map((registro) => {
                        const fecha = new Date(registro.timestamp);
                        const bombaNumero = Number(registro.bomba);
                        const estadoBomba = bombaNumero === 1 ? "Encendida" : "Apagada";
                        const badgeClass = `pump-pill ${bombaNumero === 1 ? "pump-pill--on" : "pump-pill--off"}`;
                        return (
                          <tr key={registro.id} style={{ borderTop: "1px solid rgba(15,46,29,0.1)" }}>
                            <td style={{ padding: "16px", fontWeight: 600 }}>{registro.id}</td>
                            <td style={{ padding: "16px" }}>{Number(registro.humedad).toFixed(2)}</td>
                            <td style={{ padding: "16px" }}>
                              <span className={badgeClass}>
                                {estadoBomba} ({bombaNumero})
                              </span>
                            </td>
                            <td style={{ padding: "16px", color: palette.muted }}>
                              {fecha.toLocaleString("es-ES", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

// --- Componentes auxiliares (igual que en tu código) ---
function LoginForm({ onLogin, loading, palette }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function submit(e) {
    e.preventDefault();
    onLogin({ username, password });
  }

  const inputStyle = {
    width: "100%",
    marginTop: "6px",
    borderRadius: "18px",
    border: "1px solid rgba(15,46,29,0.18)",
    padding: "12px 16px",
    fontSize: "14px",
    background: "rgba(255,255,255,0.9)",
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <label style={{ display: "block", fontSize: "14px", color: palette?.text || "#123" }}>Usuario</label>
        <input
          style={inputStyle}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: "14px", color: palette?.text || "#123" }}>Contraseña</label>
        <input
          type="password"
          style={inputStyle}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        style={{
          width: "100%",
          padding: "12px 18px",
          borderRadius: "999px",
          color: "#fff",
          background: loading ? "#aabfb3" : (palette?.leaf || "#45b649"),
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 600,
          boxShadow: "0 18px 35px rgba(69,182,73,0.25)",
        }}
        disabled={loading}
      >
        {loading ? "Validando..." : "Ingresar"}
      </button>
    </form>
  );
}
