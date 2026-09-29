const {
    sql,
    conectarBD
} = require("../config/database");

const ESTADOS_VIAJE = [
    "PROGRAMADO",
    "EN_CURSO",
    "FINALIZADO",
    "CANCELADO"
];


// ======================================================
// LISTAR VIAJES
// ======================================================

const listarViajes = async (req, res) => {

    try {

        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT
                V.IdViaje,
                V.IdRuta,
                V.IdBus,
                V.IdConductor,
                V.FechaHoraSalida,
                V.FechaHoraLlegada,
                V.Precio,
                V.Estado,
                V.FechaRegistro,

                R.CiudadOrigen,
                R.CiudadDestino,
                R.TerminalOrigen,
                R.TerminalDestino,

                B.NumeroBus,
                B.Placa,
                B.Capacidad,
                B.TipoBus,

                E.Nombres AS ConductorNombres,
                E.Apellidos AS ConductorApellidos,

                (
                    SELECT COUNT(*)
                    FROM DetalleReserva DR
                    INNER JOIN Reservas RES
                        ON DR.IdReserva = RES.IdReserva
                    WHERE
                        DR.IdViaje = V.IdViaje
                        AND RES.Estado <> 'CANCELADA'
                ) AS AsientosOcupados

            FROM Viajes V

            INNER JOIN Rutas R
                ON V.IdRuta = R.IdRuta

            INNER JOIN Buses B
                ON V.IdBus = B.IdBus

            INNER JOIN Conductores C
                ON V.IdConductor = C.IdConductor

            INNER JOIN Empleados E
                ON C.IdEmpleado = E.IdEmpleado

            ORDER BY
                V.FechaHoraSalida DESC
        `);

        return res.status(200).json({
            ok: true,
            viajes: resultado.recordset
        });

    } catch (error) {

        console.error("Error listando viajes:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener viajes",
            error: error.message
        });

    }

};


// ======================================================
// OBTENER VIAJE
// ======================================================

const obtenerViaje = async (req, res) => {

    try {

        const idViaje = parseInt(req.params.id);

        if (isNaN(idViaje)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de viaje inválido"
            });
        }

        const pool = await conectarBD();

        const resultado = await pool
            .request()
            .input("IdViaje", sql.Int, idViaje)
            .query(`
                SELECT
                    V.IdViaje,
                    V.IdRuta,
                    V.IdBus,
                    V.IdConductor,
                    V.FechaHoraSalida,
                    V.FechaHoraLlegada,
                    V.Precio,
                    V.Estado,
                    V.FechaRegistro,

                    R.CiudadOrigen,
                    R.CiudadDestino,
                    R.TerminalOrigen,
                    R.TerminalDestino,

                    B.NumeroBus,
                    B.Placa,
                    B.Capacidad,
                    B.TipoBus,

                    E.Nombres AS ConductorNombres,
                    E.Apellidos AS ConductorApellidos

                FROM Viajes V

                INNER JOIN Rutas R
                    ON V.IdRuta = R.IdRuta

                INNER JOIN Buses B
                    ON V.IdBus = B.IdBus

                INNER JOIN Conductores C
                    ON V.IdConductor = C.IdConductor

                INNER JOIN Empleados E
                    ON C.IdEmpleado = E.IdEmpleado

                WHERE
                    V.IdViaje = @IdViaje
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Viaje no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            viaje: resultado.recordset[0]
        });

    } catch (error) {

        console.error("Error obteniendo viaje:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener viaje",
            error: error.message
        });

    }

};


// ======================================================
// OPCIONES PARA FORMULARIO DE VIAJE
// ======================================================

const obtenerOpcionesViaje = async (req, res) => {

    try {

        const pool = await conectarBD();

        const rutas = await pool.request().query(`
            SELECT
                IdRuta,
                CiudadOrigen,
                CiudadDestino,
                TerminalOrigen,
                TerminalDestino
            FROM Rutas
            WHERE Estado = 1
            ORDER BY CiudadOrigen, CiudadDestino
        `);

        const buses = await pool.request().query(`
            SELECT
                IdBus,
                NumeroBus,
                Placa,
                Marca,
                Modelo,
                Capacidad,
                TipoBus,
                Estado
            FROM Buses
            WHERE Estado = 'DISPONIBLE'
            ORDER BY NumeroBus
        `);

        const conductores = await pool.request().query(`
            SELECT
                C.IdConductor,
                C.NumeroLicencia,
                C.TipoLicencia,
                C.FechaVencimiento,
                E.Nombres,
                E.Apellidos,
                E.Cedula
            FROM Conductores C
            INNER JOIN Empleados E
                ON C.IdEmpleado = E.IdEmpleado
            WHERE
                C.Estado = 1
                AND E.Estado = 1
                AND C.FechaVencimiento >= CAST(GETDATE() AS DATE)
            ORDER BY E.Nombres, E.Apellidos
        `);

        return res.status(200).json({
            ok: true,
            rutas: rutas.recordset,
            buses: buses.recordset,
            conductores: conductores.recordset
        });

    } catch (error) {

        console.error("Error obteniendo opciones de viaje:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener opciones para el viaje",
            error: error.message
        });

    }

};


// ======================================================
// VALIDAR VIAJE
// ======================================================

async function validarDatosViaje(
    pool,
    {
        idViajeExcluir = null,
        idRuta,
        idBus,
        idConductor,
        fechaHoraSalida,
        fechaHoraLlegada,
        precio
    }
) {

    const salida = new Date(fechaHoraSalida);
    const llegada = new Date(fechaHoraLlegada);
    const precioNumero = Number(precio);

    if (
        !idRuta ||
        !idBus ||
        !idConductor ||
        !fechaHoraSalida ||
        !fechaHoraLlegada
    ) {
        return "Completa todos los campos obligatorios";
    }

    if (
        Number.isNaN(salida.getTime()) ||
        Number.isNaN(llegada.getTime()) ||
        llegada <= salida
    ) {
        return "La fecha de llegada debe ser posterior a la fecha de salida";
    }

    if (!Number.isFinite(precioNumero) || precioNumero < 0) {
        return "El precio es inválido";
    }

    const ruta = await pool
        .request()
        .input("IdRuta", sql.Int, parseInt(idRuta))
        .query(`
            SELECT IdRuta, Estado
            FROM Rutas
            WHERE IdRuta = @IdRuta
        `);

    if (ruta.recordset.length === 0 || !ruta.recordset[0].Estado) {
        return "La ruta no existe o está inactiva";
    }

    const bus = await pool
        .request()
        .input("IdBus", sql.Int, parseInt(idBus))
        .query(`
            SELECT
                IdBus,
                Estado
            FROM Buses
            WHERE IdBus = @IdBus
        `);

    if (bus.recordset.length === 0) {
        return "El bus no existe";
    }

    if (bus.recordset[0].Estado !== "DISPONIBLE") {
        return `El bus no está disponible. Estado actual: ${bus.recordset[0].Estado}`;
    }

    const conductor = await pool
        .request()
        .input("IdConductor", sql.Int, parseInt(idConductor))
        .query(`
            SELECT
                C.IdConductor,
                C.Estado,
                C.FechaVencimiento,
                E.Estado AS EstadoEmpleado
            FROM Conductores C
            INNER JOIN Empleados E
                ON C.IdEmpleado = E.IdEmpleado
            WHERE C.IdConductor = @IdConductor
        `);

    if (conductor.recordset.length === 0) {
        return "El conductor no existe";
    }

    const conductorDatos = conductor.recordset[0];

    if (!conductorDatos.Estado || !conductorDatos.EstadoEmpleado) {
        return "El conductor está inactivo";
    }

    if (new Date(conductorDatos.FechaVencimiento) < new Date(new Date().toDateString())) {
        return "La licencia del conductor está vencida";
    }

    const solapamiento = await pool
        .request()
        .input("IdViajeExcluir", sql.Int, idViajeExcluir)
        .input("IdBus", sql.Int, parseInt(idBus))
        .input("IdConductor", sql.Int, parseInt(idConductor))
        .input("FechaHoraSalida", sql.DateTime2, salida)
        .input("FechaHoraLlegada", sql.DateTime2, llegada)
        .query(`
            SELECT TOP 1
                IdViaje,
                IdBus,
                IdConductor
            FROM Viajes
            WHERE
                Estado IN ('PROGRAMADO', 'EN_CURSO')
                AND
                (
                    @IdViajeExcluir IS NULL
                    OR IdViaje <> @IdViajeExcluir
                )
                AND
                (
                    IdBus = @IdBus
                    OR IdConductor = @IdConductor
                )
                AND
                @FechaHoraSalida < FechaHoraLlegada
                AND
                @FechaHoraLlegada > FechaHoraSalida
        `);

    if (solapamiento.recordset.length > 0) {

        const conflicto = solapamiento.recordset[0];

        if (conflicto.IdBus === parseInt(idBus)) {
            return "El bus ya tiene otro viaje en ese horario";
        }

        return "El conductor ya tiene otro viaje en ese horario";

    }

    return null;
}


// ======================================================
// CREAR VIAJE
// ======================================================

const crearViaje = async (req, res) => {

    try {

        const {
            idRuta,
            idBus,
            idConductor,
            fechaHoraSalida,
            fechaHoraLlegada,
            precio
        } = req.body;

        const pool = await conectarBD();

        const errorValidacion = await validarDatosViaje(
            pool,
            {
                idRuta,
                idBus,
                idConductor,
                fechaHoraSalida,
                fechaHoraLlegada,
                precio
            }
        );

        if (errorValidacion) {
            return res.status(400).json({
                ok: false,
                mensaje: errorValidacion
            });
        }

        await pool
            .request()
            .input("IdRuta", sql.Int, parseInt(idRuta))
            .input("IdBus", sql.Int, parseInt(idBus))
            .input("IdConductor", sql.Int, parseInt(idConductor))
            .input("FechaHoraSalida", sql.DateTime2, new Date(fechaHoraSalida))
            .input("FechaHoraLlegada", sql.DateTime2, new Date(fechaHoraLlegada))
            .input("Precio", sql.Decimal(10, 2), Number(precio))
            .query(`
                INSERT INTO Viajes
                (
                    IdRuta,
                    IdBus,
                    IdConductor,
                    FechaHoraSalida,
                    FechaHoraLlegada,
                    Precio,
                    Estado
                )
                VALUES
                (
                    @IdRuta,
                    @IdBus,
                    @IdConductor,
                    @FechaHoraSalida,
                    @FechaHoraLlegada,
                    @Precio,
                    'PROGRAMADO'
                )
            `);

        return res.status(201).json({
            ok: true,
            mensaje: "Viaje programado correctamente"
        });

    } catch (error) {

        console.error("Error creando viaje:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al crear viaje",
            error: error.message
        });

    }

};


// ======================================================
// ACTUALIZAR VIAJE
// ======================================================

const actualizarViaje = async (req, res) => {

    try {

        const idViaje = parseInt(req.params.id);

        const {
            idRuta,
            idBus,
            idConductor,
            fechaHoraSalida,
            fechaHoraLlegada,
            precio
        } = req.body;

        if (isNaN(idViaje)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de viaje inválido"
            });
        }

        const pool = await conectarBD();

        const existe = await pool
            .request()
            .input("IdViaje", sql.Int, idViaje)
            .query(`
                SELECT
                    IdViaje,
                    Estado
                FROM Viajes
                WHERE IdViaje = @IdViaje
            `);

        if (existe.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Viaje no encontrado"
            });
        }

        if (["FINALIZADO", "CANCELADO"].includes(existe.recordset[0].Estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "No puedes editar un viaje finalizado o cancelado"
            });
        }

        const errorValidacion = await validarDatosViaje(
            pool,
            {
                idViajeExcluir: idViaje,
                idRuta,
                idBus,
                idConductor,
                fechaHoraSalida,
                fechaHoraLlegada,
                precio
            }
        );

        if (errorValidacion) {
            return res.status(400).json({
                ok: false,
                mensaje: errorValidacion
            });
        }

        await pool
            .request()
            .input("IdViaje", sql.Int, idViaje)
            .input("IdRuta", sql.Int, parseInt(idRuta))
            .input("IdBus", sql.Int, parseInt(idBus))
            .input("IdConductor", sql.Int, parseInt(idConductor))
            .input("FechaHoraSalida", sql.DateTime2, new Date(fechaHoraSalida))
            .input("FechaHoraLlegada", sql.DateTime2, new Date(fechaHoraLlegada))
            .input("Precio", sql.Decimal(10, 2), Number(precio))
            .query(`
                UPDATE Viajes
                SET
                    IdRuta = @IdRuta,
                    IdBus = @IdBus,
                    IdConductor = @IdConductor,
                    FechaHoraSalida = @FechaHoraSalida,
                    FechaHoraLlegada = @FechaHoraLlegada,
                    Precio = @Precio
                WHERE IdViaje = @IdViaje
            `);

        return res.status(200).json({
            ok: true,
            mensaje: "Viaje actualizado correctamente"
        });

    } catch (error) {

        console.error("Error actualizando viaje:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar viaje",
            error: error.message
        });

    }

};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoViaje = async (req, res) => {

    try {

        const idViaje = parseInt(req.params.id);
        const estado = String(req.body.estado || "").toUpperCase();

        if (isNaN(idViaje)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de viaje inválido"
            });
        }

        if (!ESTADOS_VIAJE.includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Estado de viaje inválido"
            });
        }

        const pool = await conectarBD();

        const actual = await pool
            .request()
            .input("IdViaje", sql.Int, idViaje)
            .query(`
                SELECT
                    IdViaje,
                    IdBus,
                    Estado
                FROM Viajes
                WHERE IdViaje = @IdViaje
            `);

        if (actual.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Viaje no encontrado"
            });
        }

        const idBus = actual.recordset[0].IdBus;

        await pool
            .request()
            .input("IdViaje", sql.Int, idViaje)
            .input("Estado", sql.VarChar, estado)
            .query(`
                UPDATE Viajes
                SET Estado = @Estado
                WHERE IdViaje = @IdViaje
            `);

        if (estado === "EN_CURSO") {

            await pool
                .request()
                .input("IdBus", sql.Int, idBus)
                .query(`
                    UPDATE Buses
                    SET Estado = 'EN_VIAJE'
                    WHERE IdBus = @IdBus
                `);

        } else if (["FINALIZADO", "CANCELADO"].includes(estado)) {

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

            const nuevoEstadoBus =
                mantenimiento.recordset.length > 0
                    ? "MANTENIMIENTO"
                    : "DISPONIBLE";

            await pool
                .request()
                .input("IdBus", sql.Int, idBus)
                .input("Estado", sql.VarChar, nuevoEstadoBus)
                .query(`
                    UPDATE Buses
                    SET Estado = @Estado
                    WHERE IdBus = @IdBus
                `);

        }

        return res.status(200).json({
            ok: true,
            mensaje: "Estado del viaje actualizado correctamente"
        });

    } catch (error) {

        console.error("Error cambiando estado del viaje:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al cambiar estado del viaje",
            error: error.message
        });

    }

};


// ======================================================
// ELIMINAR VIAJE
// ======================================================

const eliminarViaje = async (req, res) => {

    try {

        const idViaje = parseInt(req.params.id);

        if (isNaN(idViaje)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de viaje inválido"
            });
        }

        const pool = await conectarBD();

        const reservas = await pool
            .request()
            .input("IdViaje", sql.Int, idViaje)
            .query(`
                SELECT TOP 1 IdReserva
                FROM Reservas
                WHERE IdViaje = @IdViaje
            `);

        if (reservas.recordset.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: "No puedes eliminar un viaje con reservas relacionadas"
            });
        }

        const resultado = await pool
            .request()
            .input("IdViaje", sql.Int, idViaje)
            .query(`
                DELETE FROM Viajes
                WHERE IdViaje = @IdViaje;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Viaje no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: "Viaje eliminado correctamente"
        });

    } catch (error) {

        console.error("Error eliminando viaje:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No se pudo eliminar el viaje",
            error: error.message
        });

    }

};


module.exports = {
    listarViajes,
    obtenerViaje,
    obtenerOpcionesViaje,
    crearViaje,
    actualizarViaje,
    cambiarEstadoViaje,
    eliminarViaje
};
