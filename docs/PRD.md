Product Requirements
This is a adminstration and managing app designed for a clinic that recieves patients. The goal is to easily manage their day to day bookings and keep track of their earnings.

User stories

Como usuario:

1. quiero poder darme de alta en el servicio, anyadir mis datos personales para poder crear facturas con ellos y reservar una cita con tipo de mi eleccion y profesional de mi eleccion.
2. Como ususario, quiero elegir a traves de que metodo el profesional se comunica conmigo.
3. Como usuario, quiero firmar el documento de proteccion de datos vistualmente.
4. Como usuario, quiero poder anyadir opcionalmente comentarios sorbe el motivo de mi visita.
5. quiero poder ver mis citas pasadas y descargar una factura
6. quiero modificar mis datos de la factura antes de descargar la factura
7. quiero poder firmar los documentos requeridos antes o durante la sesion
8. quiero poder ver los documentos que he firmado

Como profesional:
4. quiero crear citas para mis pacientes
5. quiero tener un horario de trabajo en el que los pacientes puedas reservar citas
6. quiero poder bloquear horas en las que noe stoy disponible
7. quiero poder elegir varios slots a la vez para crear una cita en ellos
8. quiero poder crear citas recurentes
9. quiero poder comunicarme con mi paciente de forma rapida a traves de su metodo de comunicacion elegido
10. quiero visualizar todas mis citas semanales de un vistazo
11. quiero visualizar mis citas pasadas o futuras de cualquier fecha
12. quiero guardar la informacion de cobros a mis pacientes
13. quiero acceder a la informacion de cobros pasados y futuros por fecha
14. quiero ver mi facturacion mensual y trimestral
15. quiero poder crear bonos de sesiones
16. quiero saber si los paciente me pagaron con targeta bizum o efectivo
17. quiero saber que parte de mis ingresos proviene de cada forma de pago
18. quiero poder enviar documentos de consentimiento propios a mis pacientes para que estos los firmen
19. quiero poder ver facilmente que documentos asignados al paciente estan pendientes de firma
20. quiero poder ofrecer mi dispositivo al paciente para que en el pueda firmar los documentos pendientes

Features user app

Calendario de citas disponibles

- navegar por semanas presente y futura
- elegir cita disponible
- formulario de datos personales
- una vez pasada descargar factura

Features profesional app

Calendario 

- Crear cita   
- Elegir varios slots a la vez para crear varias citas para el mismo paciente 
- Crear citas recurrentes     
- Coordinar con con Google calendar para que las citas creadas se muestren en mi calendar
- Ver cita     
  - Datos de cita (paciente, hora, motivo, tipo)     
  - Link a paciente      
  - Dar por cobrada 
  - Cancelar (si es antes de la hora)
  - Marcar no asistencia    
  - Editar 

- Bloquear horas 

Listado de pacientes 

Paciente   

- Ver historial    
- Ver datos personales
- Proximas citas
- Ultimas citas
- Ver todas las citas
- Ver documentos firmados
- Ver documentos pendientes de firma

Contabilidad    

- Ver facturación mensual   
- Ver facturacion mensual por metodo de pago
- Ver histórico de facturación de otros meses   
- Ver lista de cobros 

Creador de tipo de cita

- Precio
- Nombre
- Duracion

Creador de bonos

- Sesiones
- Precio
- Tipo de sesion
- Nombre

Bussines logic

Registro y roles
Cuando un usuario se registra con el rol "profesional", se crea automaticamente un perfil de profesional en la base de datos. Cuando un usuario se registra con el rol "paciente", se crea automaticamente un perfil de paciente en la base de datos con los datos proporcionados durante el registro (nombre, email). El profileId se vincula automaticamente al usuario en ambos casos.
Los pacientes pueden ser creados por un profesional. En este caso se crea un perfil de paciente que se asocia al usuario cuando se registra.

RGPD
Un paciente no puede reservar citas hasta no haber firmado el consentimiento.

Otros consentimientos
Un paciente puede reservar citas sin haber firmado otros consentimientos pero el profesional debe ser advertido en un lugar visible de la apicacion

Bonos
Al reservar una cita se descuenta del bono, aunque al crear cita damos opcion a no restar del bono. Si se cancela una cita se debe devolver al bono. Queremos que el profesional pueda restar una sesion del bono del paciente, esto manda una notificacion al paciente. Es el profesional el que asigna un bono al paciente tras el pago fuera de la aplicacion.

Pagos
Tanto los pagos de bonos como de sesiones se realizan fuera de la app. La aplicacion unicamente llevara el registro

Profesional
Un profesional unicamente puede acceder a los datos de sus propios pacientes, nunca los demas.

Reserva de citas
Si al reservar una cita un paciente cambia su nombre, numero de telefono o email se considera que ha cambiado 
sus datos personales y estos se actualizan en db