const {
    conectarBD
} = require("../config/database");


// ======================================================
// RESUMEN DASHBOARD
// ======================================================

const obtenerResumen = async (req, res) => {

    try {

        const pool =
            await conectarBD();


        const stats =
            await pool
                .request()
                .query(`
                    SELECT

                        (
                            SELECT COUNT(*)
                            FROM Buses
                        ) AS TotalBuses,

                        (
                            SELECT COUNT(*)
                            FROM Viajes
                            WHERE Estado = 'PROGRAMADO'
                              AND FechaHoraSalida > GETDATE()
                        ) AS ViajesProgramados,

                        (
                            SELECT COUNT(*)
                            FROM Reservas
                            WHERE Estado <> 'CANCELADA'
                        ) AS TotalReservas,

                        (
                            SELECT ISNULL(
                                SUM(Monto),
                                0
                            )
                            FROM Pagos
                            WHERE Estado = 'APROBADO'
                        ) AS Ingresos,

                        (
                            SELECT COUNT(*)
                            FROM Usuarios U
                            INNER JOIN Roles R
                                ON U.IdRol = R.IdRol
                            WHERE
                                R.NombreRol = 'CLIENTE'
                                AND U.Estado = 1
                        ) AS ClientesActivos,

                        (
                            SELECT COUNT(*)
                            FROM Empleados
                            WHERE Estado = 1
                        ) AS EmpleadosActivos
                `);


        const viajes =
            await pool
                .request()
                .query(`
                    SELECT TOP 5
                        V.IdViaje,
                        V.FechaHoraSalida,
                        V.Estado,

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
                        AND
                        V.FechaHoraSalida > GETDATE()

                    ORDER BY
                        V.FechaHoraSalida ASC
                `);


        return res.status(200).json({

            ok: true,

            resumen:
                stats.recordset[0],

            proximosViajes:
                viajes.recordset

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al cargar el dashboard",
            error: error.message
        });

    }

};


module.exports = {
    obtenerResumen
};
