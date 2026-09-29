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


    const modalElemento = document.getElementById("modalConductor");
    const modal = modalElemento ? new bootstrap.Modal(modalElemento) : null;
    const form = document.getElementById("formConductor");
    const tabla = document.getElementById("tablaConductores");
    const buscar = document.getElementById("buscarConductor");
    const filtro = document.getElementById("filtroEstadoConductor");

    let conductores = [];

    cargar();

    document.getElementById("btnNuevoConductor")?.addEventListener("click", async () => {
        form.reset();
        document.getElementById("idConductor").value = "";
        document.getElementById("idEmpleado").disabled = false;
        document.getElementById("tituloModalConductor").textContent = "Nuevo conductor";
        await cargarEmpleados();
        modal?.show();
    });

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const id = document.getElementById("idConductor").value;

        const datos = {
            idEmpleado: Number(document.getElementById("idEmpleado").value),
            numeroLicencia: document.getElementById("numeroLicencia").value.trim(),
            tipoLicencia: document.getElementById("tipoLicencia").value.trim(),
            fechaEmision: document.getElementById("fechaEmision").value,
            fechaVencimiento: document.getElementById("fechaVencimiento").value
        };

        try {
            await api(
                id ? `/api/conductores/${id}` : "/api/conductores",
                {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(datos)
                }
            );

            modal?.hide();
            await cargar();

        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    });

    buscar?.addEventListener("input", render);
    filtro?.addEventListener("change", render);

    async function cargar() {
        try {
            const data = await api("/api/conductores");
            conductores = data.conductores || [];
            document.getElementById("totalConductores").textContent = conductores.length;
            document.getElementById("conductoresVigentes").textContent = conductores.filter(c => c.EstadoLicencia === "VIGENTE").length;
            document.getElementById("conductoresVencidos").textContent = conductores.filter(c => c.EstadoLicencia === "VENCIDA").length;
            render();
        } catch (error) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-exclamation-triangle"></i><span>${escapeHTML(error.message)}</span></div></td></tr>`;
        }
    }

    async function cargarEmpleados(seleccionado = null) {
        const data = await api("/api/conductores/empleados-disponibles");
        const select = document.getElementById("idEmpleado");
        const opciones = data.empleados || [];

        select.innerHTML =
            `<option value="">Seleccionar empleado...</option>` +
            opciones.map(e =>
                `<option value="${e.IdEmpleado}">${escapeHTML(e.Nombres)} ${escapeHTML(e.Apellidos)} · ${escapeHTML(e.Cedula)}</option>`
            ).join("");

        if (seleccionado) {
            const conductorActual = conductores.find(c => c.IdEmpleado === seleccionado);

            if (conductorActual && !opciones.some(e => e.IdEmpleado === seleccionado)) {
                const option = document.createElement("option");
                option.value = seleccionado;
                option.textContent = `${conductorActual.Nombres} ${conductorActual.Apellidos} · ${conductorActual.Cedula}`;
                select.appendChild(option);
            }

            select.value = seleccionado;
        }
    }

    function render() {
        const texto = (buscar?.value || "").toLowerCase();
        const estado = filtro?.value || "";

        const lista = conductores.filter(c => {
            const t = [c.Nombres,c.Apellidos,c.Cedula,c.NumeroLicencia,c.TipoLicencia].join(" ").toLowerCase();
            const coincideEstado = estado === "" || String(Number(Boolean(c.Estado))) === estado;
            return t.includes(texto) && coincideEstado;
        });

        if (!lista.length) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-person-vcard"></i><span>No hay conductores.</span></div></td></tr>`;
            return;
        }

        tabla.innerHTML = lista.map(c => {
            const licenciaClass =
                c.EstadoLicencia === "VIGENTE"
                    ? "badge-vigente"
                    : c.EstadoLicencia === "POR_VENCER"
                        ? "badge-por-vencer"
                        : "badge-vencida";

            return `
                <tr>
                    <td><div class="entity-main"><div class="entity-avatar">${escapeHTML((c.Nombres || "C")[0])}</div><div><strong>${escapeHTML(c.Nombres)} ${escapeHTML(c.Apellidos)}</strong><small>#${c.IdConductor}</small></div></div></td>
                    <td>${escapeHTML(c.Cedula)}</td>
                    <td>${escapeHTML(c.NumeroLicencia)}</td>
                    <td>${escapeHTML(c.TipoLicencia)}</td>
                    <td>${fecha(c.FechaVencimiento)}</td>
                    <td><span class="badge-status ${licenciaClass}">${escapeHTML(c.EstadoLicencia)}</span></td>
                    <td><span class="badge-status ${c.Estado ? "badge-activo" : "badge-inactivo"}">${c.Estado ? "ACTIVO" : "INACTIVO"}</span></td>
                    <td><div class="actions-cell">
                        <button class="btn-action" data-editar="${c.IdConductor}"><i class="bi bi-pencil"></i></button>
                        <button class="btn-action" data-estado="${c.IdConductor}" data-nuevo="${c.Estado ? 0 : 1}"><i class="bi bi-power"></i></button>
                        <button class="btn-action danger" data-eliminar="${c.IdConductor}"><i class="bi bi-trash"></i></button>
                    </div></td>
                </tr>`;
        }).join("");

        tabla.querySelectorAll("[data-editar]").forEach(b => b.addEventListener("click", () => editar(Number(b.dataset.editar))));
        tabla.querySelectorAll("[data-estado]").forEach(b => b.addEventListener("click", () => cambiarEstado(Number(b.dataset.estado), Number(b.dataset.nuevo))));
        tabla.querySelectorAll("[data-eliminar]").forEach(b => b.addEventListener("click", () => eliminar(Number(b.dataset.eliminar))));
    }

    async function editar(id) {
        try {
            const data = await api(`/api/conductores/${id}`);
            const c = data.conductor;

            await cargarEmpleados(c.IdEmpleado);

            document.getElementById("idConductor").value = c.IdConductor;
            document.getElementById("idEmpleado").value = c.IdEmpleado;
            document.getElementById("idEmpleado").disabled = false;
            document.getElementById("numeroLicencia").value = c.NumeroLicencia || "";
            document.getElementById("tipoLicencia").value = c.TipoLicencia || "";
            document.getElementById("fechaEmision").value = paraInputFecha(c.FechaEmision);
            document.getElementById("fechaVencimiento").value = paraInputFecha(c.FechaVencimiento);
            document.getElementById("tituloModalConductor").textContent = "Editar conductor";
            modal?.show();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

    async function cambiarEstado(id, estado) {
        try {
            await api(`/api/conductores/${id}/estado`, {
                method:"PATCH",
                body:JSON.stringify({estado})
            });
            await cargar();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

    async function eliminar(id) {
        const r = await Swal.fire({
            title:"¿Eliminar conductor?",
            icon:"warning",
            showCancelButton:true,
            confirmButtonText:"Eliminar"
        });
        if (!r.isConfirmed) return;

        try {
            await api(`/api/conductores/${id}`, {method:"DELETE"});
            await cargar();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

});
