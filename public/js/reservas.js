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


    const tabla = document.getElementById("tablaReservas");
    const buscar = document.getElementById("buscarReserva");
    const filtro = document.getElementById("filtroEstadoReserva");
    const modalElemento = document.getElementById("modalDetalleReserva");
    const modal = modalElemento ? new bootstrap.Modal(modalElemento) : null;

    let reservas = [];

    cargar();

    buscar?.addEventListener("input", render);
    filtro?.addEventListener("change", render);

    async function cargar() {
        try {
            const data = await api("/api/reservas");
            reservas = data.reservas || [];

            document.getElementById("totalReservas").textContent = reservas.length;
            document.getElementById("reservasPendientes").textContent = reservas.filter(r => r.Estado === "PENDIENTE").length;
            document.getElementById("reservasPagadas").textContent = reservas.filter(r => r.Estado === "PAGADA").length;
            document.getElementById("reservasCanceladas").textContent = reservas.filter(r => r.Estado === "CANCELADA").length;

            render();
        } catch (error) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-exclamation-triangle"></i><span>${escapeHTML(error.message)}</span></div></td></tr>`;
        }
    }

    function render() {
        const texto = (buscar?.value || "").toLowerCase();
        const estado = filtro?.value || "";

        const lista = reservas.filter(r => {
            const t = [
                r.CodigoReserva,r.Nombres,r.Apellidos,r.Cedula,
                r.CiudadOrigen,r.CiudadDestino
            ].join(" ").toLowerCase();

            return t.includes(texto) && (!estado || r.Estado === estado);
        });

        if (!lista.length) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-journal-x"></i><span>No hay reservas.</span></div></td></tr>`;
            return;
        }

        tabla.innerHTML = lista.map(r => `
            <tr>
                <td><strong>${escapeHTML(r.CodigoReserva)}</strong><small class="d-block text-muted">${fechaHora(r.FechaReserva)}</small></td>
                <td><strong>${escapeHTML(r.Nombres)} ${escapeHTML(r.Apellidos)}</strong><small class="d-block text-muted">${escapeHTML(r.Cedula)}</small></td>
                <td>${escapeHTML(r.CiudadOrigen)} → ${escapeHTML(r.CiudadDestino)}</td>
                <td>${fechaHora(r.FechaHoraSalida)}</td>
                <td>${escapeHTML(r.Asientos || "-")}</td>
                <td>$${Number(r.Total || 0).toFixed(2)}</td>
                <td><span class="badge-status badge-${String(r.Estado).toLowerCase()}">${escapeHTML(r.Estado)}</span></td>
                <td><div class="actions-cell"><button class="btn-action" data-detalle="${r.IdReserva}"><i class="bi bi-eye"></i></button></div></td>
            </tr>
        `).join("");

        tabla.querySelectorAll("[data-detalle]").forEach(
            b => b.addEventListener("click", () => verDetalle(Number(b.dataset.detalle)))
        );
    }

    async function verDetalle(id) {
        try {
            const data = await api(`/api/reservas/${id}`);
            const r = data.reserva;
            const asientos = data.asientos || [];

            document.getElementById("detalleReserva").innerHTML = `
                <div class="detail-grid">
                    <div class="detail-box"><small>Código</small><strong>${escapeHTML(r.CodigoReserva)}</strong></div>
                    <div class="detail-box"><small>Estado</small><strong>${escapeHTML(r.Estado)}</strong></div>
                    <div class="detail-box"><small>Pasajero</small><strong>${escapeHTML(r.Nombres)} ${escapeHTML(r.Apellidos)}</strong></div>
                    <div class="detail-box"><small>Cédula</small><strong>${escapeHTML(r.Cedula)}</strong></div>
                    <div class="detail-box"><small>Ruta</small><strong>${escapeHTML(r.CiudadOrigen)} → ${escapeHTML(r.CiudadDestino)}</strong></div>
                    <div class="detail-box"><small>Salida</small><strong>${fechaHora(r.FechaHoraSalida)}</strong></div>
                    <div class="detail-box"><small>Bus</small><strong>${escapeHTML(r.NumeroBus)} · ${escapeHTML(r.Placa)}</strong></div>
                    <div class="detail-box"><small>Asientos</small><strong>${asientos.map(a => escapeHTML(a.NumeroAsiento)).join(", ") || "-"}</strong></div>
                    <div class="detail-box"><small>Total</small><strong>$${Number(r.Total || 0).toFixed(2)}</strong></div>
                </div>
            `;

            modal?.show();

        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

});
