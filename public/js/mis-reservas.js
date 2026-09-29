document.addEventListener(
    "DOMContentLoaded",
    () => {


        if (
            !ClienteAPI.requireCliente()
        ) {

            return;

        }


        const btnCerrarSesion =
            document.getElementById(
                "btnCerrarSesion"
            );


        const contenedor =
            document.getElementById(
                "listaReservas"
            );


        if (
            btnCerrarSesion
        ) {

            btnCerrarSesion.addEventListener(
                "click",
                ClienteAPI.logout
            );

        }


        cargarReservas();


        // ==================================================
        // CARGAR RESERVAS
        // ==================================================

        async function cargarReservas() {


            try {


                const {
                    response,
                    data
                } =
                    await ClienteAPI.request(
                        "/api/cliente/reservas"
                    );


                if (
                    !response.ok
                ) {

                    throw new Error(
                        data.mensaje ||
                        "No se pudieron cargar las reservas."
                    );

                }


                renderReservas(
                    data.reservas || []
                );


            } catch (error) {


                contenedor.innerHTML =
                    `
                        <div class="empty-client">

                            <i class="bi bi-exclamation-triangle"></i>

                            <br><br>

                            ${escapeHTML(
                                error.message
                            )}

                        </div>
                    `;


            }

        }


        // ==================================================
        // RENDER RESERVAS
        // ==================================================

        function renderReservas(
            reservas
        ) {


            if (
                reservas.length === 0
            ) {

                contenedor.innerHTML =
                    `
                        <div class="empty-client">

                            <i class="bi bi-journal-x"></i>

                            <br><br>

                            Todavía no tienes reservas.

                        </div>
                    `;

                return;

            }


            contenedor.innerHTML =
                reservas
                    .map(
                        reserva => {


                            const puedePagar =
                                [
                                    "PENDIENTE",
                                    "CONFIRMADA"
                                ].includes(
                                    reserva.Estado
                                );


                            const puedeCancelar =
                                [
                                    "PENDIENTE",
                                    "CONFIRMADA"
                                ].includes(
                                    reserva.Estado
                                );


                            return `
                                <article class="reservation-card">


                                    <div class="reservation-top">


                                        <div>

                                            <div class="ticket-code">
                                                ${escapeHTML(
                                                    reserva.CodigoReserva
                                                )}
                                            </div>


                                            <div class="ticket-route">

                                                ${escapeHTML(
                                                    reserva.CiudadOrigen
                                                )}

                                                →

                                                ${escapeHTML(
                                                    reserva.CiudadDestino
                                                )}

                                            </div>

                                        </div>


                                        <div>
                                            ${badgeReserva(
                                                reserva.Estado
                                            )}
                                        </div>


                                    </div>


                                    <div class="ticket-data">


                                        <div>

                                            <small>
                                                SALIDA
                                            </small>

                                            <strong>
                                                ${formatearFechaHora(
                                                    reserva.FechaHoraSalida
                                                )}
                                            </strong>

                                        </div>


                                        <div>

                                            <small>
                                                BUS
                                            </small>

                                            <strong>

                                                ${escapeHTML(
                                                    reserva.NumeroBus || "-"
                                                )}

                                                ${
                                                    reserva.Placa
                                                        ? ` · ${escapeHTML(reserva.Placa)}`
                                                        : ""
                                                }

                                            </strong>

                                        </div>


                                        <div>

                                            <small>
                                                ASIENTO(S)
                                            </small>

                                            <strong>
                                                ${escapeHTML(
                                                    reserva.Asientos || "-"
                                                )}
                                            </strong>

                                        </div>


                                        <div>

                                            <small>
                                                TOTAL
                                            </small>

                                            <strong>
                                                ${formatearDinero(
                                                    reserva.Total
                                                )}
                                            </strong>

                                        </div>


                                    </div>


                                    ${
                                        puedePagar ||
                                        puedeCancelar

                                            ? `
                                                <div class="ticket-actions">

                                                    ${
                                                        puedeCancelar
                                                            ? `
                                                                <button
                                                                    class="btn-client-danger"
                                                                    type="button"
                                                                    onclick="cancelarReserva(${Number(reserva.IdReserva)})"
                                                                >

                                                                    <i class="bi bi-x-circle"></i>

                                                                    Cancelar

                                                                </button>
                                                            `
                                                            : ""
                                                    }


                                                    ${
                                                        puedePagar
                                                            ? `
                                                                <button
                                                                    class="btn-client-secondary"
                                                                    type="button"
                                                                    onclick="pagarReserva(${Number(reserva.IdReserva)})"
                                                                >

                                                                    <i class="bi bi-credit-card"></i>

                                                                    Pagar ahora

                                                                </button>
                                                            `
                                                            : ""
                                                    }

                                                </div>
                                            `

                                            : ""
                                    }


                                </article>
                            `;


                        }
                    )
                    .join("");

        }


        // ==================================================
        // PAGAR RESERVA
        // ==================================================

        window.pagarReserva =
            async function(
                idReserva
            ) {


                const resultado =
                    await Swal.fire({


                        title:
                            "Completar pago",


                        html:
                            `
                                <select
                                    id="swalMetodoPago"
                                    class="swal2-input"
                                    style="width:80%"
                                >

                                    <option value="TARJETA">
                                        Tarjeta
                                    </option>

                                    <option value="TRANSFERENCIA">
                                        Transferencia
                                    </option>

                                    <option value="EFECTIVO">
                                        Efectivo
                                    </option>

                                </select>


                                <input
                                    id="swalReferencia"
                                    class="swal2-input"
                                    style="width:80%"
                                    placeholder="Referencia / comprobante (opcional)"
                                >
                            `,


                        showCancelButton:
                            true,


                        confirmButtonText:
                            "Pagar",


                        cancelButtonText:
                            "Cancelar",


                        preConfirm:
                            () => {


                                return {

                                    metodoPago:
                                        document.getElementById(
                                            "swalMetodoPago"
                                        ).value,


                                    referenciaPago:
                                        document.getElementById(
                                            "swalReferencia"
                                        ).value.trim()

                                };


                            }


                    });


                if (
                    !resultado.isConfirmed
                ) {

                    return;

                }


                try {


                    const {
                        response,
                        data
                    } =
                        await ClienteAPI.request(
                            `/api/cliente/reservas/${idReserva}/pagar`,
                            {

                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        resultado.value
                                    )

                            }
                        );


                    if (
                        !response.ok
                    ) {

                        throw new Error(
                            data.mensaje ||
                            "No se pudo completar el pago."
                        );

                    }


                    const decision =
                        await Swal.fire({


                            icon:
                                "success",


                            title:
                                "Pago completado",


                            text:
                                "Tu boleto ya está disponible en Mis boletos.",


                            showCancelButton:
                                true,


                            confirmButtonText:
                                "Ver mis boletos",


                            cancelButtonText:
                                "Seguir aquí"


                        });


                    if (
                        decision.isConfirmed
                    ) {

                        window.location.href =
                            "/cliente/mis-boletos.html";

                        return;

                    }


                    await cargarReservas();


                } catch (error) {


                    Swal.fire({

                        icon:
                            "error",

                        title:
                            "No se pudo pagar",

                        text:
                            error.message

                    });


                }

            };


        // ==================================================
        // CANCELAR RESERVA
        // ==================================================

        window.cancelarReserva =
            async function(
                idReserva
            ) {


                const confirmacion =
                    await Swal.fire({


                        icon:
                            "warning",


                        title:
                            "¿Cancelar reserva?",


                        text:
                            "Los asientos volverán a quedar disponibles.",


                        showCancelButton:
                            true,


                        confirmButtonText:
                            "Sí, cancelar",


                        cancelButtonText:
                            "No",


                        confirmButtonColor:
                            "#dc2626"


                    });


                if (
                    !confirmacion.isConfirmed
                ) {

                    return;

                }


                try {


                    const {
                        response,
                        data
                    } =
                        await ClienteAPI.request(
                            `/api/cliente/reservas/${idReserva}/cancelar`,
                            {

                                method:
                                    "PATCH"

                            }
                        );


                    if (
                        !response.ok
                    ) {

                        throw new Error(
                            data.mensaje ||
                            "No se pudo cancelar la reserva."
                        );

                    }


                    await Swal.fire({

                        icon:
                            "success",

                        title:
                            "Reserva cancelada",

                        timer:
                            1200,

                        showConfirmButton:
                            false

                    });


                    await cargarReservas();


                } catch (error) {


                    Swal.fire({

                        icon:
                            "error",

                        title:
                            "No se pudo cancelar",

                        text:
                            error.message

                    });


                }

            };


        // ==================================================
        // BADGE
        // ==================================================

        function badgeReserva(
            estado
        ) {


            if (
                estado === "PAGADA"
            ) {

                return `
                    <span class="status-badge status-green">
                        PAGADA
                    </span>
                `;

            }


            if (
                estado === "CANCELADA"
            ) {

                return `
                    <span class="status-badge status-red">
                        CANCELADA
                    </span>
                `;

            }


            if (
                estado === "CONFIRMADA"
            ) {

                return `
                    <span class="status-badge status-blue">
                        CONFIRMADA
                    </span>
                `;

            }


            return `
                <span class="status-badge status-orange">
                    PENDIENTE
                </span>
            `;

        }


        // ==================================================
        // UTILIDADES
        // ==================================================

        function formatearDinero(
            valor
        ) {


            return new Intl.NumberFormat(
                "es-EC",
                {
                    style:
                        "currency",
                    currency:
                        "USD"
                }
            ).format(
                Number(
                    valor || 0
                )
            );

        }


        function formatearFechaHora(
            valor
        ) {


            if (
                !valor
            ) {

                return "-";

            }


            return new Date(
                valor
            ).toLocaleString(
                "es-EC",
                {
                    day:
                        "2-digit",
                    month:
                        "short",
                    year:
                        "numeric",
                    hour:
                        "2-digit",
                    minute:
                        "2-digit"
                }
            );

        }


        function escapeHTML(
            valor
        ) {


            const div =
                document.createElement(
                    "div"
                );


            div.textContent =
                valor ?? "";


            return div.innerHTML;

        }


    }
);
