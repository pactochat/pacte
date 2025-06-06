# Aipacto

**Inglés**: Para la versión en inglés de este README, consulta [`README`](../README.md).

## Visión y Misión

Aipacto es una plataforma de chat de código abierto impulsada por IA, diseñada para revolucionar la toma de decisiones y la transparencia en gobiernos locales y regionales. Nuestra visión es establecer un nuevo estándar global para la IA en la política y la gobernanza, comenzando por las regiones de habla catalana y expandiéndose internacionalmente. Aprovechando modelos de lenguaje avanzados (como Salamandra-7b-instruct de Aina Kit), empoderamos a las administraciones públicas y a la ciudadanía con información basada en datos y herramientas accesibles para la participación cívica.

### ¿Por qué Aipacto?

- **Potenciar la toma de decisiones local**: Proporcionar a los gobiernos locales herramientas para analizar datos regionales y planificar eficazmente, superando a los sistemas centralizados al centrarse en el contexto hiperlocal.
- **Mejorar la transparencia y el acceso**: Hacer que la información compleja sea accesible y accionable para la ciudadanía, fomentando la confianza y la participación.
- **Escalable y sostenible**: Diseñado para adaptarse internacionalmente, con una versión autoalojada gratuita y una suscripción en la nube para la viabilidad a largo plazo.

### Casos de uso

**Para la ciudadanía:**

- "¿Qué decidió el ayuntamiento sobre el nuevo plan de igualdad en la última reunión?"
- "¿Dónde puedo encontrar información sobre eventos culturales locales y su impacto económico?"
- "¿Cómo reporto una farola rota en mi barrio?"
- "Explica el Plan de Acción Municipal en términos sencillos."
- "¿Qué está haciendo el ayuntamiento para abordar la percepción de que 'aquí nunca pasa nada'?"

**Para personal y cargos públicos:**

- "Genera un borrador de hilo para redes sociales resumiendo la última reunión del pleno."
- "Identifica fortalezas y debilidades en los argumentos de la oposición."
- "Resume las quejas ciudadanas sobre la limpieza de calles."
- "Analiza un documento de planificación extenso y extrae los 5 puntos más relevantes."
- "Identifica menciones de 'impacto económico' y 'sostenibilidad' en los informes de festivales."

### Impacto económico y social

- **Cataluña**: 900+ municipios, más de 8.000 millones de euros de presupuesto anual. Incluso una adopción del 5% podría gestionar más de 400 millones de euros en recursos.
- **Ahorros en eficiencia**: 2-5% de ahorro en presupuestos operativos, potencialmente 8-20 millones de euros optimizados anualmente en las primeras etapas.
- **Escalabilidad**: Diseñado para España (8.000+ municipios, 60.000 millones de euros de presupuesto) y más allá, con planes para soporte multilingüe.

## Arquitectura y stack tecnológico

Aipacto está construido con una arquitectura moderna y robusta:

- **Clean Architecture y DDD**: El código está organizado en contextos delimitados, siguiendo principios de Clean Architecture y Domain-Driven Design para facilitar el mantenimiento y la escalabilidad.
- **TypeScript en todo**: Desarrollo full stack y multiplataforma en TypeScript para mayor consistencia y seguridad.
- **Frontend**: React, React Native, Expo, Tamagui (Material Design 3, tokens personalizados para el tema).
- **Backend**: Fastify (Node.js), Effect, contenedores para computación segura.
- **Orquestación IA**: LangChain, LangGraph para flujos de trabajo multiagente.
- **Búsqueda semántica**: Qdrant.
- **LLMs principales**: Modelos Salamandra de Aina Kit, con soporte para OpenAI, DeepSeek, Grok, etc.
- **Almacenamiento de datos**: PostgreSQL, Databricks.
- **Otras herramientas**: Procesamiento masivo de datos, búsqueda en internet, GitHub para colaboración open source.

## Componentes principales

1. **Interfaz de chat**: UI de chat multiplataforma (web/móvil) para consultar datos, generar información o solicitar acciones.
2. **Rastreadores de datos**: Scripts para recopilar y estructurar datos regionales para su análisis.
3. **Flujos de trabajo agentic**: Sistema multiagente orquestado mediante LangChain y LangGraph.
4. **APIs backend**: Servidor Fastify que gestiona sesiones de chat, procesamiento de datos y tareas de agentes.

## Cómo contribuir

Estamos desarrollando activamente las interfaces web y móvil principales y el orquestador de agentes IA. Si te interesa tener un impacto significativo en la intersección de IA, gobernanza y open source, ¡nos encantaría contar contigo!

Antes de empezar, por favor lee nuestra [Guía de contribución](../CONTRIBUTING.md) para instrucciones de configuración, estándares de código y flujo de trabajo de contribución.

## Licencia

Licenciado bajo la Licencia MIT con una cláusula visible de atribución.

Cualquier uso público debe mostrar el texto "Powered by AIPacto.com".

Consulta [LICENSE](../LICENSE) para más detalles.
