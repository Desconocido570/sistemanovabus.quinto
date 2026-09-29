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
    listarEmpleados,
    obtenerEmpleado,
    crearEmpleado,
    actualizarEmpleado,
    cambiarEstadoEmpleado,
    eliminarEmpleado
} = require(
    "../controllers/empleados.controller"
);


router.use(
    verificarToken,
    soloAdmin
);


router.get(
    "/",
    listarEmpleados
);


router.get(
    "/:id",
    obtenerEmpleado
);


router.post(
    "/",
    crearEmpleado
);


router.put(
    "/:id",
    actualizarEmpleado
);


router.patch(
    "/:id/estado",
    cambiarEstadoEmpleado
);


router.delete(
    "/:id",
    eliminarEmpleado
);


module.exports =
    router;
