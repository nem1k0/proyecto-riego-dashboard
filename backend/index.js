const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = "este-es-un-secreto-muy-seguro-para-mi-proyecto-12345";

const demoUser = {
  id: 1,
  username: "admin",
  passwordHash: "$2a$10$Yc/6vj.J13yQcK.2L4eB5.Iihf/Yx15rL0/L1Z0i1.Y/H52O.j/vW"
};

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api', (req, res) => {
  res.json({ message: "Hola desde el servidor backend!" });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || username.toLowerCase() !== demoUser.username) {
    return res.status(401).json({ error: "Credenciales invalidas (usuario no encontrado)" });
  }

  try {
    const passwordMatch = (password === "riego123");

    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenciales invalidas (contrasena incorrecta)" });
    }

    const token = jwt.sign(
      { userId: demoUser.id, username: demoUser.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: "Login exitoso",
      token,
      user: { username: demoUser.username }
    });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await pool.promise().query('SELECT 1 AS connectivity_check');
    res.json({
      message: "Conexion a la BD de AWS (EC2) exitosa",
      data: rows
    });
  } catch (error) {
    console.error("Error al probar la conexion a la BD:", error);
    res.status(500).json({
      message: "Fallo al conectar a la BD de AWS (EC2)",
      error: error.code || error.message
    });
  }
});

app.get('/api/sensor-data', async (req, res) => {
  try {
    const parsed = parseInt(req.query.rangeHours, 10);
    const rangeHours = Number.isNaN(parsed) ? 24 : parsed;
    const normalizedRange = Math.min(Math.max(rangeHours, 1), 168); // entre 1 hora y 1 semana
    
    const connection = pool.promise();
    const timeWindowQuery = `
      SELECT d.id, d.humedad, d.bomba, d.timestamp
      FROM datos_sensores d
      JOIN (SELECT MAX(timestamp) AS anchor FROM datos_sensores) meta ON 1=1
      WHERE d.timestamp BETWEEN DATE_SUB(meta.anchor, INTERVAL ${normalizedRange} HOUR) AND meta.anchor
      ORDER BY d.timestamp DESC
    `;
    const [rangeRows] = await connection.query(timeWindowQuery);

    let data = rangeRows;
    let usedFallback = false;

    if (!rangeRows.length) {
      const [latestRows] = await connection.query(
        `SELECT id, humedad, bomba, timestamp
         FROM datos_sensores
         ORDER BY timestamp DESC
         LIMIT 500`
      );
      data = latestRows;
      usedFallback = true;
    }

    const anchorTimestamp = data[0]?.timestamp || null;

    res.json({
      message: usedFallback
        ? "Sin registros en el periodo solicitado. Se devuelven las últimas lecturas disponibles."
        : "Lectura exitosa de datos_sensores",
      anchorTimestamp,
      rangeHours: normalizedRange,
      usedFallback,
      data
    });
  } catch (error) {
    console.error("Error al consultar datos_sensores:", error);
    res.status(500).json({
      message: "No fue posible leer datos_sensores",
      error: error.code || error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
console.log(`Servidor corriendo en http://localhost:${PORT}`);
console.log(`Conectado a BD: ${process.env.DB_DATABASE} en ${process.env.DB_HOST}`);
});
