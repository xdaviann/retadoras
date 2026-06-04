# Product

## Register

product

## Users

Administrador y entrenador de una academia de voleibol venezolana. Lo usa principalmente desde el celular, en el gimnasio o cancha, después de los entrenamientos. También lo usa desde computador en casa o academia para revisiones mensuales. Flujo principal: registrar pagos de mensualidades y controlar que las atletas estén al día.

## Product Purpose

Sistema de gestión financiera interna para una academia de voleibol. Permite registrar atletas (Grupo A y Grupo B), cobrar mensualidades en Bs. o USD, registrar ingresos y gastos generales, y visualizar el balance del mes en tiempo real. Los datos se persisten en LocalStorage. La tasa BCV se actualiza manualmente o via API. Éxito: cero cuadernos, todo digitado y accesible desde el celular en menos de 30 segundos.

## Brand Personality

Atlética, directa, confiable. Energía deportiva sin excesos. Seria pero accesible.

## Anti-references

- Dashboards corporativos genéricos (azul navy con gradientes dorados, estética "fintech bancario").
- Interfaces de ERP que requieren manual de usuario.
- Apps de gimnasio con neón y fuentes ultra-condensadas estilo "gym bro".

## Design Principles

1. **Velocidad de operación**: el flujo más común (registrar un pago) debe completarse en menos de 5 taps/clicks.
2. **Claridad numérica**: los montos deben ser inmediatamente legibles; nunca ambiguos sobre si son Bs. o USD.
3. **Confianza en los datos**: el usuario debe saber siempre con qué tasa se calculó cada monto, y cuándo fue actualizada.
4. **Mobile-first sin sacrificar desktop**: diseñado primero para una mano en el celular.

## Accessibility & Inclusion

- WCAG AA mínimo en contraste de texto.
- Soporte para prefers-reduced-motion.
- Todos los controles interactivos tienen labels accesibles.
