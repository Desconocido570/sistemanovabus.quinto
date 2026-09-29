document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            !ClienteAPI.requireCliente()
        ) {
            return;
        }


        const usuario =
            ClienteAPI.usuario;


        const nombreCliente =
            document.getElementById(
                "nombreCliente"
            );


        if (nombreCliente) {

            nombreCliente.textContent =
                usuario.nombres;

        }


        document.getElementById(
            "btnCerrarSesion"
        ).addEventListener(
            "click",
            ClienteAPI.logout
        );


        const form =
            document.getElementById(
                "formBuscarViaje"
            );


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                cargarViajes();

            }
        );


        cargarViajes();


        async function cargarViajes() {

            const origen =
                document.getElementById(
                    "origen"
                ).value.trim();


            const destino =
                document.getElementById(
                    "destino"
                ).value.trim();


            const fecha =
                document.getElementById(
                    "fecha"
                ).value;


            const params =
                new URLSearchParams();


            if (origen) {
                params.set(
                    "origen",
                    origen
                );
            }


            if (destino) {
                params.set(
                    "destino",
                    destino
                );
            }


            if (fecha) {
                params.set(
                    "fecha",
                    fecha
                );
            }


            const lista =
                document.getElementById(
                    "listaViajes"
                );


            lista.innerHTML = `

                <div class="empty-client">

                    Buscando viajes...

                </div>

            `;


            try {

                const {
                    response,
                    data
                } =
                    await ClienteAPI.request(
                        `/api/cliente/viajes?${params.toString()}`
                    );


                if (!response.ok) {

                    throw new Error(
                        data.mensaje
                    );

                }


                document.getElementById(
                    "textoResultados"
                ).textContent =
                    `${data.viajes.length} viaje(s) encontrado(s).`;


                renderViajes(
                    data.viajes
                );


            } catch (error) {

                lista.innerHTML = `

                    <div class="empty-client">

                        ${escapeHTML(
                            error.message
                        )}

                    </div>

                `;

            }

        }


        function renderViajes(
            viajes
        ) {

            const lista =
                document.getElementById(
                    "listaViajes"
                );


            if (
                viajes.length === 0
            ) {

                lista.innerHTML = `

                    <div class="empty-client">

                        <i class="bi bi-calendar-x"></i>

                        <br><br>

                        No encontramos viajes con esos criterios.

                    </div>

                `;

                return;

            }


            lista.innerHTML =
                viajes
                    .map(
                        viaje => {

                            const disponibles =
                                Number(
                                    viaje.AsientosDisponibles
                                );


                            return `

                                <article class="trip-card">


                                    <div class="trip-route">

                                        <span>

                                            ${escapeHTML(
                                                viaje.CiudadOrigen
                                            )}

                                        </span>


                                        <span class="trip-route-arrow">

                                            <i class="bi bi-arrow-right"></i>

                                        </span>


                                        <span>

                                            ${escapeHTML(
                                                viaje.CiudadDestino
                                            )}

                                        </span>

                                    </div>


                                    <div class="trip-meta">


                                        <div class="trip-meta-item">

                                            <small>
                                                SALIDA
                                            </small>

                                            <strong>

                                                ${formatearFechaHora(
                                                    viaje.FechaHoraSalida
                                                )}

                                            </strong>

                                        </div>


                                        <div class="trip-meta-item">

                                            <small>
                                                BUS
                                            </small>

                                            <strong>

                                                ${escapeHTML(
                                                    viaje.NumeroBus
                                                )}

                                                ·

                                                ${escapeHTML(
                                                    viaje.TipoBus ||
                                                    "Normal"
                                                )}

                                            </strong>

                                        </div>


                                        <div class="trip-meta-item">

                                            <small>
                                                DISPONIBILIDAD
                                            </small>

                                            <strong>

                                                ${disponibles}
                                                asiento(s)

                                            </strong>

                                        </div>


                                    </div>


                                    <div class="trip-card-footer">


                                        <div class="trip-price">

                                            <small>
                                                Precio por asiento
                                            </small>

                                            <strong>

                                                ${formatearDinero(
                                                    viaje.Precio
                                                )}

                                            </strong>

                                            <span class="badge-availability">

                                                ${disponibles > 0
                                                    ? "Disponible"
                                                    : "Agotado"
                                                }

                                            </span>

                                        </div>


                                        <button
                                            type="button"
                                            class="btn-client-primary"
                                            ${disponibles <= 0
                                                ? "disabled"
                                                : ""
                                            }
                                            onclick="seleccionarViaje(
                                                ${viaje.IdViaje}
                                            )"
                                        >

                                            Elegir

                                            <i class="bi bi-arrow-right"></i>

                                        </button>


                                    </div>


                                </article>

                            `;

                        }
                    )
                    .join("");

        }


        window.seleccionarViaje =
            function(
                idViaje
            ) {

                window.location.href =
                    `/cliente/compra.html?idViaje=${idViaje}`;

            };


        function formatearFechaHora(
            valor
        ) {

            return new Date(
                valor
            ).toLocaleString(
                "es-EC",
                {
                    day:
                        "2-digit",
                    month:
                        "short",
                    hour:
                        "2-digit",
                    minute:
                        "2-digit"
                }
            );

        }


        function formatearDinero(
            valor
        ) {

            return new Intl
                .NumberFormat(
                    "es-EC",
                    {
                        style:
                            "currency",
                        currency:
                            "USD"
                    }
                )
                .format(
                    Number(valor)
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
