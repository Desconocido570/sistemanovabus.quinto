const express =
    require("express");


const router =
    express.Router();


const {
    login,
    registrarCliente,
    logout
} = require(
    "../controllers/auth.controller"
);


// ======================================================
// LOGIN
// ======================================================

router.post(
    "/login",
    login
);


// ======================================================
// REGISTRO PÚBLICO
//
// SIEMPRE CREA CLIENTE.
// ======================================================

router.post(
    "/registro",
    registrarCliente
);


// ======================================================
// LOGOUT
// ======================================================

router.post(
    "/logout",
    logout
);


module.exports =
    router;