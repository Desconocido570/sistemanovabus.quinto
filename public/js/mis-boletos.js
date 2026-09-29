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
                "listaBoletos"
            );


        if (
            btnCerrarSesion
        ) {

            btnCerrarSesion.addEventListener(
                "click",
                ClienteAPI.logout
            );

        }


        cargarBoletos();


        // ==================================================
        // CARGAR BOLETOS
        // ==================================================

        async function cargarBoletos() {


            try {


                const {
                    response,
                    data
                } =
                    await ClienteAPI.request(
                        "/api/cliente/boletos"
                    );


                if (
                    !response.ok
                ) {

                    throw new Error(
                        data.mensaje ||
                        "No se pudieron cargar los boletos."
                    );

                }


                renderBoletos(
                    data.boletos || []
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
        // RENDER BOLETOS
        // ==================================================

        function renderBoletos(
            boletos
        ) {


            if (
                boletos.length === 0
            ) {

                contenedor.innerHTML =
                    `
                        <div class="empty-client">

                            <i class="bi bi-ticket-perforated"></i>

                            <br><br>

                            Todavía no tienes boletos emitidos.

                        </div>
                    `;

                return;

            }


            contenedor.innerHTML =
                boletos
                    .map(
                        boleto => {


                            return `
                                <article class="ticket-card">


                                    <div class="ticket-top">


                                        <div>

                                            <div class="ticket-code">

                                                ${escapeHTML(
                                                    boleto.CodigoBoleto
                                                )}

                                            </div>


                                            <div class="ticket-route">

                                                ${escapeHTML(
                                                    boleto.CiudadOrigen
                                                )}

                                                →

                                                ${escapeHTML(
                                                    boleto.CiudadDestino
                                                )}

                                            </div>

                                        </div>


                                        <div>
                                            ${badgeBoleto(
                                                boleto.Estado
                                            )}
                                        </div>


                                    </div>


                                    <div class="ticket-data">


                                        <div>

                                            <small>
                                                RESERVA
                                            </small>

                                            <strong>
                                                ${escapeHTML(
                                                    boleto.CodigoReserva || "-"
                                                )}
                                            </strong>

                                        </div>


                                        <div>

                                            <small>
                                                SALIDA
                                            </small>

                                            <strong>
                                                ${formatearFechaHora(
                                                    boleto.FechaHoraSalida
                                                )}
                                            </strong>

                                        </div>


                                        <div>

                                            <small>
                                                BUS
                                            </small>

                                            <strong>

                                                ${escapeHTML(
                                                    boleto.NumeroBus || "-"
                                                )}

                                                ${
                                                    boleto.Placa
                                                        ? ` · ${escapeHTML(boleto.Placa)}`
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
                                                    boleto.Asientos || "-"
                                                )}
                                            </strong>

                                        </div>


                                    </div>


                                    <div class="ticket-actions">


                                        <button
                                            class="btn-client-secondary"
                                            type="button"
                                            data-id="${Number(boleto.IdBoleto)}"
                                            data-codigo="${escapeHTML(boleto.CodigoBoleto)}"
                                        >

                                            <i class="bi bi-file-earmark-pdf"></i>

                                            Descargar PDF

                                        </button>


                                    </div>


                                </article>
                            `;


                        }
                    )
                    .join("");


            contenedor
                .querySelectorAll(
                    "[data-id]"
                )
                .forEach(
                    boton => {


                        boton.addEventListener(
                            "click",
                            () => {


                                descargarBoleto(
                                    Number(
                                        boton.dataset.id
                                    ),
                                    boton.dataset.codigo
                                );


                            }
                        );


                    }
                );

        }


        // ==================================================
        // DESCARGAR PDF
        // ==================================================

        async function descargarBoleto(
            idBoleto,
            codigo
        ) {


            try {


                await ClienteAPI.downloadPDF(
                    `/api/boletos/${idBoleto}/pdf`,
                    `${codigo}.pdf`
                );


            } catch (error) {


                Swal.fire({

                    icon:
                        "error",

                    title:
                        "No se pudo descargar",

                    text:
                        error.message

                });


            }

        }


        // ==================================================
        // BADGE
        // ==================================================

        function badgeBoleto(
            estado
        ) {


            if (
                estado === "ACTIVO"
            ) {

                return `
                    <span class="status-badge status-green">
                        ACTIVO
                    </span>
                `;

            }


            if (
                estado === "UTILIZADO"
            ) {

                return `
                    <span class="status-badge status-blue">
                        UTILIZADO
                    </span>
                `;

            }


            return `
                <span class="status-badge status-red">
                    CANCELADO
                </span>
            `;

        }


        // ==================================================
        // UTILIDADES
        // ==================================================

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
