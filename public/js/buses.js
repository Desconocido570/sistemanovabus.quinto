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


    const modalElemento = document.getElementById("modalBus");
    const modal = modalElemento ? new bootstrap.Modal(modalElemento) : null;
    const form = document.getElementById("formBus");
    const tabla = document.getElementById("tablaBuses");
    const buscar = document.getElementById("buscarBus");
    const filtro = document.getElementById("filtroEstadoBus");

    let buses = [];

    cargar();

    document.getElementById("btnNuevoBus")?.addEventListener("click", () => {
        form.reset();
        document.getElementById("idBus").value = "";
        document.getElementById("estado").value = "DISPONIBLE";
        document.getElementById("tituloModalBus").textContent = "Registrar bus";
        modal?.show();
    });

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const id = document.getElementById("idBus").value;

        const datos = {
            numeroBus: document.getElementById("numeroBus").value.trim(),
            placa: document.getElementById("placa").value.trim(),
            marca: document.getElementById("marca").value.trim(),
            modelo: document.getElementById("modelo").value.trim(),
            anio: document.getElementById("anio").value || null,
            capacidad: Number(document.getElementById("capacidad").value),
            tipoBus: document.getElementById("tipoBus").value.trim(),
            estado: document.getElementById("estado").value
        };

        try {
            await api(id ? `/api/buses/${id}` : "/api/buses", {
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
            const data = await api("/api/buses");
            buses = data.buses || [];

            document.getElementById("totalBuses").textContent = buses.length;
            document.getElementById("busesDisponibles").textContent = buses.filter(b => b.Estado === "DISPONIBLE").length;
            document.getElementById("busesEnViaje").textContent = buses.filter(b => b.Estado === "EN_VIAJE").length;
            document.getElementById("busesMantenimiento").textContent = buses.filter(b => b.Estado === "MANTENIMIENTO").length;

            render();
        } catch (error) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-exclamation-triangle"></i><span>${escapeHTML(error.message)}</span></div></td></tr>`;
        }
    }

    function render() {
        const texto = (buscar?.value || "").toLowerCase();
        const estado = filtro?.value || "";

        const lista = buses.filter(b => {
            const t = [b.NumeroBus,b.Placa,b.Marca,b.Modelo,b.TipoBus].join(" ").toLowerCase();
            return t.includes(texto) && (!estado || b.Estado === estado);
        });

        if (!lista.length) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-bus-front"></i><span>No hay buses.</span></div></td></tr>`;
            return;
        }

        tabla.innerHTML = lista.map(b => `
            <tr>
                <td><strong>${escapeHTML(b.NumeroBus)}</strong><small class="d-block text-muted">#${b.IdBus}</small></td>
                <td>${escapeHTML(b.Placa)}</td>
                <td><strong>${escapeHTML(b.Marca)}</strong><small class="d-block text-muted">${escapeHTML(b.Modelo)}</small></td>
                <td>${escapeHTML(b.Anio || "-")}</td>
                <td>${escapeHTML(b.Capacidad)} asientos</td>
                <td>${escapeHTML(b.TipoBus || "-")}</td>
                <td><span class="badge-status badge-${String(b.Estado).toLowerCase().replaceAll("_","-")}">${escapeHTML(b.Estado)}</span></td>
                <td><div class="actions-cell">
                    <button class="btn-action" data-editar="${b.IdBus}"><i class="bi bi-pencil"></i></button>
                    <button class="btn-action danger" data-eliminar="${b.IdBus}"><i class="bi bi-trash"></i></button>
                </div></td>
            </tr>
        `).join("");

        tabla.querySelectorAll("[data-editar]").forEach(x => x.addEventListener("click", () => editar(Number(x.dataset.editar))));
        tabla.querySelectorAll("[data-eliminar]").forEach(x => x.addEventListener("click", () => eliminar(Number(x.dataset.eliminar))));
    }

    async function editar(id) {
        try {
            const data = await api(`/api/buses/${id}`);
            const b = data.bus;
            document.getElementById("idBus").value = b.IdBus;
            document.getElementById("numeroBus").value = b.NumeroBus || "";
            document.getElementById("placa").value = b.Placa || "";
            document.getElementById("marca").value = b.Marca || "";
            document.getElementById("modelo").value = b.Modelo || "";
            document.getElementById("anio").value = b.Anio || "";
            document.getElementById("capacidad").value = b.Capacidad || "";
            document.getElementById("tipoBus").value = b.TipoBus || "";
            document.getElementById("estado").value = b.Estado || "DISPONIBLE";
            document.getElementById("tituloModalBus").textContent = "Editar bus";
            modal?.show();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

    async function eliminar(id) {
        const r = await Swal.fire({
            title:"¿Eliminar bus?",
            icon:"warning",
            showCancelButton:true,
            confirmButtonText:"Eliminar"
        });
        if (!r.isConfirmed) return;

        try {
            await api(`/api/buses/${id}`, {method:"DELETE"});
            await cargar();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

});
