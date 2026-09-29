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
    listarBuses,
    obtenerBus,
    obtenerAsientosBus,
    crearBus,
    actualizarBus,
    cambiarEstadoBus,
    eliminarBus
} = require(
    "../controllers/buses.controller"
);


router.use(
    verificarToken,
    soloAdmin
);


router.get(
    "/",
    listarBuses
);


router.get(
    "/:id/asientos",
    obtenerAsientosBus
);


router.get(
    "/:id",
    obtenerBus
);


router.post(
    "/",
    crearBus
);


router.put(
    "/:id",
    actualizarBus
);


router.patch(
    "/:id/estado",
    cambiarEstadoBus
);


router.delete(
    "/:id",
    eliminarBus
);


module.exports =
    router;
