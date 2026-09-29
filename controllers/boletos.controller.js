const PDFDocument = require("pdfkit");

const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// CÓDIGO DE BOLETO
// ======================================================

function generarCodigoBoleto() {

    const ahora =
        new Date();

    const fecha =
        `${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}`;

    const tiempo =
        Date.now()
            .toString()
            .slice(-7);

    const aleatorio =
        Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();


    return `BOL-${fecha}-${tiempo}-${aleatorio}`;
}


// ======================================================
// QUERY DETALLADA
// ======================================================

async function obtenerDatosBoleto(
    pool,
    idBoleto
) {

    const resultado =
        await pool
            .request()

            .input(
                "IdBoleto",
                sql.Int,
                idBoleto
            )

            .query(`
                SELECT
                    BOL.IdBoleto,
                    BOL.CodigoBoleto,
                    BOL.FechaEmision,
                    BOL.Estado AS EstadoBoleto,

                    R.IdReserva,
                    R.CodigoReserva,
                    R.FechaReserva,
                    R.Total,
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
                    V.Precio,

                    RU.CiudadOrigen,
                    RU.CiudadDestino,
                    RU.TerminalOrigen,
                    RU.TerminalDestino,

                    BUS.NumeroBus,
                    BUS.Placa,
                    BUS.Marca,
                    BUS.Modelo,
                    BUS.TipoBus,

                    P.MetodoPago,
                    P.Monto AS MontoPago,
                    P.FechaPago,
                    P.ReferenciaPago,

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

                INNER JOIN Usuarios U
                    ON R.IdUsuario = U.IdUsuario

                INNER JOIN Viajes V
                    ON R.IdViaje = V.IdViaje

                INNER JOIN Rutas RU
                    ON V.IdRuta = RU.IdRuta

                INNER JOIN Buses BUS
                    ON V.IdBus = BUS.IdBus

                OUTER APPLY
                (
                    SELECT TOP 1
                        P2.MetodoPago,
                        P2.Monto,
                        P2.FechaPago,
                        P2.ReferenciaPago
                    FROM Pagos P2
                    WHERE
                        P2.IdReserva = R.IdReserva
                        AND
                        P2.Estado = 'APROBADO'
                    ORDER BY
                        P2.FechaPago DESC,
                        P2.IdPago DESC
                ) P

                WHERE
                    BOL.IdBoleto = @IdBoleto
            `);


    return resultado.recordset[0] || null;
}


// ======================================================
// LISTAR BOLETOS
// ======================================================

const listarBoletos = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .query(`
                    SELECT
                        BOL.IdBoleto,
                        BOL.CodigoBoleto,
                        BOL.FechaEmision,
                        BOL.Estado,

                        R.IdReserva,
                        R.CodigoReserva,
                        R.Total,

                        U.IdUsuario,
                        U.Cedula,
                        U.Nombres,
                        U.Apellidos,

                        V.FechaHoraSalida,

                        RU.CiudadOrigen,
                        RU.CiudadDestino,

                        BUS.NumeroBus,
                        BUS.Placa,

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

                    INNER JOIN Usuarios U
                        ON R.IdUsuario = U.IdUsuario

                    INNER JOIN Viajes V
                        ON R.IdViaje = V.IdViaje

                    INNER JOIN Rutas RU
                        ON V.IdRuta = RU.IdRuta

                    INNER JOIN Buses BUS
                        ON V.IdBus = BUS.IdBus

                    ORDER BY
                        BOL.FechaEmision DESC,
                        BOL.IdBoleto DESC
                `);


        return res.status(200).json({

            ok: true,

            boletos:
                resultado.recordset

        });

    } catch (error) {

        console.error(
            "Error listando boletos:",
            error
        );


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al obtener los boletos",

            error:
                error.message

        });

    }

};


// ======================================================
// RESERVAS PAGADAS SIN BOLETO ACTIVO
// ======================================================

const reservasDisponibles = async (req, res) => {

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

                        U.Cedula,
                        U.Nombres,
                        U.Apellidos,

                        V.FechaHoraSalida,

                        RU.CiudadOrigen,
                        RU.CiudadDestino

                    FROM Reservas R

                    INNER JOIN Usuarios U
                        ON R.IdUsuario = U.IdUsuario

                    INNER JOIN Viajes V
                        ON R.IdViaje = V.IdViaje

                    INNER JOIN Rutas RU
                        ON V.IdRuta = RU.IdRuta

                    WHERE
                        R.Estado = 'PAGADA'

                        AND NOT EXISTS
                        (
                            SELECT 1
                            FROM Boletos B
                            WHERE
                                B.IdReserva = R.IdReserva
                                AND
                                B.Estado <> 'CANCELADO'
                        )

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
                "Error al cargar reservas pagadas",

            error:
                error.message

        });

    }

};


// ======================================================
// OBTENER BOLETO
// ======================================================

const obtenerBoleto = async (req, res) => {

    try {

        const idBoleto =
            parseInt(
                req.params.id
            );


        if (
            isNaN(idBoleto)
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "ID de boleto inválido"

            });

        }


        const pool =
            await conectarBD();


        const boleto =
            await obtenerDatosBoleto(
                pool,
                idBoleto
            );


        if (!boleto) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Boleto no encontrado"

            });

        }


        if (
            req.usuario.rol !== "ADMIN" &&
            Number(
                boleto.IdUsuario
            ) !==
            Number(
                req.usuario.idUsuario
            )
        ) {

            return res.status(403).json({

                ok: false,

                mensaje:
                    "No tienes permiso para consultar este boleto"

            });

        }


        return res.status(200).json({

            ok: true,

            boleto

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al obtener el boleto",

            error:
                error.message

        });

    }

};


// ======================================================
// EMITIR BOLETO
// ======================================================

const emitirBoleto = async (req, res) => {

    try {

        const {
            idReserva
        } = req.body;


        if (!idReserva) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Debes seleccionar una reserva"

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

                mensaje:
                    "Reserva no encontrada"

            });

        }


        if (
            reservaResult.recordset[0].Estado !==
            "PAGADA"
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Solo se puede emitir un boleto para una reserva PAGADA"

            });

        }


        const existente =
            await pool
                .request()

                .input(
                    "IdReserva",
                    sql.Int,
                    parseInt(idReserva)
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

            return res.status(200).json({

                ok: true,

                mensaje:
                    "La reserva ya tiene un boleto emitido",

                boleto:
                    existente.recordset[0]

            });

        }


        const codigoBoleto =
            generarCodigoBoleto();


        const resultado =
            await pool
                .request()

                .input(
                    "IdReserva",
                    sql.Int,
                    parseInt(idReserva)
                )

                .input(
                    "CodigoBoleto",
                    sql.VarChar,
                    codigoBoleto
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


        return res.status(201).json({

            ok: true,

            mensaje:
                "Boleto emitido correctamente",

            boleto:
                resultado.recordset[0]

        });

    } catch (error) {

        console.error(
            "Error emitiendo boleto:",
            error
        );


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al emitir el boleto",

            error:
                error.message

        });

    }

};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoBoleto = async (req, res) => {

    try {

        const idBoleto =
            parseInt(
                req.params.id
            );


        const {
            estado
        } = req.body;


        const permitidos = [
            "ACTIVO",
            "UTILIZADO",
            "CANCELADO"
        ];


        if (
            isNaN(idBoleto)
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "ID de boleto inválido"

            });

        }


        if (
            !permitidos.includes(
                estado
            )
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "Estado de boleto inválido"

            });

        }


        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()

                .input(
                    "IdBoleto",
                    sql.Int,
                    idBoleto
                )

                .input(
                    "Estado",
                    sql.VarChar,
                    estado
                )

                .query(`
                    UPDATE Boletos

                    SET
                        Estado = @Estado

                    WHERE
                        IdBoleto = @IdBoleto;

                    SELECT
                        @@ROWCOUNT AS FilasAfectadas;
                `);


        if (
            resultado.recordset[0]
                .FilasAfectadas === 0
        ) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Boleto no encontrado"

            });

        }


        return res.status(200).json({

            ok: true,

            mensaje:
                "Estado del boleto actualizado"

        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            ok: false,

            mensaje:
                "Error al cambiar el estado del boleto",

            error:
                error.message

        });

    }

};


// ======================================================
// PDF
// ======================================================

const descargarPDF = async (req, res) => {

    try {

        const idBoleto =
            parseInt(
                req.params.id
            );


        if (
            isNaN(idBoleto)
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "ID de boleto inválido"

            });

        }


        const pool =
            await conectarBD();


        const boleto =
            await obtenerDatosBoleto(
                pool,
                idBoleto
            );


        if (!boleto) {

            return res.status(404).json({

                ok: false,

                mensaje:
                    "Boleto no encontrado"

            });

        }


        if (
            req.usuario.rol !== "ADMIN" &&
            Number(
                boleto.IdUsuario
            ) !==
            Number(
                req.usuario.idUsuario
            )
        ) {

            return res.status(403).json({

                ok: false,

                mensaje:
                    "No tienes permiso para descargar este boleto"

            });

        }


        const nombreArchivo =
            `NovaBus-${boleto.CodigoBoleto}.pdf`;


        res.setHeader(
            "Content-Type",
            "application/pdf"
        );


        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${nombreArchivo}"`
        );


        const doc =
            new PDFDocument({
                size: "A4",
                margin: 45
            });


        doc.pipe(res);


        // ==================================================
        // CABECERA
        // ==================================================

        doc
            .font("Helvetica-Bold")
            .fontSize(24)
            .text(
                "NovaBus",
                45,
                45
            );


        doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#666666")
            .text(
                "Sistema de Reserva de Boletos",
                45,
                74
            );


        doc
            .font("Helvetica-Bold")
            .fontSize(16)
            .fillColor("#111111")
            .text(
                "BOLETO DE VIAJE",
                350,
                50,
                {
                    align: "right",
                    width: 200
                }
            );


        doc
            .fontSize(10)
            .fillColor("#4f46e5")
            .text(
                boleto.CodigoBoleto,
                350,
                74,
                {
                    align: "right",
                    width: 200
                }
            );


        doc
            .moveTo(
                45,
                105
            )
            .lineTo(
                550,
                105
            )
            .strokeColor("#dddddd")
            .stroke();


        // ==================================================
        // RUTA
        // ==================================================

        doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#666666")
            .text(
                "RUTA",
                45,
                130
            );


        doc
            .fontSize(21)
            .fillColor("#111111")
            .text(
                `${boleto.CiudadOrigen}  →  ${boleto.CiudadDestino}`,
                45,
                150
            );


        doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#666666")
            .text(
                `${boleto.TerminalOrigen || "Terminal de origen no especificado"} → ${boleto.TerminalDestino || "Terminal de destino no especificado"}`,
                45,
                181
            );


        // ==================================================
        // PASAJERO
        // ==================================================

        doc
            .roundedRect(
                45,
                215,
                505,
                92,
                8
            )
            .fillAndStroke(
                "#f6f7fb",
                "#e5e7eb"
            );


        doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .fillColor("#666666")
            .text(
                "PASAJERO",
                62,
                232
            );


        doc
            .fontSize(14)
            .fillColor("#111111")
            .text(
                `${boleto.Nombres} ${boleto.Apellidos}`,
                62,
                249
            );


        doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#555555")
            .text(
                `Cédula: ${boleto.Cedula}`,
                62,
                275
            )
            .text(
                `Correo: ${boleto.Correo}`,
                260,
                275
            );


        // ==================================================
        // DATOS VIAJE
        // ==================================================

        const y =
            340;


        const columna1 =
            45;

        const columna2 =
            220;

        const columna3 =
            395;


        function campo(
            x,
            yy,
            titulo,
            valor
        ) {

            doc
                .font("Helvetica-Bold")
                .fontSize(8)
                .fillColor("#777777")
                .text(
                    titulo,
                    x,
                    yy
                );


            doc
                .font("Helvetica")
                .fontSize(11)
                .fillColor("#111111")
                .text(
                    valor || "-",
                    x,
                    yy + 15,
                    {
                        width: 145
                    }
                );

        }


        campo(
            columna1,
            y,
            "SALIDA",
            formatearFechaPDF(
                boleto.FechaHoraSalida
            )
        );


        campo(
            columna2,
            y,
            "LLEGADA",
            formatearFechaPDF(
                boleto.FechaHoraLlegada
            )
        );


        campo(
            columna3,
            y,
            "ASIENTO(S)",
            boleto.Asientos || "-"
        );


        campo(
            columna1,
            y + 70,
            "BUS",
            `${boleto.NumeroBus} / ${boleto.Placa}`
        );


        campo(
            columna2,
            y + 70,
            "VEHÍCULO",
            `${boleto.Marca} ${boleto.Modelo}`
        );


        campo(
            columna3,
            y + 70,
            "TIPO",
            boleto.TipoBus || "Normal"
        );


        // ==================================================
        // PAGO
        // ==================================================

        doc
            .moveTo(
                45,
                500
            )
            .lineTo(
                550,
                500
            )
            .strokeColor("#dddddd")
            .stroke();


        doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#111111")
            .text(
                "Información de pago",
                45,
                522
            );


        campo(
            columna1,
            550,
            "MÉTODO",
            boleto.MetodoPago || "-"
        );


        campo(
            columna2,
            550,
            "REFERENCIA",
            boleto.ReferenciaPago || "-"
        );


        campo(
            columna3,
            550,
            "FECHA DE PAGO",
            boleto.FechaPago
                ? formatearFechaPDF(
                    boleto.FechaPago
                )
                : "-"
        );


        // ==================================================
        // TOTAL
        // ==================================================

        doc
            .roundedRect(
                45,
                630,
                505,
                70,
                8
            )
            .fill(
                "#111827"
            );


        doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#d1d5db")
            .text(
                "TOTAL PAGADO",
                65,
                651
            );


        doc
            .font("Helvetica-Bold")
            .fontSize(25)
            .fillColor("#ffffff")
            .text(
                `$${Number(boleto.MontoPago || boleto.Total).toFixed(2)}`,
                350,
                644,
                {
                    width: 175,
                    align: "right"
                }
            );


        // ==================================================
        // PIE
        // ==================================================

        doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor("#777777")
            .text(
                `Reserva: ${boleto.CodigoReserva}  |  Emitido: ${formatearFechaPDF(boleto.FechaEmision)}  |  Estado: ${boleto.EstadoBoleto}`,
                45,
                730,
                {
                    align: "center",
                    width: 505
                }
            );


        doc
            .fontSize(8)
            .text(
                "Presenta este boleto junto con tu documento de identidad antes de abordar.",
                45,
                752,
                {
                    align: "center",
                    width: 505
                }
            );


        doc.end();

    } catch (error) {

        console.error(
            "Error generando PDF:",
            error
        );


        if (
            !res.headersSent
        ) {

            return res.status(500).json({

                ok: false,

                mensaje:
                    "Error al generar el PDF",

                error:
                    error.message

            });

        }

    }

};


// ======================================================
// FECHA PDF
// ======================================================

function formatearFechaPDF(
    valor
) {

    if (!valor) {
        return "-";
    }


    return new Date(
        valor
    ).toLocaleString(
        "es-EC",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


module.exports = {
    listarBoletos,
    reservasDisponibles,
    obtenerBoleto,
    emitirBoleto,
    cambiarEstadoBoleto,
    descargarPDF
};
