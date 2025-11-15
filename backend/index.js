// --- Pega este código completo en backend/index.js ---

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // (Lo dejamos importado aunque no lo usemos)
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

// --- Configuración de Autenticación ---
const JWT_SECRET = "este-es-un-secreto-muy-seguro-para-mi-proyecto-12345";

// Usuario de demostración
const demoUser = {
  id: 1,
  username: "admin",
  // (Ya no usamos el hash, pero lo dejamos)
  passwordHash: "$2a$10$Yc/6vj.J13yQcK.2L4eB5.Iihf/Yx15rL0/L1Z0i1.Y/H52O.j/vW"
};

// --- Rutas (Endpoints) ---

app.get('/api', (req, res) => {
  res.json({ message: "Hola desde el servidor backend!" });
});

app.post('/api/login', async (req, res) => {
  console.log("Intento de login recibido:", req.body);
  
  const { username, password } = req.body;

  // 1. Revisión de usuario
  if (!username || !password || username.toLowerCase() !== demoUser.username) {
    return res.status(401).json({ error: "Credenciales inválidas (usuario no encontrado)" });
  }

  // 2. Revisión de contraseña (PRUEBA SIN BCRYPT)
  try {
    console.log("--- DEBUG: Iniciando prueba de comparación simple ---");

    // Comparamos texto plano vs texto plano
    const passwordMatch = (password === "riego123"); 

    if (!passwordMatch) {
      console.log(`--- DEBUG: Falló comparación simple. Recibido: '${password}' | Esperado: 'riego123'`);
      return res.status(401).json({ error: "Credenciales inválidas (contraseña no coincide)" });
    }

    // 3. Si llegamos aquí, ¡el login es exitoso!
    const token = jwt.sign(
      { userId: demoUser.id, username: demoUser.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log("Login exitoso (con prueba simple) para:", username);
    res.json({
      message: "Login exitoso",
      token: token,
      user: {
        username: demoUser.username
      }
    });

  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// --- Inicia el servidor ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});