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
    obtenerResumen
} = require(
    "../controllers/dashboard.controller"
);


router.get(
    "/resumen",
    verificarToken,
    soloAdmin,
    obtenerResumen
);


module.exports =
    router;
