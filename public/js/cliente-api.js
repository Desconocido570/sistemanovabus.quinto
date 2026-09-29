window.ClienteAPI = (() => {

    const token =
        localStorage.getItem("token");

    let usuario =
        null;


    try {

        usuario =
            JSON.parse(
                localStorage.getItem("usuario") || "null"
            );

    } catch (error) {

        usuario =
            null;

    }


    function requireCliente() {

        if (
            !token ||
            !usuario ||
            usuario.rol !== "CLIENTE"
        ) {

            window.location.href =
                "/login.html";

            return false;

        }


        return true;

    }


    function headers(
        json = false
    ) {

        const resultado = {

            Authorization:
                `Bearer ${token}`

        };


        if (json) {

            resultado["Content-Type"] =
                "application/json";

        }


        return resultado;

    }


    async function request(
        url,
        options = {}
    ) {

        const config = {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization:
                    `Bearer ${token}`
            }
        };


        const response =
            await fetch(
                url,
                config
            );


        let data;


        try {

            data =
                await response.json();

        } catch (error) {

            data = {
                ok: false,
                mensaje:
                    "Respuesta inválida del servidor"
            };

        }


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            window.location.href =
                "/login.html";

            throw new Error(
                data.mensaje ||
                "Tu sesión expiró"
            );

        }


        return {
            response,
            data
        };

    }


    async function downloadPDF(
        url,
        filename
    ) {

        const response =
            await fetch(
                url,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            window.location.href =
                "/login.html";

            return;

        }


        if (!response.ok) {

            let mensaje =
                "No se pudo descargar el PDF";


            try {

                const error =
                    await response.json();

                mensaje =
                    error.mensaje ||
                    mensaje;

            } catch (error) {
                // Nada.
            }


            throw new Error(
                mensaje
            );

        }


        const blob =
            await response.blob();


        const enlace =
            document.createElement("a");


        const objectUrl =
            URL.createObjectURL(
                blob
            );


        enlace.href =
            objectUrl;

        enlace.download =
            filename ||
            "boleto.pdf";


        document.body.appendChild(
            enlace
        );


        enlace.click();

        enlace.remove();


        URL.revokeObjectURL(
            objectUrl
        );

    }


    async function logout() {

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


        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        window.location.href =
            "/login.html";

    }


    return {
        token,
        usuario,
        requireCliente,
        headers,
        request,
        downloadPDF,
        logout
    };

})();
