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
    listarRutas,
    obtenerRuta,
    crearRuta,
    actualizarRuta,
    cambiarEstadoRuta,
    eliminarRuta
} = require(
    "../controllers/rutas.controller"
);


router.use(
    verificarToken,
    soloAdmin
);


router.get(
    "/",
    listarRutas
);


router.get(
    "/:id",
    obtenerRuta
);


router.post(
    "/",
    crearRuta
);


router.put(
    "/:id",
    actualizarRuta
);


router.patch(
    "/:id/estado",
    cambiarEstadoRuta
);


router.delete(
    "/:id",
    eliminarRuta
);


module.exports =
    router;
