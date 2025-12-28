const URL_API = "https://script.google.com/macros/s/AKfycbyElZjg5XtKyHavLo7YiGJCIh8LYXkwDrnnf--DvZZlevJtAfue-QgTIxomi6izpwWjvA/exec";

$(document).ready(function () {

  cargarDeudores();

  $("#btnRegistrarPago").on("click", function () {

    let id = $("#id_deudor").val();
    let fecha = $("#fecha_pago").val();
    let monto = parseFloat($("#monto").val());

    if (!id || !fecha || !monto || monto <= 0) {
      Swal.fire(
        "Error",
        "Seleccione un deudor, fecha válida y monto mayor a 0",
        "warning"
      );
      return;
    }

    $.ajax({
      url: URL_API,
      dataType: "jsonp",
      data: {
        tipo: "pago",
        id_deudor: id,
        fecha: fecha,
        monto: monto
      },
      success: function (resp) {

        if (resp.status === "ok") {
          Swal.fire("Correcto", "Pago registrado", "success");

          $("#fecha_pago").val("");
          $("#monto").val("");
        } else {
          Swal.fire("Error", "No se pudo registrar el pago", "error");
        }
      }
    });
  });
});

function cargarDeudores() {

  $.ajax({
    url: URL_API,
    dataType: "jsonp",
    data: { accion: "deudores" },
    success: function (resp) {

      let select = $("#id_deudor");
      select.empty();
      select.append(`<option value="">Seleccione</option>`);

      resp.data.forEach(d => {
        select.append(`
          <option value="${d.id_deudor}">
            ${d.nombre} | Deuda: ${d.deuda_total}
          </option>
        `);
      });
    }
  });
}