const express =
    require("express");


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
    listarViajesBus,
    listarAsientos,
    actualizarAsiento
} = require(
    "../controllers/asientos.controller"
);


// ======================================================
// SOLO ADMIN
// ======================================================

router.use(
    verificarToken,
    soloAdmin
);


// ======================================================
// BUSES
// ======================================================

router.get(
    "/buses",
    listarBuses
);


// ======================================================
// VIAJES DEL BUS
// IMPORTANTE: VA ANTES DE /:id
// ======================================================

router.get(
    "/buses/:idBus/viajes",
    listarViajesBus
);


// ======================================================
// ASIENTOS
// ======================================================

router.get(
    "/",
    listarAsientos
);


// ======================================================
// ACTUALIZAR ASIENTO
// ======================================================

router.put(
    "/:id",
    actualizarAsiento
);


module.exports =
    router;