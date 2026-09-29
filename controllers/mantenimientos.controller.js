const {
    sql,
    conectarBD
} = require("../config/database");


// ======================================================
// ACTUALIZAR ESTADO DEL BUS SEGÚN MANTENIMIENTO
// ======================================================

async function sincronizarEstadoBus(
    pool,
    idBus
) {

    const activos =
        await pool
            .request()
            .input(
                "IdBus",
                sql.Int,
                idBus
            )
            .query(`
                SELECT COUNT(*) AS Total

                FROM Mantenimientos

                WHERE
                    IdBus = @IdBus
                    AND
                    Estado IN
                    (
                        'PENDIENTE',
                        'EN_PROCESO'
                    )
            `);


    const totalActivos =
        Number(
            activos.recordset[0].Total
        );


    if (
        totalActivos > 0
    ) {

        await pool
            .request()
            .input(
                "IdBus",
                sql.Int,
                idBus
            )
            .query(`
                UPDATE Buses

                SET
                    Estado = 'MANTENIMIENTO'

                WHERE
                    IdBus = @IdBus
                    AND
                    Estado <> 'EN_VIAJE'
            `);

    } else {

        await pool
            .request()
            .input(
                "IdBus",
                sql.Int,
                idBus
            )
            .query(`
                UPDATE Buses

                SET
                    Estado = 'DISPONIBLE'

                WHERE
                    IdBus = @IdBus
                    AND
                    Estado = 'MANTENIMIENTO'
            `);

    }

}


// ======================================================
// LISTAR
// ======================================================

const listarMantenimientos = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .query(`
                    SELECT
                        M.IdMantenimiento,
                        M.IdBus,
                        M.TipoMantenimiento,
                        M.Descripcion,
                        M.FechaInicio,
                        M.FechaFin,
                        M.Costo,
                        M.Estado,

                        B.NumeroBus,
                        B.Placa,
                        B.Marca,
                        B.Modelo,
                        B.Estado AS EstadoBus

                    FROM Mantenimientos M

                    INNER JOIN Buses B
                        ON M.IdBus = B.IdBus

                    ORDER BY
                        M.FechaInicio DESC,
                        M.IdMantenimiento DESC
                `);


        return res.status(200).json({
            ok: true,
            mantenimientos: resultado.recordset
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener los mantenimientos",
            error: error.message
        });

    }

};


// ======================================================
// BUSES DISPONIBLES
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
                        Estado

                    FROM Buses

                    WHERE
                        Estado <> 'INACTIVO'

                    ORDER BY
                        NumeroBus
                `);


        return res.status(200).json({
            ok: true,
            buses: resultado.recordset
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener los buses",
            error: error.message
        });

    }

};


// ======================================================
// OBTENER
// ======================================================

const obtenerMantenimiento = async (req, res) => {

    try {

        const id =
            parseInt(
                req.params.id
            );


        if (
            isNaN(id)
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "ID inválido"
            });

        }


        const pool =
            await conectarBD();


        const resultado =
            await pool
                .request()
                .input(
                    "IdMantenimiento",
                    sql.Int,
                    id
                )
                .query(`
                    SELECT
                        IdMantenimiento,
                        IdBus,
                        TipoMantenimiento,
                        Descripcion,
                        FechaInicio,
                        FechaFin,
                        Costo,
                        Estado

                    FROM Mantenimientos

                    WHERE
                        IdMantenimiento = @IdMantenimiento
                `);


        if (
            resultado.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje: "Mantenimiento no encontrado"
            });

        }


        return res.status(200).json({
            ok: true,
            mantenimiento: resultado.recordset[0]
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener el mantenimiento",
            error: error.message
        });

    }

};


// ======================================================
// CREAR
// ======================================================

const crearMantenimiento = async (req, res) => {

    try {

        const {
            idBus,
            tipoMantenimiento,
            descripcion,
            fechaInicio,
            fechaFin,
            costo,
            estado
        } = req.body;


        if (
            !idBus ||
            !tipoMantenimiento ||
            !fechaInicio
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Bus, tipo de mantenimiento y fecha de inicio son obligatorios"
            });

        }


        if (
            fechaFin &&
            new Date(
                fechaFin
            ) <
            new Date(
                fechaInicio
            )
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "La fecha final no puede ser anterior a la fecha de inicio"
            });

        }


        const estadoNuevo =
            estado || "PENDIENTE";


        if (
            ![
                "PENDIENTE",
                "EN_PROCESO",
                "FINALIZADO",
                "CANCELADO"
            ].includes(
                estadoNuevo
            )
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Estado inválido"
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
                    parseInt(idBus)
                )
                .query(`
                    SELECT
                        IdBus,
                        Estado

                    FROM Buses

                    WHERE
                        IdBus = @IdBus
                `);


        if (
            bus.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje: "Bus no encontrado"
            });

        }


        if (
            bus.recordset[0].Estado ===
            "INACTIVO"
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "No se puede registrar mantenimiento en un bus inactivo"
            });

        }


        const resultado =
            await pool
                .request()
                .input(
                    "IdBus",
                    sql.Int,
                    parseInt(idBus)
                )
                .input(
                    "TipoMantenimiento",
                    sql.VarChar,
                    tipoMantenimiento.trim()
                )
                .input(
                    "Descripcion",
                    sql.VarChar,
                    descripcion
                        ? descripcion.trim()
                        : null
                )
                .input(
                    "FechaInicio",
                    sql.Date,
                    fechaInicio
                )
                .input(
                    "FechaFin",
                    sql.Date,
                    fechaFin || null
                )
                .input(
                    "Costo",
                    sql.Decimal(10, 2),
                    costo !== "" &&
                    costo !== null &&
                    costo !== undefined
                        ? Number(costo)
                        : null
                )
                .input(
                    "Estado",
                    sql.VarChar,
                    estadoNuevo
                )
                .query(`
                    INSERT INTO Mantenimientos
                    (
                        IdBus,
                        TipoMantenimiento,
                        Descripcion,
                        FechaInicio,
                        FechaFin,
                        Costo,
                        Estado
                    )

                    OUTPUT
                        INSERTED.IdMantenimiento

                    VALUES
                    (
                        @IdBus,
                        @TipoMantenimiento,
                        @Descripcion,
                        @FechaInicio,
                        @FechaFin,
                        @Costo,
                        @Estado
                    )
                `);


        await sincronizarEstadoBus(
            pool,
            parseInt(idBus)
        );


        return res.status(201).json({
            ok: true,
            mensaje: "Mantenimiento registrado correctamente",
            idMantenimiento:
                resultado.recordset[0].IdMantenimiento
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al registrar el mantenimiento",
            error: error.message
        });

    }

};


// ======================================================
// ACTUALIZAR
// ======================================================

const actualizarMantenimiento = async (req, res) => {

    try {

        const id =
            parseInt(
                req.params.id
            );


        const {
            idBus,
            tipoMantenimiento,
            descripcion,
            fechaInicio,
            fechaFin,
            costo,
            estado
        } = req.body;


        if (
            isNaN(id) ||
            !idBus ||
            !tipoMantenimiento ||
            !fechaInicio
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Datos de mantenimiento incompletos"
            });

        }


        if (
            fechaFin &&
            new Date(
                fechaFin
            ) <
            new Date(
                fechaInicio
            )
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "La fecha final no puede ser anterior a la fecha de inicio"
            });

        }


        if (
            ![
                "PENDIENTE",
                "EN_PROCESO",
                "FINALIZADO",
                "CANCELADO"
            ].includes(
                estado
            )
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "Estado inválido"
            });

        }


        const pool =
            await conectarBD();


        const actual =
            await pool
                .request()
                .input(
                    "IdMantenimiento",
                    sql.Int,
                    id
                )
                .query(`
                    SELECT
                        IdMantenimiento,
                        IdBus

                    FROM Mantenimientos

                    WHERE
                        IdMantenimiento = @IdMantenimiento
                `);


        if (
            actual.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje: "Mantenimiento no encontrado"
            });

        }


        const idBusAnterior =
            actual.recordset[0].IdBus;


        await pool
            .request()
            .input(
                "IdMantenimiento",
                sql.Int,
                id
            )
            .input(
                "IdBus",
                sql.Int,
                parseInt(idBus)
            )
            .input(
                "TipoMantenimiento",
                sql.VarChar,
                tipoMantenimiento.trim()
            )
            .input(
                "Descripcion",
                sql.VarChar,
                descripcion
                    ? descripcion.trim()
                    : null
            )
            .input(
                "FechaInicio",
                sql.Date,
                fechaInicio
            )
            .input(
                "FechaFin",
                sql.Date,
                fechaFin || null
            )
            .input(
                "Costo",
                sql.Decimal(10, 2),
                costo !== "" &&
                costo !== null &&
                costo !== undefined
                    ? Number(costo)
                    : null
            )
            .input(
                "Estado",
                sql.VarChar,
                estado
            )
            .query(`
                UPDATE Mantenimientos

                SET
                    IdBus = @IdBus,
                    TipoMantenimiento = @TipoMantenimiento,
                    Descripcion = @Descripcion,
                    FechaInicio = @FechaInicio,
                    FechaFin = @FechaFin,
                    Costo = @Costo,
                    Estado = @Estado

                WHERE
                    IdMantenimiento = @IdMantenimiento
            `);


        await sincronizarEstadoBus(
            pool,
            idBusAnterior
        );


        if (
            Number(idBusAnterior) !==
            Number(idBus)
        ) {

            await sincronizarEstadoBus(
                pool,
                parseInt(idBus)
            );

        }


        return res.status(200).json({
            ok: true,
            mensaje: "Mantenimiento actualizado correctamente"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar el mantenimiento",
            error: error.message
        });

    }

};


// ======================================================
// ELIMINAR
// ======================================================

const eliminarMantenimiento = async (req, res) => {

    try {

        const id =
            parseInt(
                req.params.id
            );


        if (
            isNaN(id)
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "ID inválido"
            });

        }


        const pool =
            await conectarBD();


        const actual =
            await pool
                .request()
                .input(
                    "IdMantenimiento",
                    sql.Int,
                    id
                )
                .query(`
                    SELECT
                        IdBus,
                        Estado

                    FROM Mantenimientos

                    WHERE
                        IdMantenimiento = @IdMantenimiento
                `);


        if (
            actual.recordset.length === 0
        ) {

            return res.status(404).json({
                ok: false,
                mensaje: "Mantenimiento no encontrado"
            });

        }


        if (
            actual.recordset[0].Estado ===
            "EN_PROCESO"
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "No puedes eliminar un mantenimiento EN PROCESO. Finalízalo o cancélalo."
            });

        }


        const idBus =
            actual.recordset[0].IdBus;


        await pool
            .request()
            .input(
                "IdMantenimiento",
                sql.Int,
                id
            )
            .query(`
                DELETE FROM Mantenimientos
                WHERE IdMantenimiento = @IdMantenimiento
            `);


        await sincronizarEstadoBus(
            pool,
            idBus
        );


        return res.status(200).json({
            ok: true,
            mensaje: "Mantenimiento eliminado correctamente"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al eliminar el mantenimiento",
            error: error.message
        });

    }

};


module.exports = {
    listarMantenimientos,
    listarBuses,
    obtenerMantenimiento,
    crearMantenimiento,
    actualizarMantenimiento,
    eliminarMantenimiento
};
