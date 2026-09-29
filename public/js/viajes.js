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


    const modalElemento = document.getElementById("modalViaje");
    const modal = modalElemento ? new bootstrap.Modal(modalElemento) : null;
    const form = document.getElementById("formViaje");
    const tabla = document.getElementById("tablaViajes");
    const buscar = document.getElementById("buscarViaje");
    const filtroEstado = document.getElementById("filtroEstadoViaje");
    const filtroFecha = document.getElementById("filtroFechaViaje");

    let viajes = [];

    cargar();

    document.getElementById("btnNuevoViaje")?.addEventListener("click", async () => {
        form.reset();
        document.getElementById("idViaje").value = "";
        document.getElementById("tituloModalViaje").textContent = "Programar viaje";
        await cargarOpciones();
        modal?.show();
    });

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const id = document.getElementById("idViaje").value;

        const datos = {
            idRuta: Number(document.getElementById("idRuta").value),
            idBus: Number(document.getElementById("idBus").value),
            idConductor: Number(document.getElementById("idConductor").value),
            fechaHoraSalida: document.getElementById("fechaHoraSalida").value,
            fechaHoraLlegada: document.getElementById("fechaHoraLlegada").value,
            precio: Number(document.getElementById("precio").value)
        };

        try {
            await api(id ? `/api/viajes/${id}` : "/api/viajes", {
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
    filtroEstado?.addEventListener("change", render);
    filtroFecha?.addEventListener("change", render);

    async function cargar() {
        try {
            const data = await api("/api/viajes");
            viajes = data.viajes || [];

            document.getElementById("totalViajes").textContent = viajes.length;
            document.getElementById("viajesProgramados").textContent = viajes.filter(v => v.Estado === "PROGRAMADO").length;
            document.getElementById("viajesEnCurso").textContent = viajes.filter(v => v.Estado === "EN_CURSO").length;
            document.getElementById("viajesCancelados").textContent = viajes.filter(v => v.Estado === "CANCELADO").length;

            render();
        } catch (error) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-exclamation-triangle"></i><span>${escapeHTML(error.message)}</span></div></td></tr>`;
        }
    }

    async function cargarOpciones() {
        const data = await api("/api/viajes/opciones");

        const ruta = document.getElementById("idRuta");
        const bus = document.getElementById("idBus");
        const conductor = document.getElementById("idConductor");

        ruta.innerHTML = `<option value="">Seleccionar ruta...</option>` + (data.rutas || []).map(r => `<option value="${r.IdRuta}">${escapeHTML(r.CiudadOrigen)} → ${escapeHTML(r.CiudadDestino)}</option>`).join("");
        bus.innerHTML = `<option value="">Seleccionar bus...</option>` + (data.buses || []).map(b => `<option value="${b.IdBus}">${escapeHTML(b.NumeroBus)} · ${escapeHTML(b.Placa)}</option>`).join("");
        conductor.innerHTML = `<option value="">Seleccionar conductor...</option>` + (data.conductores || []).map(c => `<option value="${c.IdConductor}">${escapeHTML(c.Nombres)} ${escapeHTML(c.Apellidos)}</option>`).join("");
    }

    function render() {
        const texto = (buscar?.value || "").toLowerCase();
        const estado = filtroEstado?.value || "";
        const fechaFiltro = filtroFecha?.value || "";

        const lista = viajes.filter(v => {
            const t = [
                v.CiudadOrigen,
                v.CiudadDestino,
                v.NumeroBus,
                v.Placa,
                v.ConductorNombres,
                v.ConductorApellidos
            ].join(" ").toLowerCase();

            const fechaViaje = v.FechaHoraSalida ? new Date(v.FechaHoraSalida).toISOString().slice(0,10) : "";

            return t.includes(texto) &&
                (!estado || v.Estado === estado) &&
                (!fechaFiltro || fechaViaje === fechaFiltro);
        });

        if (!lista.length) {
            tabla.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="bi bi-calendar-x"></i><span>No hay viajes.</span></div></td></tr>`;
            return;
        }

        tabla.innerHTML = lista.map(v => {
            const ocupados = Number(v.AsientosOcupados || 0);
            const capacidad = Number(v.Capacidad || 0);
            const porcentaje = capacidad ? Math.round((ocupados / capacidad) * 100) : 0;

            return `
                <tr>
                    <td><strong>${escapeHTML(v.CiudadOrigen)} → ${escapeHTML(v.CiudadDestino)}</strong><small class="d-block text-muted">Viaje #${v.IdViaje}</small></td>
                    <td>${fechaHora(v.FechaHoraSalida)}</td>
                    <td><strong>${escapeHTML(v.NumeroBus)}</strong><small class="d-block text-muted">${escapeHTML(v.Placa)}</small></td>
                    <td>${escapeHTML(v.ConductorNombres)} ${escapeHTML(v.ConductorApellidos)}</td>
                    <td>$${Number(v.Precio || 0).toFixed(2)}</td>
                    <td>${ocupados}/${capacidad} · ${porcentaje}%</td>
                    <td><span class="badge-status badge-${String(v.Estado).toLowerCase().replaceAll("_","-")}">${escapeHTML(v.Estado)}</span></td>
                    <td><div class="actions-cell">
                        <button class="btn-action" data-editar="${v.IdViaje}"><i class="bi bi-pencil"></i></button>
                        <button class="btn-action" data-estado="${v.IdViaje}" title="Cambiar estado"><i class="bi bi-arrow-repeat"></i></button>
                        <button class="btn-action danger" data-eliminar="${v.IdViaje}"><i class="bi bi-trash"></i></button>
                    </div></td>
                </tr>`;
        }).join("");

        tabla.querySelectorAll("[data-editar]").forEach(x => x.addEventListener("click", () => editar(Number(x.dataset.editar))));
        tabla.querySelectorAll("[data-estado]").forEach(x => x.addEventListener("click", () => seleccionarEstado(Number(x.dataset.estado))));
        tabla.querySelectorAll("[data-eliminar]").forEach(x => x.addEventListener("click", () => eliminar(Number(x.dataset.eliminar))));
    }

    async function editar(id) {
        try {
            await cargarOpciones();

            const data = await api(`/api/viajes/${id}`);
            const v = data.viaje;

            const asegurarOpcion = (select, value, label) => {
                if (![...select.options].some(o => String(o.value) === String(value))) {
                    const option = document.createElement("option");
                    option.value = value;
                    option.textContent = label;
                    select.appendChild(option);
                }
                select.value = value;
            };

            asegurarOpcion(document.getElementById("idRuta"), v.IdRuta, `${v.CiudadOrigen} → ${v.CiudadDestino}`);
            asegurarOpcion(document.getElementById("idBus"), v.IdBus, `${v.NumeroBus} · ${v.Placa}`);
            asegurarOpcion(document.getElementById("idConductor"), v.IdConductor, `${v.ConductorNombres} ${v.ConductorApellidos}`);

            document.getElementById("idViaje").value = v.IdViaje;
            document.getElementById("fechaHoraSalida").value = paraInputFechaHora(v.FechaHoraSalida);
            document.getElementById("fechaHoraLlegada").value = paraInputFechaHora(v.FechaHoraLlegada);
            document.getElementById("precio").value = Number(v.Precio || 0);
            document.getElementById("tituloModalViaje").textContent = "Editar viaje";
            modal?.show();

        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

    async function seleccionarEstado(id) {
        const viaje = viajes.find(v => v.IdViaje === id);
        const actual = viaje?.Estado || "PROGRAMADO";

        const r = await Swal.fire({
            title:"Cambiar estado del viaje",
            input:"select",
            inputValue:actual,
            inputOptions:{
                PROGRAMADO:"Programado",
                EN_CURSO:"En curso",
                FINALIZADO:"Finalizado",
                CANCELADO:"Cancelado"
            },
            showCancelButton:true,
            confirmButtonText:"Guardar"
        });

        if (!r.isConfirmed) return;

        try {
            await api(`/api/viajes/${id}/estado`, {
                method:"PATCH",
                body:JSON.stringify({estado:r.value})
            });
            await cargar();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

    async function eliminar(id) {
        const r = await Swal.fire({
            title:"¿Eliminar viaje?",
            icon:"warning",
            showCancelButton:true,
            confirmButtonText:"Eliminar"
        });
        if (!r.isConfirmed) return;

        try {
            await api(`/api/viajes/${id}`, {method:"DELETE"});
            await cargar();
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    }

});
