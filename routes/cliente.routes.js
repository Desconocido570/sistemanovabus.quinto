const express = require("express");

const router =
    express.Router();


const {
    verificarToken,
    soloCliente
} = require(
    "../middlewares/auth.middleware"
);


const {
    buscarViajes,
    obtenerViaje,
    procesarCompra,
    misReservas,
    pagarReserva,
    misBoletos,
    cancelarReserva,
    obtenerPerfil,
    actualizarPerfil
} = require(
    "../controllers/cliente.controller"
);


// ======================================================
// TODO EL MÓDULO CLIENTE REQUIERE:
//
// 1. TOKEN VÁLIDO
// 2. ROL CLIENTE
// ======================================================

router.use(
    verificarToken,
    soloCliente
);


// ======================================================
// BUSCAR VIAJES
// ======================================================

router.get(
    "/viajes",
    buscarViajes
);


// ======================================================
// OBTENER VIAJE
// ======================================================

router.get(
    "/viajes/:id",
    obtenerViaje
);


// ======================================================
// PROCESAR COMPRA
// ======================================================

router.post(
    "/comprar",
    procesarCompra
);


// ======================================================
// MIS RESERVAS
// ======================================================

router.get(
    "/reservas",
    misReservas
);


// ======================================================
// PAGAR RESERVA
// ======================================================

router.post(
    "/reservas/:id/pagar",
    pagarReserva
);


// ======================================================
// CANCELAR RESERVA
// ======================================================

router.patch(
    "/reservas/:id/cancelar",
    cancelarReserva
);


// ======================================================
// MIS BOLETOS
// ======================================================

router.get(
    "/boletos",
    misBoletos
);


// ======================================================
// PERFIL
// ======================================================

router.get(
    "/perfil",
    obtenerPerfil
);


// ======================================================
// ACTUALIZAR PERFIL
// ======================================================

router.put(
    "/perfil",
    actualizarPerfil
);


// ======================================================
// EXPORTAR ROUTER
// ======================================================

module.exports =
    router;