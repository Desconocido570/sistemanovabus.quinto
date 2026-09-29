const bcrypt = require("bcrypt");

const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// UTILIDAD - VALIDAR PASSWORD ADMIN
// ======================================================

function validarPasswordAdmin(password) {

    if (
        typeof password !== "string" ||
        password.length < 12
    ) {

        return false;

    }


    const tieneMayuscula =
        /[A-Z]/.test(password);


    const tieneMinuscula =
        /[a-z]/.test(password);


    const tieneNumero =
        /[0-9]/.test(password);


    const tieneEspecial =
        /[^A-Za-z0-9]/.test(password);


    return (
        tieneMayuscula &&
        tieneMinuscula &&
        tieneNumero &&
        tieneEspecial
    );

}


// ======================================================
// VALIDAR ROL
// ======================================================

async function validarRol(
    pool,
    idRol
) {

    const resultado =
        await pool
            .request()
            .input(
                "IdRol",
                sql.Int,
                idRol
            )
            .query(`
                SELECT
                    IdRol,
                    NombreRol

                FROM Roles

                WHERE
                    IdRol = @IdRol
                    AND Estado = 1
            `);


    return resultado.recordset[0] || null;

}


// ======================================================
// VALIDAR CORREO SEGÚN ROL
// ======================================================

function validarCorreoPorRol(
    correo,
    nombreRol
) {

    const correoNormalizado =
        correo
            .trim()
            .toLowerCase();


    if (
        nombreRol === "ADMIN" &&
        !correoNormalizado.endsWith(
            "@novabus.com"
        )
    ) {

        return {
            valido: false,
            mensaje:
                "Los administradores deben utilizar un correo corporativo @novabus.com"
        };

    }


    if (
        nombreRol === "CLIENTE" &&
        correoNormalizado.endsWith(
            "@novabus.com"
        )
    ) {

        return {
            valido: false,
            mensaje:
                "El dominio @novabus.com está reservado para administradores"
        };

    }


    return {
        valido: true,
        mensaje: null
    };

}


// ======================================================
// LISTAR USUARIOS
// ======================================================

const listarUsuarios = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .query(`
                    SELECT
                        U.IdUsuario,
                        U.Cedula,
                        U.Nombres,
                        U.Apellidos,
                        U.Correo,
                        U.Telefono,
                        U.FechaNacimiento,
                        U.Estado,
                        U.FechaRegistro,
                        U.IdRol,
                        R.NombreRol

                    FROM Usuarios U

                    INNER JOIN Roles R
                        ON U.IdRol = R.IdRol

                    ORDER BY
                        U.IdUsuario DESC
                `);


        return res.status(200).json({

            ok: true,

            usuarios:
                resultado.recordset

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al obtener usuarios",

            error:
                error.message

        });

    }

};


// ======================================================
// OBTENER USUARIO
// ======================================================

const obtenerUsuario = async (req, res) => {

    try {

        const idUsuario =
            parseInt(
                req.params.id
            );


        if (
            isNaN(idUsuario)
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "ID de usuario inválido"

            });

        }


        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .query(`
                    SELECT
                        U.IdUsuario,
                        U.Cedula,
                        U.Nombres,
                        U.Apellidos,
                        U.Correo,
                        U.Telefono,
                        U.FechaNacimiento,
                        U.Estado,
                        U.IdRol,
                        R.NombreRol

                    FROM Usuarios U

                    INNER JOIN Roles R
                        ON U.IdRol = R.IdRol

                    WHERE
                        U.IdUsuario = @IdUsuario
                `);


        if (
            resultado.recordset.length === 0
        ) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Usuario no encontrado"

            });

        }


        return res.status(200).json({

            ok: true,

            usuario:
                resultado.recordset[0]

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al obtener el usuario",

            error:
                error.message

        });

    }

};


// ======================================================
// CREAR USUARIO
//
// ESTE ENDPOINT ESTÁ PROTEGIDO POR soloAdmin.
// ======================================================

const crearUsuario = async (req, res) => {

    try {

        const {
            cedula,
            nombres,
            apellidos,
            correo,
            telefono,
            fechaNacimiento,
            idRol,
            password
        } = req.body;


        if (
            !cedula ||
            !nombres ||
            !apellidos ||
            !correo ||
            !idRol ||
            !password
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Completa los campos obligatorios"

            });

        }


        const rolId =
            parseInt(idRol);


        if (
            isNaN(rolId)
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Rol inválido"

            });

        }


        const correoNormalizado =
            correo
                .trim()
                .toLowerCase();


        const pool =
            await conectarBD();


        const rol =
            await validarRol(
                pool,
                rolId
            );


        if (!rol) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "El rol seleccionado no es válido"

            });

        }


        // ==================================================
        // VALIDAR CORREO SEGÚN ROL
        // ==================================================

        const validacionCorreo =
            validarCorreoPorRol(
                correoNormalizado,
                rol.NombreRol
            );


        if (
            !validacionCorreo.valido
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    validacionCorreo.mensaje

            });

        }


        // ==================================================
        // CONTRASEÑA ADMIN
        // ==================================================

        if (
            rol.NombreRol === "ADMIN"
        ) {

            if (
                !validarPasswordAdmin(
                    password
                )
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "La contraseña del administrador debe tener mínimo 12 caracteres, una mayúscula, una minúscula, un número y un símbolo"

                });

            }

        } else {

            if (
                password.length < 8
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "La contraseña debe tener al menos 8 caracteres"

                });

            }

        }


        // ==================================================
        // DUPLICADOS
        // ==================================================

        const existente =
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
            existente.recordset.length > 0
        ) {

            return res.status(409).json({

                ok: false,

                mensaje:
                    "La cédula o correo ya están registrados"

            });

        }


        const hash =
            await bcrypt.hash(
                password,
                12
            );


        await pool
            .request()
            .input(
                "IdRol",
                sql.Int,
                rolId
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
                "FechaNacimiento",
                sql.Date,
                fechaNacimiento || null
            )
            .input(
                "ContrasenaHash",
                sql.VarChar,
                hash
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
                rol.NombreRol === "ADMIN"
                    ? "Administrador creado correctamente"
                    : "Usuario creado correctamente"

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al crear usuario",

            error:
                error.message

        });

    }

};


// ======================================================
// ACTUALIZAR USUARIO
// ======================================================

const actualizarUsuario = async (req, res) => {

    try {

        const idUsuario =
            parseInt(
                req.params.id
            );


        const {
            cedula,
            nombres,
            apellidos,
            correo,
            telefono,
            fechaNacimiento,
            idRol,
            password
        } = req.body;


        if (
            isNaN(idUsuario) ||
            !cedula ||
            !nombres ||
            !apellidos ||
            !correo ||
            !idRol
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Datos de usuario incompletos"

            });

        }


        const rolId =
            parseInt(idRol);


        if (
            isNaN(rolId)
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Rol inválido"

            });

        }


        const correoNormalizado =
            correo
                .trim()
                .toLowerCase();


        const pool =
            await conectarBD();


        const rol =
            await validarRol(
                pool,
                rolId
            );


        if (!rol) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Rol inválido"

            });

        }


        // ==================================================
        // VALIDAR USUARIO EXISTENTE
        // ==================================================

        const actual =
            await pool
                .request()
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .query(`
                    SELECT
                        U.IdUsuario,
                        U.IdRol,
                        U.Correo,
                        R.NombreRol

                    FROM Usuarios U

                    INNER JOIN Roles R
                        ON U.IdRol = R.IdRol

                    WHERE
                        U.IdUsuario = @IdUsuario
                `);


        if (
            actual.recordset.length === 0
        ) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Usuario no encontrado"

            });

        }


        // ==================================================
        // NO QUITARSE EL ROL ADMIN
        // ==================================================

        if (
            Number(
                req.usuario.idUsuario
            ) === Number(
                idUsuario
            ) &&
            rol.NombreRol !== "ADMIN"
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "No puedes quitarte tu propio rol de administrador mientras tienes la sesión iniciada"

            });

        }


        // ==================================================
        // VALIDAR CORREO POR ROL
        // ==================================================

        const validacionCorreo =
            validarCorreoPorRol(
                correoNormalizado,
                rol.NombreRol
            );


        if (
            !validacionCorreo.valido
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    validacionCorreo.mensaje

            });

        }


        // ==================================================
        // PASSWORD NUEVO
        // ==================================================

        if (
            password &&
            password.trim() !== ""
        ) {

            if (
                rol.NombreRol === "ADMIN"
            ) {

                if (
                    !validarPasswordAdmin(
                        password
                    )
                ) {

                    return res.status(400).json({

                        ok: false,

                        mensaje:
                            "La contraseña del administrador debe tener mínimo 12 caracteres, una mayúscula, una minúscula, un número y un símbolo"

                    });

                }

            } else {

                if (
                    password.length < 8
                ) {

                    return res.status(400).json({

                        ok: false,

                        mensaje:
                            "La contraseña debe tener al menos 8 caracteres"

                    });

                }

            }

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
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .query(`
                    SELECT
                        IdUsuario

                    FROM Usuarios

                    WHERE
                        (
                            Cedula = @Cedula
                            OR
                            LOWER(Correo) = LOWER(@Correo)
                        )

                        AND

                        IdUsuario <> @IdUsuario
                `);


        if (
            duplicado.recordset.length > 0
        ) {

            return res.status(409).json({

                ok: false,

                mensaje:
                    "La cédula o correo pertenecen a otro usuario"

            });

        }


        // ==================================================
        // ACTUALIZAR CON PASSWORD
        // ==================================================

        if (
            password &&
            password.trim() !== ""
        ) {

            const hash =
                await bcrypt.hash(
                    password,
                    12
                );


            await pool
                .request()
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .input(
                    "IdRol",
                    sql.Int,
                    rolId
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
                    "FechaNacimiento",
                    sql.Date,
                    fechaNacimiento || null
                )
                .input(
                    "ContrasenaHash",
                    sql.VarChar,
                    hash
                )
                .query(`
                    UPDATE Usuarios

                    SET
                        IdRol = @IdRol,
                        Cedula = @Cedula,
                        Nombres = @Nombres,
                        Apellidos = @Apellidos,
                        Correo = @Correo,
                        Telefono = @Telefono,
                        FechaNacimiento = @FechaNacimiento,
                        ContrasenaHash = @ContrasenaHash

                    WHERE
                        IdUsuario = @IdUsuario
                `);

        } else {

            await pool
                .request()
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .input(
                    "IdRol",
                    sql.Int,
                    rolId
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
                    "FechaNacimiento",
                    sql.Date,
                    fechaNacimiento || null
                )
                .query(`
                    UPDATE Usuarios

                    SET
                        IdRol = @IdRol,
                        Cedula = @Cedula,
                        Nombres = @Nombres,
                        Apellidos = @Apellidos,
                        Correo = @Correo,
                        Telefono = @Telefono,
                        FechaNacimiento = @FechaNacimiento

                    WHERE
                        IdUsuario = @IdUsuario
                `);

        }


        return res.status(200).json({

            ok: true,

            mensaje:
                "Usuario actualizado correctamente"

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al actualizar usuario",

            error:
                error.message

        });

    }

};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoUsuario = async (req, res) => {

    try {

        const idUsuario =
            parseInt(
                req.params.id
            );


        const {
            estado
        } = req.body;


        if (
            isNaN(idUsuario) ||
            ![
                0,
                1,
                false,
                true
            ].includes(
                estado
            )
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Datos inválidos"

            });

        }


        // ==================================================
        // NO DESACTIVARSE A SÍ MISMO
        // ==================================================

        if (
            Number(
                req.usuario.idUsuario
            ) === Number(
                idUsuario
            ) &&
            Number(
                estado
            ) === 0
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "No puedes desactivar tu propio usuario mientras tienes la sesión iniciada"

            });

        }


        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .input(
                    "Estado",
                    sql.Bit,
                    estado
                )
                .query(`
                    UPDATE Usuarios

                    SET
                        Estado = @Estado

                    WHERE
                        IdUsuario = @IdUsuario;


                    SELECT
                        @@ROWCOUNT AS FilasAfectadas;
                `);


        if (
            resultado.recordset[0]
                .FilasAfectadas === 0
        ) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Usuario no encontrado"

            });

        }


        return res.status(200).json({

            ok: true,

            mensaje:
                Number(
                    estado
                ) === 1
                    ? "Usuario activado"
                    : "Usuario desactivado"

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error cambiando estado",

            error:
                error.message

        });

    }

};


// ======================================================
// ELIMINAR USUARIO
// ======================================================

const eliminarUsuario = async (req, res) => {

    try {

        const idUsuario =
            parseInt(
                req.params.id
            );


        if (
            isNaN(idUsuario)
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "ID inválido"

            });

        }


        // ==================================================
        // NO ELIMINARSE A SÍ MISMO
        // ==================================================

        if (
            Number(
                req.usuario.idUsuario
            ) === Number(
                idUsuario
            )
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "No puedes eliminar tu propio usuario"

            });

        }


        const pool =
            await conectarBD();


        // ==================================================
        // VERIFICAR RESERVAS
        // ==================================================

        const reservas =
            await pool
                .request()
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .query(`
                    SELECT TOP 1
                        IdReserva

                    FROM Reservas

                    WHERE
                        IdUsuario = @IdUsuario
                `);


        if (
            reservas.recordset.length > 0
        ) {

            return res.status(409).json({

                ok: false,

                mensaje:
                    "Este usuario tiene reservas relacionadas. Desactívalo en lugar de eliminarlo."

            });

        }


        const resultado =
            await pool
                .request()
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .query(`
                    DELETE FROM Usuarios

                    WHERE
                        IdUsuario = @IdUsuario;


                    SELECT
                        @@ROWCOUNT AS FilasAfectadas;
                `);


        if (
            resultado.recordset[0]
                .FilasAfectadas === 0
        ) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Usuario no encontrado"

            });

        }


        return res.status(200).json({

            ok: true,

            mensaje:
                "Usuario eliminado correctamente"

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "No se pudo eliminar el usuario",

            error:
                error.message

        });

    }

};


module.exports = {

    listarUsuarios,

    obtenerUsuario,

    crearUsuario,

    actualizarUsuario,

    cambiarEstadoUsuario,

    eliminarUsuario

};