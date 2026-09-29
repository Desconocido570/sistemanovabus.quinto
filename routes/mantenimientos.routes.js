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
    listarMantenimientos,
    listarBuses,
    obtenerMantenimiento,
    crearMantenimiento,
    actualizarMantenimiento,
    eliminarMantenimiento
} = require(
    "../controllers/mantenimientos.controller"
);


router.use(
    verificarToken,
    soloAdmin
);


router.get(
    "/buses",
    listarBuses
);


router.get(
    "/",
    listarMantenimientos
);


router.get(
    "/:id",
    obtenerMantenimiento
);


router.post(
    "/",
    crearMantenimiento
);


router.put(
    "/:id",
    actualizarMantenimiento
);


router.delete(
    "/:id",
    eliminarMantenimiento
);


module.exports =
    router;
