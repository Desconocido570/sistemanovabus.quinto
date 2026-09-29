const sql = require("mssql/msnodesqlv8");
require("dotenv").config();

const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        trustedConnection: true,
        trustServerCertificate: true
    }
};

async function conectarBD() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log("✅ Conectado correctamente a SQL Server");
        console.log(`📦 Base de datos: ${process.env.DB_DATABASE}`);
        console.log(`🖥️ Servidor: ${process.env.DB_SERVER}`);
        return pool;
    } catch (error) {
        console.error("❌ Error al conectar con SQL Server:");
        console.error(error.message);
        throw error;
    }
}

module.exports = { sql, conectarBD };
