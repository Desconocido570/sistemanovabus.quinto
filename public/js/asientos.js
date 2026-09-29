document.addEventListener(
    "DOMContentLoaded",
    () => {


        // ==================================================
        // ELEMENTOS
        // ==================================================

        const selectBus =
            document.getElementById(
                "selectBus"
            );


        const selectViaje =
            document.getElementById(
                "selectViaje"
            );


        const contenedor =
            document.getElementById(
                "listaAsientosAdmin"
            );


        const mensajeAsientos =
            document.getElementById(
                "mensajeAsientos"
            );


        const contenedorBus =
            document.getElementById(
                "contenedorBusAsientos"
            );


        const tituloBus =
            document.getElementById(
                "tituloBusAsientos"
            );


        const tituloBusInterno =
            document.getElementById(
                "tituloBusInterno"
            );


        const subtitulo =
            document.getElementById(
                "subtituloVistaAsientos"
            );


        const contadorOcupacion =
            document.getElementById(
                "contadorOcupacion"
            );


        const cantidadDisponibles =
            document.getElementById(
                "cantidadDisponibles"
            );


        const cantidadReservados =
            document.getElementById(
                "cantidadReservados"
            );


        const cantidadVendidos =
            document.getElementById(
                "cantidadVendidos"
            );


        // ==================================================
        // TOKEN
        // ==================================================

        const token =
            localStorage.getItem(
                "token"
            );


        if (!token) {

            window.location.href =
                "/login.html";

            return;

        }


        // ==================================================
        // VARIABLES
        // ==================================================

        let idBusActual =
            null;


        let idViajeActual =
            null;


        let modoActual =
            "CONFIGURACION";


        // ==================================================
        // INICIO
        // ==================================================

        cargarBuses();


        // ==================================================
        // EVENTO BUS
        // ==================================================

        selectBus.addEventListener(
            "change",
            async () => {


                const idBus =
                    parseInt(
                        selectBus.value
                    );


                idBusActual =
                    isNaN(idBus)
                        ? null
                        : idBus;


                idViajeActual =
                    null;


                if (
                    !idBusActual
                ) {

                    limpiarVista();

                    return;

                }


                await cargarViajesBus(
                    idBusActual
                );


                // MOSTRAR CONFIGURACIÓN GENERAL
                await cargarAsientos(
                    idBusActual,
                    null
                );


            }
        );


        // ==================================================
        // EVENTO VIAJE
        // ==================================================

        selectViaje.addEventListener(
            "change",
            async () => {


                if (
                    !idBusActual
                ) {

                    return;

                }


                const valor =
                    selectViaje.value;


                if (
                    valor === "GENERAL"
                ) {

                    idViajeActual =
                        null;


                    await cargarAsientos(
                        idBusActual,
                        null
                    );


                    return;

                }


                const idViaje =
                    parseInt(
                        valor
                    );


                if (
                    isNaN(idViaje)
                ) {

                    return;

                }


                idViajeActual =
                    idViaje;


                await cargarAsientos(
                    idBusActual,
                    idViajeActual
                );


            }
        );


        // ==================================================
        // API
        // ==================================================

        async function api(
            url,
            options = {}
        ) {


            const headers = {

                ...(options.headers || {}),

                Authorization:
                    `Bearer ${token}`

            };


            const response =
                await fetch(
                    url,
                    {
                        ...options,
                        headers
                    }
                );


            let data = {};


            try {

                data =
                    await response.json();

            } catch (_) {

                data = {};

            }


            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.clear();


                window.location.href =
                    "/login.html";


                throw new Error(
                    "Sesión expirada"
                );

            }


            if (
                !response.ok
            ) {

                throw new Error(
                    data.mensaje ||
                    "Error en la solicitud"
                );

            }


            return data;

        }


        // ==================================================
        // CARGAR BUSES
        // ==================================================

        async function cargarBuses() {


            try {


                const data =
                    await api(
                        "/api/asientos/buses"
                    );


                selectBus.innerHTML =
                    `
                        <option value="">
                            Seleccionar bus...
                        </option>
                    `;


                data.buses.forEach(
                    bus => {


                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            bus.IdBus;


                        option.textContent =
                            `${bus.NumeroBus} | ${bus.Placa} | ${bus.Capacidad} asientos`;


                        selectBus.appendChild(
                            option
                        );


                    }
                );


            } catch (error) {


                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: error.message
                });


            }

        }


        // ==================================================
        // VIAJES DEL BUS
        // ==================================================

        async function cargarViajesBus(
            idBus
        ) {


            try {


                selectViaje.disabled =
                    true;


                selectViaje.innerHTML =
                    `
                        <option value="">
                            Cargando viajes...
                        </option>
                    `;


                const data =
                    await api(
                        `/api/asientos/buses/${idBus}/viajes`
                    );


                selectViaje.innerHTML =
                    `
                        <option value="GENERAL">
                            ⚙ Configuración general del bus
                        </option>
                    `;


                data.viajes.forEach(
                    viaje => {


                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            viaje.IdViaje;


                        const fecha =
                            formatearFechaHora(
                                viaje.FechaHoraSalida
                            );


                        option.textContent =
                            `${viaje.CiudadOrigen} → ${viaje.CiudadDestino} | ${fecha} | ${viaje.Estado}`;


                        selectViaje.appendChild(
                            option
                        );


                    }
                );


                selectViaje.value =
                    "GENERAL";


                selectViaje.disabled =
                    false;


            } catch (error) {


                selectViaje.innerHTML =
                    `
                        <option value="">
                            Error cargando viajes
                        </option>
                    `;


                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: error.message
                });


            }

        }


        // ==================================================
        // CARGAR ASIENTOS
        // ==================================================

        async function cargarAsientos(
            idBus,
            idViaje
        ) {


            try {


                let url =
                    `/api/asientos?idBus=${idBus}`;


                if (
                    idViaje
                ) {

                    url +=
                        `&idViaje=${idViaje}`;

                }


                const data =
                    await api(
                        url
                    );


                modoActual =
                    data.modo;


                tituloBus.textContent =
                    `${data.bus.NumeroBus} · ${data.bus.Placa}`;


                tituloBusInterno.textContent =
                    `${data.bus.NumeroBus} · ${data.bus.Placa}`;


                if (
                    data.modo ===
                    "VIAJE"
                ) {


                    subtitulo.textContent =
                        `${data.viaje.CiudadOrigen} → ${data.viaje.CiudadDestino} · ${formatearFechaHora(data.viaje.FechaHoraSalida)}`;


                    contadorOcupacion.classList.remove(
                        "d-none"
                    );


                } else {


                    subtitulo.textContent =
                        "Configuración general del bus · Pulsa un asiento para editarlo";


                    contadorOcupacion.classList.add(
                        "d-none"
                    );


                }


                renderizarAsientos(
                    data.asientos,
                    idBus
                );


                mensajeAsientos.classList.add(
                    "d-none"
                );


                contenedorBus.classList.remove(
                    "d-none"
                );


            } catch (error) {


                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: error.message
                });


            }

        }


        // ==================================================
        // RENDER
        // ==================================================

        function renderizarAsientos(
            asientos,
            idBus
        ) {


            contenedor.innerHTML =
                "";


            let disponibles =
                0;


            let reservados =
                0;


            let vendidos =
                0;


            asientos.forEach(
                asiento => {


                    const boton =
                        document.createElement(
                            "button"
                        );


                    boton.type =
                        "button";


                    boton.className =
                        "admin-seat";


                    // ==========================================
                    // TIPO DE ASIENTO
                    // ==========================================

                    if (
                        asiento.TipoAsiento ===
                        "VIP"
                    ) {

                        boton.classList.add(
                            "vip"
                        );

                    }


                    if (
                        asiento.TipoAsiento ===
                        "PREFERENCIAL"
                    ) {

                        boton.classList.add(
                            "preferencial"
                        );

                    }


                    // ==========================================
                    // INACTIVO
                    // ==========================================

                    if (
                        !asiento.Estado
                    ) {

                        boton.classList.add(
                            "inactive"
                        );

                    }


                    // ==========================================
                    // OCUPADO
                    // ==========================================

                    const ocupado =
                        Boolean(
                            asiento.Ocupado
                        );


                    const pagado =
                        Boolean(
                            asiento.Pagado
                        );


                    if (
                        modoActual === "VIAJE" &&
                        ocupado
                    ) {


                        boton.disabled =
                            true;


                        if (
                            pagado ||
                            asiento.EstadoReserva ===
                            "PAGADA"
                        ) {


                            boton.classList.add(
                                "sold"
                            );


                            vendidos++;


                        } else {


                            boton.classList.add(
                                "reserved"
                            );


                            reservados++;


                        }


                    } else if (
                        modoActual === "VIAJE" &&
                        asiento.Estado
                    ) {


                        disponibles++;


                    }


                    // ==========================================
                    // TEXTO
                    // ==========================================

                    let textoEstado =
                        asiento.TipoAsiento;


                    if (
                        modoActual === "VIAJE" &&
                        ocupado
                    ) {


                        textoEstado =
                            pagado ||
                            asiento.EstadoReserva ===
                            "PAGADA"

                                ? "VENDIDO"

                                : "RESERVADO";


                    } else if (
                        !asiento.Estado
                    ) {


                        textoEstado =
                            "INACTIVO";


                    }


                    boton.innerHTML =
                        `
                            <div class="seat-number">
                                ${String(asiento.NumeroAsiento).padStart(2, "0")}
                            </div>

                            <small>
                                ${textoEstado}
                            </small>

                            ${
                                ocupado

                                    ? `
                                        <span class="seat-lock">
                                            <i class="bi bi-lock-fill"></i>
                                        </span>
                                      `

                                    : ""
                            }
                        `;


                    // ==========================================
                    // TOOLTIP OCUPADO
                    // ==========================================

                    if (
                        modoActual === "VIAJE" &&
                        ocupado
                    ) {


                        boton.title =
                            asiento.Pasajero

                                ? `${textoEstado} · ${asiento.Pasajero} · ${asiento.CodigoReserva || ""}`

                                : textoEstado;


                    }


                    // ==========================================
                    // SOLO EDITAR EN CONFIGURACIÓN GENERAL
                    // ==========================================

                    if (
                        modoActual ===
                        "CONFIGURACION"
                    ) {


                        boton.addEventListener(
                            "click",
                            () => {


                                editarAsiento(
                                    asiento,
                                    idBus
                                );


                            }
                        );


                    } else {


                        boton.classList.add(
                            "readonly"
                        );


                        boton.addEventListener(
                            "click",
                            () => {


                                if (
                                    ocupado
                                ) {

                                    mostrarDetalleReserva(
                                        asiento
                                    );


                                }


                            }
                        );


                    }


                    contenedor.appendChild(
                        boton
                    );


                }
            );


            cantidadDisponibles.textContent =
                disponibles;


            cantidadReservados.textContent =
                reservados;


            cantidadVendidos.textContent =
                vendidos;

        }


        // ==================================================
        // DETALLE OCUPACIÓN
        // ==================================================

        async function mostrarDetalleReserva(
            asiento
        ) {


            await Swal.fire({


                icon:
                    asiento.Pagado
                        ? "success"
                        : "info",


                title:
                    `Asiento ${String(asiento.NumeroAsiento).padStart(2, "0")}`,


                html:
                    `
                        <div class="seat-reservation-detail">

                            <div>
                                <span>
                                    Estado
                                </span>

                                <strong>
                                    ${
                                        asiento.Pagado
                                            ? "VENDIDO / PAGADO"
                                            : "RESERVADO"
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Reserva
                                </span>

                                <strong>
                                    ${escapeHTML(asiento.CodigoReserva || "-")}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Pasajero
                                </span>

                                <strong>
                                    ${escapeHTML(asiento.Pasajero || "-")}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Cédula
                                </span>

                                <strong>
                                    ${escapeHTML(asiento.CedulaPasajero || "-")}
                                </strong>
                            </div>

                        </div>
                    `,


                confirmButtonText:
                    "Cerrar"


            });

        }


        // ==================================================
        // EDITAR ASIENTO
        // ==================================================

        async function editarAsiento(
            asiento,
            idBus
        ) {


            // DOBLE PROTECCIÓN
            if (
                asiento.Ocupado
            ) {

                await Swal.fire({
                    icon: "info",
                    title: "Asiento reservado",
                    text: "Este asiento pertenece a una reserva y no puede modificarse."
                });


                return;

            }


            const resultado =
                await Swal.fire({


                    title:
                        `Asiento ${asiento.NumeroAsiento}`,


                    html:
                        `
                            <div class="seat-edit-form">

                                <label>
                                    Tipo de asiento
                                </label>

                                <select
                                    id="swalTipoAsiento"
                                    class="swal2-input"
                                >

                                    <option value="NORMAL">
                                        Normal
                                    </option>

                                    <option value="VIP">
                                        VIP
                                    </option>

                                    <option value="PREFERENCIAL">
                                        Preferencial
                                    </option>

                                </select>


                                <label>
                                    Estado
                                </label>


                                <select
                                    id="swalEstadoAsiento"
                                    class="swal2-input"
                                >

                                    <option value="1">
                                        Activo
                                    </option>

                                    <option value="0">
                                        Inactivo
                                    </option>

                                </select>

                            </div>
                        `,


                    didOpen:
                        () => {


                            document.getElementById(
                                "swalTipoAsiento"
                            ).value =
                                asiento.TipoAsiento;


                            document.getElementById(
                                "swalEstadoAsiento"
                            ).value =
                                asiento.Estado
                                    ? "1"
                                    : "0";


                        },


                    showCancelButton:
                        true,


                    confirmButtonText:
                        "Guardar",


                    cancelButtonText:
                        "Cancelar",


                    preConfirm:
                        () => {


                            return {

                                tipoAsiento:
                                    document.getElementById(
                                        "swalTipoAsiento"
                                    ).value,


                                estado:
                                    Number(
                                        document.getElementById(
                                            "swalEstadoAsiento"
                                        ).value
                                    )

                            };


                        }


                });


            if (
                !resultado.isConfirmed
            ) {

                return;

            }


            try {


                await api(
                    `/api/asientos/${asiento.IdAsiento}`,
                    {

                        method:
                            "PUT",


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


                await cargarAsientos(
                    idBus,
                    null
                );


                Swal.fire({

                    icon:
                        "success",

                    title:
                        "Asiento actualizado",

                    timer:
                        1200,

                    showConfirmButton:
                        false

                });


            } catch (error) {


                Swal.fire({

                    icon:
                        "error",

                    title:
                        "No se pudo actualizar",

                    text:
                        error.message

                });


            }

        }


        // ==================================================
        // LIMPIAR
        // ==================================================

        function limpiarVista() {


            selectViaje.disabled =
                true;


            selectViaje.innerHTML =
                `
                    <option value="">
                        Primero selecciona un bus
                    </option>
                `;


            contenedor.innerHTML =
                "";


            contenedorBus.classList.add(
                "d-none"
            );


            mensajeAsientos.classList.remove(
                "d-none"
            );


        }


        // ==================================================
        // FORMATO
        // ==================================================

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


        // ==================================================
        // ESCAPE HTML
        // ==================================================

        function escapeHTML(
            valor
        ) {


            return String(
                valor ?? ""
            )

                .replaceAll(
                    "&",
                    "&amp;"
                )

                .replaceAll(
                    "<",
                    "&lt;"
                )

                .replaceAll(
                    ">",
                    "&gt;"
                )

                .replaceAll(
                    '"',
                    "&quot;"
                )

                .replaceAll(
                    "'",
                    "&#039;"
                );

        }


    }
);