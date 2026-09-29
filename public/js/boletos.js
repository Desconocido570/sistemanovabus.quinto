document.addEventListener(
    "DOMContentLoaded",
    () => {

        const token =
            localStorage.getItem(
                "token"
            );


        const usuario =
            JSON.parse(
                localStorage.getItem(
                    "usuario"
                ) || "null"
            );


        if (
            !token ||
            !usuario ||
            usuario.rol !== "ADMIN"
        ) {

            window.location.href =
                "/login.html";

            return;

        }


        const modalEmitir =
            bootstrap.Modal.getOrCreateInstance(
                document.getElementById(
                    "modalEmitirBoleto"
                )
            );


        const modalDetalle =
            bootstrap.Modal.getOrCreateInstance(
                document.getElementById(
                    "modalDetalleBoleto"
                )
            );


        let boletos =
            [];


        document.getElementById(
            "nombreAdmin"
        ).textContent =
            `${usuario.nombres} ${usuario.apellidos}`;


        document.getElementById(
            "btnCerrarSesion"
        ).addEventListener(
            "click",
            () => {

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


        document.getElementById(
            "btnMenu"
        ).addEventListener(
            "click",
            () => {

                document.querySelector(
                    ".sidebar"
                ).classList.toggle(
                    "show"
                );

            }
        );


        document.getElementById(
            "buscarBoleto"
        ).addEventListener(
            "input",
            aplicarFiltros
        );


        document.getElementById(
            "filtroEstadoBoleto"
        ).addEventListener(
            "change",
            aplicarFiltros
        );


        document.getElementById(
            "btnEmitirBoleto"
        ).addEventListener(
            "click",
            cargarReservasDisponibles
        );


        document.getElementById(
            "formEmitirBoleto"
        ).addEventListener(
            "submit",
            emitirBoleto
        );


        cargarBoletos();


        async function api(
            url,
            options = {}
        ) {

            const response =
                await fetch(
                    url,
                    {
                        ...options,

                        headers: {
                            ...(options.headers || {}),

                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );


            const data =
                await response.json();


            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.clear();

                window.location.href =
                    "/login.html";

                throw new Error(
                    data.mensaje
                );

            }


            return {
                response,
                data
            };

        }


        async function cargarBoletos() {

            try {

                const {
                    response,
                    data
                } =
                    await api(
                        "/api/boletos"
                    );


                if (!response.ok) {

                    throw new Error(
                        data.mensaje
                    );

                }


                boletos =
                    data.boletos;


                aplicarFiltros();


            } catch (error) {

                document.getElementById(
                    "tablaBoletos"
                ).innerHTML = `

                    <tr>

                        <td colspan="8">

                            <div class="tabla-boletos-vacia text-danger">

                                ${escapeHTML(
                                    error.message
                                )}

                            </div>

                        </td>

                    </tr>

                `;

            }

        }


        function renderBoletos(
            lista
        ) {

            const tbody =
                document.getElementById(
                    "tablaBoletos"
                );


            if (
                lista.length === 0
            ) {

                tbody.innerHTML = `

                    <tr>

                        <td colspan="8">

                            <div class="tabla-boletos-vacia">

                                No hay boletos registrados.

                            </div>

                        </td>

                    </tr>

                `;

                return;

            }


            tbody.innerHTML =
                lista
                    .map(
                        boleto => `

                            <tr>

                                <td>

                                    <span class="codigo-boleto">

                                        ${escapeHTML(
                                            boleto.CodigoBoleto
                                        )}

                                    </span>

                                    <br>

                                    <small class="text-muted">

                                        ${formatearFechaHora(
                                            boleto.FechaEmision
                                        )}

                                    </small>

                                </td>

                                <td>

                                    <strong>

                                        ${escapeHTML(
                                            boleto.Nombres
                                        )}

                                        ${escapeHTML(
                                            boleto.Apellidos
                                        )}

                                    </strong>

                                    <br>

                                    <small class="text-muted">

                                        ${escapeHTML(
                                            boleto.Cedula
                                        )}

                                    </small>

                                </td>

                                <td>

                                    ${escapeHTML(
                                        boleto.CiudadOrigen
                                    )}

                                    →

                                    ${escapeHTML(
                                        boleto.CiudadDestino
                                    )}

                                </td>

                                <td>

                                    ${formatearFechaHora(
                                        boleto.FechaHoraSalida
                                    )}

                                </td>

                                <td>

                                    ${escapeHTML(
                                        boleto.Asientos ||
                                        "-"
                                    )}

                                </td>

                                <td>

                                    <strong>

                                        ${formatearDinero(
                                            boleto.Total
                                        )}

                                    </strong>

                                </td>

                                <td>

                                    ${badgeEstado(
                                        boleto.Estado
                                    )}

                                </td>

                                <td class="text-end">

                                    <button
                                        class="btn-accion-boleto"
                                        title="Ver detalle"
                                        onclick="verBoleto(
                                            ${boleto.IdBoleto}
                                        )"
                                    >
                                        <i class="bi bi-eye"></i>
                                    </button>

                                    <button
                                        class="btn-accion-boleto"
                                        title="Descargar PDF"
                                        onclick="descargarPDF(
                                            ${boleto.IdBoleto},
                                            '${escapeJS(
                                                boleto.CodigoBoleto
                                            )}'
                                        )"
                                    >
                                        <i class="bi bi-file-earmark-pdf"></i>
                                    </button>

                                    <button
                                        class="btn-accion-boleto"
                                        title="Cambiar estado"
                                        onclick="cambiarEstado(
                                            ${boleto.IdBoleto},
                                            '${boleto.Estado}'
                                        )"
                                    >
                                        <i class="bi bi-arrow-repeat"></i>
                                    </button>

                                </td>

                            </tr>

                        `
                    )
                    .join("");

        }


        async function cargarReservasDisponibles() {

            const select =
                document.getElementById(
                    "idReservaBoleto"
                );


            select.innerHTML = `

                <option value="">
                    Cargando...
                </option>

            `;


            try {

                const {
                    response,
                    data
                } =
                    await api(
                        "/api/boletos/admin/reservas-disponibles/lista"
                    );


                if (!response.ok) {

                    throw new Error(
                        data.mensaje
                    );

                }


                select.innerHTML = `

                    <option value="">
                        Seleccionar reserva...
                    </option>

                `;


                data.reservas.forEach(
                    reserva => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            reserva.IdReserva;


                        option.textContent =
                            `${reserva.CodigoReserva} | ${reserva.Nombres} ${reserva.Apellidos} | ${reserva.CiudadOrigen} → ${reserva.CiudadDestino}`;


                        select.appendChild(
                            option
                        );

                    }
                );


            } catch (error) {

                select.innerHTML = `

                    <option value="">
                        Error cargando reservas
                    </option>

                `;

            }

        }


        async function emitirBoleto(
            event
        ) {

            event.preventDefault();


            const idReserva =
                parseInt(
                    document.getElementById(
                        "idReservaBoleto"
                    ).value
                );


            if (!idReserva) {
                return;
            }


            try {

                const {
                    response,
                    data
                } =
                    await api(
                        "/api/boletos",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    idReserva
                                })
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        data.mensaje
                    );

                }


                modalEmitir.hide();


                await Swal.fire({

                    icon:
                        "success",

                    title:
                        "Boleto listo",

                    text:
                        data.mensaje,

                    timer:
                        1400,

                    showConfirmButton:
                        false

                });


                cargarBoletos();


            } catch (error) {

                Swal.fire({

                    icon:
                        "error",

                    title:
                        "Error",

                    text:
                        error.message

                });

            }

        }


        window.verBoleto =
            async function(
                idBoleto
            ) {

                try {

                    const {
                        response,
                        data
                    } =
                        await api(
                            `/api/boletos/${idBoleto}`
                        );


                    if (!response.ok) {

                        throw new Error(
                            data.mensaje
                        );

                    }


                    const b =
                        data.boleto;


                    document.getElementById(
                        "contenidoDetalleBoleto"
                    ).innerHTML = `

                        <div class="detalle-boleto-grid">

                            <div class="detalle-boleto-box">
                                <small>CÓDIGO</small>
                                <strong>${escapeHTML(b.CodigoBoleto)}</strong>
                            </div>

                            <div class="detalle-boleto-box">
                                <small>RESERVA</small>
                                <strong>${escapeHTML(b.CodigoReserva)}</strong>
                            </div>

                            <div class="detalle-boleto-box">
                                <small>PASAJERO</small>
                                <strong>${escapeHTML(b.Nombres)} ${escapeHTML(b.Apellidos)}</strong>
                            </div>

                            <div class="detalle-boleto-box">
                                <small>CÉDULA</small>
                                <strong>${escapeHTML(b.Cedula)}</strong>
                            </div>

                            <div class="detalle-boleto-box">
                                <small>RUTA</small>
                                <strong>${escapeHTML(b.CiudadOrigen)} → ${escapeHTML(b.CiudadDestino)}</strong>
                            </div>

                            <div class="detalle-boleto-box">
                                <small>SALIDA</small>
                                <strong>${formatearFechaHora(b.FechaHoraSalida)}</strong>
                            </div>

                            <div class="detalle-boleto-box">
                                <small>BUS</small>
                                <strong>${escapeHTML(b.NumeroBus)} · ${escapeHTML(b.Placa)}</strong>
                            </div>

                            <div class="detalle-boleto-box">
                                <small>ASIENTO(S)</small>
                                <strong>${escapeHTML(b.Asientos || "-")}</strong>
                            </div>

                            <div class="detalle-boleto-box">
                                <small>PAGO</small>
                                <strong>${escapeHTML(b.MetodoPago || "-")}</strong>
                            </div>

                            <div class="detalle-boleto-box">
                                <small>TOTAL</small>
                                <strong>${formatearDinero(b.MontoPago || b.Total)}</strong>
                            </div>

                        </div>

                    `;


                    modalDetalle.show();


                } catch (error) {

                    Swal.fire({

                        icon:
                            "error",

                        title:
                            "Error",

                        text:
                            error.message

                    });

                }

            };


        window.descargarPDF =
            async function(
                idBoleto,
                codigo
            ) {

                try {

                    const response =
                        await fetch(
                            `/api/boletos/${idBoleto}/pdf`,
                            {
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`
                                }
                            }
                        );


                    if (!response.ok) {

                        const error =
                            await response.json();

                        throw new Error(
                            error.mensaje
                        );

                    }


                    const blob =
                        await response.blob();


                    const url =
                        URL.createObjectURL(
                            blob
                        );


                    const link =
                        document.createElement(
                            "a"
                        );


                    link.href =
                        url;

                    link.download =
                        `${codigo}.pdf`;


                    document.body.appendChild(
                        link
                    );


                    link.click();

                    link.remove();


                    URL.revokeObjectURL(
                        url
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

            };


        window.cambiarEstado =
            async function(
                idBoleto,
                estadoActual
            ) {

                const resultado =
                    await Swal.fire({

                        title:
                            "Estado del boleto",

                        input:
                            "select",

                        inputOptions: {
                            ACTIVO:
                                "Activo",
                            UTILIZADO:
                                "Utilizado",
                            CANCELADO:
                                "Cancelado"
                        },

                        inputValue:
                            estadoActual,

                        showCancelButton:
                            true,

                        confirmButtonText:
                            "Guardar",

                        cancelButtonText:
                            "Cancelar"

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
                        await api(
                            `/api/boletos/${idBoleto}/estado`,
                            {
                                method:
                                    "PATCH",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        estado:
                                            resultado.value
                                    })
                            }
                        );


                    if (!response.ok) {

                        throw new Error(
                            data.mensaje
                        );

                    }


                    cargarBoletos();


                } catch (error) {

                    Swal.fire({

                        icon:
                            "error",

                        title:
                            "Error",

                        text:
                            error.message

                    });

                }

            };


        function aplicarFiltros() {

            const texto =
                document.getElementById(
                    "buscarBoleto"
                ).value
                    .toLowerCase()
                    .trim();


            const estado =
                document.getElementById(
                    "filtroEstadoBoleto"
                ).value;


            const filtrados =
                boletos.filter(
                    boleto => {

                        const info =
                            `
                            ${boleto.CodigoBoleto}
                            ${boleto.CodigoReserva}
                            ${boleto.Cedula}
                            ${boleto.Nombres}
                            ${boleto.Apellidos}
                            ${boleto.CiudadOrigen}
                            ${boleto.CiudadDestino}
                            `
                                .toLowerCase();


                        return (
                            info.includes(
                                texto
                            ) &&
                            (
                                !estado ||
                                boleto.Estado ===
                                estado
                            )
                        );

                    }
                );


            renderBoletos(
                filtrados
            );

        }


        function badgeEstado(
            estado
        ) {

            if (
                estado === "ACTIVO"
            ) {

                return `<span class="badge-boleto boleto-activo">ACTIVO</span>`;

            }


            if (
                estado === "UTILIZADO"
            ) {

                return `<span class="badge-boleto boleto-utilizado">UTILIZADO</span>`;

            }


            return `<span class="badge-boleto boleto-cancelado">CANCELADO</span>`;

        }


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
                Number(valor)
            );

        }


        function formatearFechaHora(
            valor
        ) {

            if (!valor) {
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
                        "2-digit",
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


        function escapeJS(
            valor
        ) {

            return String(
                valor ?? ""
            )
                .replace(
                    /\\/g,
                    "\\\\"
                )
                .replace(
                    /'/g,
                    "\\'"
                );

        }

    }
);
