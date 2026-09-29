const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// LISTAR RUTAS
// ======================================================

const listarRutas = async (req, res) => {

    try {

        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT
                IdRuta,
                CiudadOrigen,
                TerminalOrigen,
                CiudadDestino,
                TerminalDestino,
                DistanciaKm,
                DuracionMinutos,
                Estado
            FROM Rutas
            ORDER BY IdRuta DESC
        `);

        return res.status(200).json({
            ok: true,
            rutas: resultado.recordset
        });

    } catch (error) {

        console.error("Error listando rutas:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener rutas",
            error: error.message
        });

    }

};


// ======================================================
// OBTENER RUTA
// ======================================================

const obtenerRuta = async (req, res) => {

    try {

        const idRuta = parseInt(req.params.id);

        if (isNaN(idRuta)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de ruta inválido"
            });
        }

        const pool = await conectarBD();

        const resultado = await pool
            .request()
            .input("IdRuta", sql.Int, idRuta)
            .query(`
                SELECT
                    IdRuta,
                    CiudadOrigen,
                    TerminalOrigen,
                    CiudadDestino,
                    TerminalDestino,
                    DistanciaKm,
                    DuracionMinutos,
                    Estado
                FROM Rutas
                WHERE IdRuta = @IdRuta
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Ruta no encontrada"
            });
        }

        return res.status(200).json({
            ok: true,
            ruta: resultado.recordset[0]
        });

    } catch (error) {

        console.error("Error obteniendo ruta:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener ruta",
            error: error.message
        });

    }

};


// ======================================================
// CREAR RUTA
// ======================================================

const crearRuta = async (req, res) => {

    try {

        const {
            ciudadOrigen,
            terminalOrigen,
            ciudadDestino,
            terminalDestino,
            distanciaKm,
            duracionMinutos
        } = req.body;

        if (!ciudadOrigen || !ciudadDestino) {
            return res.status(400).json({
                ok: false,
                mensaje: "Ciudad de origen y ciudad de destino son obligatorias"
            });
        }

        if (
            ciudadOrigen.trim().toLowerCase() ===
            ciudadDestino.trim().toLowerCase()
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "El origen y el destino deben ser diferentes"
            });
        }

        const distancia = distanciaKm ? Number(distanciaKm) : null;
        const duracion = duracionMinutos ? parseInt(duracionMinutos) : null;

        if (distancia !== null && (!Number.isFinite(distancia) || distancia <= 0)) {
            return res.status(400).json({
                ok: false,
                mensaje: "La distancia debe ser mayor que cero"
            });
        }

        if (duracion !== null && (isNaN(duracion) || duracion <= 0)) {
            return res.status(400).json({
                ok: false,
                mensaje: "La duración debe ser mayor que cero"
            });
        }

        const pool = await conectarBD();

        await pool
            .request()
            .input("CiudadOrigen", sql.VarChar, ciudadOrigen.trim())
            .input("TerminalOrigen", sql.VarChar, terminalOrigen ? terminalOrigen.trim() : null)
            .input("CiudadDestino", sql.VarChar, ciudadDestino.trim())
            .input("TerminalDestino", sql.VarChar, terminalDestino ? terminalDestino.trim() : null)
            .input("DistanciaKm", sql.Decimal(10, 2), distancia)
            .input("DuracionMinutos", sql.Int, duracion)
            .query(`
                INSERT INTO Rutas
                (
                    CiudadOrigen,
                    TerminalOrigen,
                    CiudadDestino,
                    TerminalDestino,
                    DistanciaKm,
                    DuracionMinutos,
                    Estado
                )
                VALUES
                (
                    @CiudadOrigen,
                    @TerminalOrigen,
                    @CiudadDestino,
                    @TerminalDestino,
                    @DistanciaKm,
                    @DuracionMinutos,
                    1
                )
            `);

        return res.status(201).json({
            ok: true,
            mensaje: "Ruta creada correctamente"
        });

    } catch (error) {

        console.error("Error creando ruta:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al crear ruta",
            error: error.message
        });

    }

};


// ======================================================
// ACTUALIZAR RUTA
// ======================================================

const actualizarRuta = async (req, res) => {

    try {

        const idRuta = parseInt(req.params.id);

        const {
            ciudadOrigen,
            terminalOrigen,
            ciudadDestino,
            terminalDestino,
            distanciaKm,
            duracionMinutos
        } = req.body;

        if (isNaN(idRuta)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de ruta inválido"
            });
        }

        if (!ciudadOrigen || !ciudadDestino) {
            return res.status(400).json({
                ok: false,
                mensaje: "Ciudad de origen y ciudad de destino son obligatorias"
            });
        }

        if (
            ciudadOrigen.trim().toLowerCase() ===
            ciudadDestino.trim().toLowerCase()
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "El origen y el destino deben ser diferentes"
            });
        }

        const distancia = distanciaKm ? Number(distanciaKm) : null;
        const duracion = duracionMinutos ? parseInt(duracionMinutos) : null;

        const pool = await conectarBD();

        const resultado = await pool
            .request()
            .input("IdRuta", sql.Int, idRuta)
            .input("CiudadOrigen", sql.VarChar, ciudadOrigen.trim())
            .input("TerminalOrigen", sql.VarChar, terminalOrigen ? terminalOrigen.trim() : null)
            .input("CiudadDestino", sql.VarChar, ciudadDestino.trim())
            .input("TerminalDestino", sql.VarChar, terminalDestino ? terminalDestino.trim() : null)
            .input("DistanciaKm", sql.Decimal(10, 2), distancia)
            .input("DuracionMinutos", sql.Int, duracion)
            .query(`
                UPDATE Rutas
                SET
                    CiudadOrigen = @CiudadOrigen,
                    TerminalOrigen = @TerminalOrigen,
                    CiudadDestino = @CiudadDestino,
                    TerminalDestino = @TerminalDestino,
                    DistanciaKm = @DistanciaKm,
                    DuracionMinutos = @DuracionMinutos
                WHERE IdRuta = @IdRuta;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Ruta no encontrada"
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: "Ruta actualizada correctamente"
        });

    } catch (error) {

        console.error("Error actualizando ruta:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar ruta",
            error: error.message
        });

    }

};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoRuta = async (req, res) => {

    try {

        const idRuta = parseInt(req.params.id);
        const { estado } = req.body;

        if (isNaN(idRuta)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de ruta inválido"
            });
        }

        if (![true, false, 1, 0].includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Estado inválido"
            });
        }

        const pool = await conectarBD();

        if (Number(estado) === 0) {

            const futuros = await pool
                .request()
                .input("IdRuta", sql.Int, idRuta)
                .query(`
                    SELECT TOP 1 IdViaje
                    FROM Viajes
                    WHERE
                        IdRuta = @IdRuta
                        AND Estado IN ('PROGRAMADO', 'EN_CURSO')
                        AND FechaHoraSalida >= GETDATE()
                `);

            if (futuros.recordset.length > 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No puedes desactivar una ruta con viajes futuros activos"
                });
            }

        }

        const resultado = await pool
            .request()
            .input("IdRuta", sql.Int, idRuta)
            .input("Estado", sql.Bit, estado)
            .query(`
                UPDATE Rutas
                SET Estado = @Estado
                WHERE IdRuta = @IdRuta;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Ruta no encontrada"
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: estado
                ? "Ruta activada correctamente"
                : "Ruta desactivada correctamente"
        });

    } catch (error) {

        console.error("Error cambiando estado de ruta:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al cambiar estado de la ruta",
            error: error.message
        });

    }

};


// ======================================================
// ELIMINAR RUTA
// ======================================================

const eliminarRuta = async (req, res) => {

    try {

        const idRuta = parseInt(req.params.id);

        if (isNaN(idRuta)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de ruta inválido"
            });
        }

        const pool = await conectarBD();

        const viajes = await pool
            .request()
            .input("IdRuta", sql.Int, idRuta)
            .query(`
                SELECT TOP 1 IdViaje
                FROM Viajes
                WHERE IdRuta = @IdRuta
            `);

        if (viajes.recordset.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: "No puedes eliminar una ruta con viajes relacionados"
            });
        }

        const resultado = await pool
            .request()
            .input("IdRuta", sql.Int, idRuta)
            .query(`
                DELETE FROM Rutas
                WHERE IdRuta = @IdRuta;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Ruta no encontrada"
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: "Ruta eliminada correctamente"
        });

    } catch (error) {

        console.error("Error eliminando ruta:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No se pudo eliminar la ruta",
            error: error.message
        });

    }

};


module.exports = {
    listarRutas,
    obtenerRuta,
    crearRuta,
    actualizarRuta,
    cambiarEstadoRuta,
    eliminarRuta
};
