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
    listarPagos,
    obtenerPago,
    obtenerReservasParaPago,
    crearPago,
    actualizarPago,
    cambiarEstadoPago,
    eliminarPago
} = require(
    "../controllers/pagos.controller"
);


router.use(
    verificarToken,
    soloAdmin
);


router.get(
    "/reservas-disponibles",
    obtenerReservasParaPago
);


router.get(
    "/",
    listarPagos
);


router.get(
    "/:id",
    obtenerPago
);


router.post(
    "/",
    crearPago
);


router.put(
    "/:id",
    actualizarPago
);


router.patch(
    "/:id/estado",
    cambiarEstadoPago
);


router.delete(
    "/:id",
    eliminarPago
);


module.exports =
    router;
