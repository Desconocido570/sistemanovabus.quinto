const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// LISTAR CONDUCTORES
// ======================================================

const listarConductores = async (req, res) => {

    try {

        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT
                C.IdConductor,
                C.IdEmpleado,
                C.NumeroLicencia,
                C.TipoLicencia,
                C.FechaEmision,
                C.FechaVencimiento,
                C.Estado,

                E.Cedula,
                E.Nombres,
                E.Apellidos,
                E.Correo,
                E.Telefono,
                E.Cargo,
                E.Estado AS EstadoEmpleado,

                CASE
                    WHEN C.FechaVencimiento < CAST(GETDATE() AS DATE)
                        THEN 'VENCIDA'
                    WHEN C.FechaVencimiento <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
                        THEN 'POR_VENCER'
                    ELSE 'VIGENTE'
                END AS EstadoLicencia

            FROM Conductores C

            INNER JOIN Empleados E
                ON C.IdEmpleado = E.IdEmpleado

            ORDER BY
                C.IdConductor DESC
        `);

        return res.status(200).json({
            ok: true,
            conductores: resultado.recordset
        });

    } catch (error) {

        console.error("Error listando conductores:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener conductores",
            error: error.message
        });

    }

};


// ======================================================
// OBTENER CONDUCTOR
// ======================================================

const obtenerConductor = async (req, res) => {

    try {

        const idConductor = parseInt(req.params.id);

        if (isNaN(idConductor)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de conductor inválido"
            });
        }

        const pool = await conectarBD();

        const resultado = await pool
            .request()
            .input("IdConductor", sql.Int, idConductor)
            .query(`
                SELECT
                    C.IdConductor,
                    C.IdEmpleado,
                    C.NumeroLicencia,
                    C.TipoLicencia,
                    C.FechaEmision,
                    C.FechaVencimiento,
                    C.Estado,

                    E.Cedula,
                    E.Nombres,
                    E.Apellidos,
                    E.Correo,
                    E.Telefono,
                    E.Cargo,
                    E.Estado AS EstadoEmpleado,

                    CASE
                        WHEN C.FechaVencimiento < CAST(GETDATE() AS DATE)
                            THEN 'VENCIDA'
                        WHEN C.FechaVencimiento <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
                            THEN 'POR_VENCER'
                        ELSE 'VIGENTE'
                    END AS EstadoLicencia

                FROM Conductores C

                INNER JOIN Empleados E
                    ON C.IdEmpleado = E.IdEmpleado

                WHERE
                    C.IdConductor = @IdConductor
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Conductor no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            conductor: resultado.recordset[0]
        });

    } catch (error) {

        console.error("Error obteniendo conductor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener el conductor",
            error: error.message
        });

    }

};


// ======================================================
// EMPLEADOS DISPONIBLES PARA SER CONDUCTORES
// ======================================================

const listarEmpleadosDisponibles = async (req, res) => {

    try {

        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT
                E.IdEmpleado,
                E.Cedula,
                E.Nombres,
                E.Apellidos,
                E.Correo,
                E.Telefono,
                E.Cargo,
                E.Estado

            FROM Empleados E

            WHERE
                E.Estado = 1
                AND UPPER(E.Cargo) = 'CONDUCTOR'
                AND NOT EXISTS
                (
                    SELECT 1
                    FROM Conductores C
                    WHERE C.IdEmpleado = E.IdEmpleado
                )

            ORDER BY
                E.Nombres,
                E.Apellidos
        `);

        return res.status(200).json({
            ok: true,
            empleados: resultado.recordset
        });

    } catch (error) {

        console.error("Error obteniendo empleados disponibles:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener empleados disponibles",
            error: error.message
        });

    }

};


// ======================================================
// CREAR CONDUCTOR
// ======================================================

const crearConductor = async (req, res) => {

    try {

        const {
            idEmpleado,
            numeroLicencia,
            tipoLicencia,
            fechaEmision,
            fechaVencimiento
        } = req.body;

        if (
            !idEmpleado ||
            !numeroLicencia ||
            !tipoLicencia ||
            !fechaEmision ||
            !fechaVencimiento
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Completa todos los campos obligatorios"
            });
        }

        const emision = new Date(fechaEmision);
        const vencimiento = new Date(fechaVencimiento);

        if (
            Number.isNaN(emision.getTime()) ||
            Number.isNaN(vencimiento.getTime()) ||
            vencimiento <= emision
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "La fecha de vencimiento debe ser posterior a la fecha de emisión"
            });
        }

        const pool = await conectarBD();

        const empleado = await pool
            .request()
            .input("IdEmpleado", sql.Int, parseInt(idEmpleado))
            .query(`
                SELECT
                    IdEmpleado,
                    Cargo,
                    Estado
                FROM Empleados
                WHERE IdEmpleado = @IdEmpleado
            `);

        if (empleado.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Empleado no encontrado"
            });
        }

        if (!empleado.recordset[0].Estado) {
            return res.status(400).json({
                ok: false,
                mensaje: "El empleado está inactivo"
            });
        }

        if (
            String(empleado.recordset[0].Cargo || "")
                .trim()
                .toUpperCase() !== "CONDUCTOR"
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "El empleado debe tener el cargo CONDUCTOR"
            });
        }

        const duplicado = await pool
            .request()
            .input("IdEmpleado", sql.Int, parseInt(idEmpleado))
            .input("NumeroLicencia", sql.VarChar, numeroLicencia.trim())
            .query(`
                SELECT
                    IdConductor
                FROM Conductores
                WHERE
                    IdEmpleado = @IdEmpleado
                    OR NumeroLicencia = @NumeroLicencia
            `);

        if (duplicado.recordset.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "El empleado ya es conductor o la licencia ya está registrada"
            });
        }

        await pool
            .request()
            .input("IdEmpleado", sql.Int, parseInt(idEmpleado))
            .input("NumeroLicencia", sql.VarChar, numeroLicencia.trim())
            .input("TipoLicencia", sql.VarChar, tipoLicencia.trim().toUpperCase())
            .input("FechaEmision", sql.Date, fechaEmision)
            .input("FechaVencimiento", sql.Date, fechaVencimiento)
            .query(`
                INSERT INTO Conductores
                (
                    IdEmpleado,
                    NumeroLicencia,
                    TipoLicencia,
                    FechaEmision,
                    FechaVencimiento,
                    Estado
                )
                VALUES
                (
                    @IdEmpleado,
                    @NumeroLicencia,
                    @TipoLicencia,
                    @FechaEmision,
                    @FechaVencimiento,
                    1
                )
            `);

        return res.status(201).json({
            ok: true,
            mensaje: "Conductor creado correctamente"
        });

    } catch (error) {

        console.error("Error creando conductor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al crear conductor",
            error: error.message
        });

    }

};


// ======================================================
// ACTUALIZAR CONDUCTOR
// ======================================================

const actualizarConductor = async (req, res) => {

    try {

        const idConductor = parseInt(req.params.id);

        const {
            idEmpleado,
            numeroLicencia,
            tipoLicencia,
            fechaEmision,
            fechaVencimiento
        } = req.body;

        if (isNaN(idConductor)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de conductor inválido"
            });
        }

        if (
            !idEmpleado ||
            !numeroLicencia ||
            !tipoLicencia ||
            !fechaEmision ||
            !fechaVencimiento
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Completa todos los campos obligatorios"
            });
        }

        const emision = new Date(fechaEmision);
        const vencimiento = new Date(fechaVencimiento);

        if (
            Number.isNaN(emision.getTime()) ||
            Number.isNaN(vencimiento.getTime()) ||
            vencimiento <= emision
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "La fecha de vencimiento debe ser posterior a la fecha de emisión"
            });
        }

        const pool = await conectarBD();

        const existe = await pool
            .request()
            .input("IdConductor", sql.Int, idConductor)
            .query(`
                SELECT IdConductor
                FROM Conductores
                WHERE IdConductor = @IdConductor
            `);

        if (existe.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Conductor no encontrado"
            });
        }

        const empleado = await pool
            .request()
            .input("IdEmpleado", sql.Int, parseInt(idEmpleado))
            .query(`
                SELECT
                    IdEmpleado,
                    Cargo,
                    Estado
                FROM Empleados
                WHERE IdEmpleado = @IdEmpleado
            `);

        if (empleado.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Empleado no encontrado"
            });
        }

        if (
            String(empleado.recordset[0].Cargo || "")
                .trim()
                .toUpperCase() !== "CONDUCTOR"
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "El empleado debe tener el cargo CONDUCTOR"
            });
        }

        const duplicado = await pool
            .request()
            .input("IdConductor", sql.Int, idConductor)
            .input("IdEmpleado", sql.Int, parseInt(idEmpleado))
            .input("NumeroLicencia", sql.VarChar, numeroLicencia.trim())
            .query(`
                SELECT IdConductor
                FROM Conductores
                WHERE
                    (
                        IdEmpleado = @IdEmpleado
                        OR NumeroLicencia = @NumeroLicencia
                    )
                    AND IdConductor <> @IdConductor
            `);

        if (duplicado.recordset.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "El empleado o la licencia ya pertenecen a otro conductor"
            });
        }

        await pool
            .request()
            .input("IdConductor", sql.Int, idConductor)
            .input("IdEmpleado", sql.Int, parseInt(idEmpleado))
            .input("NumeroLicencia", sql.VarChar, numeroLicencia.trim())
            .input("TipoLicencia", sql.VarChar, tipoLicencia.trim().toUpperCase())
            .input("FechaEmision", sql.Date, fechaEmision)
            .input("FechaVencimiento", sql.Date, fechaVencimiento)
            .query(`
                UPDATE Conductores
                SET
                    IdEmpleado = @IdEmpleado,
                    NumeroLicencia = @NumeroLicencia,
                    TipoLicencia = @TipoLicencia,
                    FechaEmision = @FechaEmision,
                    FechaVencimiento = @FechaVencimiento
                WHERE IdConductor = @IdConductor
            `);

        return res.status(200).json({
            ok: true,
            mensaje: "Conductor actualizado correctamente"
        });

    } catch (error) {

        console.error("Error actualizando conductor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar conductor",
            error: error.message
        });

    }

};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoConductor = async (req, res) => {

    try {

        const idConductor = parseInt(req.params.id);
        const { estado } = req.body;

        if (isNaN(idConductor)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de conductor inválido"
            });
        }

        if (![true, false, 1, 0].includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Estado inválido"
            });
        }

        const pool = await conectarBD();

        if (Number(estado) === 1) {

            const validacion = await pool
                .request()
                .input("IdConductor", sql.Int, idConductor)
                .query(`
                    SELECT
                        C.IdConductor,
                        C.FechaVencimiento,
                        E.Estado AS EstadoEmpleado
                    FROM Conductores C
                    INNER JOIN Empleados E
                        ON C.IdEmpleado = E.IdEmpleado
                    WHERE C.IdConductor = @IdConductor
                `);

            if (validacion.recordset.length === 0) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "Conductor no encontrado"
                });
            }

            const conductor = validacion.recordset[0];

            if (!conductor.EstadoEmpleado) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No puedes activar un conductor cuyo empleado está inactivo"
                });
            }

            if (new Date(conductor.FechaVencimiento) < new Date(new Date().toDateString())) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No puedes activar un conductor con licencia vencida"
                });
            }

        }

        const resultado = await pool
            .request()
            .input("IdConductor", sql.Int, idConductor)
            .input("Estado", sql.Bit, estado)
            .query(`
                UPDATE Conductores
                SET Estado = @Estado
                WHERE IdConductor = @IdConductor;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Conductor no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: estado
                ? "Conductor activado correctamente"
                : "Conductor desactivado correctamente"
        });

    } catch (error) {

        console.error("Error cambiando estado del conductor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al cambiar estado del conductor",
            error: error.message
        });

    }

};


// ======================================================
// ELIMINAR
// ======================================================

const eliminarConductor = async (req, res) => {

    try {

        const idConductor = parseInt(req.params.id);

        if (isNaN(idConductor)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de conductor inválido"
            });
        }

        const pool = await conectarBD();

        const viajes = await pool
            .request()
            .input("IdConductor", sql.Int, idConductor)
            .query(`
                SELECT TOP 1 IdViaje
                FROM Viajes
                WHERE IdConductor = @IdConductor
            `);

        if (viajes.recordset.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: "No puedes eliminar el conductor porque tiene viajes relacionados"
            });
        }

        const resultado = await pool
            .request()
            .input("IdConductor", sql.Int, idConductor)
            .query(`
                DELETE FROM Conductores
                WHERE IdConductor = @IdConductor;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Conductor no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: "Conductor eliminado correctamente"
        });

    } catch (error) {

        console.error("Error eliminando conductor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No se pudo eliminar el conductor",
            error: error.message
        });

    }

};


module.exports = {
    listarConductores,
    obtenerConductor,
    listarEmpleadosDisponibles,
    crearConductor,
    actualizarConductor,
    cambiarEstadoConductor,
    eliminarConductor
};
