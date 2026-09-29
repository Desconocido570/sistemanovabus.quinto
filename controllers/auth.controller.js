const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// LOGIN
// ======================================================

const login = async (req, res) => {

    try {

        const {
            correo,
            password
        } = req.body;


        if (!correo || !password) {

            return res.status(400).json({
                ok: false,
                mensaje: "Correo y contraseña son obligatorios"
            });

        }


        const correoNormalizado =
            correo
                .trim()
                .toLowerCase();


        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .input(
                    "Correo",
                    sql.VarChar,
                    correoNormalizado
                )
                .query(`
                    SELECT
                        U.IdUsuario,
                        U.IdRol,
                        U.Cedula,
                        U.Nombres,
                        U.Apellidos,
                        U.Correo,
                        U.Telefono,
                        U.ContrasenaHash,
                        U.Estado,
                        R.NombreRol

                    FROM Usuarios U

                    INNER JOIN Roles R
                        ON U.IdRol = R.IdRol

                    WHERE
                        LOWER(U.Correo) = LOWER(@Correo)
                `);


        if (resultado.recordset.length === 0) {

            return res.status(401).json({
                ok: false,
                mensaje: "Correo o contraseña incorrectos"
            });

        }


        const usuario =
            resultado.recordset[0];


        if (!usuario.Estado) {

            return res.status(403).json({
                ok: false,
                mensaje: "Este usuario está deshabilitado"
            });

        }


        const passwordCorrecto =
            await bcrypt.compare(
                password,
                usuario.ContrasenaHash
            );


        if (!passwordCorrecto) {

            return res.status(401).json({
                ok: false,
                mensaje: "Correo o contraseña incorrectos"
            });

        }


        // ==================================================
        // SEGURIDAD ADMINISTRATIVA
        // ==================================================

        if (
            usuario.NombreRol === "ADMIN" &&
            !usuario.Correo
                .toLowerCase()
                .endsWith("@novabus.com")
        ) {

            return res.status(403).json({
                ok: false,
                mensaje:
                    "La cuenta administrativa no posee un correo corporativo válido @novabus.com"
            });

        }


        const token =
            jwt.sign(
                {
                    idUsuario:
                        usuario.IdUsuario,

                    idRol:
                        usuario.IdRol,

                    rol:
                        usuario.NombreRol
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "8h"
                }
            );


        return res.status(200).json({

            ok: true,

            mensaje:
                "Inicio de sesión correcto",

            token,

            usuario: {

                idUsuario:
                    usuario.IdUsuario,

                nombres:
                    usuario.Nombres,

                apellidos:
                    usuario.Apellidos,

                correo:
                    usuario.Correo,

                rol:
                    usuario.NombreRol

            }

        });

    } catch (error) {

        console.error(
            "Error en login:",
            error
        );


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error interno del servidor",

            error:
                error.message

        });

    }

};


// ======================================================
// REGISTRAR CLIENTE
//
// IMPORTANTE:
// ESTE ENDPOINT JAMÁS ACEPTA IdRol.
// TODOS LOS REGISTROS PÚBLICOS SON CLIENTES.
// ======================================================

const registrarCliente = async (req, res) => {

    try {

        const {
            cedula,
            nombres,
            apellidos,
            correo,
            telefono,
            fechaNacimiento,
            password
        } = req.body;


        if (
            !cedula ||
            !nombres ||
            !apellidos ||
            !correo ||
            !password
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Cédula, nombres, apellidos, correo y contraseña son obligatorios"

            });

        }


        const correoNormalizado =
            correo
                .trim()
                .toLowerCase();


        // ==================================================
        // BLOQUEAR DOMINIO CORPORATIVO
        // ==================================================

        if (
            correoNormalizado.endsWith(
                "@novabus.com"
            )
        ) {

            return res.status(403).json({

                ok: false,

                mensaje:
                    "El dominio @novabus.com está reservado para cuentas administrativas"

            });

        }


        // ==================================================
        // CONTRASEÑA CLIENTE
        // ==================================================

        if (
            password.length < 8
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "La contraseña debe tener al menos 8 caracteres"

            });

        }


        const pool =
            await conectarBD();


        // ==================================================
        // OBTENER ROL CLIENTE
        // ==================================================

        const rolResult =
            await pool
                .request()
                .input(
                    "NombreRol",
                    sql.VarChar,
                    "CLIENTE"
                )
                .query(`
                    SELECT
                        IdRol

                    FROM Roles

                    WHERE
                        NombreRol = @NombreRol
                        AND Estado = 1
                `);


        if (
            rolResult.recordset.length === 0
        ) {

            return res.status(500).json({

                ok: false,

                mensaje:
                    "No existe el rol CLIENTE en el sistema"

            });

        }


        // ==================================================
        // DUPLICADOS
        // ==================================================

        const duplicado =
            await pool
                .request()
                .input(
                    "Cedula",
                    sql.VarChar,
                    cedula.trim()
                )
                .input(
                    "Correo",
                    sql.VarChar,
                    correoNormalizado
                )
                .query(`
                    SELECT
                        IdUsuario

                    FROM Usuarios

                    WHERE
                        Cedula = @Cedula
                        OR
                        LOWER(Correo) = LOWER(@Correo)
                `);


        if (
            duplicado.recordset.length > 0
        ) {

            return res.status(409).json({

                ok: false,

                mensaje:
                    "La cédula o el correo ya están registrados"

            });

        }


        const hash =
            await bcrypt.hash(
                password,
                12
            );


        // ==================================================
        // INSERTAR SIEMPRE COMO CLIENTE
        // ==================================================

        await pool
            .request()
            .input(
                "IdRol",
                sql.Int,
                rolResult.recordset[0].IdRol
            )
            .input(
                "Cedula",
                sql.VarChar,
                cedula.trim()
            )
            .input(
                "Nombres",
                sql.VarChar,
                nombres.trim()
            )
            .input(
                "Apellidos",
                sql.VarChar,
                apellidos.trim()
            )
            .input(
                "Correo",
                sql.VarChar,
                correoNormalizado
            )
            .input(
                "Telefono",
                sql.VarChar,
                telefono
                    ? telefono.trim()
                    : null
            )
            .input(
                "ContrasenaHash",
                sql.VarChar,
                hash
            )
            .input(
                "FechaNacimiento",
                sql.Date,
                fechaNacimiento || null
            )
            .query(`
                INSERT INTO Usuarios
                (
                    IdRol,
                    Cedula,
                    Nombres,
                    Apellidos,
                    Correo,
                    Telefono,
                    ContrasenaHash,
                    FechaNacimiento,
                    Estado
                )

                VALUES
                (
                    @IdRol,
                    @Cedula,
                    @Nombres,
                    @Apellidos,
                    @Correo,
                    @Telefono,
                    @ContrasenaHash,
                    @FechaNacimiento,
                    1
                )
            `);


        return res.status(201).json({

            ok: true,

            mensaje:
                "Cuenta creada correctamente. Ya puedes iniciar sesión."

        });

    } catch (error) {

        console.error(
            "Error registrando cliente:",
            error
        );


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al crear la cuenta",

            error:
                error.message

        });

    }

};


// ======================================================
// LOGOUT
// ======================================================

const logout = async (req, res) => {

    return res.status(200).json({
        ok: true,
        mensaje:
            "Sesión cerrada"
    });

};


module.exports = {
    login,
    registrarCliente,
    logout
};