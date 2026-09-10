"""
jobs.py — Cola de trabajos en proceso, con un solo trabajador.

Por qué hace falta: transcribir bloquea el servidor entre 20 y 90 segundos. Sin
cola, dos peticiones simultáneas se reparten los mismos núcleos y **ninguna
termina antes**. Medido con audio de 15 s: 1 petición 18.8 s, 2 a la vez 33.0 s,
3 a la vez 46.7 s — las tres esperando lo mismo.

Con un solo trabajador el primero espera 18.8 s en vez de 46.7, y los demás
saben exactamente cuánto les falta.

El motivo decisivo, sin embargo, es otro: nginx corta las peticiones a los 60 s
por defecto. Una transcripción larga muere ahí por muy bien que funcione el
backend. Con cola, toda petición HTTP dura milisegundos y el trabajo ocurre
aparte.

Deliberadamente en memoria y sin Redis: para un despliegue de una sola máquina,
Redis es infraestructura que hay que mantener a cambio de nada. Si algún día hay
varias máquinas, ahí sí toca cambiarlo — no antes. El precio es que un reinicio
pierde lo que hubiera en curso, cosa asumible cuando el usuario puede reintentar.
"""
from __future__ import annotations

import os
import queue
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable

# Cuántos encargos se aceptan esperando antes de rechazar por saturación
MAX_QUEUED = 20

# Cuánto se conserva un encargo terminado para que puedan recogerlo
TTL_DONE = 1800.0        # 30 min

# Si nada lo recoge y tampoco hay actividad, se descarta igualmente
TTL_ANY = 7200.0         # 2 h


@dataclass
class Job:
    id: str
    kind: str
    payload: dict
    eta: float                              # segundos estimados de trabajo
    status: str = "queued"                  # queued | running | done | error | cancelled
    created: float = field(default_factory=time.time)
    started: float | None = None
    finished: float | None = None
    result: Any = None
    error: str | None = None

    def age(self) -> float:
        return time.time() - (self.finished or self.created)


class QueueFull(Exception):
    """La cola está saturada; conviene rechazar en vez de arrastrarse."""


class JobQueue:
    """
    Cola con un único trabajador.

    Uno y no varios a propósito: el trabajo ya usa todos los núcleos por dentro
    (torch con 8 hilos), así que lanzar dos en paralelo solo los hace competir.
    """

    def __init__(self, handler: Callable[[str, dict], Any]):
        self._handler = handler
        self._q: queue.Queue[str] = queue.Queue()
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._current: str | None = None
        self._worker = threading.Thread(target=self._run, daemon=True, name="jobs")
        self._worker.start()

    # ── API pública ──────────────────────────────────────────────────────

    def submit(self, kind: str, payload: dict, eta: float) -> Job:
        with self._lock:
            self._sweep()
            pendientes = sum(1 for j in self._jobs.values() if j.status == "queued")
            if pendientes >= MAX_QUEUED:
                raise QueueFull(f"{pendientes} trabajos en espera")
            job = Job(id=uuid.uuid4().hex[:12], kind=kind, payload=payload, eta=eta)
            self._jobs[job.id] = job
        self._q.put(job.id)
        return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def cancel(self, job_id: str) -> bool:
        """Solo se puede cancelar lo que aún no ha empezado."""
        with self._lock:
            job = self._jobs.get(job_id)
            if job and job.status == "queued":
                job.status = "cancelled"
                job.finished = time.time()
                self._drop_payload(job)
                return True
        return False

    def snapshot(self, job_id: str) -> dict | None:
        """Estado de un encargo, con su posición y la espera estimada."""
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None

            info: dict[str, Any] = {
                "id": job.id,
                "status": job.status,
                "kind": job.kind,
            }

            if job.status == "queued":
                # Cuántos hay por delante y cuánto suman
                delante = [
                    j for j in self._jobs.values()
                    if j.status == "queued" and j.created < job.created
                ]
                espera = sum(j.eta for j in delante)
                # Lo que le queda al que se está ejecutando ahora mismo
                actual = self._jobs.get(self._current) if self._current else None
                if actual and actual.status == "running" and actual.started:
                    espera += max(0.0, actual.eta - (time.time() - actual.started))
                info["position"] = len(delante) + 1
                info["waitSeconds"] = round(espera)
                info["etaSeconds"] = round(espera + job.eta)

            elif job.status == "running":
                transcurrido = time.time() - (job.started or time.time())
                info["position"] = 0
                info["elapsedSeconds"] = round(transcurrido)
                info["etaSeconds"] = round(max(0.0, job.eta - transcurrido))
                # Tope en 95: el 100 lo marca la respuesta real, no una estimación
                info["progress"] = min(95, round(transcurrido / max(job.eta, 1) * 100))

            elif job.status == "done":
                info["progress"] = 100
                info["result"] = job.result
                info["tookSeconds"] = round((job.finished or 0) - (job.started or 0), 1)

            elif job.status == "error":
                info["error"] = job.error

            return info

    def stats(self) -> dict:
        with self._lock:
            estados: dict[str, int] = {}
            for j in self._jobs.values():
                estados[j.status] = estados.get(j.status, 0) + 1
            return {
                "queued": estados.get("queued", 0),
                "running": estados.get("running", 0),
                "done": estados.get("done", 0),
                "error": estados.get("error", 0),
                "maxQueued": MAX_QUEUED,
            }

    # ── Trabajador ───────────────────────────────────────────────────────

    def _run(self) -> None:
        while True:
            job_id = self._q.get()
            with self._lock:
                job = self._jobs.get(job_id)
                if job is None or job.status != "queued":
                    continue                      # cancelado mientras esperaba
                job.status = "running"
                job.started = time.time()
                self._current = job.id

            try:
                resultado = self._handler(job.kind, job.payload)
                with self._lock:
                    job.result = resultado
                    job.status = "done"
            except Exception as e:
                with self._lock:
                    job.error = f"{type(e).__name__}: {e}"
                    job.status = "error"
            finally:
                with self._lock:
                    job.finished = time.time()
                    self._current = None
                    self._drop_payload(job)

    # ── Limpieza ─────────────────────────────────────────────────────────

    def _drop_payload(self, job: Job) -> None:
        """Borra el archivo temporal del encargo; ya no hace falta."""
        path = job.payload.get("path")
        if path and os.path.exists(path):
            try:
                os.unlink(path)
            except OSError:
                pass
        job.payload = {}

    def _sweep(self) -> None:
        """Descarta encargos viejos para que el diccionario no crezca sin fin."""
        muertos = [
            jid for jid, j in self._jobs.items()
            if (j.status in ("done", "error", "cancelled") and j.age() > TTL_DONE)
            or j.age() > TTL_ANY
        ]
        for jid in muertos:
            self._drop_payload(self._jobs[jid])
            del self._jobs[jid]
