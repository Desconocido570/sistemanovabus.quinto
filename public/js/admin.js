document.addEventListener(
    "DOMContentLoaded",
    () => {

        const token =
            localStorage.getItem(
                "token"
            );


        const usuarioGuardado =
            localStorage.getItem(
                "usuario"
            );


        if (
            !token ||
            !usuarioGuardado
        ) {

            window.location.href =
                "/login.html";

            return;

        }


        let usuario;


        try {

            usuario =
                JSON.parse(
                    usuarioGuardado
                );

        } catch (error) {

            localStorage.clear();

            window.location.href =
                "/login.html";

            return;

        }


        if (
            usuario.rol !== "ADMIN"
        ) {

            window.location.href =
                "/cliente/inicio.html";

            return;

        }


        const nombreCompleto =
            `${usuario.nombres} ${usuario.apellidos}`;


        const nombreAdmin =
            document.getElementById(
                "nombreAdmin"
            );


        const nombreBienvenida =
            document.getElementById(
                "nombreBienvenida"
            );


        if (nombreAdmin) {

            nombreAdmin.textContent =
                nombreCompleto;

        }


        if (nombreBienvenida) {

            nombreBienvenida.textContent =
                usuario.nombres;

        }


        const fechaActual =
            document.getElementById(
                "fechaActual"
            );


        if (fechaActual) {

            fechaActual.textContent =
                new Date()
                    .toLocaleDateString(
                        "es-EC",
                        {
                            weekday:
                                "long",

                            day:
                                "2-digit",

                            month:
                                "long",

                            year:
                                "numeric"
                        }
                    );

        }


        const btnCerrarSesion =
            document.getElementById(
                "btnCerrarSesion"
            );


        if (btnCerrarSesion) {

            btnCerrarSesion.addEventListener(
                "click",
                async () => {

                    try {

                        await fetch(
                            "/api/auth/logout",
                            {
                                method: "POST"
                            }
                        );

                    } catch (error) {

                        console.error(
                            error
                        );

                    }


                    localStorage.removeItem(
                        "token"
                    );

                    localStorage.removeItem(
                        "usuario"
                    );

                    window.location.href =
                        "/login.html";

                }
            );

        }


        const btnMenu =
            document.getElementById(
                "btnMenu"
            );


        const sidebar =
            document.querySelector(
                ".sidebar"
            );


        if (
            btnMenu &&
            sidebar
        ) {

            btnMenu.addEventListener(
                "click",
                () => {

                    sidebar.classList.toggle(
                        "show"
                    );

                }
            );

        }


        cargarResumen();


        async function cargarResumen() {

            try {

                const response =
                    await fetch(
                        "/api/dashboard/resumen",
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );


                const resultado =
                    await response.json();


                if (
                    response.status === 401 ||
                    response.status === 403
                ) {

                    localStorage.clear();

                    window.location.href =
                        "/login.html";

                    return;

                }


                if (!response.ok) {

                    throw new Error(
                        resultado.mensaje
                    );

                }


                const resumen =
                    resultado.resumen;


                setTexto(
                    "statBuses",
                    resumen.TotalBuses
                );


                setTexto(
                    "statViajes",
                    resumen.ViajesProgramados
                );


                setTexto(
                    "statReservas",
                    resumen.TotalReservas
                );


                setTexto(
                    "statIngresos",
                    formatearDinero(
                        resumen.Ingresos
                    )
                );


                renderViajes(
                    resultado.proximosViajes
                );


            } catch (error) {

                console.error(
                    error
                );

            }

        }


        function renderViajes(
            viajes
        ) {

            const tabla =
                document.getElementById(
                    "tablaProximosViajes"
                );


            if (!tabla) {
                return;
            }


            if (
                viajes.length === 0
            ) {

                tabla.innerHTML = `

                    <tr>

                        <td colspan="5">

                            <div class="empty-table">

                                <i class="bi bi-calendar2-x"></i>

                                <span>
                                    Todavía no hay viajes próximos.
                                </span>

                            </div>

                        </td>

                    </tr>

                `;

                return;

            }


            tabla.innerHTML =
                viajes
                    .map(
                        viaje => `

                            <tr>

                                <td>

                                    <strong>

                                        ${escapeHTML(
                                            viaje.CiudadOrigen
                                        )}

                                        →

                                        ${escapeHTML(
                                            viaje.CiudadDestino
                                        )}

                                    </strong>

                                </td>

                                <td>

                                    ${escapeHTML(
                                        viaje.NumeroBus
                                    )}

                                    <br>

                                    <small class="text-muted">

                                        ${escapeHTML(
                                            viaje.Placa
                                        )}

                                    </small>

                                </td>

                                <td>

                                    ${formatearFecha(
                                        viaje.FechaHoraSalida
                                    )}

                                </td>

                                <td>

                                    ${formatearHora(
                                        viaje.FechaHoraSalida
                                    )}

                                </td>

                                <td>

                                    <span class="badge text-bg-primary">
                                        PROGRAMADO
                                    </span>

                                </td>

                            </tr>

                        `
                    )
                    .join("");

        }


        function setTexto(
            id,
            valor
        ) {

            const elemento =
                document.getElementById(
                    id
                );


            if (elemento) {

                elemento.textContent =
                    valor;

            }

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
                    Number(valor || 0)
                );

        }


        function formatearFecha(
            valor
        ) {

            return new Date(
                valor
            )
                .toLocaleDateString(
                    "es-EC"
                );

        }


        function formatearHora(
            valor
        ) {

            return new Date(
                valor
            )
                .toLocaleTimeString(
                    "es-EC",
                    {
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
