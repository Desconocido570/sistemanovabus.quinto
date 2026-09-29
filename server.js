const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");

require("dotenv").config();


// ======================================================
// BASE DE DATOS
// ======================================================

const {
    conectarBD
} = require("./config/database");


// ======================================================
// RUTAS
// ======================================================

const authRoutes =
    require("./routes/auth.routes");

const usuariosRoutes =
    require("./routes/usuarios.routes");

const empleadosRoutes =
    require("./routes/empleados.routes");

const conductoresRoutes =
    require("./routes/conductores.routes");

const busesRoutes =
    require("./routes/buses.routes");

const rutasRoutes =
    require("./routes/rutas.routes");

const viajesRoutes =
    require("./routes/viajes.routes");

const reservasRoutes =
    require("./routes/reservas.routes");

const pagosRoutes =
    require("./routes/pagos.routes");

const boletosRoutes =
    require("./routes/boletos.routes");

const mantenimientosRoutes =
    require("./routes/mantenimientos.routes");

const clienteRoutes =
    require("./routes/cliente.routes");

const asientosRoutes =
    require("./routes/asientos.routes");

const dashboardRoutes =
    require("./routes/dashboard.routes");


// ======================================================
// APP
// ======================================================

const app =
    express();


const PORT =
    process.env.PORT || 3000;


// ======================================================
// MIDDLEWARES
// ======================================================

app.use(
    cors()
);


app.use(
    express.json()
);


app.use(
    express.urlencoded({
        extended: true
    })
);


app.use(
    cookieParser()
);


// ======================================================
// ARCHIVOS PÚBLICOS
// ======================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ======================================================
// API
// ======================================================

app.use(
    "/api/auth",
    authRoutes
);


app.use(
    "/api/usuarios",
    usuariosRoutes
);


app.use(
    "/api/empleados",
    empleadosRoutes
);


app.use(
    "/api/conductores",
    conductoresRoutes
);


app.use(
    "/api/buses",
    busesRoutes
);


app.use(
    "/api/rutas",
    rutasRoutes
);


app.use(
    "/api/viajes",
    viajesRoutes
);


app.use(
    "/api/reservas",
    reservasRoutes
);


app.use(
    "/api/pagos",
    pagosRoutes
);


app.use(
    "/api/boletos",
    boletosRoutes
);


app.use(
    "/api/mantenimientos",
    mantenimientosRoutes
);


app.use(
    "/api/cliente",
    clienteRoutes
);


app.use(
    "/api/asientos",
    asientosRoutes
);


app.use(
    "/api/dashboard",
    dashboardRoutes
);


// ======================================================
// PÁGINA PRINCIPAL
// ======================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "login.html"
            )
        );

    }
);


// ======================================================
// PRUEBA SQL SERVER
// ======================================================

app.get(
    "/api/test-db",
    async (req, res) => {

        try {

            const pool =
                await conectarBD();


            const resultado =
                await pool
                    .request()
                    .query(`
                        SELECT
                            DB_NAME() AS BaseDatos,
                            @@SERVERNAME AS Servidor,
                            SYSTEM_USER AS UsuarioWindows,
                            GETDATE() AS FechaServidor
                    `);


            return res.status(200).json({

                ok: true,

                mensaje:
                    "Conexión correcta con SQL Server",

                datos:
                    resultado.recordset[0]

            });

        } catch (error) {

            console.error(
                "Error en /api/test-db:",
                error
            );


            return res.status(500).json({

                ok: false,

                mensaje:
                    "Error conectando con SQL Server",

                error:
                    error.message

            });

        }

    }
);


// ======================================================
// API 404
// ======================================================

app.use(
    "/api",
    (req, res) => {

        return res.status(404).json({

            ok: false,

            mensaje:
                "Ruta API no encontrada"

        });

    }
);


// ======================================================
// INICIAR SERVIDOR
// ======================================================

async function iniciarServidor() {

    try {

        await conectarBD();


        app.listen(
            PORT,
            () => {

                console.log("");

                console.log(
                    "========================================="
                );

                console.log(
                    "🚌 SISTEMA RESERVA BOLETO BUSES"
                );

                console.log(
                    "========================================="
                );

                console.log(
                    `🌐 Servidor: http://localhost:${PORT}`
                );

                console.log(
                    `📦 Base de datos: ${process.env.DB_DATABASE}`
                );

                console.log(
                    `🖥️ SQL Server: ${process.env.DB_SERVER}`
                );

                console.log(
                    "========================================="
                );

                console.log("");

            }
        );

    } catch (error) {

        console.error(
            "❌ No se pudo iniciar el servidor"
        );

        console.error(
            error.message
        );

    }

}


iniciarServidor();
