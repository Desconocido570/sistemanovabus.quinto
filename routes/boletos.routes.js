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
    listarBoletos,
    reservasDisponibles,
    obtenerBoleto,
    emitirBoleto,
    cambiarEstadoBoleto,
    descargarPDF
} = require(
    "../controllers/boletos.controller"
);


// PDF y detalle pueden usarlos ADMIN o el dueño del boleto.
router.get(
    "/:id/pdf",
    verificarToken,
    descargarPDF
);


router.get(
    "/:id",
    verificarToken,
    obtenerBoleto
);


// Rutas administrativas.
router.get(
    "/",
    verificarToken,
    soloAdmin,
    listarBoletos
);


router.get(
    "/admin/reservas-disponibles/lista",
    verificarToken,
    soloAdmin,
    reservasDisponibles
);


router.post(
    "/",
    verificarToken,
    soloAdmin,
    emitirBoleto
);


router.patch(
    "/:id/estado",
    verificarToken,
    soloAdmin,
    cambiarEstadoBoleto
);


module.exports =
    router;
