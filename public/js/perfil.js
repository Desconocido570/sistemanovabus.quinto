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


        const form =
            document.getElementById(
                "formPerfil"
            );


        form.addEventListener(
            "submit",
            guardarPerfil
        );


        cargarPerfil();


        async function cargarPerfil() {

            try {

                const {
                    response,
                    data
                } =
                    await ClienteAPI.request(
                        "/api/cliente/perfil"
                    );


                if (!response.ok) {

                    throw new Error(
                        data.mensaje
                    );

                }


                const usuario =
                    data.usuario;


                document.getElementById(
                    "cedula"
                ).value =
                    usuario.Cedula ||
                    "";


                document.getElementById(
                    "nombres"
                ).value =
                    usuario.Nombres ||
                    "";


                document.getElementById(
                    "apellidos"
                ).value =
                    usuario.Apellidos ||
                    "";


                document.getElementById(
                    "correo"
                ).value =
                    usuario.Correo ||
                    "";


                document.getElementById(
                    "telefono"
                ).value =
                    usuario.Telefono ||
                    "";


                document.getElementById(
                    "fechaNacimiento"
                ).value =
                    fechaInput(
                        usuario.FechaNacimiento
                    );


                actualizarResumen(
                    usuario
                );


            } catch (error) {

                mostrarAlerta(
                    error.message,
                    "error"
                );

            }

        }


        async function guardarPerfil(
            event
        ) {

            event.preventDefault();


            ocultarAlerta();


            const password =
                document.getElementById(
                    "password"
                ).value;


            const confirmarPassword =
                document.getElementById(
                    "confirmarPassword"
                ).value;


            if (
                password &&
                password !==
                confirmarPassword
            ) {

                mostrarAlerta(
                    "Las contraseñas no coinciden.",
                    "error"
                );

                return;

            }


            const datos = {

                nombres:
                    document.getElementById(
                        "nombres"
                    ).value.trim(),

                apellidos:
                    document.getElementById(
                        "apellidos"
                    ).value.trim(),

                correo:
                    document.getElementById(
                        "correo"
                    ).value.trim(),

                telefono:
                    document.getElementById(
                        "telefono"
                    ).value.trim(),

                fechaNacimiento:
                    document.getElementById(
                        "fechaNacimiento"
                    ).value || null,

                password:
                    password || null

            };


            const boton =
                document.getElementById(
                    "btnGuardarPerfil"
                );


            boton.disabled =
                true;


            try {

                const {
                    response,
                    data
                } =
                    await ClienteAPI.request(
                        "/api/cliente/perfil",
                        {

                            method:
                                "PUT",

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


                const usuarioLocal =
                    ClienteAPI.usuario;


                usuarioLocal.nombres =
                    datos.nombres;

                usuarioLocal.apellidos =
                    datos.apellidos;

                usuarioLocal.correo =
                    datos.correo;


                localStorage.setItem(
                    "usuario",
                    JSON.stringify(
                        usuarioLocal
                    )
                );


                document.getElementById(
                    "password"
                ).value =
                    "";


                document.getElementById(
                    "confirmarPassword"
                ).value =
                    "";


                mostrarAlerta(
                    data.mensaje,
                    "success"
                );


                await cargarPerfil();


            } catch (error) {

                mostrarAlerta(
                    error.message,
                    "error"
                );

            } finally {

                boton.disabled =
                    false;

            }

        }


        function actualizarResumen(
            usuario
        ) {

            const nombre =
                `${usuario.Nombres} ${usuario.Apellidos}`;


            document.getElementById(
                "nombrePerfil"
            ).textContent =
                nombre;


            document.getElementById(
                "correoPerfil"
            ).textContent =
                usuario.Correo;


            document.getElementById(
                "avatarPerfil"
            ).textContent =
                `${usuario.Nombres?.[0] || ""}${usuario.Apellidos?.[0] || ""}`
                    .toUpperCase();

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


        function mostrarAlerta(
            mensaje,
            tipo
        ) {

            const alerta =
                document.getElementById(
                    "alertaPerfil"
                );


            alerta.textContent =
                mensaje;


            alerta.className =
                tipo === "success"
                    ? "alert-client alert-success"
                    : "alert-client alert-error";

        }


        function ocultarAlerta() {

            const alerta =
                document.getElementById(
                    "alertaPerfil"
                );


            alerta.className =
                "alert-client hidden";

            alerta.textContent =
                "";

        }

    }
);
