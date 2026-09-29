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
    listarReservas,
    obtenerReserva,
    obtenerOpcionesReserva,
    obtenerAsientosViaje,
    crearReserva,
    cambiarEstadoReserva,
    eliminarReserva
} = require(
    "../controllers/reservas.controller"
);


router.use(
    verificarToken,
    soloAdmin
);


router.get(
    "/opciones",
    obtenerOpcionesReserva
);


router.get(
    "/viaje/:idViaje/asientos",
    obtenerAsientosViaje
);


router.get(
    "/",
    listarReservas
);


router.get(
    "/:id",
    obtenerReserva
);


router.post(
    "/",
    crearReserva
);


router.patch(
    "/:id/estado",
    cambiarEstadoReserva
);


router.delete(
    "/:id",
    eliminarReserva
);


module.exports =
    router;
