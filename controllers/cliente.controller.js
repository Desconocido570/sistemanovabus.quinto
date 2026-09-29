const bcrypt = require("bcrypt");

const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// UTILIDADES
// ======================================================

function codigoReserva() {

    const ahora =
        new Date();

    return `RES-${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}


function codigoBoleto() {

    const ahora =
        new Date();

    return `BOL-${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}-${Date.now().toString().slice(-7)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}


// ======================================================
// BUSCAR VIAJES
// ======================================================

const buscarViajes = async (req, res) => {

    try {

        const {
            origen,
            destino,
            fecha
        } = req.query;


        const pool =
            await conectarBD();


        let query = `
            SELECT
                V.IdViaje,
                V.IdRuta,
                V.IdBus,
                V.FechaHoraSalida,
                V.FechaHoraLlegada,
                V.Precio,
                V.Estado,

                R.CiudadOrigen,
                R.CiudadDestino,
                R.TerminalOrigen,
                R.TerminalDestino,
                R.DuracionMinutos,

                B.NumeroBus,
                B.Placa,
                B.Marca,
                B.Modelo,
                B.Capacidad,
                B.TipoBus,

                (
                    B.Capacidad -
                    (
                        SELECT COUNT(*)

                        FROM DetalleReserva DR

                        INNER JOIN Reservas RES
                            ON DR.IdReserva = RES.IdReserva

                        WHERE
                            DR.IdViaje = V.IdViaje
                            AND
                            RES.Estado <> 'CANCELADA'
                    )
                ) AS AsientosDisponibles

            FROM Viajes V

            INNER JOIN Rutas R
                ON V.IdRuta = R.IdRuta

            INNER JOIN Buses B
                ON V.IdBus = B.IdBus

            WHERE
                V.Estado = 'PROGRAMADO'
                AND
                R.Estado = 1
                AND
                B.Estado <> 'INACTIVO'
                AND
                B.Estado <> 'MANTENIMIENTO'
                AND
                V.FechaHoraSalida > GETDATE()
        `;


        const request =
            pool.request();


        if (origen) {

            query += `
                AND LOWER(R.CiudadOrigen)
                    LIKE LOWER(@Origen)
            `;

            request.input(
                "Origen",
                sql.VarChar,
                `%${origen.trim()}%`
            );

        }


        if (destino) {

            query += `
                AND LOWER(R.CiudadDestino)
                    LIKE LOWER(@Destino)
            `;

            request.input(
                "Destino",
                sql.VarChar,
                `%${destino.trim()}%`
            );

        }


        if (fecha) {

            query += `
                AND CAST(
                    V.FechaHoraSalida
                    AS DATE
                ) = @Fecha
            `;

            request.input(
                "Fecha",
                sql.Date,
                fecha
            );

        }


        query += `
            ORDER BY
                V.FechaHoraSalida ASC
        `;


        const resultado =
            await request.query(
                query
            );


        return res.status(200).json({

            ok: true,

            viajes:
                resultado.recordset

        });

    } catch (error) {

        console.error(
            "Error buscando viajes:",
            error
        );


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al buscar viajes",

            error:
                error.message

        });

    }

};


// ======================================================
// DETALLE DE VIAJE + ASIENTOS
// ======================================================

const obtenerViaje = async (req, res) => {

    try {

        const idViaje =
            parseInt(
                req.params.idViaje
            );


        if (
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


        const viajeResult =
            await pool
                .request()

                .input(
                    "IdViaje",
                    sql.Int,
                    idViaje
                )

                .query(`
                    SELECT
                        V.IdViaje,
                        V.IdBus,
                        V.FechaHoraSalida,
                        V.FechaHoraLlegada,
                        V.Precio,
                        V.Estado,

                        R.CiudadOrigen,
                        R.CiudadDestino,
                        R.TerminalOrigen,
                        R.TerminalDestino,

                        B.NumeroBus,
                        B.Placa,
                        B.Marca,
                        B.Modelo,
                        B.Capacidad,
                        B.TipoBus

                    FROM Viajes V

                    INNER JOIN Rutas R
                        ON V.IdRuta = R.IdRuta

                    INNER JOIN Buses B
                        ON V.IdBus = B.IdBus

                    WHERE
                        V.IdViaje = @IdViaje
                        AND
                        V.Estado = 'PROGRAMADO'
                        AND
                        V.FechaHoraSalida > GETDATE()
                `);


        if (
            viajeResult.recordset.length === 0
        ) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "El viaje no existe o ya no está disponible"

            });

        }


        const viaje =
            viajeResult.recordset[0];


        const asientosResult =
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
                    viaje.IdBus
                )

                .query(`
                    SELECT
                        A.IdAsiento,
                        A.NumeroAsiento,
                        A.TipoAsiento,

                        CASE
                            WHEN EXISTS
                            (
                                SELECT 1

                                FROM DetalleReserva DR

                                INNER JOIN Reservas R
                                    ON DR.IdReserva = R.IdReserva

                                WHERE
                                    DR.IdViaje = @IdViaje
                                    AND
                                    DR.IdAsiento = A.IdAsiento
                                    AND
                                    R.Estado <> 'CANCELADA'
                            )
                            THEN 1
                            ELSE 0
                        END AS Ocupado

                    FROM Asientos A

                    WHERE
                        A.IdBus = @IdBus
                        AND
                        A.Estado = 1

                    ORDER BY
                        A.NumeroAsiento
                `);


        return res.status(200).json({

            ok: true,

            viaje,

            asientos:
                asientosResult.recordset

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al cargar el viaje",

            error:
                error.message

        });

    }

};


// ======================================================
// RESERVAR O COMPRAR
// ======================================================

const procesarCompra = async (req, res) => {

    let transaction;


    try {

        const idUsuario =
            Number(
                req.usuario.idUsuario
            );


        const {
            idViaje,
            asientos,
            tipoOperacion,
            metodoPago,
            referenciaPago
        } = req.body;


        const operacion =
            tipoOperacion === "RESERVAR"
                ? "RESERVAR"
                : "COMPRAR";


        if (
            !idViaje ||
            !Array.isArray(asientos) ||
            asientos.length === 0
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Selecciona el viaje y al menos un asiento"

            });

        }


        if (
            operacion === "COMPRAR" &&
            !metodoPago
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Selecciona un método de pago"

            });

        }


        const idsAsientos =
            [
                ...new Set(
                    asientos.map(
                        item =>
                            parseInt(item)
                    )
                )
            ];


        if (
            idsAsientos.some(
                item =>
                    isNaN(item)
            )
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Hay asientos inválidos en la selección"

            });

        }


        const pool =
            await conectarBD();


        const usuarioResult =
            await pool
                .request()

                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )

                .query(`
                    SELECT
                        U.IdUsuario,
                        U.Estado,
                        R.NombreRol

                    FROM Usuarios U

                    INNER JOIN Roles R
                        ON U.IdRol = R.IdRol

                    WHERE
                        U.IdUsuario = @IdUsuario
                `);


        if (
            usuarioResult.recordset.length === 0 ||
            !usuarioResult.recordset[0].Estado ||
            usuarioResult.recordset[0].NombreRol !== "CLIENTE"
        ) {

            return res.status(403).json({

                ok: false,

                mensaje:
                    "Tu cuenta no está habilitada para realizar compras"

            });

        }


        const viajeResult =
            await pool
                .request()

                .input(
                    "IdViaje",
                    sql.Int,
                    parseInt(idViaje)
                )

                .query(`
                    SELECT
                        V.IdViaje,
                        V.IdBus,
                        V.Precio,
                        V.Estado,
                        V.FechaHoraSalida

                    FROM Viajes V

                    INNER JOIN Buses B
                        ON V.IdBus = B.IdBus

                    WHERE
                        V.IdViaje = @IdViaje
                        AND
                        V.Estado = 'PROGRAMADO'
                        AND
                        V.FechaHoraSalida > GETDATE()
                        AND
                        B.Estado <> 'INACTIVO'
                        AND
                        B.Estado <> 'MANTENIMIENTO'
                `);


        if (
            viajeResult.recordset.length === 0
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "El viaje ya no está disponible"

            });

        }


        const viaje =
            viajeResult.recordset[0];


        const placeholders =
            idsAsientos
                .map(
                    (_, index) =>
                        `@A${index}`
                )
                .join(",");


        const validarAsientos =
            pool
                .request()

                .input(
                    "IdBus",
                    sql.Int,
                    viaje.IdBus
                );


        idsAsientos.forEach(
            (
                idAsiento,
                index
            ) => {

                validarAsientos.input(
                    `A${index}`,
                    sql.Int,
                    idAsiento
                );

            }
        );


        const asientosResult =
            await validarAsientos
                .query(`
                    SELECT
                        IdAsiento,
                        NumeroAsiento

                    FROM Asientos

                    WHERE
                        IdBus = @IdBus
                        AND
                        Estado = 1
                        AND
                        IdAsiento IN (${placeholders})
                `);


        if (
            asientosResult.recordset.length !==
            idsAsientos.length
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Uno o más asientos no son válidos para este bus"

            });

        }


        transaction =
            new sql.Transaction(
                pool
            );


        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        );


        const ocupadosRequest =
            new sql.Request(
                transaction
            )

                .input(
                    "IdViaje",
                    sql.Int,
                    parseInt(idViaje)
                );


        idsAsientos.forEach(
            (
                idAsiento,
                index
            ) => {

                ocupadosRequest.input(
                    `A${index}`,
                    sql.Int,
                    idAsiento
                );

            }
        );


        const ocupados =
            await ocupadosRequest
                .query(`
                    SELECT
                        DR.IdAsiento

                    FROM DetalleReserva DR WITH (UPDLOCK, HOLDLOCK)

                    INNER JOIN Reservas R
                        ON DR.IdReserva = R.IdReserva

                    WHERE
                        DR.IdViaje = @IdViaje
                        AND
                        DR.IdAsiento IN (${placeholders})
                        AND
                        R.Estado <> 'CANCELADA'
                `);


        if (
            ocupados.recordset.length > 0
        ) {

            await transaction.rollback();

            transaction = null;


            return res.status(409).json({

                ok: false,

                mensaje:
                    "Uno de los asientos acaba de ser ocupado. Actualiza la selección."

            });

        }


        const codigoReservaNuevo =
            codigoReserva();


        const precio =
            Number(
                viaje.Precio
            );


        const total =
            precio *
            idsAsientos.length;


        const estadoReserva =
            operacion === "COMPRAR"
                ? "PAGADA"
                : "PENDIENTE";


        const reservaResult =
            await new sql.Request(
                transaction
            )

                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )

                .input(
                    "IdViaje",
                    sql.Int,
                    parseInt(idViaje)
                )

                .input(
                    "CodigoReserva",
                    sql.VarChar,
                    codigoReservaNuevo
                )

                .input(
                    "Total",
                    sql.Decimal(10, 2),
                    total
                )

                .input(
                    "Estado",
                    sql.VarChar,
                    estadoReserva
                )

                .query(`
                    INSERT INTO Reservas
                    (
                        IdUsuario,
                        IdViaje,
                        CodigoReserva,
                        Total,
                        Estado
                    )

                    OUTPUT
                        INSERTED.IdReserva

                    VALUES
                    (
                        @IdUsuario,
                        @IdViaje,
                        @CodigoReserva,
                        @Total,
                        @Estado
                    )
                `);


        const idReserva =
            reservaResult.recordset[0]
                .IdReserva;


        for (
            const idAsiento
            of idsAsientos
        ) {

            await new sql.Request(
                transaction
            )

                .input(
                    "IdReserva",
                    sql.Int,
                    idReserva
                )

                .input(
                    "IdViaje",
                    sql.Int,
                    parseInt(idViaje)
                )

                .input(
                    "IdAsiento",
                    sql.Int,
                    idAsiento
                )

                .input(
                    "Precio",
                    sql.Decimal(10, 2),
                    precio
                )

                .query(`
                    INSERT INTO DetalleReserva
                    (
                        IdReserva,
                        IdViaje,
                        IdAsiento,
                        Precio
                    )

                    VALUES
                    (
                        @IdReserva,
                        @IdViaje,
                        @IdAsiento,
                        @Precio
                    )
                `);

        }


        let boleto =
            null;


        if (
            operacion === "COMPRAR"
        ) {

            await new sql.Request(
                transaction
            )

                .input(
                    "IdReserva",
                    sql.Int,
                    idReserva
                )

                .input(
                    "MetodoPago",
                    sql.VarChar,
                    metodoPago.trim()
                )

                .input(
                    "Monto",
                    sql.Decimal(10, 2),
                    total
                )

                .input(
                    "ReferenciaPago",
                    sql.VarChar,
                    referenciaPago
                        ? referenciaPago.trim()
                        : null
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

                    VALUES
                    (
                        @IdReserva,
                        @MetodoPago,
                        @Monto,
                        @ReferenciaPago,
                        'APROBADO'
                    )
                `);


            const codigoBoletoNuevo =
                codigoBoleto();


            const boletoResult =
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
                        codigoBoletoNuevo
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


            boleto =
                boletoResult.recordset[0];

        }


        await transaction.commit();

        transaction = null;


        return res.status(201).json({

            ok: true,

            mensaje:
                operacion === "COMPRAR"
                    ? "Compra realizada correctamente"
                    : "Reserva creada correctamente",

            reserva: {

                idReserva,

                codigoReserva:
                    codigoReservaNuevo,

                total,

                estado:
                    estadoReserva

            },

            boleto

        });

    } catch (error) {

        if (transaction) {

            try {

                await transaction.rollback();

            } catch (rollbackError) {

                console.error(
                    rollbackError
                );

            }

        }


        console.error(
            "Error procesando compra:",
            error
        );


        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({

                ok: false,

                mensaje:
                    "Uno de los asientos ya fue reservado"

            });

        }


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al procesar la operación",

            error:
                error.message

        });

    }

};


// ======================================================
// MIS RESERVAS
// ======================================================

const misReservas = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()

                .input(
                    "IdUsuario",
                    sql.Int,
                    Number(
                        req.usuario.idUsuario
                    )
                )

                .query(`
                    SELECT
                        R.IdReserva,
                        R.CodigoReserva,
                        R.FechaReserva,
                        R.Total,
                        R.Estado,

                        V.FechaHoraSalida,
                        V.FechaHoraLlegada,
                        V.Estado AS EstadoViaje,

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

                    INNER JOIN Viajes V
                        ON R.IdViaje = V.IdViaje

                    INNER JOIN Rutas RU
                        ON V.IdRuta = RU.IdRuta

                    INNER JOIN Buses B
                        ON V.IdBus = B.IdBus

                    WHERE
                        R.IdUsuario = @IdUsuario

                    ORDER BY
                        R.FechaReserva DESC
                `);


        return res.status(200).json({

            ok: true,

            reservas:
                resultado.recordset

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al consultar tus reservas",

            error:
                error.message

        });

    }

};


// ======================================================
// PAGAR UNA RESERVA PENDIENTE
// ======================================================

const pagarReserva = async (req, res) => {

    let transaction;


    try {

        const idReserva =
            parseInt(
                req.params.idReserva
            );


        const {
            metodoPago,
            referenciaPago
        } = req.body;


        if (
            isNaN(idReserva) ||
            !metodoPago
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Datos de pago incompletos"

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
                    idReserva
                )

                .input(
                    "IdUsuario",
                    sql.Int,
                    Number(
                        req.usuario.idUsuario
                    )
                )

                .query(`
                    SELECT
                        R.IdReserva,
                        R.Total,
                        R.Estado,
                        V.FechaHoraSalida

                    FROM Reservas R

                    INNER JOIN Viajes V
                        ON R.IdViaje = V.IdViaje

                    WHERE
                        R.IdReserva = @IdReserva
                        AND
                        R.IdUsuario = @IdUsuario
                `);


        if (
            reservaResult.recordset.length === 0
        ) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Reserva no encontrada"

            });

        }


        const reserva =
            reservaResult.recordset[0];


        if (
            ![
                "PENDIENTE",
                "CONFIRMADA"
            ].includes(
                reserva.Estado
            )
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Esta reserva ya no puede pagarse"

            });

        }


        if (
            new Date(
                reserva.FechaHoraSalida
            ) <=
            new Date()
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "El viaje ya inició o finalizó"

            });

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
                "IdReserva",
                sql.Int,
                idReserva
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

            .query(`
                INSERT INTO Pagos
                (
                    IdReserva,
                    MetodoPago,
                    Monto,
                    ReferenciaPago,
                    Estado
                )

                VALUES
                (
                    @IdReserva,
                    @MetodoPago,
                    @Monto,
                    @ReferenciaPago,
                    'APROBADO'
                )
            `);


        await new sql.Request(
            transaction
        )

            .input(
                "IdReserva",
                sql.Int,
                idReserva
            )

            .query(`
                UPDATE Reservas

                SET
                    Estado = 'PAGADA'

                WHERE
                    IdReserva = @IdReserva
            `);


        let boletoResult =
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


        let boleto;


        if (
            boletoResult.recordset.length > 0
        ) {

            boleto =
                boletoResult.recordset[0];

        } else {

            boletoResult =
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
                        codigoBoleto()
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


            boleto =
                boletoResult.recordset[0];

        }


        await transaction.commit();

        transaction = null;


        return res.status(200).json({

            ok: true,

            mensaje:
                "Pago aprobado. Tu boleto está listo.",

            boleto

        });

    } catch (error) {

        if (transaction) {

            try {

                await transaction.rollback();

            } catch (rollbackError) {

                console.error(
                    rollbackError
                );

            }

        }


        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al procesar el pago",

            error:
                error.message

        });

    }

};


// ======================================================
// MIS BOLETOS
// ======================================================

const misBoletos = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()

                .input(
                    "IdUsuario",
                    sql.Int,
                    Number(
                        req.usuario.idUsuario
                    )
                )

                .query(`
                    SELECT
                        BOL.IdBoleto,
                        BOL.CodigoBoleto,
                        BOL.FechaEmision,
                        BOL.Estado,

                        R.CodigoReserva,
                        R.Total,

                        V.FechaHoraSalida,
                        V.FechaHoraLlegada,

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

                    FROM Boletos BOL

                    INNER JOIN Reservas R
                        ON BOL.IdReserva = R.IdReserva

                    INNER JOIN Viajes V
                        ON R.IdViaje = V.IdViaje

                    INNER JOIN Rutas RU
                        ON V.IdRuta = RU.IdRuta

                    INNER JOIN Buses B
                        ON V.IdBus = B.IdBus

                    WHERE
                        R.IdUsuario = @IdUsuario

                    ORDER BY
                        BOL.FechaEmision DESC
                `);


        return res.status(200).json({

            ok: true,

            boletos:
                resultado.recordset

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al consultar tus boletos",

            error:
                error.message

        });

    }

};


// ======================================================
// CANCELAR RESERVA CLIENTE
// ======================================================

const cancelarReserva = async (req, res) => {

    let transaction;


    try {

        const idReserva =
            parseInt(
                req.params.idReserva
            );


        if (
            isNaN(idReserva)
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Reserva inválida"

            });

        }


        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()

                .input(
                    "IdReserva",
                    sql.Int,
                    idReserva
                )

                .input(
                    "IdUsuario",
                    sql.Int,
                    Number(
                        req.usuario.idUsuario
                    )
                )

                .query(`
                    SELECT
                        R.IdReserva,
                        R.Estado,
                        V.FechaHoraSalida

                    FROM Reservas R

                    INNER JOIN Viajes V
                        ON R.IdViaje = V.IdViaje

                    WHERE
                        R.IdReserva = @IdReserva
                        AND
                        R.IdUsuario = @IdUsuario
                `);


        if (
            resultado.recordset.length === 0
        ) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Reserva no encontrada"

            });

        }


        const reserva =
            resultado.recordset[0];


        if (
            reserva.Estado === "PAGADA"
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Una reserva pagada requiere un reembolso administrativo"

            });

        }


        if (
            reserva.Estado === "CANCELADA"
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "La reserva ya está cancelada"

            });

        }


        if (
            new Date(
                reserva.FechaHoraSalida
            ) <= new Date()
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Ya no puedes cancelar porque el viaje inició"

            });

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
                "IdReserva",
                sql.Int,
                idReserva
            )

            .query(`
                DELETE FROM DetalleReserva

                WHERE
                    IdReserva = @IdReserva
            `);


        await new sql.Request(
            transaction
        )

            .input(
                "IdReserva",
                sql.Int,
                idReserva
            )

            .query(`
                UPDATE Reservas

                SET
                    Estado = 'CANCELADA'

                WHERE
                    IdReserva = @IdReserva
            `);


        await transaction.commit();

        transaction = null;


        return res.status(200).json({

            ok: true,

            mensaje:
                "Reserva cancelada correctamente"

        });

    } catch (error) {

        if (transaction) {

            try {

                await transaction.rollback();

            } catch (rollbackError) {

                console.error(
                    rollbackError
                );

            }

        }


        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al cancelar la reserva",

            error:
                error.message

        });

    }

};


// ======================================================
// PERFIL
// ======================================================

const obtenerPerfil = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()

                .input(
                    "IdUsuario",
                    sql.Int,
                    Number(
                        req.usuario.idUsuario
                    )
                )

                .query(`
                    SELECT
                        IdUsuario,
                        Cedula,
                        Nombres,
                        Apellidos,
                        Correo,
                        Telefono,
                        FechaNacimiento,
                        FechaRegistro

                    FROM Usuarios

                    WHERE
                        IdUsuario = @IdUsuario
                `);


        if (
            resultado.recordset.length === 0
        ) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Usuario no encontrado"

            });

        }


        return res.status(200).json({

            ok: true,

            usuario:
                resultado.recordset[0]

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al cargar el perfil",

            error:
                error.message

        });

    }

};


const actualizarPerfil = async (req, res) => {

    try {

        const idUsuario =
            Number(
                req.usuario.idUsuario
            );


        const {
            nombres,
            apellidos,
            correo,
            telefono,
            fechaNacimiento,
            password
        } = req.body;


        if (
            !nombres ||
            !apellidos ||
            !correo
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Nombres, apellidos y correo son obligatorios"

            });

        }


        if (
            password &&
            password.length < 8
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "La nueva contraseña debe tener al menos 8 caracteres"

            });

        }


        const pool =
            await conectarBD();


        const duplicado =
            await pool
                .request()

                .input(
                    "Correo",
                    sql.VarChar,
                    correo.trim()
                )

                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )

                .query(`
                    SELECT
                        IdUsuario

                    FROM Usuarios

                    WHERE
                        LOWER(Correo) = LOWER(@Correo)
                        AND
                        IdUsuario <> @IdUsuario
                `);


        if (
            duplicado.recordset.length > 0
        ) {

            return res.status(409).json({

                ok: false,

                mensaje:
                    "Ese correo ya pertenece a otro usuario"

            });

        }


        if (password) {

            const hash =
                await bcrypt.hash(
                    password,
                    10
                );


            await pool
                .request()

                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )

                .input(
                    "Nombres",
                    sql.VarChar,
                    nombres.trim()
                )

                .input(
                    "Apellidos",
                    sql.VarChar,
                    apellidos.trim()
                )

                .input(
                    "Correo",
                    sql.VarChar,
                    correo.trim()
                )

                .input(
                    "Telefono",
                    sql.VarChar,
                    telefono
                        ? telefono.trim()
                        : null
                )

                .input(
                    "FechaNacimiento",
                    sql.Date,
                    fechaNacimiento || null
                )

                .input(
                    "ContrasenaHash",
                    sql.VarChar,
                    hash
                )

                .query(`
                    UPDATE Usuarios

                    SET
                        Nombres = @Nombres,
                        Apellidos = @Apellidos,
                        Correo = @Correo,
                        Telefono = @Telefono,
                        FechaNacimiento = @FechaNacimiento,
                        ContrasenaHash = @ContrasenaHash

                    WHERE
                        IdUsuario = @IdUsuario
                `);

        } else {

            await pool
                .request()

                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )

                .input(
                    "Nombres",
                    sql.VarChar,
                    nombres.trim()
                )

                .input(
                    "Apellidos",
                    sql.VarChar,
                    apellidos.trim()
                )

                .input(
                    "Correo",
                    sql.VarChar,
                    correo.trim()
                )

                .input(
                    "Telefono",
                    sql.VarChar,
                    telefono
                        ? telefono.trim()
                        : null
                )

                .input(
                    "FechaNacimiento",
                    sql.Date,
                    fechaNacimiento || null
                )

                .query(`
                    UPDATE Usuarios

                    SET
                        Nombres = @Nombres,
                        Apellidos = @Apellidos,
                        Correo = @Correo,
                        Telefono = @Telefono,
                        FechaNacimiento = @FechaNacimiento

                    WHERE
                        IdUsuario = @IdUsuario
                `);

        }


        return res.status(200).json({

            ok: true,

            mensaje:
                "Perfil actualizado correctamente"

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al actualizar el perfil",

            error:
                error.message

        });

    }

};


module.exports = {
    buscarViajes,
    obtenerViaje,
    procesarCompra,
    misReservas,
    pagarReserva,
    misBoletos,
    cancelarReserva,
    obtenerPerfil,
    actualizarPerfil
};
