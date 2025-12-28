const URL_API = "https://script.google.com/macros/s/AKfycbyElZjg5XtKyHavLo7YiGJCIh8LYXkwDrnnf--DvZZlevJtAfue-QgTIxomi6izpwWjvA/exec";


let tabla; // 👈 VARIABLE GLOBAL

$(document).ready(function () {

  tabla = $("#tablaDeudores").DataTable({
    destroy: true,
    language: {
      url: "//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json"
    }
  });

  listarDeudores();

  $("#btnGuardarDeudor").click(function () {

    let nombre = $("#nombre").val().trim();
    let deuda = $("#deuda").val().trim();

    if (nombre === "" || deuda === "") {
      Swal.fire("Error", "Complete todos los campos", "warning");
      return;
    }

    $.ajax({
      url: URL_API,
      dataType: "jsonp",
      data: {
        tipo: "deudor",
        nombre: nombre,
        deuda: deuda
      },
      success: function (resp) {

        if (resp.status === "ok") {
          Swal.fire("Correcto", "Deudor registrado", "success");
          $("#nombre").val("");
          $("#deuda").val("");
          listarDeudores();
        }
      }
    });
  });
});

function listarDeudores() {

  $.ajax({
    url: URL_API,
    dataType: "jsonp",
    data: { accion: "deudores" },
    success: function (resp) {

      tabla.clear();

      resp.data.forEach(d => {
        tabla.row.add([
          d.id_deudor,
          d.nombre,
          d.deuda_total
        ]);
      });

      tabla.draw();
    }
  });
}