# 📙 Manual de CI/CD Backend

## Introducción

El **Continuous Integration/Continuous Deployment (CI/CD)** de Taxi Pro automatiza las pruebas y despliegues del backend, asegurando que:

- Cada commit sea probado automáticamente
- Las reglas de Firestore sean validadas
- Los estados de viajes mantengan su integridad
- No se despliegue código que rompa funcionalidades existentes

### Beneficios del CI/CD
- **Detección temprana** de errores
- **Despliegues seguros** y consistentes
- **Regresiones evitadas** mediante pruebas automatizadas
- **Colaboración mejorada** entre desarrolladores

## Archivo Principal

**Ubicación**: `.github/workflows/backend-ci.yml` 

### Triggers

```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch: # Permite ejecución manual
```

## Jobs del Workflow

### 1. **Setup y Preparación**

```yaml
- name: Checkout code
  uses: actions/checkout@v4

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'
```

### 2. **Instalación de Dependencias (Raíz)**

```yaml
- name: Install root dependencies
  run: npm ci
```

**Propósito**: Instalar herramientas de desarrollo, linters, y dependencias compartidas.

### 3. **Instalación de Dependencias (Functions)**

```yaml
- name: Install functions dependencies
  working-directory: functions
  run: npm ci
```

**Propósito**: Instalar dependencias específicas de Cloud Functions.

### 4. **Ejecución de Unit Tests**

```yaml
- name: Run unit tests
  run: npm test
```

**Cobertura incluye**:
- Validación de funciones de estado (`canTransition()` )
- Helpers de autenticación y roles
- Utilidades de procesamiento de datos
- Validadores de entrada

### 5. **Tests de Reglas Firestore con Emulador**

```yaml
- name: Run Firestore rules tests
  run: npx firebase emulators:exec --only firestore "npm run test:rules"
```

**Validaciones incluidas**:
- Permisos de lectura/escritura por rol
- Restricciones de campos críticos
- Validación de transiciones de estados
- Seguridad de colecciones sensibles

## Ejecución Local

### Prerequisitos

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Instalar Java (para emuladores)
# macOS: brew install openjdk@11
# Ubuntu: sudo apt install openjdk-11-jdk
```

### Comandos para desarrollo

```bash
# Instalar todas las dependencias
npm ci && cd functions && npm ci && cd ..

# Ejecutar unit tests
npm test

# Ejecutar tests de funciones específicamente
npm run test:functions

# Ejecutar tests de reglas con emulador
npx firebase emulators:exec --only firestore "npm run test:rules"

# Ejecutar emulador completo (desarrollo)
firebase emulators:start
```

### Scripts disponibles en package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:functions": "cd functions && npm test",
    "test:rules": "jest firestore.rules.test.js",
    "test:watch": "jest --watch",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## Ambientes y Deploy

### Ambientes configurados

| Ambiente | Branch | Firebase Project | Auto-deploy |
|----------|--------|------------------|-------------|
| **Development** | `develop`  | `taxi-pro-dev`  | ✅ |
| **Staging** | `staging`  | `taxi-pro-stage`  | ✅ |
| **Production** | `main`  | `taxi-pro-prod`  | 🔒 Manual |

### Proceso de Deploy

```yaml
# Deploy automático a development
- name: Deploy to development
  if: github.ref == 'refs/heads/develop'
  run: |
    firebase use taxi-pro-dev
    firebase deploy --only functions,firestore:rules

# Deploy a production (manual approval requerido)
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  environment: production
  run: |
    firebase use taxi-pro-prod
    firebase deploy --only functions,firestore:rules
```

## Monitoreo y Notificaciones

### Estado del Pipeline

- ✅ **Badge de estado** en README
- 📧 **Notificaciones por email** en fallos
- 💬 **Integración con Slack** para deploys exitosos

### Métricas importantes

- **Tiempo de ejecución** del pipeline (~3-5 minutos)
- **Cobertura de tests** (objetivo: >80%)
- **Frecuencia de deploys** (daily en dev, weekly en prod)

### Comando para verificar estado

```bash
# Ver último estado de CI
gh workflow list

# Ver detalles de última ejecución
gh run list --limit 1

# Ver logs de fallo específico
gh run view [run-id] --log-failed
```

## Reglas de Calidad

### ✅ Criteria de Aprobación

- Todos los unit tests pasan
- Tests de reglas Firestore pasan
- Cobertura de código > 75%
- Linting sin errores críticos
- Build exitoso de funciones

### 🔒 Protecciones de Branch

- **main**: Requiere review + CI green
- **develop**: Requiere CI green
- **hotfix/***: Review requerido

### 📋 Checklist pre-deploy

- [ ] Tests locales pasan
- [ ] Reglas probadas con emulador
- [ ] Variables de entorno actualizadas
- [ ] Documentación actualizada
- [ ] Rollback plan definido

---

## 🚀 Próximos Pasos

1. **Capturas de pantalla** de GitHub Actions en ejecución
2. **Diagramas de flujo** para máquina de estados visuales
3. **Ejemplos completos** de reglas Firestore con casos edge
4. **Métricas y dashboards** de monitoreo de CI/CD
