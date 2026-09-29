document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "formRegistro"
            );


        const alerta =
            document.getElementById(
                "alertaRegistro"
            );


        const boton =
            document.getElementById(
                "btnRegistro"
            );


        form.addEventListener(
            "submit",
            async event => {

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

                    cedula:
                        document.getElementById(
                            "cedula"
                        ).value.trim(),

                    telefono:
                        document.getElementById(
                            "telefono"
                        ).value.trim(),

                    fechaNacimiento:
                        document.getElementById(
                            "fechaNacimiento"
                        ).value || null,

                    correo:
                        document.getElementById(
                            "correo"
                        ).value.trim(),

                    password

                };


                boton.disabled =
                    true;

                boton.textContent =
                    "Creando cuenta...";


                try {

                    const response =
                        await fetch(
                            "/api/auth/registro",
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


                    const resultado =
                        await response.json();


                    if (!response.ok) {

                        mostrarAlerta(
                            resultado.mensaje ||
                            "No se pudo crear la cuenta.",
                            "error"
                        );

                        return;

                    }


                    mostrarAlerta(
                        resultado.mensaje,
                        "success"
                    );


                    form.reset();


                    setTimeout(
                        () => {

                            window.location.href =
                                "/login.html";

                        },
                        1400
                    );


                } catch (error) {

                    console.error(error);


                    mostrarAlerta(
                        "No fue posible conectar con el servidor.",
                        "error"
                    );

                } finally {

                    boton.disabled =
                        false;

                    boton.textContent =
                        "Crear mi cuenta";

                }

            }
        );


        function mostrarAlerta(
            mensaje,
            tipo
        ) {

            alerta.textContent =
                mensaje;

            alerta.className =
                `register-alert ${tipo}`;

        }


        function ocultarAlerta() {

            alerta.className =
                "register-alert hidden";

            alerta.textContent =
                "";

        }

    }
);
