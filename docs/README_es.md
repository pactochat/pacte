# Pacte

**Inglés**: Para la versión en inglés de este README, consulta [`README`](../README.md).

## Resumen

Este repositorio define **Pacte**, una plataforma de chat integral basada en IA, diseñada para empoderar a **gobiernos e instituciones locales** con capacidades de toma de decisiones seguras y basadas en datos. Utilizando datos regionales, Pacte facilita la planificación y la toma de decisiones, incluso con la misma calidad que los gobiernos centrales y organizaciones supranacionales como la OMS o la ONU. El sistema se basa en un **servidor Node.js Fastify**, una **interfaz de chat multiplataforma** (web y móvil nativa a través de Expo), un **orquestador LangChain** para flujos de trabajo multiagente y **rastreadores de datos** para recopilar y procesar información regional.

Los componentes clave incluyen:

1. **Interfaz de chat**: Una experiencia similar a ChatGPT para que los usuarios consulten datos, generen información o soliciten acciones. Plantee preguntas como "¿Cuál es la tendencia sanitaria en mi región?" o "¿Planificar una respuesta ante inundaciones?".

2. **Rastreadores de datos**: Recopilan y estructuran datos regionales para su análisis. 3. **Flujos de trabajo de Agentic**: Sistema multiagente (p. ej., Agente de datos, Agente de análisis, Agente de planificación) orquestado mediante LangChain.

## Objetivos principales

1. **Potenciar la toma de decisiones local**

- Proporcionar a los gobiernos locales herramientas para analizar datos regionales y planificar eficazmente.
- Superar a los sistemas centralizados centrándose en el contexto hiperlocal.

2. **Coordinación multiagente**

- Aprovechar LangChain para orquestar agentes en tareas como el rastreo de datos, la síntesis y el apoyo a la toma de decisiones.
- El **Agente de planificación** central coordina las subtareas; agentes especializados gestionan los datos y el análisis.

## Componentes principales

1. **Backend Fastify/Node.js**

- Servidor basado en TypeScript con API para gestionar sesiones de chat, procesar datos y ejecutar tareas de agente.
- Se integra con entornos contenedorizados para una computación segura.
- Sirve la interfaz de chat y el backend de la aplicación móvil.

2. **Chat multiplataforma (Expo)**

- Desarrollado con Expo para compatibilidad web y móvil nativa (iOS/Android).
- Proporciona una interfaz de usuario similar a ChatGPT para consultar datos e interactuar con los agentes.

3. **Orquestador LangChain.js**

- Gestiona flujos de trabajo multiagente (p. ej., rastreo de datos, generación de informes, sugerencia de planes).
- Impulsa las respuestas basadas en LLM y la delegación de tareas.

4. **Rastreadores de datos**

- Scripts personalizados para extraer, agregar y limpiar datos regionales de diversas fuentes.
- Alimenta el sistema con datos estructurados para el análisis de los agentes.

## Tareas pendientes

- [ ] Web y aplicación mínimas funcionando en Expo
- [ ] Añadir agentes LangChain al servidor
- [ ] Añadir interfaz de usuario similar a ChatGPT
- [ ] Extraer datos de algunos sitios web y regiones de gobiernos locales
- [ ] Introducir los datos extraídos en una base de datos
