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


    const modalElemento = document.getElementById("modalRuta");
    const modal = modalElemento ? new bootstrap.Modal(modalElemento) : null;
    const form = document.getElementById("formRuta");
    const tabla = document.getElementById("tablaRutas");
    const buscar = document.getElementById("buscarRuta");
    const filtro = document.getElementById("filtroEstadoRuta");

    let rutas = [];

    cargar();

    document.getElementById("btnNuevaRuta")?.addEventListener("click", () => {
        form.reset();
        document.getElementById("idRuta").value = "";
        document.getElementById("tituloModalRuta").textContent = "Nueva ruta";
        modal?.show();
    });

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const id = document.getElementById("idRuta").value;

        const datos = {
            ciudadOrigen: document.getElementById("ciudadOrigen").value.trim(),
            terminalOrigen: document.getElementById("terminalOrigen").value.trim(),
            ciudadDestino: document.getElementById("ciudadDestino").value.trim(),
            terminalDestino: document.getElementById("terminalDestino").value.trim(),
            distanciaKm: document.getElementById("distanciaKm").value || null,
            duracionMinutos: document.getElementById("duracionMinutos").value || null
        };

        try {
            await api(id ? `/api/rutas/${id}` : "/api/rutas", {
                method:id ? "PUT" : "POST",
                body:JSON.stringify(datos)
            });
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
            const data = await api("/api/rutas");
            rutas = data.rutas || [];
            render();
        } catch (error) {
            tabla.innerHTML = `<tr><td colspan="7"><div class="table-empty"><i class="bi bi-exclamation-triangle"></i><span>${escapeHTML(error.message)}</span></div></td></tr>`;
        }
    }

    function render() {
        const texto = (buscar?.value || "").toLowerCase();
        const estado = filtro?.value || "";

        const lista = rutas.filter(r => {
            const t = [r.CiudadOrigen,r.CiudadDestino,r.TerminalOrigen,r.TerminalDestino].join(" ").toLowerCase();
            return t.includes(texto) &&
                (estado === "" || String(Number(Boolean(r.Estado))) === estado);
        });

        if (!lista.length) {
            tabla.innerHTML = `<tr><td colspan="7"><div class="table-empty"><i class="bi bi-signpost-split"></i><span>No hay rutas.</span></div></td></tr>`;
            return;
        }

        tabla.innerHTML = lista.map(r => `
            <tr>
                <td><strong>${escapeHTML(r.CiudadOrigen)} → ${escapeHTML(r.CiudadDestino)}</strong><small class="d-block text-muted">Ruta #${r.IdRuta}</small></td>
                <td>${escapeHTML(r.TerminalOrigen || "-")}</td>
                <td>${escapeHTML(r.TerminalDestino || "-")}</td>
                <td>${r.DistanciaKm ? `${Number(r.DistanciaKm).toFixed(2)} km` : "-"}</td>
                <td>${r.DuracionMinutos ? `${r.DuracionMinutos} min` : "-"}</td>
                <td><span class="badge-status ${r.Estado ? "badge-activo" : "badge-inactivo"}">${r.Estado ? "ACTIVA" : "INACTIVA"}</span></td>
                <td><div class="actions-cell">
                    <button class="btn-action" data-editar="${r.IdRuta}"><i class="bi bi-pencil"></i></button>
                    <button class="btn-action" data-estado="${r.IdRuta}" data-nuevo="${r.Estado ? 0 : 1}"><i class="bi bi-power"></i></button>
                    <button class="btn-action danger" data-eliminar="${r.IdRuta}"><i class="bi bi-trash"></i></button>
                </div></td>
            </tr>
        `).join("");

        tabla.querySelectorAll("[data-editar]").forEach(x => x.addEventListener("click", () => editar(Number(x.dataset.editar))));
        tabla.querySelectorAll("[data-estado]").forEach(x => x.addEventListener("click", () => cambiarEstado(Number(x.dataset.estado), Number(x.dataset.nuevo))));
        tabla.querySelectorAll("[data-eliminar]").forEach(x => x.addEventListener("click", () => eliminar(Number(x.dataset.eliminar))));
    }

    async function editar(id) {
        try {
            const data = await api(`/api/rutas/${id}`);
            const r = data.ruta;
            document.getElementById("idRuta").value = r.IdRuta;
            document.getElementById("ciudadOrigen").value = r.CiudadOrigen || "";
            document.getElementById("terminalOrigen").value = r.TerminalOrigen || "";
            document.getElementById("ciudadDestino").value = r.CiudadDestino || "";
            document.getElementById("terminalDestino").value = r.TerminalDestino || "";
            document.getElementById("distanciaKm").value = r.DistanciaKm || "";
            document.getElementById("duracionMinutos").value = r.DuracionMinutos || "";
            document.getElementById("tituloModalRuta").textContent = "Editar ruta";
            modal?.show();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

    async function cambiarEstado(id, estado) {
        try {
            await api(`/api/rutas/${id}/estado`, {
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
            title:"¿Eliminar ruta?",
            icon:"warning",
            showCancelButton:true,
            confirmButtonText:"Eliminar"
        });
        if (!r.isConfirmed) return;

        try {
            await api(`/api/rutas/${id}`, {method:"DELETE"});
            await cargar();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

});
