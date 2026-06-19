# Server Pilot

Panel de administración de servidores Linux, autoalojado y accesible desde cualquier lugar vía Cloudflare Tunnel. Permite gestionar métricas en tiempo real, terminal SSH, contenedores Docker, servicios systemd, archivos SFTP, runbooks y hardware (iDRAC/IPMI) desde una única interfaz web.

![dashboard](docs/dashboard.png)

---

## ¿Qué resuelve?

Administrar un servidor Linux normalmente requiere abrir varias herramientas: Portainer para Docker, SSH en terminal, Grafana para métricas, acceso web al iDRAC... Server Pilot centraliza todo en un solo panel con autenticación propia, accesible de forma segura desde Internet sin exponer puertos.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Spring Boot 3 (Java 21), WebSocket, SSH (JSch), SFTP |
| Frontend | Angular 20 · Standalone components · Signals · Angular Material |
| Contenedores | Docker + Docker Compose |
| Proxy / Acceso | nginx · Cloudflare Tunnel (sin puertos abiertos al exterior) |
| Observabilidad | Prometheus + Grafana (stack opcional) |
| Persistencia | JSONL + JSON (sin base de datos externa) |

---

## Features

- **Dashboard en tiempo real** — CPU, RAM, disco, red vía WebSocket con gráficos de tendencia (1h / 24h / 7d)
- **Terminal SSH** — xterm.js conectado al servidor vía WebSocket
- **Gestión de Docker** — listar, iniciar, detener y reiniciar contenedores; logs en vivo
- **Servicios systemd** — listar unidades, start/stop/restart, journal en tiempo real
- **File Manager SFTP** — navegar, editar, subir (drag & drop), descargar y borrar archivos
- **iDRAC / IPMI** — control de energía del servidor (power on/off/reset, estado de sensores)
- **Runbooks** — scripts predefinidos ejecutados vía SSH con salida en tiempo real
- **Actualizaciones del SO** — detección y aplicación de `apt` upgrades
- **Alertas** — webhook configurable (Slack, Discord, ntfy, genérico)
- **Historial de métricas** — muestras cada 60 segundos, persistidas en JSONL, purga automática a los 7 días
- **Audit log** — registro de todas las acciones destructivas
- **Hardening de acceso** — lockout tras N intentos fallidos, credenciales almacenadas como BCrypt hash
- **UI responsive** — diseñada para escritorio y móvil (375px+)

---

## Arquitectura

```
Internet
  └── Cloudflare Tunnel
        └── nginx (proxy inverso)
              ├── /         → Angular SPA (static)
              ├── /api/*    → Spring Boot :8090
              └── /ws/*     → WebSocket Spring Boot :8090

Spring Boot
  ├── REST API  (/api/*)
  ├── WebSocket (/ws/metrics, /ws/terminal, /ws/journal/*)
  ├── SSH/SFTP  → servidor Linux (JSch)
  └── Docker    → /var/run/docker.sock

Datos persistidos en volumen Docker (/data):
  settings.json · audit.jsonl · metrics-history.jsonl
```

---

## Cómo correrlo

### Requisitos

- Docker y Docker Compose
- Clave SSH con acceso al servidor a administrar
- (Opcional) Cloudflare Tunnel para acceso remoto

### 1. Clonar y configurar

```bash
git clone https://github.com/tu-usuario/server-pilot.git
cd server-pilot
cp .env.example .env
# Editá .env con tus credenciales y la IP/usuario SSH de tu servidor
```

### 2. Levantar

```bash
docker compose up -d --build
```

El panel queda disponible en `http://localhost:3000`.

Credenciales iniciales: las definidas en `.env` (`SP_USER` / `SP_PASS`). Podés cambiarlas desde **Configuración → Acceso al panel**.

### 3. Stack de observabilidad (opcional)

```bash
docker compose -f docker-compose.observability.yml up -d
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (mismas credenciales que el panel)

---

## Variables de entorno

Ver [`.env.example`](.env.example) para la lista completa con descripción.

| Variable | Default | Descripción |
|---|---|---|
| `SP_USER` | `admin` | Usuario del panel |
| `SP_PASS` | `changeme` | Contraseña inicial |
| `SP_SSH_HOST` | `host.docker.internal` | IP/hostname del servidor a gestionar |
| `SP_SSH_USER` | `ubuntu` | Usuario SSH |
| `SP_SSH_KEY` | `/root/.ssh/id_rsa` | Ruta a la clave privada SSH |
| `SP_DATA` | `/data` | Ruta interna donde se guardan los datos |

---

## Capturas

| Dashboard | Terminal SSH |
|---|---|
| ![dashboard](docs/dashboard.png) | ![terminal](docs/terminal.png) |

| File Manager | Systemd |
|---|---|
| ![files](docs/files.png) | ![systemd](docs/systemd.png) |

---

## Licencia

MIT
