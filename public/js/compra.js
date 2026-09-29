document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            !ClienteAPI.requireCliente()
        ) {
            return;
        }


        document.getElementById(
            "btnCerrarSesion"
        ).addEventListener(
            "click",
            ClienteAPI.logout
        );


        const params =
            new URLSearchParams(
                window.location.search
            );


        const idViaje =
            parseInt(
                params.get("idViaje")
            );


        if (
            !idViaje
        ) {

            window.location.href =
                "/cliente/inicio.html";

            return;

        }


        let viaje =
            null;


        let seleccionados =
            [];


        document
            .querySelectorAll(
                'input[name="tipoOperacion"]'
            )
            .forEach(
                radio => {

                    radio.addEventListener(
                        "change",
                        actualizarOperacion
                    );

                }
            );


        document.getElementById(
            "btnProcesar"
        ).addEventListener(
            "click",
            procesar
        );


        cargarViaje();


        async function cargarViaje() {

            try {

                const {
                    response,
                    data
                } =
                    await ClienteAPI.request(
                        `/api/cliente/viajes/${idViaje}`
                    );


                if (!response.ok) {

                    throw new Error(
                        data.mensaje
                    );

                }


                viaje =
                    data.viaje;


                mostrarResumenViaje();

                renderAsientos(
                    data.asientos
                );

                actualizarResumen();


            } catch (error) {

                mostrarAlerta(
                    error.message
                );

            }

        }


        function mostrarResumenViaje() {

            document.getElementById(
                "tituloRuta"
            ).textContent =
                `${viaje.CiudadOrigen} → ${viaje.CiudadDestino}`;


            document.getElementById(
                "resumenSalida"
            ).textContent =
                formatearFechaHora(
                    viaje.FechaHoraSalida
                );


            document.getElementById(
                "resumenLlegada"
            ).textContent =
                formatearFechaHora(
                    viaje.FechaHoraLlegada
                );


            document.getElementById(
                "resumenBus"
            ).textContent =
                `${viaje.NumeroBus} · ${viaje.Placa}`;


            document.getElementById(
                "resumenPrecio"
            ).textContent =
                formatearDinero(
                    viaje.Precio
                );

        }


        function renderAsientos(
            asientos
        ) {

            const contenedor =
                document.getElementById(
                    "listaAsientos"
                );


            contenedor.innerHTML =
                "";


            asientos.forEach(
                asiento => {

                    const boton =
                        document.createElement(
                            "button"
                        );


                    boton.type =
                        "button";


                    boton.className =
                        "seat-client";


                    boton.textContent =
                        String(
                            asiento.NumeroAsiento
                        ).padStart(
                            2,
                            "0"
                        );


                    if (
                        asiento.Ocupado
                    ) {

                        boton.disabled =
                            true;

                        boton.classList.add(
                            "occupied"
                        );

                    } else {

                        boton.addEventListener(
                            "click",
                            () => {

                                toggleAsiento(
                                    boton,
                                    asiento
                                );

                            }
                        );

                    }


                    contenedor.appendChild(
                        boton
                    );

                }
            );

        }


        function toggleAsiento(
            boton,
            asiento
        ) {

            const indice =
                seleccionados.findIndex(
                    item =>
                        item.idAsiento ===
                        asiento.IdAsiento
                );


            if (
                indice >= 0
            ) {

                seleccionados.splice(
                    indice,
                    1
                );

                boton.classList.remove(
                    "selected"
                );

            } else {

                seleccionados.push({

                    idAsiento:
                        asiento.IdAsiento,

                    numero:
                        asiento.NumeroAsiento

                });


                boton.classList.add(
                    "selected"
                );

            }


            actualizarResumen();

        }


        function actualizarOperacion() {

            const tipo =
                document.querySelector(
                    'input[name="tipoOperacion"]:checked'
                ).value;


            const pago =
                document.getElementById(
                    "contenedorPago"
                );


            const boton =
                document.getElementById(
                    "btnProcesar"
                );


            if (
                tipo === "COMPRAR"
            ) {

                pago.classList.remove(
                    "hidden"
                );

                boton.textContent =
                    "Confirmar compra";

            } else {

                pago.classList.add(
                    "hidden"
                );

                boton.textContent =
                    "Confirmar reserva";

            }

        }


        function actualizarResumen() {

            document.getElementById(
                "resumenAsientos"
            ).textContent =
                seleccionados.length
                    ? seleccionados
                        .map(
                            item =>
                                item.numero
                        )
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                a - b
                        )
                        .join(", ")
                    : "-";


            document.getElementById(
                "resumenCantidad"
            ).textContent =
                seleccionados.length;


            const total =
                viaje
                    ? Number(
                        viaje.Precio
                    ) *
                    seleccionados.length
                    : 0;


            document.getElementById(
                "resumenTotal"
            ).textContent =
                formatearDinero(
                    total
                );

        }


        async function procesar() {

            ocultarAlerta();


            if (
                seleccionados.length === 0
            ) {

                mostrarAlerta(
                    "Selecciona al menos un asiento."
                );

                return;

            }


            const tipoOperacion =
                document.querySelector(
                    'input[name="tipoOperacion"]:checked'
                ).value;


            const datos = {

                idViaje,

                asientos:
                    seleccionados.map(
                        item =>
                            item.idAsiento
                    ),

                tipoOperacion,

                metodoPago:
                    tipoOperacion === "COMPRAR"
                        ? document.getElementById(
                            "metodoPago"
                        ).value
                        : null,

                referenciaPago:
                    tipoOperacion === "COMPRAR"
                        ? document.getElementById(
                            "referenciaPago"
                        ).value.trim()
                        : null

            };


            const boton =
                document.getElementById(
                    "btnProcesar"
                );


            boton.disabled =
                true;


            try {

                const {
                    response,
                    data
                } =
                    await ClienteAPI.request(
                        "/api/cliente/comprar",
                        {
                            method:
                                "POST",

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


                if (
                    data.boleto
                ) {

                    const resultado =
                        await Swal.fire({

                            icon:
                                "success",

                            title:
                                "¡Compra completada!",

                            html: `

                                <p>
                                    Tu boleto ya está listo.
                                </p>

                                <strong>
                                    ${data.boleto.CodigoBoleto}
                                </strong>

                                <br><br>

                                Total:

                                <strong>
                                    ${formatearDinero(
                                        data.reserva.total
                                    )}
                                </strong>

                            `,

                            showCancelButton:
                                true,

                            confirmButtonText:
                                "Descargar PDF",

                            cancelButtonText:
                                "Ver mis boletos"

                        });


                    if (
                        resultado.isConfirmed
                    ) {

                        await ClienteAPI.downloadPDF(
                            `/api/boletos/${data.boleto.IdBoleto}/pdf`,
                            `${data.boleto.CodigoBoleto}.pdf`
                        );

                    }


                    window.location.href =
                        "/cliente/mis-boletos.html";

                } else {

                    await Swal.fire({

                        icon:
                            "success",

                        title:
                            "Reserva creada",

                        text:
                            "Tus asientos quedaron reservados. Puedes pagar desde Mis boletos.",

                        confirmButtonText:
                            "Ver mis reservas"

                    });


                    window.location.href =
                        "/cliente/mis-boletos.html";

                }


            } catch (error) {

                mostrarAlerta(
                    error.message
                );


                if (
                    error.message
                        .toLowerCase()
                        .includes(
                            "asiento"
                        )
                ) {

                    seleccionados =
                        [];

                    await cargarViaje();

                }

            } finally {

                boton.disabled =
                    false;

            }

        }


        function mostrarAlerta(
            mensaje
        ) {

            const alerta =
                document.getElementById(
                    "alertaCompra"
                );


            alerta.textContent =
                mensaje;

            alerta.className =
                "alert-client alert-error";

        }


        function ocultarAlerta() {

            const alerta =
                document.getElementById(
                    "alertaCompra"
                );


            alerta.className =
                "alert-client alert-error hidden";

            alerta.textContent =
                "";

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
                    year:
                        "numeric",
                    hour:
                        "2-digit",
                    minute:
                        "2-digit"
                }
            );

        }

    }
);
