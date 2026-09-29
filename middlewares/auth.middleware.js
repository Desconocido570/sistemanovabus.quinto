const jwt = require("jsonwebtoken");


// ======================================================
// VERIFICAR TOKEN
// ======================================================

const verificarToken = (req, res, next) => {

    try {

        const authorization =
            req.headers.authorization;


        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {

            return res.status(401).json({

                ok: false,

                mensaje:
                    "No autorizado. Token requerido."

            });

        }


        const token =
            authorization.substring(7);


        if (!token) {

            return res.status(401).json({

                ok: false,

                mensaje:
                    "Token inválido"

            });

        }


        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        req.usuario = {

            idUsuario:
                decoded.idUsuario,

            idRol:
                decoded.idRol,

            rol:
                decoded.rol

        };


        next();

    } catch (error) {

        console.error(
            "Error verificando token:",
            error.message
        );


        if (
            error.name ===
            "TokenExpiredError"
        ) {

            return res.status(401).json({

                ok: false,

                mensaje:
                    "La sesión ha expirado"

            });

        }


        return res.status(401).json({

            ok: false,

            mensaje:
                "Token inválido o no autorizado"

        });

    }

};


// ======================================================
// SOLO ADMINISTRADOR
// ======================================================

const soloAdmin = (req, res, next) => {

    if (!req.usuario) {

        return res.status(401).json({

            ok: false,

            mensaje:
                "Usuario no autenticado"

        });

    }


    if (
        req.usuario.rol !==
        "ADMIN"
    ) {

        return res.status(403).json({

            ok: false,

            mensaje:
                "Acceso exclusivo para administradores"

        });

    }


    next();

};


// ======================================================
// SOLO CLIENTE
// ======================================================

const soloCliente = (req, res, next) => {

    if (!req.usuario) {

        return res.status(401).json({

            ok: false,

            mensaje:
                "Usuario no autenticado"

        });

    }


    if (
        req.usuario.rol !==
        "CLIENTE"
    ) {

        return res.status(403).json({

            ok: false,

            mensaje:
                "Acceso exclusivo para clientes"

        });

    }


    next();

};


// ======================================================
// EXPORTAR
// ======================================================

module.exports = {

    verificarToken,

    soloAdmin,

    soloCliente

};