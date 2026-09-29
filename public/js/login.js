document.addEventListener("DOMContentLoaded", () => {

    const formLogin = document.getElementById("formLogin");
    const correo = document.getElementById("correo");
    const password = document.getElementById("password");
    const alerta = document.getElementById("alerta");
    const btnLogin = document.getElementById("btnLogin");
    const btnTexto = document.getElementById("btnTexto");
    const btnCargando = document.getElementById("btnCargando");
    const btnMostrarPassword = document.getElementById("btnMostrarPassword");
    const iconPassword = document.getElementById("iconPassword");

    if (!formLogin) {
        return;
    }

    btnMostrarPassword?.addEventListener("click", () => {

        const mostrar =
            password.type === "password";

        password.type =
            mostrar
                ? "text"
                : "password";

        iconPassword?.classList.toggle(
            "bi-eye",
            !mostrar
        );

        iconPassword?.classList.toggle(
            "bi-eye-slash",
            mostrar
        );

    });


    formLogin.addEventListener("submit", async (event) => {

        event.preventDefault();

        ocultarAlerta();

        const datos = {
            correo:
                correo.value.trim(),

            password:
                password.value
        };

        if (
            !datos.correo ||
            !datos.password
        ) {

            mostrarAlerta(
                "Completa todos los campos.",
                "danger"
            );

            return;

        }

        activarCarga();

        try {

            const response =
                await fetch(
                    "/api/auth/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials:
                            "include",

                        body:
                            JSON.stringify(
                                datos
                            )
                    }
                );

            const resultado =
                await response.json();

            if (
                !response.ok ||
                !resultado.ok
            ) {

                throw new Error(
                    resultado.mensaje ||
                    "No se pudo iniciar sesión"
                );

            }

            localStorage.setItem(
                "token",
                resultado.token
            );

            localStorage.setItem(
                "usuario",
                JSON.stringify(
                    resultado.usuario
                )
            );

            window.location.href =
                resultado.usuario.rol === "ADMIN"
                    ? "/admin/dashboard.html"
                    : "/cliente/inicio.html";

        } catch (error) {

            mostrarAlerta(
                error.message,
                "danger"
            );

        } finally {

            desactivarCarga();

        }

    });


    function mostrarAlerta(
        mensaje,
        tipo
    ) {

        alerta.textContent =
            mensaje;

        alerta.className =
            `alert alert-${tipo}`;

    }


    function ocultarAlerta() {

        alerta.textContent =
            "";

        alerta.className =
            "alert d-none";

    }


    function activarCarga() {

        btnLogin.disabled =
            true;

        btnTexto?.classList.add(
            "d-none"
        );

        btnCargando?.classList.remove(
            "d-none"
        );

    }


    function desactivarCarga() {

        btnLogin.disabled =
            false;

        btnTexto?.classList.remove(
            "d-none"
        );

        btnCargando?.classList.add(
            "d-none"
        );

    }

});
