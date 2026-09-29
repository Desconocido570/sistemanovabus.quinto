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
    listarConductores,
    obtenerConductor,
    listarEmpleadosDisponibles,
    crearConductor,
    actualizarConductor,
    cambiarEstadoConductor,
    eliminarConductor
} = require(
    "../controllers/conductores.controller"
);


router.use(
    verificarToken,
    soloAdmin
);


router.get(
    "/empleados-disponibles",
    listarEmpleadosDisponibles
);


router.get(
    "/",
    listarConductores
);


router.get(
    "/:id",
    obtenerConductor
);


router.post(
    "/",
    crearConductor
);


router.put(
    "/:id",
    actualizarConductor
);


router.patch(
    "/:id/estado",
    cambiarEstadoConductor
);


router.delete(
    "/:id",
    eliminarConductor
);


module.exports =
    router;
