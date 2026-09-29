const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// UTILIDAD: CÓDIGO DE BOLETO
// ======================================================

function generarCodigoBoleto() {

    const ahora =
        new Date();

    return `BOL-${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}-${Date.now().toString().slice(-7)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}


// ======================================================
// UTILIDAD: ASEGURAR BOLETO EN TRANSACCIÓN
// ======================================================

async function asegurarBoleto(
    transaction,
    idReserva
) {

    const existente =
        await new sql.Request(
            transaction
        )
            .input(
                "IdReserva",
                sql.Int,
                idReserva
            )
            .query(`
                SELECT TOP 1
                    IdBoleto,
                    CodigoBoleto

                FROM Boletos

                WHERE
                    IdReserva = @IdReserva
                    AND
                    Estado <> 'CANCELADO'

                ORDER BY
                    IdBoleto DESC
            `);


    if (
        existente.recordset.length > 0
    ) {

        return existente.recordset[0];

    }


    const resultado =
        await new sql.Request(
            transaction
        )
            .input(
                "IdReserva",
                sql.Int,
                idReserva
            )
            .input(
                "CodigoBoleto",
                sql.VarChar,
                generarCodigoBoleto()
            )
            .query(`
                INSERT INTO Boletos
                (
                    IdReserva,
                    CodigoBoleto,
                    Estado
                )

                OUTPUT
                    INSERTED.IdBoleto,
                    INSERTED.CodigoBoleto

                VALUES
                (
                    @IdReserva,
                    @CodigoBoleto,
                    'ACTIVO'
                )
            `);


    return resultado.recordset[0];
}


// ======================================================
// LISTAR PAGOS
// ======================================================

const listarPagos = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .query(`
                    SELECT
                        P.IdPago,
                        P.IdReserva,
                        P.MetodoPago,
                        P.Monto,
                        P.FechaPago,
                        P.ReferenciaPago,
                        P.Estado,

                        R.CodigoReserva,
                        R.Total AS TotalReserva,
                        R.Estado AS EstadoReserva,

                        U.IdUsuario,
                        U.Cedula,
                        U.Nombres,
                        U.Apellidos,
                        U.Correo,
                        U.Telefono,

                        V.IdViaje,
                        V.FechaHoraSalida,
                        V.FechaHoraLlegada,

                        RU.CiudadOrigen,
                        RU.CiudadDestino,

                        B.NumeroBus,
                        B.Placa,

                        BO.IdBoleto,
                        BO.CodigoBoleto

                    FROM Pagos P

                    INNER JOIN Reservas R
                        ON P.IdReserva = R.IdReserva

                    INNER JOIN Usuarios U
                        ON R.IdUsuario = U.IdUsuario

                    INNER JOIN Viajes V
                        ON R.IdViaje = V.IdViaje

                    INNER JOIN Rutas RU
                        ON V.IdRuta = RU.IdRuta

                    INNER JOIN Buses B
                        ON V.IdBus = B.IdBus

                    OUTER APPLY
                    (
                        SELECT TOP 1
                            B2.IdBoleto,
                            B2.CodigoBoleto
                        FROM Boletos B2
                        WHERE
                            B2.IdReserva = R.IdReserva
                            AND
                            B2.Estado <> 'CANCELADO'
                        ORDER BY
                            B2.IdBoleto DESC
                    ) BO

                    ORDER BY
                        P.FechaPago DESC,
                        P.IdPago DESC
                `);


        return res.status(200).json({
            ok: true,
            pagos: resultado.recordset
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener los pagos",
            error: error.message
        });

    }

};


// ======================================================
// OBTENER PAGO
// ======================================================

const obtenerPago = async (req, res) => {

    try {

        const idPago =
            parseInt(
                req.params.id
            );


        if (
            isNaN(idPago)
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "ID de pago inválido"
            });

        }


        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .input(
                    "IdPago",
                    sql.Int,
                    idPago
                )
                .query(`
                    SELECT
                        P.IdPago,
                        P.IdReserva,
                        P.MetodoPago,
                        P.Monto,
                        P.FechaPago,
                        P.ReferenciaPago,
                        P.Estado,

                        R.CodigoReserva,
                        R.Total AS TotalReserva,
                        R.Estado AS EstadoReserva,

                        U.Cedula,
                        U.Nombres,
                        U.Apellidos,
                        U.Correo,
                        U.Telefono,

                        V.FechaHoraSalida,
                        V.FechaHoraLlegada,

                        RU.CiudadOrigen,
                        RU.CiudadDestino,

                        B.NumeroBus,
                        B.Placa

                    FROM Pagos P

                    INNER JOIN Reservas R
                        ON P.IdReserva = R.IdReserva

                    INNER JOIN Usuarios U
                        ON R.IdUsuario = U.IdUsuario

                    INNER JOIN Viajes V
                        ON R.IdViaje = V.IdViaje

                    INNER JOIN Rutas RU
                        ON V.IdRuta = RU.IdRuta

                    INNER JOIN Buses B
                        ON V.IdBus = B.IdBus

                    WHERE
                        P.IdPago = @IdPago
                `);


        if (
            resultado.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje: "Pago no encontrado"
            });

        }


        return res.status(200).json({
            ok: true,
            pago: resultado.recordset[0]
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener el pago",
            error: error.message
        });

    }

};


// ======================================================
// RESERVAS DISPONIBLES
// ======================================================

const obtenerReservasParaPago = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .query(`
                    SELECT
                        R.IdReserva,
                        R.CodigoReserva,
                        R.Total,
                        R.Estado,
                        R.FechaReserva,

                        U.Cedula,
                        U.Nombres,
                        U.Apellidos,
                        U.Correo,

                        V.FechaHoraSalida,

                        RU.CiudadOrigen,
                        RU.CiudadDestino,

                        B.NumeroBus,
                        B.Placa,

                        (
                            SELECT STRING_AGG(
                                CAST(A.NumeroAsiento AS VARCHAR(10)),
                                ', '
                            )
                            FROM DetalleReserva DR
                            INNER JOIN Asientos A
                                ON DR.IdAsiento = A.IdAsiento
                            WHERE
                                DR.IdReserva = R.IdReserva
                        ) AS Asientos

                    FROM Reservas R

                    INNER JOIN Usuarios U
                        ON R.IdUsuario = U.IdUsuario

                    INNER JOIN Viajes V
                        ON R.IdViaje = V.IdViaje

                    INNER JOIN Rutas RU
                        ON V.IdRuta = RU.IdRuta

                    INNER JOIN Buses B
                        ON V.IdBus = B.IdBus

                    WHERE
                        R.Estado IN
                        (
                            'PENDIENTE',
                            'CONFIRMADA'
                        )

                        AND NOT EXISTS
                        (
                            SELECT 1
                            FROM Pagos P
                            WHERE
                                P.IdReserva = R.IdReserva
                                AND
                                P.Estado = 'APROBADO'
                        )

                    ORDER BY
                        R.FechaReserva DESC
                `);


        return res.status(200).json({
            ok: true,
            reservas: resultado.recordset
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener reservas pendientes de pago",
            error: error.message
        });

    }

};


// ======================================================
// CREAR PAGO
// ======================================================

const crearPago = async (req, res) => {

    let transaction;


    try {

        const {
            idReserva,
            metodoPago,
            referenciaPago,
            estado
        } = req.body;


        if (
            !idReserva ||
            !metodoPago
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Reserva y método de pago son obligatorios"
            });

        }


        const estadoPago =
            estado || "APROBADO";


        if (
            ![
                "PENDIENTE",
                "APROBADO",
                "RECHAZADO"
            ].includes(
                estadoPago
            )
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Estado de pago inválido"
            });

        }


        const pool =
            await conectarBD();


        const reservaResult =
            await pool
                .request()
                .input(
                    "IdReserva",
                    sql.Int,
                    parseInt(idReserva)
                )
                .query(`
                    SELECT
                        IdReserva,
                        CodigoReserva,
                        Total,
                        Estado

                    FROM Reservas

                    WHERE
                        IdReserva = @IdReserva
                `);


        if (
            reservaResult.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje: "La reserva no existe"
            });

        }


        const reserva =
            reservaResult.recordset[0];


        if (
            reserva.Estado === "CANCELADA"
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "No se puede pagar una reserva cancelada"
            });

        }


        if (
            reserva.Estado === "PAGADA"
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "La reserva ya está pagada"
            });

        }


        const otroAprobado =
            await pool
                .request()
                .input(
                    "IdReserva",
                    sql.Int,
                    parseInt(idReserva)
                )
                .query(`
                    SELECT TOP 1
                        IdPago

                    FROM Pagos

                    WHERE
                        IdReserva = @IdReserva
                        AND
                        Estado = 'APROBADO'
                `);


        if (
            otroAprobado.recordset.length > 0
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "La reserva ya tiene un pago aprobado"
            });

        }


        transaction =
            new sql.Transaction(
                pool
            );


        await transaction.begin();


        const pagoResult =
            await new sql.Request(
                transaction
            )
                .input(
                    "IdReserva",
                    sql.Int,
                    parseInt(idReserva)
                )
                .input(
                    "MetodoPago",
                    sql.VarChar,
                    metodoPago.trim()
                )
                .input(
                    "Monto",
                    sql.Decimal(10, 2),
                    Number(
                        reserva.Total
                    )
                )
                .input(
                    "ReferenciaPago",
                    sql.VarChar,
                    referenciaPago
                        ? referenciaPago.trim()
                        : null
                )
                .input(
                    "Estado",
                    sql.VarChar,
                    estadoPago
                )
                .query(`
                    INSERT INTO Pagos
                    (
                        IdReserva,
                        MetodoPago,
                        Monto,
                        ReferenciaPago,
                        Estado
                    )

                    OUTPUT
                        INSERTED.IdPago,
                        INSERTED.FechaPago

                    VALUES
                    (
                        @IdReserva,
                        @MetodoPago,
                        @Monto,
                        @ReferenciaPago,
                        @Estado
                    )
                `);


        let boleto =
            null;


        if (
            estadoPago === "APROBADO"
        ) {

            await new sql.Request(
                transaction
            )
                .input(
                    "IdReserva",
                    sql.Int,
                    parseInt(idReserva)
                )
                .query(`
                    UPDATE Reservas

                    SET
                        Estado = 'PAGADA'

                    WHERE
                        IdReserva = @IdReserva
                `);


            boleto =
                await asegurarBoleto(
                    transaction,
                    parseInt(idReserva)
                );

        } else if (
            estadoPago === "PENDIENTE" &&
            reserva.Estado === "PENDIENTE"
        ) {

            await new sql.Request(
                transaction
            )
                .input(
                    "IdReserva",
                    sql.Int,
                    parseInt(idReserva)
                )
                .query(`
                    UPDATE Reservas

                    SET
                        Estado = 'CONFIRMADA'

                    WHERE
                        IdReserva = @IdReserva
                `);

        }


        await transaction.commit();

        transaction = null;


        return res.status(201).json({

            ok: true,

            mensaje:
                estadoPago === "APROBADO"
                    ? "Pago aprobado. La reserva quedó PAGADA y el boleto fue emitido."
                    : "Pago registrado correctamente",

            pago: {
                idPago:
                    pagoResult.recordset[0].IdPago,

                fechaPago:
                    pagoResult.recordset[0].FechaPago,

                monto:
                    Number(
                        reserva.Total
                    ),

                estado:
                    estadoPago
            },

            boleto

        });

    } catch (error) {

        if (transaction) {

            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(rollbackError);
            }

        }


        console.error(error);


        return res.status(500).json({
            ok: false,
            mensaje: "Error al registrar el pago",
            error: error.message
        });

    }

};


// ======================================================
// ACTUALIZAR PAGO
// ======================================================

const actualizarPago = async (req, res) => {

    try {

        const idPago =
            parseInt(
                req.params.id
            );


        const {
            metodoPago,
            referenciaPago
        } = req.body;


        if (
            isNaN(idPago) ||
            !metodoPago
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Datos de pago inválidos"
            });

        }


        const pool =
            await conectarBD();


        const actual =
            await pool
                .request()
                .input(
                    "IdPago",
                    sql.Int,
                    idPago
                )
                .query(`
                    SELECT
                        IdPago,
                        Estado

                    FROM Pagos

                    WHERE
                        IdPago = @IdPago
                `);


        if (
            actual.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje: "Pago no encontrado"
            });

        }


        if (
            actual.recordset[0].Estado ===
            "REEMBOLSADO"
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "No se puede modificar un pago reembolsado"
            });

        }


        await pool
            .request()
            .input(
                "IdPago",
                sql.Int,
                idPago
            )
            .input(
                "MetodoPago",
                sql.VarChar,
                metodoPago.trim()
            )
            .input(
                "ReferenciaPago",
                sql.VarChar,
                referenciaPago
                    ? referenciaPago.trim()
                    : null
            )
            .query(`
                UPDATE Pagos

                SET
                    MetodoPago = @MetodoPago,
                    ReferenciaPago = @ReferenciaPago

                WHERE
                    IdPago = @IdPago
            `);


        return res.status(200).json({
            ok: true,
            mensaje: "Pago actualizado correctamente"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar el pago",
            error: error.message
        });

    }

};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoPago = async (req, res) => {

    let transaction;


    try {

        const idPago =
            parseInt(
                req.params.id
            );


        const {
            estado
        } = req.body;


        if (
            isNaN(idPago) ||
            ![
                "PENDIENTE",
                "APROBADO",
                "RECHAZADO",
                "REEMBOLSADO"
            ].includes(
                estado
            )
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Estado de pago inválido"
            });

        }


        const pool =
            await conectarBD();


        const pagoResult =
            await pool
                .request()
                .input(
                    "IdPago",
                    sql.Int,
                    idPago
                )
                .query(`
                    SELECT
                        IdPago,
                        IdReserva,
                        Estado

                    FROM Pagos

                    WHERE
                        IdPago = @IdPago
                `);


        if (
            pagoResult.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje: "Pago no encontrado"
            });

        }


        const pago =
            pagoResult.recordset[0];


        if (
            pago.Estado === "REEMBOLSADO"
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Un pago reembolsado ya no puede cambiar de estado"
            });

        }


        if (
            estado === "APROBADO"
        ) {

            const otro =
                await pool
                    .request()
                    .input(
                        "IdReserva",
                        sql.Int,
                        pago.IdReserva
                    )
                    .input(
                        "IdPago",
                        sql.Int,
                        idPago
                    )
                    .query(`
                        SELECT TOP 1
                            IdPago

                        FROM Pagos

                        WHERE
                            IdReserva = @IdReserva
                            AND
                            Estado = 'APROBADO'
                            AND
                            IdPago <> @IdPago
                    `);


            if (
                otro.recordset.length > 0
            ) {

                return res.status(400).json({
                    ok: false,
                    mensaje: "La reserva ya tiene otro pago aprobado"
                });

            }

        }


        transaction =
            new sql.Transaction(
                pool
            );


        await transaction.begin();


        await new sql.Request(
            transaction
        )
            .input(
                "IdPago",
                sql.Int,
                idPago
            )
            .input(
                "Estado",
                sql.VarChar,
                estado
            )
            .query(`
                UPDATE Pagos

                SET
                    Estado = @Estado

                WHERE
                    IdPago = @IdPago
            `);


        let boleto =
            null;


        if (
            estado === "APROBADO"
        ) {

            await new sql.Request(
                transaction
            )
                .input(
                    "IdReserva",
                    sql.Int,
                    pago.IdReserva
                )
                .query(`
                    UPDATE Reservas

                    SET
                        Estado = 'PAGADA'

                    WHERE
                        IdReserva = @IdReserva
                        AND
                        Estado <> 'CANCELADA'
                `);


            boleto =
                await asegurarBoleto(
                    transaction,
                    pago.IdReserva
                );

        }


        if (
            estado === "REEMBOLSADO"
        ) {

            await new sql.Request(
                transaction
            )
                .input(
                    "IdReserva",
                    sql.Int,
                    pago.IdReserva
                )
                .query(`
                    UPDATE Reservas
                    SET Estado = 'CANCELADA'
                    WHERE IdReserva = @IdReserva;

                    UPDATE Boletos
                    SET Estado = 'CANCELADO'
                    WHERE IdReserva = @IdReserva;

                    DELETE FROM DetalleReserva
                    WHERE IdReserva = @IdReserva;
                `);

        }


        if (
            pago.Estado === "APROBADO" &&
            (
                estado === "PENDIENTE" ||
                estado === "RECHAZADO"
            )
        ) {

            await new sql.Request(
                transaction
            )
                .input(
                    "IdReserva",
                    sql.Int,
                    pago.IdReserva
                )
                .query(`
                    UPDATE Reservas

                    SET
                        Estado = 'CONFIRMADA'

                    WHERE
                        IdReserva = @IdReserva
                        AND
                        Estado <> 'CANCELADA'
                `);

        }


        await transaction.commit();

        transaction = null;


        return res.status(200).json({

            ok: true,

            mensaje:
                estado === "APROBADO"
                    ? "Pago aprobado y boleto emitido"
                    : estado === "REEMBOLSADO"
                        ? "Pago reembolsado, reserva cancelada y asientos liberados"
                        : "Estado actualizado correctamente",

            boleto

        });

    } catch (error) {

        if (transaction) {

            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(rollbackError);
            }

        }


        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al cambiar el estado del pago",
            error: error.message
        });

    }

};


// ======================================================
// ELIMINAR PAGO
// ======================================================

const eliminarPago = async (req, res) => {

    try {

        const idPago =
            parseInt(
                req.params.id
            );


        if (
            isNaN(idPago)
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "ID de pago inválido"
            });

        }


        const pool =
            await conectarBD();


        const pago =
            await pool
                .request()
                .input(
                    "IdPago",
                    sql.Int,
                    idPago
                )
                .query(`
                    SELECT
                        IdPago,
                        Estado

                    FROM Pagos

                    WHERE
                        IdPago = @IdPago
                `);


        if (
            pago.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje: "Pago no encontrado"
            });

        }


        if (
            [
                "APROBADO",
                "REEMBOLSADO"
            ].includes(
                pago.recordset[0].Estado
            )
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Los pagos aprobados o reembolsados se conservan en el historial"
            });

        }


        await pool
            .request()
            .input(
                "IdPago",
                sql.Int,
                idPago
            )
            .query(`
                DELETE FROM Pagos
                WHERE IdPago = @IdPago
            `);


        return res.status(200).json({
            ok: true,
            mensaje: "Pago eliminado correctamente"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible eliminar el pago",
            error: error.message
        });

    }

};


module.exports = {
    listarPagos,
    obtenerPago,
    obtenerReservasParaPago,
    crearPago,
    actualizarPago,
    cambiarEstadoPago,
    eliminarPago
};
