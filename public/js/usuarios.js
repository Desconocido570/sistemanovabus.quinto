document.addEventListener("DOMContentLoaded", () => {

    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    async function api(
        url,
        opciones = {}
    ) {

        const headers = {
            ...(opciones.body
                ? {
                    "Content-Type":
                        "application/json"
                }
                : {}),
            ...(opciones.headers || {}),
            Authorization:
                `Bearer ${token}`
        };

        const response =
            await fetch(
                url,
                {
                    ...opciones,
                    headers
                }
            );

        let data = {};

        try {
            data =
                await response.json();
        } catch (_) {}

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

        if (!response.ok) {
            throw new Error(
                data.mensaje ||
                "Ocurrió un error"
            );
        }

        return data;
    }

    function escapeHTML(valor) {
        return String(
            valor ?? ""
        )
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function fecha(valor) {
        if (!valor) return "-";

        return new Date(valor)
            .toLocaleDateString(
                "es-EC"
            );
    }

    function fechaHora(valor) {
        if (!valor) return "-";

        return new Date(valor)
            .toLocaleString(
                "es-EC",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            );
    }

    function paraInputFecha(valor) {
        if (!valor) return "";
        return String(valor)
            .slice(0, 10);
    }

    function paraInputFechaHora(valor) {
        if (!valor) return "";

        const d =
            new Date(valor);

        const local =
            new Date(
                d.getTime() -
                d.getTimezoneOffset() *
                60000
            );

        return local
            .toISOString()
            .slice(0, 16);
    }


    const modalElemento =
        document.getElementById("modalUsuario");

    const modal =
        modalElemento
            ? new bootstrap.Modal(
                modalElemento
            )
            : null;

    const form =
        document.getElementById("formUsuario");

    const tabla =
        document.getElementById("tablaUsuarios");

    const buscar =
        document.getElementById("buscarUsuario");

    const filtroRol =
        document.getElementById("filtroRol");

    const filtroEstado =
        document.getElementById("filtroEstado");

    let usuarios = [];


    cargar();


    document
        .getElementById("btnNuevoUsuario")
        ?.addEventListener(
            "click",
            () => {
                form.reset();
                document.getElementById("idUsuario").value = "";
                document.getElementById("tituloModal").textContent = "Nuevo usuario";
                document.getElementById("password").required = true;
                document.getElementById("ayudaPassword").textContent = "";
                modal?.show();
            }
        );


    form?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const id =
                document.getElementById("idUsuario").value;

            const datos = {
                nombres:
                    document.getElementById("nombres").value.trim(),
                apellidos:
                    document.getElementById("apellidos").value.trim(),
                cedula:
                    document.getElementById("cedula").value.trim(),
                telefono:
                    document.getElementById("telefono").value.trim(),
                correo:
                    document.getElementById("correo").value.trim(),
                fechaNacimiento:
                    document.getElementById("fechaNacimiento").value || null,
                idRol:
                    Number(document.getElementById("idRol").value),
                password:
                    document.getElementById("password").value
            };

            try {

                await api(
                    id
                        ? `/api/usuarios/${id}`
                        : "/api/usuarios",
                    {
                        method:
                            id
                                ? "PUT"
                                : "POST",
                        body:
                            JSON.stringify(
                                datos
                            )
                    }
                );

                modal?.hide();

                await cargar();

                Swal.fire({
                    icon: "success",
                    title:
                        id
                            ? "Usuario actualizado"
                            : "Usuario creado",
                    timer: 1400,
                    showConfirmButton: false
                });

            } catch (error) {

                Swal.fire(
                    "Error",
                    error.message,
                    "error"
                );

            }

        }
    );


    buscar?.addEventListener(
        "input",
        render
    );

    filtroRol?.addEventListener(
        "change",
        render
    );

    filtroEstado?.addEventListener(
        "change",
        render
    );


    async function cargar() {

        try {

            const data =
                await api(
                    "/api/usuarios"
                );

            usuarios =
                data.usuarios || [];

            actualizarEstadisticas();
            render();

        } catch (error) {

            tabla.innerHTML =
                `<tr><td colspan="7"><div class="table-empty"><i class="bi bi-exclamation-triangle"></i><span>${escapeHTML(error.message)}</span></div></td></tr>`;

        }

    }


    function actualizarEstadisticas() {

        const total =
            usuarios.length;

        const activos =
            usuarios.filter(
                u => u.Estado
            ).length;

        document.getElementById("totalUsuarios").textContent = total;
        document.getElementById("usuariosActivos").textContent = activos;
        document.getElementById("usuariosInactivos").textContent = total - activos;

    }


    function render() {

        const texto =
            (buscar?.value || "")
                .trim()
                .toLowerCase();

        const rol =
            filtroRol?.value || "";

        const estado =
            filtroEstado?.value || "";

        const filtrados =
            usuarios.filter(
                usuario => {

                    const coincideTexto =
                        !texto ||
                        [
                            usuario.Nombres,
                            usuario.Apellidos,
                            usuario.Cedula,
                            usuario.Correo
                        ]
                            .join(" ")
                            .toLowerCase()
                            .includes(texto);

                    const coincideRol =
                        !rol ||
                        usuario.NombreRol === rol;

                    const coincideEstado =
                        estado === "" ||
                        String(
                            Number(
                                Boolean(
                                    usuario.Estado
                                )
                            )
                        ) === estado;

                    return (
                        coincideTexto &&
                        coincideRol &&
                        coincideEstado
                    );

                }
            );

        if (!filtrados.length) {
            tabla.innerHTML =
                `<tr><td colspan="7"><div class="table-empty"><i class="bi bi-people"></i><span>No hay usuarios para mostrar.</span></div></td></tr>`;
            return;
        }

        tabla.innerHTML =
            filtrados.map(
                usuario => `
                    <tr>
                        <td>
                            <div class="entity-main">
                                <div class="entity-avatar">${escapeHTML((usuario.Nombres || "U")[0])}</div>
                                <div>
                                    <strong>${escapeHTML(usuario.Nombres)} ${escapeHTML(usuario.Apellidos)}</strong>
                                    <small>#${usuario.IdUsuario}</small>
                                </div>
                            </div>
                        </td>
                        <td>${escapeHTML(usuario.Cedula)}</td>
                        <td>${escapeHTML(usuario.Correo)}</td>
                        <td>${escapeHTML(usuario.Telefono || "-")}</td>
                        <td><span class="badge-status badge-programado">${escapeHTML(usuario.NombreRol)}</span></td>
                        <td><span class="badge-status ${usuario.Estado ? "badge-activo" : "badge-inactivo"}">${usuario.Estado ? "ACTIVO" : "INACTIVO"}</span></td>
                        <td>
                            <div class="actions-cell">
                                <button class="btn-action" data-editar="${usuario.IdUsuario}" title="Editar"><i class="bi bi-pencil"></i></button>
                                <button class="btn-action" data-estado="${usuario.IdUsuario}" data-nuevo="${usuario.Estado ? 0 : 1}" title="Cambiar estado"><i class="bi bi-power"></i></button>
                                <button class="btn-action danger" data-eliminar="${usuario.IdUsuario}" title="Eliminar"><i class="bi bi-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `
            ).join("");

        tabla.querySelectorAll("[data-editar]").forEach(
            boton =>
                boton.addEventListener(
                    "click",
                    () =>
                        editar(
                            Number(
                                boton.dataset.editar
                            )
                        )
                )
        );

        tabla.querySelectorAll("[data-estado]").forEach(
            boton =>
                boton.addEventListener(
                    "click",
                    () =>
                        cambiarEstado(
                            Number(boton.dataset.estado),
                            Number(boton.dataset.nuevo)
                        )
                )
        );

        tabla.querySelectorAll("[data-eliminar]").forEach(
            boton =>
                boton.addEventListener(
                    "click",
                    () =>
                        eliminar(
                            Number(
                                boton.dataset.eliminar
                            )
                        )
                )
        );

    }


    async function editar(id) {

        try {

            const data =
                await api(
                    `/api/usuarios/${id}`
                );

            const u =
                data.usuario;

            document.getElementById("idUsuario").value = u.IdUsuario;
            document.getElementById("nombres").value = u.Nombres || "";
            document.getElementById("apellidos").value = u.Apellidos || "";
            document.getElementById("cedula").value = u.Cedula || "";
            document.getElementById("telefono").value = u.Telefono || "";
            document.getElementById("correo").value = u.Correo || "";
            document.getElementById("fechaNacimiento").value = paraInputFecha(u.FechaNacimiento);
            document.getElementById("idRol").value = u.IdRol;
            document.getElementById("password").value = "";
            document.getElementById("password").required = false;
            document.getElementById("ayudaPassword").textContent = "Déjala vacía para conservar la contraseña actual.";
            document.getElementById("tituloModal").textContent = "Editar usuario";

            modal?.show();

        } catch (error) {

            Swal.fire(
                "Error",
                error.message,
                "error"
            );

        }

    }


    async function cambiarEstado(
        id,
        estado
    ) {

        try {

            await api(
                `/api/usuarios/${id}/estado`,
                {
                    method: "PATCH",
                    body:
                        JSON.stringify({
                            estado
                        })
                }
            );

            await cargar();

        } catch (error) {

            Swal.fire(
                "Error",
                error.message,
                "error"
            );

        }

    }


    async function eliminar(id) {

        const confirmacion =
            await Swal.fire({
                title: "¿Eliminar usuario?",
                text: "Esta acción no se puede deshacer.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Eliminar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmacion.isConfirmed) {
            return;
        }

        try {

            await api(
                `/api/usuarios/${id}`,
                {
                    method: "DELETE"
                }
            );

            await cargar();

        } catch (error) {

            Swal.fire(
                "Error",
                error.message,
                "error"
            );

        }

    }

});
