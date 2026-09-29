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


    const tabla = document.getElementById("tablaPagos");
    const buscar = document.getElementById("buscarPago");
    const filtro = document.getElementById("filtroEstadoPago");

    let pagos = [];

    cargar();

    buscar?.addEventListener("input", render);
    filtro?.addEventListener("change", render);

    async function cargar() {
        try {
            const data = await api("/api/pagos");
            pagos = data.pagos || [];

            document.getElementById("totalPagos").textContent = pagos.length;
            document.getElementById("pagosAprobados").textContent = pagos.filter(p => p.Estado === "APROBADO").length;
            document.getElementById("pagosPendientes").textContent = pagos.filter(p => p.Estado === "PENDIENTE").length;

            const ingresos =
                pagos
                    .filter(p => p.Estado === "APROBADO")
                    .reduce((s,p) => s + Number(p.Monto || 0), 0);

            document.getElementById("ingresosPagos").textContent =
                `$${ingresos.toFixed(2)}`;

            render();

        } catch (error) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-exclamation-triangle"></i><span>${escapeHTML(error.message)}</span></div></td></tr>`;
        }
    }

    function render() {
        const texto = (buscar?.value || "").toLowerCase();
        const estado = filtro?.value || "";

        const lista = pagos.filter(p => {
            const t = [
                p.IdPago,p.CodigoReserva,p.Nombres,p.Apellidos,
                p.Cedula,p.ReferenciaPago,p.MetodoPago
            ].join(" ").toLowerCase();

            return t.includes(texto) && (!estado || p.Estado === estado);
        });

        if (!lista.length) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-credit-card"></i><span>No hay pagos.</span></div></td></tr>`;
            return;
        }

        tabla.innerHTML = lista.map(p => `
            <tr>
                <td>#${p.IdPago}</td>
                <td><strong>${escapeHTML(p.CodigoReserva || "-")}</strong></td>
                <td><strong>${escapeHTML(p.Nombres || "")} ${escapeHTML(p.Apellidos || "")}</strong><small class="d-block text-muted">${escapeHTML(p.Cedula || "-")}</small></td>
                <td>${escapeHTML(p.MetodoPago || "-")}</td>
                <td>${escapeHTML(p.ReferenciaPago || "-")}</td>
                <td>$${Number(p.Monto || 0).toFixed(2)}</td>
                <td>${fechaHora(p.FechaPago)}</td>
                <td><span class="badge-status badge-${String(p.Estado || "").toLowerCase()}">${escapeHTML(p.Estado)}</span></td>
            </tr>
        `).join("");
    }

});
