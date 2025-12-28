const URL_API = "https://script.google.com/macros/s/AKfycbyElZjg5XtKyHavLo7YiGJCIh8LYXkwDrnnf--DvZZlevJtAfue-QgTIxomi6izpwWjvA/exec";

let tablaPagos;
let idDeudorActual = null;
let esModoDeudor = false;

/* ==========================
   UTIL: obtener parámetro URL
========================== */
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

/* ==========================
   FUNCION: formatear fecha DD/MM/YYYY
========================== */
function formatoFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0"); // enero = 0
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

$(document).ready(function () {

  let idURL = getParam("id");
  const modo  = getParam("modo");

  /* ==========================
     DETECTAR MODO DEUDOR
  ========================== */
  if (modo === "deudor" && idURL) {
    esModoDeudor = true;

    // Decodificar ID Base64
    try {
      idURL = atob(idURL);
    } catch(e) {
      Swal.fire("Error", "Enlace de deudor inválido", "error");
      return;
    }

    $("#menuAdmin").hide();
    $("#bloqueSelect").hide();
    $("#btnCompartir").hide();
  }

  /* ==========================
     DATATABLE
  ========================== */
  tablaPagos = $("#tablaPagos").DataTable({
    language: {
      url: "https://cdn.datatables.net/plug-ins/1.13.8/i18n/es-ES.json"
    },
    ordering: false,
    pageLength: 5,
    columnDefs: [
      {
        targets: 2,
        visible: !esModoDeudor,
        orderable: false
      }
    ],
    scrollY: esModoDeudor ? "300px" : false,
    scrollCollapse: esModoDeudor,
    paging: !esModoDeudor
  });

  /* ==========================
     SELECT2 (solo admin)
  ========================== */
  $("#selectDeudor").select2({
    placeholder: "Seleccione un deudor",
    width: "100%"
  });

  /* ==========================
     CARGAR ESTADO EN MODO DEUDOR
  ========================== */
  if (modo === "deudor" && idURL) {
    cargarEstado(idURL);
    return;
  }

  /* ==========================
     MODO ADMIN
  ========================== */
  cargarDeudores();

  $("#selectDeudor").on("change", function () {
    const id = $(this).val();
    if (id) {
      cargarEstado(id);
    } else {
      limpiarEstado();
    }
  });

  /* ==========================
     COMPARTIR ESTADO (ADMIN)
  ========================== */
  $("#btnCompartir").on("click", function () {

    if (!idDeudorActual) return;

    const baseURL = window.location.origin + window.location.pathname;

    // Encriptar ID con Base64
    const encodedId = btoa(idDeudorActual);
    const link = `${baseURL}?id=${encodedId}&modo=deudor`;

    Swal.fire({
      title: "Compartir estado",
      html: `
        <p>Copia y envía este enlace al deudor:</p>
        <input type="text" class="form-control" value="${link}" readonly>
      `,
      confirmButtonText: "📋 Copiar enlace",
      showCancelButton: true,
      cancelButtonText: "Cerrar"
    }).then(r => {
      if (r.isConfirmed) {
        navigator.clipboard.writeText(link);
        Swal.fire("Copiado", "El enlace fue copiado", "success");
      }
    });
  });

  /* ==========================
     ELIMINAR PAGO (ADMIN)
  ========================== */
  $("#tablaPagos tbody").on("click", ".btnEliminar", function () {

    const idPago = $(this).data("id");

    Swal.fire({
      title: "¿Eliminar pago?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then(result => {

      if (!result.isConfirmed) return;

      $.ajax({
        url: URL_API,
        dataType: "jsonp",
        data: {
          accion: "eliminar_pago",
          id_pago: idPago
        },
        success: function (resp) {

          if (resp.status === "ok") {
            Swal.fire("Eliminado", "El pago fue eliminado", "success");
            cargarEstado(idDeudorActual);
          } else {
            Swal.fire("Error", resp.mensaje || "No se pudo eliminar", "error");
          }
        }
      });

    });
  });

});

/* ==========================
   CARGAR DEUDORES (ADMIN)
========================== */
function cargarDeudores() {

  $.ajax({
    url: URL_API,
    dataType: "jsonp",
    data: { accion: "deudores" },
    success: function (resp) {

      if (resp.status !== "ok") return;

      const select = $("#selectDeudor");
      select.empty().append(`<option value=""></option>`);

      resp.data.forEach(d => {
        select.append(`
          <option value="${d.id_deudor}">
            ${d.nombre} - Deuda: S/ ${Number(d.deuda_total).toFixed(2)}
          </option>
        `);
      });
    }
  });
}

/* ==========================
   CARGAR ESTADO
========================== */
function cargarEstado(id) {

  $.ajax({
    url: URL_API,
    dataType: "jsonp",
    data: { accion: "estado", id: id },
    success: function (data) {

      if (data.status !== "ok") {
        Swal.fire("Error", data.mensaje || "No se pudo cargar el estado", "error");
        return;
      }

      idDeudorActual = id;
      $("#btnCompartir").prop("disabled", false);

      $("#nombreDeudor").text(data.nombre);
      $("#deudaTotal").text(Number(data.deuda_total).toFixed(2));
      $("#totalPagado").text(Number(data.total_pagado).toFixed(2));
      $("#saldoPendiente").text(Number(data.saldo).toFixed(2));

      let porcentaje = data.deuda_total > 0
        ? (data.total_pagado / data.deuda_total) * 100
        : 0;

      $("#avance")
        .css("width", porcentaje + "%")
        .text(porcentaje.toFixed(1) + "%");

      // Limpiar tabla antes de agregar
      if (tablaPagos) tablaPagos.clear();

      data.pagos.forEach(p => {

        let acciones = esModoDeudor
          ? ""
          : `<button class="btn btn-danger btn-sm btnEliminar"
                      data-id="${p.id_pago}">
                🗑️
             </button>`;

        tablaPagos.row.add([
          formatoFecha(p.fecha_pago),
          Number(p.monto).toFixed(2),
          acciones
        ]);
      });

      tablaPagos.draw();
    }
  });
}

/* ==========================
   LIMPIAR ESTADO
========================== */
function limpiarEstado() {

  idDeudorActual = null;
  $("#btnCompartir").prop("disabled", true);

  $("#nombreDeudor").text("---");
  $("#deudaTotal").text("0.00");
  $("#totalPagado").text("0.00");
  $("#saldoPendiente").text("0.00");
  $("#avance").css("width", "0%").text("0%");

  if (tablaPagos) tablaPagos.clear().draw();
}
