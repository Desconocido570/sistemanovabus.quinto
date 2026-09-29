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
    listarViajes,
    obtenerViaje,
    obtenerOpcionesViaje,
    crearViaje,
    actualizarViaje,
    cambiarEstadoViaje,
    eliminarViaje
} = require(
    "../controllers/viajes.controller"
);


router.use(
    verificarToken,
    soloAdmin
);


router.get(
    "/opciones",
    obtenerOpcionesViaje
);


router.get(
    "/",
    listarViajes
);


router.get(
    "/:id",
    obtenerViaje
);


router.post(
    "/",
    crearViaje
);


router.put(
    "/:id",
    actualizarViaje
);


router.patch(
    "/:id/estado",
    cambiarEstadoViaje
);


router.delete(
    "/:id",
    eliminarViaje
);


module.exports =
    router;
