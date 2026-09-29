const bcrypt = require("bcrypt");
const { sql, conectarBD } = require("../config/database");

async function crearAdmin() {
    let pool;

    try {
        pool = await conectarBD();

        const cedula = "0700000000";
        const nombres = "Administrador";
        const apellidos = "Principal";
        const correo = "admin@buses.com";
        const telefono = "0999999999";
        const passwordPlano = "Admin123*";

        const rolResult = await pool.request()
            .input("NombreRol", sql.VarChar, "ADMIN")
            .query(`SELECT IdRol FROM Roles WHERE NombreRol = @NombreRol`);

        if (rolResult.recordset.length === 0) {
            console.log("❌ No existe el rol ADMIN.");
            return;
        }

        const idRolAdmin = rolResult.recordset[0].IdRol;

        const usuarioExistente = await pool.request()
            .input("Correo", sql.VarChar, correo)
            .query(`SELECT IdUsuario FROM Usuarios WHERE Correo = @Correo`);

        if (usuarioExistente.recordset.length > 0) {
            console.log("⚠️ El usuario administrador ya existe.");
            return;
        }

        const passwordHash = await bcrypt.hash(passwordPlano, 10);

        await pool.request()
            .input("IdRol", sql.Int, idRolAdmin)
            .input("Cedula", sql.VarChar, cedula)
            .input("Nombres", sql.VarChar, nombres)
            .input("Apellidos", sql.VarChar, apellidos)
            .input("Correo", sql.VarChar, correo)
            .input("Telefono", sql.VarChar, telefono)
            .input("ContrasenaHash", sql.VarChar, passwordHash)
            .query(`
                INSERT INTO Usuarios
                (IdRol,Cedula,Nombres,Apellidos,Correo,Telefono,ContrasenaHash,Estado)
                VALUES
                (@IdRol,@Cedula,@Nombres,@Apellidos,@Correo,@Telefono,@ContrasenaHash,1)
            `);

        console.log("✅ ADMINISTRADOR CREADO");
    } catch (error) {
        console.error(error.message);
    } finally {
        if (pool) await pool.close();
        process.exit();
    }
}

crearAdmin();
