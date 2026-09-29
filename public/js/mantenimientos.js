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


        const modal =
            bootstrap.Modal.getOrCreateInstance(
                document.getElementById(
                    "modalMantenimiento"
                )
            );


        let mantenimientos =
            [];


        let buses =
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

                localStorage.clear();

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
            "buscarMantenimiento"
        ).addEventListener(
            "input",
            aplicarFiltros
        );


        document.getElementById(
            "filtroEstadoMantenimiento"
        ).addEventListener(
            "change",
            aplicarFiltros
        );


        document.getElementById(
            "btnNuevoMantenimiento"
        ).addEventListener(
            "click",
            nuevoMantenimiento
        );


        document.getElementById(
            "formMantenimiento"
        ).addEventListener(
            "submit",
            guardarMantenimiento
        );


        cargarMantenimientos();


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


        async function cargarMantenimientos() {

            try {

                const {
                    response,
                    data
                } =
                    await api(
                        "/api/mantenimientos"
                    );


                if (!response.ok) {

                    throw new Error(
                        data.mensaje
                    );

                }


                mantenimientos =
                    data.mantenimientos;


                actualizarStats();

                aplicarFiltros();


            } catch (error) {

                document.getElementById(
                    "tablaMantenimientos"
                ).innerHTML = `

                    <tr>
                        <td colspan="7">
                            <div class="tabla-mantenimientos-vacia text-danger">
                                ${escapeHTML(error.message)}
                            </div>
                        </td>
                    </tr>

                `;

            }

        }


        function actualizarStats() {

            document.getElementById(
                "statTotal"
            ).textContent =
                mantenimientos.length;


            document.getElementById(
                "statPendientes"
            ).textContent =
                mantenimientos.filter(
                    item =>
                        item.Estado ===
                        "PENDIENTE"
                ).length;


            document.getElementById(
                "statProceso"
            ).textContent =
                mantenimientos.filter(
                    item =>
                        item.Estado ===
                        "EN_PROCESO"
                ).length;


            const costo =
                mantenimientos.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Number(
                            item.Costo ||
                            0
                        ),
                    0
                );


            document.getElementById(
                "statCosto"
            ).textContent =
                formatearDinero(
                    costo
                );

        }


        function renderTabla(
            lista
        ) {

            const tbody =
                document.getElementById(
                    "tablaMantenimientos"
                );


            if (
                lista.length === 0
            ) {

                tbody.innerHTML = `

                    <tr>
                        <td colspan="7">
                            <div class="tabla-mantenimientos-vacia">
                                No hay mantenimientos registrados.
                            </div>
                        </td>
                    </tr>

                `;

                return;

            }


            tbody.innerHTML =
                lista
                    .map(
                        item => `

                            <tr>

                                <td>

                                    <strong>
                                        ${escapeHTML(item.NumeroBus)}
                                    </strong>

                                    <br>

                                    <small class="text-muted">
                                        ${escapeHTML(item.Placa)}
                                    </small>

                                </td>

                                <td>
                                    ${escapeHTML(item.TipoMantenimiento)}
                                </td>

                                <td>
                                    ${formatearFecha(item.FechaInicio)}
                                </td>

                                <td>
                                    ${formatearFecha(item.FechaFin)}
                                </td>

                                <td>

                                    <strong>
                                        ${item.Costo !== null
                                            ? formatearDinero(item.Costo)
                                            : "-"
                                        }
                                    </strong>

                                </td>

                                <td>
                                    ${badgeEstado(item.Estado)}
                                </td>

                                <td class="text-end">

                                    <button
                                        class="btn-accion-mantenimiento"
                                        title="Editar"
                                        onclick="editarMantenimiento(
                                            ${item.IdMantenimiento}
                                        )"
                                    >
                                        <i class="bi bi-pencil"></i>
                                    </button>

                                    <button
                                        class="btn-accion-mantenimiento eliminar"
                                        title="Eliminar"
                                        onclick="eliminarMantenimiento(
                                            ${item.IdMantenimiento}
                                        )"
                                    >
                                        <i class="bi bi-trash"></i>
                                    </button>

                                </td>

                            </tr>

                        `
                    )
                    .join("");

        }


        async function cargarBuses() {

            const {
                response,
                data
            } =
                await api(
                    "/api/mantenimientos/buses"
                );


            if (!response.ok) {

                throw new Error(
                    data.mensaje
                );

            }


            buses =
                data.buses;


            const select =
                document.getElementById(
                    "idBus"
                );


            select.innerHTML = `

                <option value="">
                    Seleccionar bus...
                </option>

            `;


            buses.forEach(
                bus => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        bus.IdBus;


                    option.textContent =
                        `${bus.NumeroBus} | ${bus.Placa} | ${bus.Marca} ${bus.Modelo}`;


                    select.appendChild(
                        option
                    );

                }
            );

        }


        async function nuevoMantenimiento() {

            limpiarFormulario();


            document.getElementById(
                "tituloModalMantenimiento"
            ).textContent =
                "Nuevo mantenimiento";


            document.getElementById(
                "fechaInicio"
            ).value =
                new Date()
                    .toISOString()
                    .split("T")[0];


            try {

                await cargarBuses();

            } catch (error) {

                mostrarAlerta(
                    error.message
                );

            }

        }


        async function guardarMantenimiento(
            event
        ) {

            event.preventDefault();


            ocultarAlerta();


            const id =
                document.getElementById(
                    "idMantenimiento"
                ).value;


            const datos = {

                idBus:
                    parseInt(
                        document.getElementById(
                            "idBus"
                        ).value
                    ),

                tipoMantenimiento:
                    document.getElementById(
                        "tipoMantenimiento"
                    ).value,

                descripcion:
                    document.getElementById(
                        "descripcion"
                    ).value.trim(),

                fechaInicio:
                    document.getElementById(
                        "fechaInicio"
                    ).value,

                fechaFin:
                    document.getElementById(
                        "fechaFin"
                    ).value || null,

                costo:
                    document.getElementById(
                        "costo"
                    ).value || null,

                estado:
                    document.getElementById(
                        "estadoMantenimiento"
                    ).value

            };


            try {

                const {
                    response,
                    data
                } =
                    await api(
                        id
                            ? `/api/mantenimientos/${id}`
                            : "/api/mantenimientos",
                        {

                            method:
                                id
                                    ? "PUT"
                                    : "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    datos
                                )

                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        data.mensaje
                    );

                }


                modal.hide();


                await Swal.fire({

                    icon:
                        "success",

                    title:
                        "Correcto",

                    text:
                        data.mensaje,

                    timer:
                        1400,

                    showConfirmButton:
                        false

                });


                cargarMantenimientos();


            } catch (error) {

                mostrarAlerta(
                    error.message
                );

            }

        }


        window.editarMantenimiento =
            async function(
                id
            ) {

                try {

                    await cargarBuses();


                    const {
                        response,
                        data
                    } =
                        await api(
                            `/api/mantenimientos/${id}`
                        );


                    if (!response.ok) {

                        throw new Error(
                            data.mensaje
                        );

                    }


                    const m =
                        data.mantenimiento;


                    document.getElementById(
                        "idMantenimiento"
                    ).value =
                        m.IdMantenimiento;


                    document.getElementById(
                        "idBus"
                    ).value =
                        m.IdBus;


                    document.getElementById(
                        "tipoMantenimiento"
                    ).value =
                        m.TipoMantenimiento;


                    document.getElementById(
                        "descripcion"
                    ).value =
                        m.Descripcion ||
                        "";


                    document.getElementById(
                        "fechaInicio"
                    ).value =
                        fechaInput(
                            m.FechaInicio
                        );


                    document.getElementById(
                        "fechaFin"
                    ).value =
                        fechaInput(
                            m.FechaFin
                        );


                    document.getElementById(
                        "costo"
                    ).value =
                        m.Costo ?? "";


                    document.getElementById(
                        "estadoMantenimiento"
                    ).value =
                        m.Estado;


                    document.getElementById(
                        "tituloModalMantenimiento"
                    ).textContent =
                        "Editar mantenimiento";


                    ocultarAlerta();

                    modal.show();


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


        window.eliminarMantenimiento =
            async function(
                id
            ) {

                const confirmacion =
                    await Swal.fire({

                        icon:
                            "warning",

                        title:
                            "¿Eliminar mantenimiento?",

                        text:
                            "Esta acción no se puede deshacer.",

                        showCancelButton:
                            true,

                        confirmButtonText:
                            "Sí, eliminar",

                        cancelButtonText:
                            "Cancelar",

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
                        await api(
                            `/api/mantenimientos/${id}`,
                            {
                                method:
                                    "DELETE"
                            }
                        );


                    if (!response.ok) {

                        throw new Error(
                            data.mensaje
                        );

                    }


                    await Swal.fire({

                        icon:
                            "success",

                        title:
                            "Eliminado",

                        timer:
                            1200,

                        showConfirmButton:
                            false

                    });


                    cargarMantenimientos();


                } catch (error) {

                    Swal.fire({

                        icon:
                            "error",

                        title:
                            "No se pudo eliminar",

                        text:
                            error.message

                    });

                }

            };


        function aplicarFiltros() {

            const texto =
                document.getElementById(
                    "buscarMantenimiento"
                ).value
                    .toLowerCase()
                    .trim();


            const estado =
                document.getElementById(
                    "filtroEstadoMantenimiento"
                ).value;


            const filtrados =
                mantenimientos.filter(
                    item => {

                        const info =
                            `
                            ${item.NumeroBus}
                            ${item.Placa}
                            ${item.Marca}
                            ${item.Modelo}
                            ${item.TipoMantenimiento}
                            ${item.Descripcion || ""}
                            `
                                .toLowerCase();


                        return (
                            info.includes(
                                texto
                            ) &&
                            (
                                !estado ||
                                item.Estado ===
                                estado
                            )
                        );

                    }
                );


            renderTabla(
                filtrados
            );

        }


        function limpiarFormulario() {

            document.getElementById(
                "formMantenimiento"
            ).reset();


            document.getElementById(
                "idMantenimiento"
            ).value =
                "";


            document.getElementById(
                "estadoMantenimiento"
            ).value =
                "PENDIENTE";


            ocultarAlerta();

        }


        function mostrarAlerta(
            mensaje
        ) {

            const alerta =
                document.getElementById(
                    "alertaMantenimiento"
                );


            alerta.className =
                "alert alert-danger";


            alerta.textContent =
                mensaje;

        }


        function ocultarAlerta() {

            const alerta =
                document.getElementById(
                    "alertaMantenimiento"
                );


            alerta.className =
                "alert d-none";


            alerta.textContent =
                "";

        }


        function badgeEstado(
            estado
        ) {

            if (
                estado === "PENDIENTE"
            ) {

                return `<span class="badge-mantenimiento estado-pendiente">PENDIENTE</span>`;

            }


            if (
                estado === "EN_PROCESO"
            ) {

                return `<span class="badge-mantenimiento estado-proceso">EN PROCESO</span>`;

            }


            if (
                estado === "FINALIZADO"
            ) {

                return `<span class="badge-mantenimiento estado-finalizado">FINALIZADO</span>`;

            }


            return `<span class="badge-mantenimiento estado-cancelado">CANCELADO</span>`;

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


        function formatearFecha(
            valor
        ) {

            if (!valor) {
                return "-";
            }


            return new Date(
                valor
            ).toLocaleDateString(
                "es-EC"
            );

        }


        function fechaInput(
            valor
        ) {

            if (!valor) {
                return "";
            }


            return new Date(
                valor
            )
                .toISOString()
                .split("T")[0];

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
