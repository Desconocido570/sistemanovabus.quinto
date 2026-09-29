const express = require("express");

const router =
    express.Router();


const {
    verificarToken,
    soloAdmin
} = require(
    "../middlewares/auth.middleware"
);


const {
    listarUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    eliminarUsuario
} = require(
    "../controllers/usuarios.controller"
);


// ======================================================
// SEGURIDAD
//
// TODO LO QUE ESTÁ DEBAJO DE ESTA LÍNEA
// REQUIERE TOKEN + ROL ADMIN.
// ======================================================

router.use(
    verificarToken,
    soloAdmin
);


// ======================================================
// LISTAR
// ======================================================

router.get(
    "/",
    listarUsuarios
);


// ======================================================
// OBTENER UNO
// ======================================================

router.get(
    "/:id",
    obtenerUsuario
);


// ======================================================
// CREAR
// ======================================================

router.post(
    "/",
    crearUsuario
);


// ======================================================
// ACTUALIZAR
// ======================================================

router.put(
    "/:id",
    actualizarUsuario
);


// ======================================================
// CAMBIAR ESTADO
// ======================================================

router.patch(
    "/:id/estado",
    cambiarEstadoUsuario
);


// ======================================================
// ELIMINAR
// ======================================================

router.delete(
    "/:id",
    eliminarUsuario
);


module.exports =
    router;