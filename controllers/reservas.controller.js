const {
    sql,
    conectarBD
} = require("../config/database");

const ESTADOS_RESERVA = [
    "PENDIENTE",
    "CONFIRMADA",
    "PAGADA",
    "CANCELADA"
];

function generarCodigoReserva() {

    const tiempo = Date.now().toString().slice(-8);

    const aleatorio = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

    return `RES-${tiempo}-${aleatorio}`;
}


// ======================================================
// LISTAR RESERVAS
// ======================================================

const listarReservas = async (req, res) => {

    try {

        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT
                R.IdReserva,
                R.IdUsuario,
                R.IdViaje,
                R.CodigoReserva,
                R.FechaReserva,
                R.Total,
                R.Estado,

                U.Cedula,
                U.Nombres,
                U.Apellidos,
                U.Correo,

                V.FechaHoraSalida,
                V.FechaHoraLlegada,
                V.Precio,

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
                    WHERE DR.IdReserva = R.IdReserva
                ) AS Asientos,

                (
                    SELECT COUNT(*)
                    FROM DetalleReserva DR
                    WHERE DR.IdReserva = R.IdReserva
                ) AS CantidadBoletos

            FROM Reservas R

            INNER JOIN Usuarios U
                ON R.IdUsuario = U.IdUsuario

            INNER JOIN Viajes V
                ON R.IdViaje = V.IdViaje

            INNER JOIN Rutas RU
                ON V.IdRuta = RU.IdRuta

            INNER JOIN Buses B
                ON V.IdBus = B.IdBus

            ORDER BY
                R.FechaReserva DESC
        `);

        return res.status(200).json({
            ok: true,
            reservas: resultado.recordset
        });

    } catch (error) {

        console.error("Error listando reservas:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener reservas",
            error: error.message
        });

    }

};


// ======================================================
// OBTENER RESERVA
// ======================================================

const obtenerReserva = async (req, res) => {

    try {

        const idReserva = parseInt(req.params.id);

        if (isNaN(idReserva)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de reserva inválido"
            });
        }

        const pool = await conectarBD();

        const reserva = await pool
            .request()
            .input("IdReserva", sql.Int, idReserva)
            .query(`
                SELECT
                    R.IdReserva,
                    R.IdUsuario,
                    R.IdViaje,
                    R.CodigoReserva,
                    R.FechaReserva,
                    R.Total,
                    R.Estado,

                    U.Cedula,
                    U.Nombres,
                    U.Apellidos,
                    U.Correo,
                    U.Telefono,

                    V.FechaHoraSalida,
                    V.FechaHoraLlegada,
                    V.Precio,

                    RU.CiudadOrigen,
                    RU.CiudadDestino,
                    RU.TerminalOrigen,
                    RU.TerminalDestino,

                    B.NumeroBus,
                    B.Placa,
                    B.Marca,
                    B.Modelo

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
                    R.IdReserva = @IdReserva
            `);

        if (reserva.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Reserva no encontrada"
            });
        }

        const asientos = await pool
            .request()
            .input("IdReserva", sql.Int, idReserva)
            .query(`
                SELECT
                    DR.IdDetalleReserva,
                    DR.IdAsiento,
                    DR.Precio,
                    A.NumeroAsiento,
                    A.TipoAsiento
                FROM DetalleReserva DR
                INNER JOIN Asientos A
                    ON DR.IdAsiento = A.IdAsiento
                WHERE DR.IdReserva = @IdReserva
                ORDER BY A.NumeroAsiento
            `);

        return res.status(200).json({
            ok: true,
            reserva: reserva.recordset[0],
            asientos: asientos.recordset
        });

    } catch (error) {

        console.error("Error obteniendo reserva:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener la reserva",
            error: error.message
        });

    }

};


// ======================================================
// OPCIONES PARA RESERVA
// ======================================================

const obtenerOpcionesReserva = async (req, res) => {

    try {

        const pool = await conectarBD();

        const usuarios = await pool.request().query(`
            SELECT
                U.IdUsuario,
                U.Cedula,
                U.Nombres,
                U.Apellidos,
                U.Correo
            FROM Usuarios U
            INNER JOIN Roles R
                ON U.IdRol = R.IdRol
            WHERE
                U.Estado = 1
                AND R.NombreRol = 'CLIENTE'
            ORDER BY U.Nombres, U.Apellidos
        `);

        const viajes = await pool.request().query(`
            SELECT
                V.IdViaje,
                V.FechaHoraSalida,
                V.Precio,
                R.CiudadOrigen,
                R.CiudadDestino,
                B.NumeroBus,
                B.Placa
            FROM Viajes V
            INNER JOIN Rutas R
                ON V.IdRuta = R.IdRuta
            INNER JOIN Buses B
                ON V.IdBus = B.IdBus
            WHERE
                V.Estado = 'PROGRAMADO'
                AND V.FechaHoraSalida > GETDATE()
            ORDER BY V.FechaHoraSalida
        `);

        return res.status(200).json({
            ok: true,
            usuarios: usuarios.recordset,
            viajes: viajes.recordset
        });

    } catch (error) {

        console.error("Error obteniendo opciones de reserva:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener opciones de reserva",
            error: error.message
        });

    }

};


// ======================================================
// ASIENTOS DE UN VIAJE
// ======================================================

const obtenerAsientosViaje = async (req, res) => {

    try {

        const idViaje = parseInt(req.params.idViaje);

        if (isNaN(idViaje)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de viaje inválido"
            });
        }

        const pool = await conectarBD();

        const viaje = await pool
            .request()
            .input("IdViaje", sql.Int, idViaje)
            .query(`
                SELECT
                    V.IdViaje,
                    V.IdBus,
                    V.Precio,
                    V.Estado
                FROM Viajes V
                WHERE V.IdViaje = @IdViaje
            `);

        if (viaje.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Viaje no encontrado"
            });
        }

        const resultado = await pool
            .request()
            .input("IdViaje", sql.Int, idViaje)
            .input("IdBus", sql.Int, viaje.recordset[0].IdBus)
            .query(`
                SELECT
                    A.IdAsiento,
                    A.NumeroAsiento,
                    A.TipoAsiento,
                    A.Estado,

                    CASE
                        WHEN EXISTS
                        (
                            SELECT 1
                            FROM DetalleReserva DR
                            INNER JOIN Reservas R
                                ON DR.IdReserva = R.IdReserva
                            WHERE
                                DR.IdViaje = @IdViaje
                                AND DR.IdAsiento = A.IdAsiento
                                AND R.Estado <> 'CANCELADA'
                        )
                        THEN 1
                        ELSE 0
                    END AS Ocupado

                FROM Asientos A

                WHERE
                    A.IdBus = @IdBus

                ORDER BY
                    A.NumeroAsiento
            `);

        return res.status(200).json({
            ok: true,
            viaje: viaje.recordset[0],
            asientos: resultado.recordset
        });

    } catch (error) {

        console.error("Error obteniendo asientos del viaje:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener los asientos",
            error: error.message
        });

    }

};


// ======================================================
// CREAR RESERVA
// ======================================================

const crearReserva = async (req, res) => {

    let transaction;

    try {

        const {
            idUsuario,
            idViaje,
            asientos
        } = req.body;

        const idUsuarioNumero = parseInt(idUsuario);
        const idViajeNumero = parseInt(idViaje);

        if (
            isNaN(idUsuarioNumero) ||
            isNaN(idViajeNumero) ||
            !Array.isArray(asientos) ||
            asientos.length === 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Usuario, viaje y al menos un asiento son obligatorios"
            });
        }

        const idsAsientos = [...new Set(
            asientos
                .map(Number)
                .filter(Number.isInteger)
        )];

        if (idsAsientos.length !== asientos.length) {
            return res.status(400).json({
                ok: false,
                mensaje: "La selección de asientos es inválida"
            });
        }

        const pool = await conectarBD();

        const usuario = await pool
            .request()
            .input("IdUsuario", sql.Int, idUsuarioNumero)
            .query(`
                SELECT
                    U.IdUsuario,
                    U.Estado,
                    R.NombreRol
                FROM Usuarios U
                INNER JOIN Roles R
                    ON U.IdRol = R.IdRol
                WHERE U.IdUsuario = @IdUsuario
            `);

        if (
            usuario.recordset.length === 0 ||
            !usuario.recordset[0].Estado ||
            usuario.recordset[0].NombreRol !== "CLIENTE"
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Cliente inválido o inactivo"
            });
        }

        const viaje = await pool
            .request()
            .input("IdViaje", sql.Int, idViajeNumero)
            .query(`
                SELECT
                    V.IdViaje,
                    V.IdBus,
                    V.Precio,
                    V.Estado,
                    V.FechaHoraSalida
                FROM Viajes V
                WHERE V.IdViaje = @IdViaje
            `);

        if (viaje.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Viaje no encontrado"
            });
        }

        const datosViaje = viaje.recordset[0];

        if (
            datosViaje.Estado !== "PROGRAMADO" ||
            new Date(datosViaje.FechaHoraSalida) <= new Date()
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "El viaje ya no está disponible para reservas"
            });
        }

        const placeholders = idsAsientos
            .map((_, index) => `@Asiento${index}`)
            .join(", ");

        const requestAsientos = pool
            .request()
            .input("IdBus", sql.Int, datosViaje.IdBus)
            .input("IdViaje", sql.Int, idViajeNumero);

        idsAsientos.forEach((id, index) => {
            requestAsientos.input(`Asiento${index}`, sql.Int, id);
        });

        const validarAsientos = await requestAsientos.query(`
            SELECT
                A.IdAsiento,
                A.Estado,
                CASE
                    WHEN EXISTS
                    (
                        SELECT 1
                        FROM DetalleReserva DR
                        INNER JOIN Reservas R
                            ON DR.IdReserva = R.IdReserva
                        WHERE
                            DR.IdViaje = @IdViaje
                            AND DR.IdAsiento = A.IdAsiento
                            AND R.Estado <> 'CANCELADA'
                    )
                    THEN 1
                    ELSE 0
                END AS Ocupado
            FROM Asientos A
            WHERE
                A.IdBus = @IdBus
                AND A.IdAsiento IN (${placeholders})
        `);

        if (validarAsientos.recordset.length !== idsAsientos.length) {
            return res.status(400).json({
                ok: false,
                mensaje: "Uno o más asientos no pertenecen al bus del viaje"
            });
        }

        const noDisponibles = validarAsientos.recordset.filter(
            asiento => !asiento.Estado || asiento.Ocupado
        );

        if (noDisponibles.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "Uno o más asientos ya no están disponibles"
            });
        }

        const total = Number(datosViaje.Precio) * idsAsientos.length;
        const codigoReserva = generarCodigoReserva();

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const insertarReserva = await new sql.Request(transaction)
            .input("IdUsuario", sql.Int, idUsuarioNumero)
            .input("IdViaje", sql.Int, idViajeNumero)
            .input("CodigoReserva", sql.VarChar, codigoReserva)
            .input("Total", sql.Decimal(10, 2), total)
            .query(`
                INSERT INTO Reservas
                (
                    IdUsuario,
                    IdViaje,
                    CodigoReserva,
                    Total,
                    Estado
                )
                OUTPUT INSERTED.IdReserva
                VALUES
                (
                    @IdUsuario,
                    @IdViaje,
                    @CodigoReserva,
                    @Total,
                    'PENDIENTE'
                )
            `);

        const idReserva = insertarReserva.recordset[0].IdReserva;

        for (const idAsiento of idsAsientos) {

            await new sql.Request(transaction)
                .input("IdReserva", sql.Int, idReserva)
                .input("IdViaje", sql.Int, idViajeNumero)
                .input("IdAsiento", sql.Int, idAsiento)
                .input("Precio", sql.Decimal(10, 2), Number(datosViaje.Precio))
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

        await transaction.commit();

        return res.status(201).json({
            ok: true,
            mensaje: "Reserva creada correctamente",
            idReserva,
            codigoReserva,
            total
        });

    } catch (error) {

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (_) {}
        }

        console.error("Error creando reserva:", error);

        const mensaje =
            error.number === 2627 || error.number === 2601
                ? "Uno de los asientos fue reservado por otro usuario"
                : "Error al crear la reserva";

        return res.status(500).json({
            ok: false,
            mensaje,
            error: error.message
        });

    }

};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoReserva = async (req, res) => {

    try {

        const idReserva = parseInt(req.params.id);
        const estado = String(req.body.estado || "").toUpperCase();

        if (isNaN(idReserva)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de reserva inválido"
            });
        }

        if (!ESTADOS_RESERVA.includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Estado de reserva inválido"
            });
        }

        const pool = await conectarBD();

        const resultado = await pool
            .request()
            .input("IdReserva", sql.Int, idReserva)
            .input("Estado", sql.VarChar, estado)
            .query(`
                UPDATE Reservas
                SET Estado = @Estado
                WHERE IdReserva = @IdReserva;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Reserva no encontrada"
            });
        }

        if (estado === "CANCELADA") {

            await pool
                .request()
                .input("IdReserva", sql.Int, idReserva)
                .query(`
                    UPDATE Boletos
                    SET Estado = 'CANCELADO'
                    WHERE
                        IdReserva = @IdReserva
                        AND Estado <> 'CANCELADO'
                `);

        }

        return res.status(200).json({
            ok: true,
            mensaje: "Estado de reserva actualizado correctamente"
        });

    } catch (error) {

        console.error("Error cambiando estado de reserva:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al cambiar estado de la reserva",
            error: error.message
        });

    }

};


// ======================================================
// ELIMINAR RESERVA
// ======================================================

const eliminarReserva = async (req, res) => {

    let transaction;

    try {

        const idReserva = parseInt(req.params.id);

        if (isNaN(idReserva)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de reserva inválido"
            });
        }

        const pool = await conectarBD();

        const relaciones = await pool
            .request()
            .input("IdReserva", sql.Int, idReserva)
            .query(`
                SELECT
                    (SELECT COUNT(*) FROM Pagos WHERE IdReserva = @IdReserva) AS Pagos,
                    (SELECT COUNT(*) FROM Boletos WHERE IdReserva = @IdReserva) AS Boletos
            `);

        const datos = relaciones.recordset[0];

        if (datos.Pagos > 0 || datos.Boletos > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: "No puedes eliminar una reserva que ya tiene pagos o boletos asociados"
            });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        await new sql.Request(transaction)
            .input("IdReserva", sql.Int, idReserva)
            .query(`
                DELETE FROM DetalleReserva
                WHERE IdReserva = @IdReserva
            `);

        const resultado = await new sql.Request(transaction)
            .input("IdReserva", sql.Int, idReserva)
            .query(`
                DELETE FROM Reservas
                WHERE IdReserva = @IdReserva;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            await transaction.rollback();

            return res.status(404).json({
                ok: false,
                mensaje: "Reserva no encontrada"
            });
        }

        await transaction.commit();

        return res.status(200).json({
            ok: true,
            mensaje: "Reserva eliminada correctamente"
        });

    } catch (error) {

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (_) {}
        }

        console.error("Error eliminando reserva:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No se pudo eliminar la reserva",
            error: error.message
        });

    }

};


module.exports = {
    listarReservas,
    obtenerReserva,
    obtenerOpcionesReserva,
    obtenerAsientosViaje,
    crearReserva,
    cambiarEstadoReserva,
    eliminarReserva
};
