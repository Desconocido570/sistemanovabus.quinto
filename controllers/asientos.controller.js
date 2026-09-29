const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// LISTAR BUSES
// ======================================================

const listarBuses = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .query(`
                    SELECT
                        IdBus,
                        NumeroBus,
                        Placa,
                        Marca,
                        Modelo,
                        Capacidad,
                        Estado

                    FROM Buses

                    ORDER BY
                        NumeroBus
                `);


        return res.status(200).json({
            ok: true,
            buses: resultado.recordset
        });

    } catch (error) {

        console.error(
            "Error listando buses:",
            error
        );


        return res.status(500).json({
            ok: false,
            mensaje:
                "Error al obtener buses",
            error:
                error.message
        });

    }

};


// ======================================================
// LISTAR VIAJES DE UN BUS
// ======================================================

const listarViajesBus = async (req, res) => {

    try {

        const idBus =
            parseInt(
                req.params.idBus
            );


        if (
            isNaN(idBus)
        ) {

            return res.status(400).json({
                ok: false,
                mensaje:
                    "Bus inválido"
            });

        }


        const pool =
            await conectarBD();


        const bus =
            await pool
                .request()
                .input(
                    "IdBus",
                    sql.Int,
                    idBus
                )
                .query(`
                    SELECT
                        IdBus

                    FROM Buses

                    WHERE
                        IdBus = @IdBus
                `);


        if (
            bus.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje:
                    "Bus no encontrado"
            });

        }


        const resultado =
            await pool
                .request()
                .input(
                    "IdBus",
                    sql.Int,
                    idBus
                )
                .query(`
                    SELECT
                        V.IdViaje,
                        V.FechaHoraSalida,
                        V.FechaHoraLlegada,
                        V.Estado,
                        V.Precio,

                        R.CiudadOrigen,
                        R.CiudadDestino,

                        R.TerminalOrigen,
                        R.TerminalDestino

                    FROM Viajes V

                    INNER JOIN Rutas R
                        ON V.IdRuta = R.IdRuta

                    WHERE
                        V.IdBus = @IdBus

                    ORDER BY
                        CASE
                            WHEN V.FechaHoraSalida >= GETDATE()
                                THEN 0
                            ELSE 1
                        END,

                        V.FechaHoraSalida ASC
                `);


        return res.status(200).json({
            ok: true,
            viajes:
                resultado.recordset
        });

    } catch (error) {

        console.error(
            "Error listando viajes del bus:",
            error
        );


        return res.status(500).json({
            ok: false,
            mensaje:
                "Error al obtener los viajes del bus",
            error:
                error.message
        });

    }

};


// ======================================================
// LISTAR ASIENTOS
//
// MODO GENERAL:
// /api/asientos?idBus=1
//
// MODO OCUPACIÓN:
// /api/asientos?idBus=1&idViaje=5
// ======================================================

const listarAsientos = async (req, res) => {

    try {

        const idBus =
            parseInt(
                req.query.idBus
            );


        const idViaje =
            req.query.idViaje
                ? parseInt(
                    req.query.idViaje
                )
                : null;


        if (
            isNaN(idBus)
        ) {

            return res.status(400).json({
                ok: false,
                mensaje:
                    "Selecciona un bus"
            });

        }


        if (
            req.query.idViaje &&
            isNaN(idViaje)
        ) {

            return res.status(400).json({
                ok: false,
                mensaje:
                    "Viaje inválido"
            });

        }


        const pool =
            await conectarBD();


        // ==================================================
        // BUS
        // ==================================================

        const busResult =
            await pool
                .request()
                .input(
                    "IdBus",
                    sql.Int,
                    idBus
                )
                .query(`
                    SELECT
                        IdBus,
                        NumeroBus,
                        Placa,
                        Marca,
                        Modelo,
                        Capacidad,
                        Estado

                    FROM Buses

                    WHERE
                        IdBus = @IdBus
                `);


        if (
            busResult.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje:
                    "Bus no encontrado"
            });

        }


        let viaje = null;


        // ==================================================
        // VALIDAR VIAJE
        // ==================================================

        if (
            idViaje !== null
        ) {

            const viajeResult =
                await pool
                    .request()
                    .input(
                        "IdViaje",
                        sql.Int,
                        idViaje
                    )
                    .input(
                        "IdBus",
                        sql.Int,
                        idBus
                    )
                    .query(`
                        SELECT
                            V.IdViaje,
                            V.IdBus,
                            V.FechaHoraSalida,
                            V.FechaHoraLlegada,
                            V.Estado,
                            V.Precio,

                            R.CiudadOrigen,
                            R.CiudadDestino,

                            R.TerminalOrigen,
                            R.TerminalDestino

                        FROM Viajes V

                        INNER JOIN Rutas R
                            ON V.IdRuta = R.IdRuta

                        WHERE
                            V.IdViaje = @IdViaje
                            AND
                            V.IdBus = @IdBus
                    `);


            if (
                viajeResult.recordset.length === 0
            ) {

                return res.status(404).json({
                    ok: false,
                    mensaje:
                        "El viaje no pertenece al bus seleccionado"
                });

            }


            viaje =
                viajeResult.recordset[0];

        }


        // ==================================================
        // MODO CONFIGURACIÓN GENERAL
        // ==================================================

        if (
            idViaje === null
        ) {

            const resultado =
                await pool
                    .request()
                    .input(
                        "IdBus",
                        sql.Int,
                        idBus
                    )
                    .query(`
                        SELECT
                            A.IdAsiento,
                            A.IdBus,
                            A.NumeroAsiento,
                            A.TipoAsiento,
                            A.Estado,

                            CAST(
                                0
                                AS BIT
                            ) AS Ocupado,

                            NULL
                                AS EstadoReserva,

                            NULL
                                AS CodigoReserva,

                            NULL
                                AS IdReserva,

                            NULL
                                AS Pasajero

                        FROM Asientos A

                        WHERE
                            A.IdBus = @IdBus

                        ORDER BY
                            A.NumeroAsiento
                    `);


            return res.status(200).json({

                ok: true,

                modo:
                    "CONFIGURACION",

                bus:
                    busResult.recordset[0],

                viaje:
                    null,

                asientos:
                    resultado.recordset

            });

        }


        // ==================================================
        // MODO OCUPACIÓN DEL VIAJE
        // ==================================================

        const resultado =
            await pool
                .request()
                .input(
                    "IdBus",
                    sql.Int,
                    idBus
                )
                .input(
                    "IdViaje",
                    sql.Int,
                    idViaje
                )
                .query(`
                    SELECT
                        A.IdAsiento,
                        A.IdBus,
                        A.NumeroAsiento,
                        A.TipoAsiento,
                        A.Estado,

                        CAST(
                            CASE
                                WHEN DR.IdDetalleReserva
                                    IS NOT NULL
                                    THEN 1

                                ELSE 0
                            END
                            AS BIT
                        ) AS Ocupado,

                        R.Estado
                            AS EstadoReserva,

                        R.CodigoReserva,

                        R.IdReserva,

                        CASE
                            WHEN U.IdUsuario
                                IS NULL
                                THEN NULL

                            ELSE
                                CONCAT(
                                    U.Nombres,
                                    ' ',
                                    U.Apellidos
                                )
                        END
                            AS Pasajero,

                        U.Cedula
                            AS CedulaPasajero,

                        CASE
                            WHEN EXISTS
                            (
                                SELECT
                                    1

                                FROM Pagos P

                                WHERE
                                    P.IdReserva =
                                        R.IdReserva

                                    AND

                                    P.Estado =
                                        'APROBADO'
                            )
                                THEN 1

                            ELSE 0
                        END
                            AS Pagado

                    FROM Asientos A

                    LEFT JOIN DetalleReserva DR

                        ON
                            DR.IdAsiento =
                                A.IdAsiento

                            AND

                            DR.IdViaje =
                                @IdViaje

                            AND

                            EXISTS
                            (
                                SELECT
                                    1

                                FROM Reservas RX

                                WHERE
                                    RX.IdReserva =
                                        DR.IdReserva

                                    AND

                                    RX.Estado <>
                                        'CANCELADA'
                            )

                    LEFT JOIN Reservas R

                        ON
                            R.IdReserva =
                                DR.IdReserva

                            AND

                            R.Estado <>
                                'CANCELADA'

                    LEFT JOIN Usuarios U

                        ON
                            U.IdUsuario =
                                R.IdUsuario

                    WHERE
                        A.IdBus =
                            @IdBus

                    ORDER BY
                        A.NumeroAsiento
                `);


        return res.status(200).json({

            ok: true,

            modo:
                "VIAJE",

            bus:
                busResult.recordset[0],

            viaje,

            asientos:
                resultado.recordset

        });

    } catch (error) {

        console.error(
            "Error obteniendo asientos:",
            error
        );


        return res.status(500).json({
            ok: false,
            mensaje:
                "Error al obtener los asientos",
            error:
                error.message
        });

    }

};


// ======================================================
// ACTUALIZAR ASIENTO
// ======================================================

const actualizarAsiento = async (req, res) => {

    try {

        const idAsiento =
            parseInt(
                req.params.id
            );


        const {
            tipoAsiento,
            estado
        } = req.body;


        const tiposPermitidos = [
            "NORMAL",
            "VIP",
            "PREFERENCIAL"
        ];


        if (
            isNaN(idAsiento)
        ) {

            return res.status(400).json({
                ok: false,
                mensaje:
                    "Asiento inválido"
            });

        }


        if (
            !tiposPermitidos.includes(
                tipoAsiento
            )
        ) {

            return res.status(400).json({
                ok: false,
                mensaje:
                    "Tipo de asiento inválido"
            });

        }


        if (
            ![
                0,
                1,
                false,
                true
            ].includes(
                estado
            )
        ) {

            return res.status(400).json({
                ok: false,
                mensaje:
                    "Estado inválido"
            });

        }


        const pool =
            await conectarBD();


        // ==================================================
        // NO PERMITIR MODIFICAR ASIENTO CON RESERVA FUTURA
        // ==================================================

        const reservaActiva =
            await pool
                .request()
                .input(
                    "IdAsiento",
                    sql.Int,
                    idAsiento
                )
                .query(`
                    SELECT TOP 1
                        DR.IdDetalleReserva,
                        R.CodigoReserva,
                        R.Estado,
                        V.FechaHoraSalida

                    FROM DetalleReserva DR

                    INNER JOIN Reservas R
                        ON DR.IdReserva =
                            R.IdReserva

                    INNER JOIN Viajes V
                        ON DR.IdViaje =
                            V.IdViaje

                    WHERE
                        DR.IdAsiento =
                            @IdAsiento

                        AND

                        R.Estado <>
                            'CANCELADA'

                        AND

                        V.FechaHoraSalida >
                            GETDATE()

                    ORDER BY
                        V.FechaHoraSalida ASC
                `);


        if (
            reservaActiva.recordset.length > 0
        ) {

            return res.status(409).json({
                ok: false,
                mensaje:
                    "Este asiento tiene una reserva futura activa y no puede ser modificado."
            });

        }


        // ==================================================
        // ACTUALIZAR
        // ==================================================

        const resultado =
            await pool
                .request()
                .input(
                    "IdAsiento",
                    sql.Int,
                    idAsiento
                )
                .input(
                    "TipoAsiento",
                    sql.VarChar,
                    tipoAsiento
                )
                .input(
                    "Estado",
                    sql.Bit,
                    estado
                )
                .query(`
                    UPDATE Asientos

                    SET
                        TipoAsiento =
                            @TipoAsiento,

                        Estado =
                            @Estado

                    WHERE
                        IdAsiento =
                            @IdAsiento;


                    SELECT
                        @@ROWCOUNT
                            AS FilasAfectadas;
                `);


        if (
            resultado.recordset[0]
                .FilasAfectadas === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje:
                    "Asiento no encontrado"
            });

        }


        return res.status(200).json({
            ok: true,
            mensaje:
                "Asiento actualizado correctamente"
        });

    } catch (error) {

        console.error(
            "Error actualizando asiento:",
            error
        );


        return res.status(500).json({
            ok: false,
            mensaje:
                "Error al actualizar el asiento",
            error:
                error.message
        });

    }

};


module.exports = {

    listarBuses,

    listarViajesBus,

    listarAsientos,

    actualizarAsiento

};