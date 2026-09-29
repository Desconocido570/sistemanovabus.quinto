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
        document.getElementById("modalEmpleado");

    const modal =
        modalElemento
            ? new bootstrap.Modal(modalElemento)
            : null;

    const form =
        document.getElementById("formEmpleado");

    const tabla =
        document.getElementById("tablaEmpleados");

    const buscar =
        document.getElementById("buscarEmpleado");

    const filtro =
        document.getElementById("filtroEstado");

    let empleados = [];

    cargar();


    document
        .getElementById("btnNuevoEmpleado")
        ?.addEventListener(
            "click",
            () => {
                form.reset();
                document.getElementById("idEmpleado").value = "";
                document.getElementById("tituloModalEmpleado").textContent = "Nuevo empleado";
                modal?.show();
            }
        );


    form?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const id =
                document.getElementById("idEmpleado").value;

            const datos = {
                nombres: document.getElementById("nombres").value.trim(),
                apellidos: document.getElementById("apellidos").value.trim(),
                cedula: document.getElementById("cedula").value.trim(),
                cargo: document.getElementById("cargo").value,
                correo: document.getElementById("correo").value.trim(),
                telefono: document.getElementById("telefono").value.trim(),
                fechaNacimiento: document.getElementById("fechaNacimiento").value || null,
                fechaContratacion: document.getElementById("fechaContratacion").value || null,
                direccion: document.getElementById("direccion").value.trim()
            };

            try {

                await api(
                    id
                        ? `/api/empleados/${id}`
                        : "/api/empleados",
                    {
                        method:
                            id
                                ? "PUT"
                                : "POST",
                        body: JSON.stringify(datos)
                    }
                );

                modal?.hide();
                await cargar();

                Swal.fire({
                    icon: "success",
                    title: "Guardado correctamente",
                    timer: 1200,
                    showConfirmButton: false
                });

            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }

        }
    );


    buscar?.addEventListener("input", render);
    filtro?.addEventListener("change", render);


    async function cargar() {

        try {
            const data =
                await api("/api/empleados");

            empleados =
                data.empleados || [];

            actualizarEstadisticas();
            render();

        } catch (error) {
            tabla.innerHTML =
                `<tr><td colspan="7"><div class="table-empty"><i class="bi bi-exclamation-triangle"></i><span>${escapeHTML(error.message)}</span></div></td></tr>`;
        }

    }


    function actualizarEstadisticas() {

        const activos =
            empleados.filter(e => e.Estado).length;

        document.getElementById("totalEmpleados").textContent = empleados.length;
        document.getElementById("empleadosActivos").textContent = activos;
        document.getElementById("empleadosInactivos").textContent = empleados.length - activos;

    }


    function render() {

        const texto =
            (buscar?.value || "").toLowerCase();

        const estado =
            filtro?.value || "";

        const lista =
            empleados.filter(
                e => {
                    const t =
                        [
                            e.Nombres,
                            e.Apellidos,
                            e.Cedula,
                            e.Cargo
                        ]
                            .join(" ")
                            .toLowerCase();

                    const coincideEstado =
                        estado === "" ||
                        String(Number(Boolean(e.Estado))) === estado;

                    return t.includes(texto) && coincideEstado;
                }
            );

        if (!lista.length) {
            tabla.innerHTML =
                `<tr><td colspan="7"><div class="table-empty"><i class="bi bi-people"></i><span>No hay empleados.</span></div></td></tr>`;
            return;
        }

        tabla.innerHTML =
            lista.map(e => `
                <tr>
                    <td>
                        <div class="entity-main">
                            <div class="entity-avatar">${escapeHTML((e.Nombres || "E")[0])}</div>
                            <div><strong>${escapeHTML(e.Nombres)} ${escapeHTML(e.Apellidos)}</strong><small>#${e.IdEmpleado}</small></div>
                        </div>
                    </td>
                    <td>${escapeHTML(e.Cedula)}</td>
                    <td>${escapeHTML(e.Cargo)}</td>
                    <td>
                        <strong>${escapeHTML(e.Correo || "-")}</strong>
                        <small class="d-block text-muted">${escapeHTML(e.Telefono || "-")}</small>
                    </td>
                    <td>${fecha(e.FechaContratacion)}</td>
                    <td><span class="badge-status ${e.Estado ? "badge-activo" : "badge-inactivo"}">${e.Estado ? "ACTIVO" : "INACTIVO"}</span></td>
                    <td><div class="actions-cell">
                        <button class="btn-action" data-editar="${e.IdEmpleado}"><i class="bi bi-pencil"></i></button>
                        <button class="btn-action" data-estado="${e.IdEmpleado}" data-nuevo="${e.Estado ? 0 : 1}"><i class="bi bi-power"></i></button>
                        <button class="btn-action danger" data-eliminar="${e.IdEmpleado}"><i class="bi bi-trash"></i></button>
                    </div></td>
                </tr>
            `).join("");

        tabla.querySelectorAll("[data-editar]").forEach(
            b => b.addEventListener("click", () => editar(Number(b.dataset.editar)))
        );

        tabla.querySelectorAll("[data-estado]").forEach(
            b => b.addEventListener("click", () => cambiarEstado(Number(b.dataset.estado), Number(b.dataset.nuevo)))
        );

        tabla.querySelectorAll("[data-eliminar]").forEach(
            b => b.addEventListener("click", () => eliminar(Number(b.dataset.eliminar)))
        );

    }


    async function editar(id) {

        try {

            const data =
                await api(`/api/empleados/${id}`);

            const e =
                data.empleado;

            document.getElementById("idEmpleado").value = e.IdEmpleado;
            document.getElementById("nombres").value = e.Nombres || "";
            document.getElementById("apellidos").value = e.Apellidos || "";
            document.getElementById("cedula").value = e.Cedula || "";
            document.getElementById("cargo").value = e.Cargo || "";
            document.getElementById("correo").value = e.Correo || "";
            document.getElementById("telefono").value = e.Telefono || "";
            document.getElementById("fechaNacimiento").value = paraInputFecha(e.FechaNacimiento);
            document.getElementById("fechaContratacion").value = paraInputFecha(e.FechaContratacion);
            document.getElementById("direccion").value = e.Direccion || "";
            document.getElementById("tituloModalEmpleado").textContent = "Editar empleado";

            modal?.show();

        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }

    }


    async function cambiarEstado(id, estado) {

        try {
            await api(
                `/api/empleados/${id}/estado`,
                {
                    method: "PATCH",
                    body: JSON.stringify({estado})
                }
            );
            await cargar();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }

    }


    async function eliminar(id) {

        const r =
            await Swal.fire({
                title: "¿Eliminar empleado?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Eliminar"
            });

        if (!r.isConfirmed) return;

        try {
            await api(`/api/empleados/${id}`, {method:"DELETE"});
            await cargar();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }

    }

});
