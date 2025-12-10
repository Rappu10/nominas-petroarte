# Manual de Usuario · PetroArte Nóminas

## 1. ¿Qué hace la aplicación?
PetroArte Nóminas es un panel web que reúne el ciclo completo de nómina: desde capturar horas con el check-in, seguir bonos y descuentos, hasta entregar efectivo y generar reportes. Todo se maneja desde una sola pantalla dividida en cuatro áreas principales para que cualquier persona pueda operar sin conocer programación.

## 2. Requisitos antes de abrir el panel
- Necesitas una computadora con navegador moderno (Chrome, Edge o Safari) y conexión a internet.
- Mantén a mano los datos de los empleados y la semana en curso para evitar confusiones.

## 3. Cómo iniciar el sistema
1. Abre el navegador en `https://petrocentral.vercel.app/` y guarda la pestaña como favorito.

## 4. Navegación general
- En la parte superior verás el logotipo «PetroArte» y, a la derecha, un botón para cambiar entre modo claro y oscuro.
- El panel izquierdo (o los botones de la parte superior en pantallas pequeñas) muestra las cuatro secciones: Nóminas, Check-in, Equipo y Billetes. Pulsa la tarjeta que necesites para cambiar de área.
- Cada sección tiene una guía rápida (texto con pasos) y botones grandes para acciones frecuentes.

## 5. Sección Nóminas
1. Usa el buscador general para localizar a un colaborador, puesto o semana rápidamente.
2. Selecciona la columna de nombre y la de monto para que los cálculos automáticos (Top 5 y métricas) funcionen.
3. Filtra por periodo si tu hoja tiene columnas de semana o fecha.
4. Activa “Ver tabla completa” para revisar la semana, los bonos y los totales antes de exportar.
5. Pulsa “Exportar CSV” para descargar los datos activos o “Descontar préstamo” para sumar descuentos manuales a un colaborador; selecciona la semana y el empleado, ajusta el valor y guarda.
6. En la parte inferior verás el historial de nóminas guardadas: puedes ver detalles, editar una semana o eliminarla.

## 6. Sección Check-in
1. Captura el nombre de la semana (ej. «Semana 42 · 20-26 OCT») y sincronízalo con nóminas si lo necesitas.
2. Agrega los días laborales que quieres registrar y captura los horarios entrada/salida por empleado. Usa las listillas de sugerencias con los nombres ya registrados.
3. Guarda cada día con su botón correspondiente; el panel muestra el estado (Pendiente, Guardando, Guardado).
4. Cuando todos los días estén guardados, pulsa “Cerrar semana y generar nómina”. Esto manda los datos al servidor, genera la nómina y la abre en la pestaña de Nóminas.
5. Si trabajas siempre con los mismos horarios, usa la plantilla “Semana típica” y captura una fila por empleado.
6. Revisa en el resumen los bonos semanales y mensuales y marca manualmente las palomitas si necesitas corregir un caso especial.

## 7. Sección Equipo (Empleados)
- Pulsa “+ Nuevo empleado” para crear un registro nuevo con datos básicos (nombre, puesto, salario). Todos los campos se pueden editar directamente en la tabla y se guardan al salir del campo.
- Usa “📋 Extras” para añadir dirección, teléfono, RFC y CURP.
- El botón “💵 Préstamo” abre un diálogo simple para registrar un monto y una descripción; el historial se actualiza automáticamente abajo.
- En el historial puedes eliminar un préstamo si fue un error.
- Usa “Exportar CSV” para compartir la lista con otras personas o usarla en Excel.
- Cuando necesites descontar un préstamo de una nómina, vuelve a la sección Nóminas, abre el modal “Descontar préstamo”, elige semana y empleado, y aplica el monto guardado aquí.

## 8. Sección Billetes
- Usa “Preset 10,000” para cargar rápidamente una mezcla estándar (5 billetes de 1000, 5 de 500 y el resto en 100).
- Ajusta cada denominación, agrega una nota con quién o cuál sucursal recibió el efectivo y pulsa “Registrar entrega”.
- El total se calcula al instante y aparece en la tarjeta superior.
- El historial muestra todas las entregas; puedes eliminar entradas incorrectas o pulsar “Exportar CSV” para enviar el reporte.

## 9. Consejos y buenas prácticas
1. Guarda cada día en Check-in antes de cerrar la semana para no perder registros.
2. Verifica la semana activa en Nóminas antes de exportar o editar cualquier monto.
3. Utiliza los filtros y la vista “Top 5” para detectar pagos atípicos.
4. Antes de aplicar un descuento por préstamo, confirma el monto en la sección Equipo.
5. Si una semana fue cerrada por error, puedes eliminarla del historial y volver a generarla desde Check-in.

## 10. Resolución de problemas comunes
- Si la tabla muestra “Cargando datos…”, refresca la página (cmd/ctrl + R), verifica tu conexión o contacta a TI para revisar el servidor backend.
- Si un botón está gris (deshabilitado), completa primero el campo requerido (nombre de semana, columnas seleccionadas o filas guardadas).
- Para recuperar datos borrados, revisa el historial de nóminas o de préstamos y usa la opción correspondiente.
- Si aparece un aviso (modal) con icono rojo o amarillo, léelo con calma: contiene instrucciones o errores que debes corregir antes de continuar.

Buena suerte y cualquier duda, consulta con el área de TI o con quien mantenga la cuenta de PetroArte.
