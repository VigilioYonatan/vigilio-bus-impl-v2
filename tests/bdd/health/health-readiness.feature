Feature: Readiness de la API
  Como plataforma de despliegue
  Quiero conocer si PostgreSQL esta disponible
  Para enrutar trafico solo a instancias preparadas

  Scenario: PostgreSQL responde
    Given que PostgreSQL esta disponible
    When consulto el estado de readiness
    Then la API reporta el estado "ready"

  Scenario: PostgreSQL no responde
    Given que PostgreSQL no esta disponible
    When consulto el estado de readiness
    Then la API rechaza la instancia con estado de servicio no disponible
