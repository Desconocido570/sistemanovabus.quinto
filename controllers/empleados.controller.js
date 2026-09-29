const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// LISTAR EMPLEADOS
// ======================================================

const listarEmpleados = async (req, res) => {

    try {

        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT
                IdEmpleado,
                Cedula,
                Nombres,
                Apellidos,
                Correo,
                Telefono,
                Direccion,
                Cargo,
                FechaNacimiento,
                FechaContratacion,
                Estado
            FROM Empleados
            ORDER BY IdEmpleado DESC
        `);

        return res.status(200).json({
            ok: true,
            empleados: resultado.recordset
        });

    } catch (error) {

        console.error("Error listando empleados:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener empleados",
            error: error.message
        });

    }

};


// ======================================================
// OBTENER EMPLEADO
// ======================================================

const obtenerEmpleado = async (req, res) => {

    try {

        const idEmpleado = parseInt(req.params.id);

        if (isNaN(idEmpleado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de empleado inválido"
            });
        }

        const pool = await conectarBD();

        const resultado = await pool
            .request()
            .input("IdEmpleado", sql.Int, idEmpleado)
            .query(`
                SELECT
                    IdEmpleado,
                    Cedula,
                    Nombres,
                    Apellidos,
                    Correo,
                    Telefono,
                    Direccion,
                    Cargo,
                    FechaNacimiento,
                    FechaContratacion,
                    Estado
                FROM Empleados
                WHERE IdEmpleado = @IdEmpleado
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Empleado no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            empleado: resultado.recordset[0]
        });

    } catch (error) {

        console.error("Error obteniendo empleado:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener el empleado",
            error: error.message
        });

    }

};


// ======================================================
// CREAR EMPLEADO
// ======================================================

const crearEmpleado = async (req, res) => {

    try {

        const {
            cedula,
            nombres,
            apellidos,
            correo,
            telefono,
            direccion,
            cargo,
            fechaNacimiento,
            fechaContratacion
        } = req.body;

        if (!cedula || !nombres || !apellidos || !cargo) {
            return res.status(400).json({
                ok: false,
                mensaje: "Cédula, nombres, apellidos y cargo son obligatorios"
            });
        }

        const pool = await conectarBD();

        const duplicado = await pool
            .request()
            .input("Cedula", sql.VarChar, cedula.trim())
            .query(`
                SELECT IdEmpleado
                FROM Empleados
                WHERE Cedula = @Cedula
            `);

        if (duplicado.recordset.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "Ya existe un empleado con esa cédula"
            });
        }

        await pool
            .request()
            .input("Cedula", sql.VarChar, cedula.trim())
            .input("Nombres", sql.VarChar, nombres.trim())
            .input("Apellidos", sql.VarChar, apellidos.trim())
            .input("Correo", sql.VarChar, correo ? correo.trim() : null)
            .input("Telefono", sql.VarChar, telefono ? telefono.trim() : null)
            .input("Direccion", sql.VarChar, direccion ? direccion.trim() : null)
            .input("Cargo", sql.VarChar, cargo.trim().toUpperCase())
            .input("FechaNacimiento", sql.Date, fechaNacimiento || null)
            .input("FechaContratacion", sql.Date, fechaContratacion || new Date())
            .query(`
                INSERT INTO Empleados
                (
                    Cedula,
                    Nombres,
                    Apellidos,
                    Correo,
                    Telefono,
                    Direccion,
                    Cargo,
                    FechaNacimiento,
                    FechaContratacion,
                    Estado
                )
                VALUES
                (
                    @Cedula,
                    @Nombres,
                    @Apellidos,
                    @Correo,
                    @Telefono,
                    @Direccion,
                    @Cargo,
                    @FechaNacimiento,
                    @FechaContratacion,
                    1
                )
            `);

        return res.status(201).json({
            ok: true,
            mensaje: "Empleado creado correctamente"
        });

    } catch (error) {

        console.error("Error creando empleado:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al crear empleado",
            error: error.message
        });

    }

};


// ======================================================
// ACTUALIZAR EMPLEADO
// ======================================================

const actualizarEmpleado = async (req, res) => {

    try {

        const idEmpleado = parseInt(req.params.id);

        const {
            cedula,
            nombres,
            apellidos,
            correo,
            telefono,
            direccion,
            cargo,
            fechaNacimiento,
            fechaContratacion
        } = req.body;

        if (isNaN(idEmpleado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de empleado inválido"
            });
        }

        if (!cedula || !nombres || !apellidos || !cargo) {
            return res.status(400).json({
                ok: false,
                mensaje: "Cédula, nombres, apellidos y cargo son obligatorios"
            });
        }

        const pool = await conectarBD();

        const existe = await pool
            .request()
            .input("IdEmpleado", sql.Int, idEmpleado)
            .query(`
                SELECT IdEmpleado
                FROM Empleados
                WHERE IdEmpleado = @IdEmpleado
            `);

        if (existe.recordset.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Empleado no encontrado"
            });
        }

        const duplicado = await pool
            .request()
            .input("Cedula", sql.VarChar, cedula.trim())
            .input("IdEmpleado", sql.Int, idEmpleado)
            .query(`
                SELECT IdEmpleado
                FROM Empleados
                WHERE Cedula = @Cedula
                  AND IdEmpleado <> @IdEmpleado
            `);

        if (duplicado.recordset.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "La cédula ya pertenece a otro empleado"
            });
        }

        await pool
            .request()
            .input("IdEmpleado", sql.Int, idEmpleado)
            .input("Cedula", sql.VarChar, cedula.trim())
            .input("Nombres", sql.VarChar, nombres.trim())
            .input("Apellidos", sql.VarChar, apellidos.trim())
            .input("Correo", sql.VarChar, correo ? correo.trim() : null)
            .input("Telefono", sql.VarChar, telefono ? telefono.trim() : null)
            .input("Direccion", sql.VarChar, direccion ? direccion.trim() : null)
            .input("Cargo", sql.VarChar, cargo.trim().toUpperCase())
            .input("FechaNacimiento", sql.Date, fechaNacimiento || null)
            .input("FechaContratacion", sql.Date, fechaContratacion || new Date())
            .query(`
                UPDATE Empleados
                SET
                    Cedula = @Cedula,
                    Nombres = @Nombres,
                    Apellidos = @Apellidos,
                    Correo = @Correo,
                    Telefono = @Telefono,
                    Direccion = @Direccion,
                    Cargo = @Cargo,
                    FechaNacimiento = @FechaNacimiento,
                    FechaContratacion = @FechaContratacion
                WHERE IdEmpleado = @IdEmpleado
            `);

        return res.status(200).json({
            ok: true,
            mensaje: "Empleado actualizado correctamente"
        });

    } catch (error) {

        console.error("Error actualizando empleado:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar empleado",
            error: error.message
        });

    }

};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoEmpleado = async (req, res) => {

    try {

        const idEmpleado = parseInt(req.params.id);
        const { estado } = req.body;

        if (isNaN(idEmpleado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de empleado inválido"
            });
        }

        if (![true, false, 1, 0].includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Estado inválido"
            });
        }

        const pool = await conectarBD();

        const resultado = await pool
            .request()
            .input("IdEmpleado", sql.Int, idEmpleado)
            .input("Estado", sql.Bit, estado)
            .query(`
                UPDATE Empleados
                SET Estado = @Estado
                WHERE IdEmpleado = @IdEmpleado;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Empleado no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: estado
                ? "Empleado activado correctamente"
                : "Empleado desactivado correctamente"
        });

    } catch (error) {

        console.error("Error cambiando estado del empleado:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al cambiar el estado del empleado",
            error: error.message
        });

    }

};


// ======================================================
// ELIMINAR EMPLEADO
// ======================================================

const eliminarEmpleado = async (req, res) => {

    try {

        const idEmpleado = parseInt(req.params.id);

        if (isNaN(idEmpleado)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Id de empleado inválido"
            });
        }

        const pool = await conectarBD();

        const conductor = await pool
            .request()
            .input("IdEmpleado", sql.Int, idEmpleado)
            .query(`
                SELECT IdConductor
                FROM Conductores
                WHERE IdEmpleado = @IdEmpleado
            `);

        if (conductor.recordset.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: "No puedes eliminar este empleado porque está registrado como conductor"
            });
        }

        const resultado = await pool
            .request()
            .input("IdEmpleado", sql.Int, idEmpleado)
            .query(`
                DELETE FROM Empleados
                WHERE IdEmpleado = @IdEmpleado;

                SELECT @@ROWCOUNT AS FilasAfectadas;
            `);

        if (resultado.recordset[0].FilasAfectadas === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Empleado no encontrado"
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: "Empleado eliminado correctamente"
        });

    } catch (error) {

        console.error("Error eliminando empleado:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No se pudo eliminar el empleado",
            error: error.message
        });

    }

};


module.exports = {
    listarEmpleados,
    obtenerEmpleado,
    crearEmpleado,
    actualizarEmpleado,
    cambiarEstadoEmpleado,
    eliminarEmpleado
};
