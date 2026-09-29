const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// VALIDACIONES
// ======================================================

const ESTADOS_BUS = [
    "DISPONIBLE",
    "EN_VIAJE",
    "MANTENIMIENTO",
    "INACTIVO"
];


// ======================================================
// LISTAR BUSES
// ======================================================

const listarBuses = async (req, res) => {

    try {

        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT
                B.IdBus,
                B.NumeroBus,
                B.Placa,
                B.Marca,
                B.Modelo,
                B.Anio,
                B.Capacidad,
                B.TipoBus,
                B.Estado,
                B.FechaRegistro,

                (
                    SELECT COUNT(*)
                    FROM Asientos A
                    WHERE A.IdBus = B.IdBus
                ) AS TotalAsientos

            FROM Buses B

            ORDER BY
                B.IdBus DESC
        `);

        return res.status(200).json({
            ok: true,
            buses: resultado.recordset
        });

    } catch (error) {

        console.error("Error listando buses:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener buses",
            error: error.message
        });

    }

};


// ======================================================
// OBTENER BUS
// ======================================================

const obtenerBus = async (req, res) => {

    try {

        const idBus = parseInt(req.params.id);

        if (isNaN(idBus)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de bus inválido"
            });
        }

        const pool = await conectarBD();

        const resultado = await pool
            .request()
            .input("IdBus", sql.Int, idBus)
            .query(`
                SELECT
                    IdBus,
                    NumeroBus,
                    Placa,
                    Marca,
                    Modelo,
                    Anio,
                    Capacidad,
                    TipoBus,
                    Estado,
                    FechaRegistro
                FROM Buses
                WHERE IdBus = @IdBus
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Bus no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            bus: resultado.recordset[0]
        });

    } catch (error) {

        console.error("Error obteniendo bus:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener bus",
            error: error.message
        });

    }

};


// ======================================================
// OBTENER ASIENTOS DE UN BUS
// ======================================================

const obtenerAsientosBus = async (req, res) => {

    try {

        const idBus = parseInt(req.params.id);

        if (isNaN(idBus)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de bus inválido"
            });
        }

        const pool = await conectarBD();

        const resultado = await pool
            .request()
            .input("IdBus", sql.Int, idBus)
            .query(`
                SELECT
                    IdAsiento,
                    IdBus,
                    NumeroAsiento,
                    TipoAsiento,
                    Estado
                FROM Asientos
                WHERE IdBus = @IdBus
                ORDER BY NumeroAsiento
            `);

        return res.status(200).json({
            ok: true,
            asientos: resultado.recordset
        });

    } catch (error) {

        console.error("Error obteniendo asientos del bus:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener los asientos del bus",
            error: error.message
        });

    }

};


// ======================================================
// CREAR BUS Y SUS ASIENTOS
// ======================================================

const crearBus = async (req, res) => {

    let transaction;

    try {

        const {
            numeroBus,
            placa,
            marca,
            modelo,
            anio,
            capacidad,
            tipoBus,
            estado
        } = req.body;

        const capacidadNumero = parseInt(capacidad);
        const estadoNormalizado = String(estado || "DISPONIBLE").toUpperCase();

        if (!numeroBus || !placa || !marca || !modelo || !capacidadNumero) {
            return res.status(400).json({
                ok: false,
                mensaje: "Número de bus, placa, marca, modelo y capacidad son obligatorios"
            });
        }

        if (capacidadNumero <= 0 || capacidadNumero > 100) {
            return res.status(400).json({
                ok: false,
                mensaje: "La capacidad debe estar entre 1 y 100"
            });
        }

        if (!ESTADOS_BUS.includes(estadoNormalizado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Estado del bus inválido"
            });
        }

        const pool = await conectarBD();

        const duplicado = await pool
            .request()
            .input("NumeroBus", sql.VarChar, numeroBus.trim())
            .input("Placa", sql.VarChar, placa.trim().toUpperCase())
            .query(`
                SELECT IdBus
                FROM Buses
                WHERE
                    NumeroBus = @NumeroBus
                    OR Placa = @Placa
            `);

        if (duplicado.recordset.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "El número de bus o la placa ya están registrados"
            });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const insertarBus = await new sql.Request(transaction)
            .input("NumeroBus", sql.VarChar, numeroBus.trim())
            .input("Placa", sql.VarChar, placa.trim().toUpperCase())
            .input("Marca", sql.VarChar, marca.trim())
            .input("Modelo", sql.VarChar, modelo.trim())
            .input("Anio", sql.Int, anio ? parseInt(anio) : null)
            .input("Capacidad", sql.Int, capacidadNumero)
            .input("TipoBus", sql.VarChar, tipoBus ? tipoBus.trim() : null)
            .input("Estado", sql.VarChar, estadoNormalizado)
            .query(`
                INSERT INTO Buses
                (
                    NumeroBus,
                    Placa,
                    Marca,
                    Modelo,
                    Anio,
                    Capacidad,
                    TipoBus,
                    Estado
                )
                OUTPUT INSERTED.IdBus
                VALUES
                (
                    @NumeroBus,
                    @Placa,
                    @Marca,
                    @Modelo,
                    @Anio,
                    @Capacidad,
                    @TipoBus,
                    @Estado
                )
            `);

        const idBus = insertarBus.recordset[0].IdBus;

        for (let numero = 1; numero <= capacidadNumero; numero++) {

            await new sql.Request(transaction)
                .input("IdBus", sql.Int, idBus)
                .input("NumeroAsiento", sql.Int, numero)
                .query(`
                    INSERT INTO Asientos
                    (
                        IdBus,
                        NumeroAsiento,
                        TipoAsiento,
                        Estado
                    )
                    VALUES
                    (
                        @IdBus,
                        @NumeroAsiento,
                        'NORMAL',
                        1
                    )
                `);

        }

        await transaction.commit();

        return res.status(201).json({
            ok: true,
            mensaje: "Bus creado correctamente",
            idBus
        });

    } catch (error) {

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (_) {}
        }

        console.error("Error creando bus:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al crear bus",
            error: error.message
        });

    }

};


// ======================================================
// ACTUALIZAR BUS
// ======================================================

const actualizarBus = async (req, res) => {

    let transaction;

    try {

        const idBus = parseInt(req.params.id);

        const {
            numeroBus,
            placa,
            marca,
            modelo,
            anio,
            capacidad,
            tipoBus,
            estado
        } = req.body;

        const capacidadNumero = parseInt(capacidad);
        const estadoNormalizado = String(estado || "DISPONIBLE").toUpperCase();

        if (isNaN(idBus)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de bus inválido"
            });
        }

        if (!numeroBus || !placa || !marca || !modelo || !capacidadNumero) {
            return res.status(400).json({
                ok: false,
                mensaje: "Completa los campos obligatorios"
            });
        }

        if (capacidadNumero <= 0 || capacidadNumero > 100) {
            return res.status(400).json({
                ok: false,
                mensaje: "La capacidad debe estar entre 1 y 100"
            });
        }

        if (!ESTADOS_BUS.includes(estadoNormalizado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Estado del bus inválido"
            });
        }

        const pool = await conectarBD();

        const actual = await pool
            .request()
            .input("IdBus", sql.Int, idBus)
            .query(`
                SELECT
                    IdBus,
                    Capacidad
                FROM Buses
                WHERE IdBus = @IdBus
            `);

        if (actual.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Bus no encontrado"
            });
        }

        const duplicado = await pool
            .request()
            .input("IdBus", sql.Int, idBus)
            .input("NumeroBus", sql.VarChar, numeroBus.trim())
            .input("Placa", sql.VarChar, placa.trim().toUpperCase())
            .query(`
                SELECT IdBus
                FROM Buses
                WHERE
                    (
                        NumeroBus = @NumeroBus
                        OR Placa = @Placa
                    )
                    AND IdBus <> @IdBus
            `);

        if (duplicado.recordset.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "El número de bus o la placa ya pertenecen a otro bus"
            });
        }

        const capacidadAnterior = Number(actual.recordset[0].Capacidad);

        if (capacidadNumero < capacidadAnterior) {

            const asientosNoEliminables = await pool
                .request()
                .input("IdBus", sql.Int, idBus)
                .input("NuevaCapacidad", sql.Int, capacidadNumero)
                .query(`
                    SELECT TOP 1
                        A.IdAsiento,
                        A.NumeroAsiento
                    FROM Asientos A
                    WHERE
                        A.IdBus = @IdBus
                        AND A.NumeroAsiento > @NuevaCapacidad
                        AND EXISTS
                        (
                            SELECT 1
                            FROM DetalleReserva DR
                            INNER JOIN Reservas R
                                ON DR.IdReserva = R.IdReserva
                            INNER JOIN Viajes V
                                ON DR.IdViaje = V.IdViaje
                            WHERE
                                DR.IdAsiento = A.IdAsiento
                                AND R.Estado <> 'CANCELADA'
                                AND V.FechaHoraSalida > GETDATE()
                        )
                `);

            if (asientosNoEliminables.recordset.length > 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No puedes reducir la capacidad porque existen reservas futuras en los asientos que se eliminarían"
                });
            }

        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        await new sql.Request(transaction)
            .input("IdBus", sql.Int, idBus)
            .input("NumeroBus", sql.VarChar, numeroBus.trim())
            .input("Placa", sql.VarChar, placa.trim().toUpperCase())
            .input("Marca", sql.VarChar, marca.trim())
            .input("Modelo", sql.VarChar, modelo.trim())
            .input("Anio", sql.Int, anio ? parseInt(anio) : null)
            .input("Capacidad", sql.Int, capacidadNumero)
            .input("TipoBus", sql.VarChar, tipoBus ? tipoBus.trim() : null)
            .input("Estado", sql.VarChar, estadoNormalizado)
            .query(`
                UPDATE Buses
                SET
                    NumeroBus = @NumeroBus,
                    Placa = @Placa,
                    Marca = @Marca,
                    Modelo = @Modelo,
                    Anio = @Anio,
                    Capacidad = @Capacidad,
                    TipoBus = @TipoBus,
                    Estado = @Estado
                WHERE IdBus = @IdBus
            `);

        if (capacidadNumero > capacidadAnterior) {

            for (
                let numero = capacidadAnterior + 1;
                numero <= capacidadNumero;
                numero++
            ) {

                await new sql.Request(transaction)
                    .input("IdBus", sql.Int, idBus)
                    .input("NumeroAsiento", sql.Int, numero)
                    .query(`
                        INSERT INTO Asientos
                        (
                            IdBus,
                            NumeroAsiento,
                            TipoAsiento,
                            Estado
                        )
                        VALUES
                        (
                            @IdBus,
                            @NumeroAsiento,
                            'NORMAL',
                            1
                        )
                    `);

            }

        } else if (capacidadNumero < capacidadAnterior) {

            await new sql.Request(transaction)
                .input("IdBus", sql.Int, idBus)
                .input("NuevaCapacidad", sql.Int, capacidadNumero)
                .query(`
                    DELETE FROM Asientos
                    WHERE
                        IdBus = @IdBus
                        AND NumeroAsiento > @NuevaCapacidad
                `);

        }

        await transaction.commit();

        return res.status(200).json({
            ok: true,
            mensaje: "Bus actualizado correctamente"
        });

    } catch (error) {

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (_) {}
        }

        console.error("Error actualizando bus:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar bus",
            error: error.message
        });

    }

};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoBus = async (req, res) => {

    try {

        const idBus = parseInt(req.params.id);
        const estado = String(req.body.estado || "").toUpperCase();

        if (isNaN(idBus)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de bus inválido"
            });
        }

        if (!ESTADOS_BUS.includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Estado del bus inválido"
            });
        }

        const pool = await conectarBD();

        if (estado === "DISPONIBLE") {

            const mantenimiento = await pool
                .request()
                .input("IdBus", sql.Int, idBus)
                .query(`
                    SELECT TOP 1 IdMantenimiento
                    FROM Mantenimientos
                    WHERE
                        IdBus = @IdBus
                        AND Estado IN ('PENDIENTE', 'EN_PROCESO')
                `);

            if (mantenimiento.recordset.length > 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El bus tiene un mantenimiento activo y no puede marcarse como disponible"
                });
            }

        }

        const resultado = await pool
            .request()
            .input("IdBus", sql.Int, idBus)
            .input("Estado", sql.VarChar, estado)
            .query(`
                UPDATE Buses
                SET Estado = @Estado
                WHERE IdBus = @IdBus;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Bus no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: "Estado del bus actualizado correctamente"
        });

    } catch (error) {

        console.error("Error cambiando estado del bus:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al cambiar estado del bus",
            error: error.message
        });

    }

};


// ======================================================
// ELIMINAR BUS
// ======================================================

const eliminarBus = async (req, res) => {

    let transaction;

    try {

        const idBus = parseInt(req.params.id);

        if (isNaN(idBus)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de bus inválido"
            });
        }

        const pool = await conectarBD();

        const relaciones = await pool
            .request()
            .input("IdBus", sql.Int, idBus)
            .query(`
                SELECT
                    (SELECT COUNT(*) FROM Viajes WHERE IdBus = @IdBus) AS Viajes,
                    (SELECT COUNT(*) FROM Mantenimientos WHERE IdBus = @IdBus) AS Mantenimientos
            `);

        const datos = relaciones.recordset[0];

        if (datos.Viajes > 0 || datos.Mantenimientos > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: "No puedes eliminar el bus porque tiene viajes o mantenimientos relacionados"
            });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        await new sql.Request(transaction)
            .input("IdBus", sql.Int, idBus)
            .query(`
                DELETE FROM Asientos
                WHERE IdBus = @IdBus
            `);

        const resultado = await new sql.Request(transaction)
            .input("IdBus", sql.Int, idBus)
            .query(`
                DELETE FROM Buses
                WHERE IdBus = @IdBus;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            await transaction.rollback();

            return res.status(404).json({
                ok: false,
                mensaje: "Bus no encontrado"
            });
        }

        await transaction.commit();

        return res.status(200).json({
            ok: true,
            mensaje: "Bus eliminado correctamente"
        });

    } catch (error) {

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (_) {}
        }

        console.error("Error eliminando bus:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No se pudo eliminar el bus",
            error: error.message
        });

    }

};


module.exports = {
    listarBuses,
    obtenerBus,
    obtenerAsientosBus,
    crearBus,
    actualizarBus,
    cambiarEstadoBus,
    eliminarBus
};
