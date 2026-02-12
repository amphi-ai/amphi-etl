# handler.py  (backend)  ─────────────────────────────────────
import os, json, logging, subprocess
import sys
from typing import Optional
import uuid
import threading
import sqlite3
import tornado
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor, ProcessPoolExecutor
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import datetime as dt



logger = logging.getLogger(__name__)

# ── helpers ────────────────────────────────────────────────────────────────
def _make_trigger(body: dict):
    kind = body.get("schedule_type", "date")

    if kind == "date":
        date_type = body.get("date_type", "once")

        if date_type == "once":
            iso = body.get("run_date")
            if not iso:
                raise ValueError("run_date is required for one-time date trigger")
            run_date = _parse_iso_datetime(iso)
            return DateTrigger(run_date=run_date), "date"

        elif date_type == "daily":
            iso = body.get("run_date")
            if not iso:
                raise ValueError("run_date is required for daily trigger")
            start_time = _parse_iso_datetime(iso)
            return CronTrigger(hour=start_time.hour, minute=start_time.minute), "cron"

        elif date_type == "weekly":
            iso = body.get("run_date")
            if not iso:
                raise ValueError("run_date is required for weekly trigger")
            start_time = _parse_iso_datetime(iso)
            day_of_week = start_time.weekday()  # 0=Monday, 6=Sunday
            return CronTrigger(day_of_week=day_of_week, hour=start_time.hour, minute=start_time.minute), "cron"

        elif date_type == "monthly":
            iso = body.get("run_date")
            if not iso:
                raise ValueError("run_date is required for monthly trigger")
            start_time = _parse_iso_datetime(iso)
            return CronTrigger(day=start_time.day, hour=start_time.hour, minute=start_time.minute), "cron"

        elif date_type == "every_x_days":
            days = body.get("interval_days")
            if days is None:
                raise ValueError("interval_days is required for every_x_days trigger")
            return IntervalTrigger(days=int(days)), "interval"

        else:
            raise ValueError(f"Invalid date_type: {date_type}")

    if kind == "interval":
        secs = body.get("interval_seconds")
        if secs is None:
            raise ValueError("interval_seconds is required for interval trigger")
        return IntervalTrigger(seconds=int(secs)), "interval"

    if kind == "cron":
        expr = body.get("cron_expression")
        if not expr:
            raise ValueError("cron_expression is required for cron trigger")
        return _cron_from_string(expr), "cron"

    if kind == "trigger":
        # Trigger jobs are dependency-driven and fired manually by backend logic.
        # Give them a far-future date trigger so APScheduler can persist metadata.
        return DateTrigger(run_date=dt.datetime(2099, 1, 1)), "trigger"

    raise ValueError(f"Invalid schedule_type: {kind}")

def _normalise_trigger_conditions(raw):
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError("trigger_conditions must be an array")

    normalised = []
    for cond in raw:
        if not isinstance(cond, dict):
            raise ValueError("Each trigger condition must be an object")
        target_id = cond.get("job_id")
        outcome = cond.get("on")
        if not target_id or not isinstance(target_id, str):
            raise ValueError("Each trigger condition must include job_id")
        if outcome not in ("success", "failure"):
            raise ValueError("Each trigger condition must use on=success|failure")
        normalised.append({"job_id": target_id, "on": outcome})
    return normalised

def _normalise_logical_operator(raw):
    op = (raw or "AND")
    if not isinstance(op, str):
        raise ValueError("logical_operator must be a string")
    op = op.upper()
    if op not in ("AND", "OR"):
        raise ValueError("logical_operator must be AND or OR")
    return op

def _validate_trigger_conditions(conditions, job_id):
    if not conditions:
        raise ValueError("At least one trigger condition is required")

    for cond in conditions:
        source_job_id = cond["job_id"]
        if source_job_id == job_id:
            raise ValueError("A task cannot depend on itself")
        if scheduler.get_job(source_job_id) is None:
            raise ValueError(f"Condition references unknown job_id: {source_job_id}")

_JOB_STATUS = {}
_TRIGGER_LOCK = threading.RLock()
_RUNS_DB_PATH = None

def _record_job_status(job_id: str, success: bool):
    with _TRIGGER_LOCK:
        _JOB_STATUS[job_id] = {
            "success": success,
            "updated_at": dt.datetime.utcnow().isoformat() + "Z",
        }

def _conditions_match(conditions, logical_operator):
    with _TRIGGER_LOCK:
        checks = []
        for cond in conditions:
            status = _JOB_STATUS.get(cond["job_id"])
            if status is None:
                checks.append(False)
                continue
            expected_success = cond["on"] == "success"
            checks.append(status["success"] == expected_success)

    if not checks:
        return False
    if logical_operator == "AND":
        return all(checks)
    return any(checks)

def _init_runs_store(sqlite_path: str):
    global _RUNS_DB_PATH
    _RUNS_DB_PATH = sqlite_path
    with sqlite3.connect(_RUNS_DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scheduler_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT,
                job_name TEXT,
                status TEXT NOT NULL,
                triggered_by TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT NOT NULL,
                exit_code INTEGER,
                output TEXT,
                error TEXT
            )
            """
        )
        conn.commit()

def _save_run(run: dict):
    if not _RUNS_DB_PATH:
        return
    with sqlite3.connect(_RUNS_DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO scheduler_runs
            (job_id, job_name, status, triggered_by, started_at, finished_at, exit_code, output, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run.get("job_id"),
                run.get("job_name"),
                run.get("status"),
                run.get("triggered_by"),
                run.get("started_at"),
                run.get("finished_at"),
                run.get("exit_code"),
                run.get("output"),
                run.get("error"),
            ),
        )
        conn.commit()

def _list_runs(limit: int = 200):
    if not _RUNS_DB_PATH:
        return []
    safe_limit = max(1, min(int(limit), 1000))
    with sqlite3.connect(_RUNS_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, job_id, job_name, status, triggered_by, started_at, finished_at, exit_code, output, error
            FROM scheduler_runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()
        return [dict(row) for row in rows]

def _get_run(run_id: int):
    if not _RUNS_DB_PATH:
        return None
    with sqlite3.connect(_RUNS_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT id, job_id, job_name, status, triggered_by, started_at, finished_at, exit_code, output, error
            FROM scheduler_runs
            WHERE id = ?
            """,
            (run_id,),
        ).fetchone()
        return dict(row) if row else None

def _evaluate_trigger_jobs(changed_job_id: str):
    for job in scheduler.get_jobs():
        if job.id == changed_job_id:
            continue

        if job.kwargs.get("schedule_type") != "trigger":
            continue

        conditions = job.kwargs.get("trigger_conditions") or []
        if not any(cond.get("job_id") == changed_job_id for cond in conditions):
            continue

        logical_operator = _normalise_logical_operator(job.kwargs.get("logical_operator"))
        if not _conditions_match(conditions, logical_operator):
            continue

        result = run_pipeline(job.args[0], _triggered_by="trigger", **job.kwargs)
        _record_job_status(job.id, bool(result.get("success")))

def _cron_to_crontab(trigger: CronTrigger) -> str:
    """Convert a CronTrigger to a 5-field crontab string (minute hour dom mon dow)."""
    minute = str(trigger.fields[6])      # APS fields order: year,mon,day,week,dow,hour,min,sec
    hour   = str(trigger.fields[5])
    dom    = str(trigger.fields[2])
    month  = str(trigger.fields[1])
    dow    = str(trigger.fields[4])
    return f"{minute} {hour} {dom} {month} {dow}"

def _cron_from_string(expr: str) -> CronTrigger:
    parts = expr.split()
    if len(parts) == 5:
        minute, hour, dom, month, dow = parts
        second = "0"
    elif len(parts) == 6:
        second, minute, hour, dom, month, dow = parts
    else:
        raise ValueError(f"Wrong number of fields; got {len(parts)}, expected 5 or 6")

    return CronTrigger(
        second=second,
        minute=minute,
        hour=hour,
        day=dom,
        month=month,
        day_of_week=dow,
    )

def _serialise(job):
    """Return a dict with a stable shape for both APScheduler 3.x and 4.x."""
    # APS 3.x -> next_run_time | APS 4.x -> next_fire_time
    next_time = getattr(job, "next_run_time", getattr(job, "next_fire_time", None))

    # Get the pipeline_path from kwargs (where we store it), not from args
    pipeline_path = job.kwargs.get("pipeline_path", "")

    base = {
        "id": job.id,
        "name": job.name,
        "next_run_time": next_time.isoformat() if next_time else None,
        "pipeline_path": pipeline_path,
        "trigger": str(job.trigger),
    }

    if job.kwargs.get("schedule_type") == "trigger":
        base.update(
            trigger="Trigger",
            schedule_type="trigger",
            logical_operator=_normalise_logical_operator(job.kwargs.get("logical_operator")),
            trigger_conditions=job.kwargs.get("trigger_conditions") or [],
        )
        return base

    if isinstance(job.trigger, DateTrigger):
        base.update(
            schedule_type="date",
            date_type=job.kwargs.get("date_type", "once"),
            run_date=job.kwargs.get("run_date"),
            coalesce=getattr(job, "coalesce", None),
            max_instances=getattr(job, "max_instances", None),
            misfire_grace_time=getattr(job, "misfire_grace_time", None),
        )
    elif isinstance(job.trigger, IntervalTrigger):
        # Check if this is from a date-based every_x_days schedule
        if job.kwargs.get("date_type") == "every_x_days":
            base.update(
                schedule_type="date",
                date_type="every_x_days",
                interval_days=job.kwargs.get("interval_days")
                or int(job.trigger.interval.total_seconds() / 86400),  # convert seconds to days
            )
        else:
            base.update(
                schedule_type="interval",
                interval_seconds=job.kwargs.get("interval_seconds")
                or int(job.trigger.interval.total_seconds()),
            )
    elif isinstance(job.trigger, CronTrigger):
        # Check if this is from a date-based schedule (daily, weekly, monthly)
        date_type = job.kwargs.get("date_type")
        if date_type in ("daily", "weekly", "monthly"):
            base.update(
                schedule_type="date",
                date_type=date_type,
                run_date=job.kwargs.get("run_date"),
            )
        else:
            cron_expr = job.kwargs.get("cron_expression") or _cron_to_crontab(job.trigger)
            base.update(schedule_type="cron", cron_expression=cron_expr)

    return base


def _parse_iso_datetime(iso: str) -> dt.datetime:
    if iso.endswith('Z'):
        iso = iso[:-1] + '+00:00'
    return dt.datetime.fromisoformat(iso)


scheduler = BackgroundScheduler()

_AMPHI_ROOT = None      # will be filled once Jupyter tells us where it lives


def _amphi_dir() -> str:
    """Folder given with --notebook-dir / --root-dir when JupyterLab was started."""
    return _AMPHI_ROOT or os.getcwd()     # sane fallback for unit tests/CLI

def _resolve_workdir(root: str, pipeline_path: Optional[str]) -> str:
    """
    Resolve execution cwd from pipeline location.

    If a pipeline path is available, use its parent directory so relative paths
    in generated/script code behave like when the pipeline is developed manually.
    """
    if not pipeline_path:
        return root

    absolute_path = pipeline_path
    if not os.path.isabs(absolute_path):
        absolute_path = os.path.join(root, absolute_path)
    absolute_path = os.path.abspath(absolute_path)

    candidate_dir = absolute_path if os.path.isdir(absolute_path) else os.path.dirname(absolute_path)
    return candidate_dir if os.path.isdir(candidate_dir) else root

# ── task runner ─────────────────────────────────────────────────────────────
def run_pipeline(pipeline_or_code, **meta):
    """
    Execute the scheduled pipeline.

    * If *pipeline_or_code* points to a file that exists (relative to _AMPHI_ROOT if needed), run it with
      the current Python interpreter.
    * Otherwise treat the string as raw Python and run it with: python -c "<code>".
    """
    try:
        started_at = dt.datetime.utcnow().isoformat() + "Z"
        root = _AMPHI_ROOT or os.getcwd()
        pipeline_path = meta.get("pipeline_path")
        run_cwd = _resolve_workdir(root, pipeline_path)
        triggered_by = meta.get("_triggered_by", "schedule")

        # Build an absolute candidate and only then decide if it is a file
        candidate = pipeline_or_code
        if not os.path.isabs(candidate):
            candidate = os.path.join(root, pipeline_or_code)

        if os.path.isfile(candidate):
            cmd = [sys.executable, candidate]
        else:
            cmd = [sys.executable, "-c", pipeline_or_code]

        # Run from pipeline directory so relative IO resolves from pipeline location
        res = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=run_cwd,
        )

        success = (res.returncode == 0)
        finished_at = dt.datetime.utcnow().isoformat() + "Z"

        if success:
            logger.info("Pipeline OK (exit %s)\nSTDOUT:\n%s", res.returncode, res.stdout)
            if res.stderr:
                logger.warning("Pipeline STDERR:\n%s", res.stderr)
        else:
            logger.error("Pipeline FAILED (exit %s)\nSTDOUT:\n%s\nSTDERR:\n%s",
                         res.returncode, res.stdout, res.stderr)

        result = {
            "success": success,
            "output": res.stdout,
            "error": res.stderr if res.stderr else None,
            "exit_code": res.returncode,
            "cwd": run_cwd,
        }
        _save_run(
            {
                "job_id": meta.get("job_id"),
                "job_name": meta.get("job_name"),
                "status": "success" if success else "failure",
                "triggered_by": triggered_by,
                "started_at": started_at,
                "finished_at": finished_at,
                "exit_code": res.returncode,
                "output": res.stdout,
                "error": res.stderr if res.stderr else None,
            }
        )
        return result

    except Exception as e:
        logger.exception("Exception while running pipeline")
        finished_at = dt.datetime.utcnow().isoformat() + "Z"
        _save_run(
            {
                "job_id": meta.get("job_id"),
                "job_name": meta.get("job_name"),
                "status": "failure",
                "triggered_by": meta.get("_triggered_by", "schedule"),
                "started_at": started_at if "started_at" in locals() else finished_at,
                "finished_at": finished_at,
                "exit_code": None,
                "output": None,
                "error": str(e),
            }
        )
        return {"success": False, "error": str(e)}


class SchedulerConfigHandler(APIHandler):
    """Tiny read-only endpoint that tells the plugin where the DB lives."""
    @tornado.web.authenticated
    async def get(self):
        self.finish(json.dumps({"amphi_dir": _amphi_dir()}))

class SchedulerRunsHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            limit_arg = self.get_argument("limit", "200")
            self.finish(json.dumps({"runs": _list_runs(limit_arg)}))
        except Exception as e:
            logger.exception("Error listing runs")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class SchedulerRunDetailHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self, run_id):
        try:
            run = _get_run(int(run_id))
            if not run:
                self.set_status(404)
                self.finish(json.dumps({"error": "Run not found"}))
                return
            self.finish(json.dumps(run))
        except Exception as e:
            logger.exception("Error fetching run details")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

# ── HTTP handlers ───────────────────────────────────────────────────────────
class SchedulerListHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            self.finish(json.dumps({"jobs": [_serialise(j) for j in scheduler.get_jobs()]}))
        except Exception as e:
            logger.exception("Error listing jobs")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

    @tornado.web.authenticated
    async def post(self):
        try:
            # More robust JSON body parsing
            try:
                body = self.get_json_body()
                if body is None:
                    # Try to get the body and parse it manually
                    raw_body = self.request.body
                    if raw_body:
                        body = json.loads(raw_body.decode('utf-8'))
                    else:
                        raise ValueError("Request body is empty")
                elif isinstance(body, str):
                    # If it's a string, try to parse it as JSON
                    body = json.loads(body)
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                raise ValueError(f"Invalid JSON in request body: {e}")
            
            if not isinstance(body, dict):
                raise ValueError("Request body must be a JSON object")
            
            job_name = body.get("name", f"job_{dt.datetime.now():%Y%m%d%H%M%S}")

            # Determine what to execute: python_code takes precedence over pipeline_path
            executable = body.get("python_code") or body.get("pipeline_path")
            if not executable:
                raise ValueError("Either pipeline_path or python_code is required")
            
            # Store the original pipeline_path for display purposes
            pipeline_path = body.get("pipeline_path", "")

            trigger, kind = _make_trigger(body)
            job_id = body.get("id") or f"job_{uuid.uuid4().hex[:12]}"

            # runtime controls (with sensible defaults)
            max_instances = int(body.get("max_instances", 2))
            coalesce      = bool(body.get("coalesce", True))
            misfire_grace = int(body.get("misfire_grace_time", 60))

            # Keep original parameters so we can round-trip them later
            kwargs = {
                "pipeline_path": pipeline_path,
                "schedule_type": body.get("schedule_type", kind),
                "job_id": job_id,
                "job_name": job_name,
            }
            if kind == "cron":
                kwargs["cron_expression"] = body.get("cron_expression")
                # Store date_type if it was a date-based cron
                if body.get("schedule_type") == "date":
                    kwargs["date_type"] = body.get("date_type")
                    kwargs["run_date"] = body.get("run_date")
            elif kind == "interval":
                kwargs["interval_seconds"] = body.get("interval_seconds")
                # Store date_type if it was every_x_days
                if body.get("schedule_type") == "date" and body.get("date_type") == "every_x_days":
                    kwargs["date_type"] = body.get("date_type")
                    kwargs["interval_days"] = body.get("interval_days")
            elif kind == "date":
                kwargs["run_date"] = body.get("run_date")
                kwargs["date_type"] = body.get("date_type", "once")
            elif kind == "trigger":
                kwargs["logical_operator"] = _normalise_logical_operator(body.get("logical_operator"))
                kwargs["trigger_conditions"] = _normalise_trigger_conditions(body.get("trigger_conditions"))
                _validate_trigger_conditions(kwargs["trigger_conditions"], job_id)

            job = scheduler.add_job(
                run_pipeline,
                trigger=trigger,
                args=[executable],
                kwargs=kwargs,
                misfire_grace_time=misfire_grace,
                coalesce=coalesce,
                max_instances=max_instances,
                id=job_id,
                name=job_name,
                replace_existing=bool(body.get("id")),  # replace to update persisted jobs
            )
            self.finish(json.dumps(_serialise(job)))
        except Exception as e:
            logger.exception("Error creating job")
            self.set_status(400)
            self.finish(json.dumps({"error": str(e)}))

class SchedulerJobHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self, job_id):
        job = scheduler.get_job(job_id)
        if not job:
            self.set_status(404)
            self.finish(json.dumps({"error": "Job not found"}))
            return
        self.finish(json.dumps(_serialise(job)))

    @tornado.web.authenticated
    async def delete(self, job_id):
        try:
            scheduler.remove_job(job_id)
            self.finish(json.dumps({"success": True}))
        except Exception as e:
            self.set_status(404)
            self.finish(json.dumps({"error": str(e)}))
            
    @tornado.web.authenticated
    async def put(self, job_id):
        job = scheduler.get_job(job_id)
        if not job:
            self.set_status(404)
            self.finish(json.dumps({"error": "Job not found"}))
            return

        try:
            body = self.get_json_body() or {}
            # modify general options
            changes = {}
            for k in ("name", "misfire_grace_time", "coalesce", "max_instances"):
                if k in body:
                    changes[k] = body[k]
            if changes:
                scheduler.modify_job(job_id, **changes)

            # optionally replace trigger
            if "schedule_type" in body:
                trigger, _ = _make_trigger(body)
                scheduler.reschedule_job(job_id, trigger=trigger)

            job = scheduler.get_job(job_id)
            self.finish(json.dumps(_serialise(job)))
        except Exception as e:
            logger.exception("Error updating job")
            self.set_status(400)
            self.finish(json.dumps({"error": str(e)}))

class SchedulerRunHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self, job_id):
        job = scheduler.get_job(job_id)
        if not job:
            self.set_status(404)
            self.finish(json.dumps({"error": "Job not found"}))
            return
        result = run_pipeline(job.args[0], _triggered_by="manual", **job.kwargs)
        _record_job_status(job.id, bool(result.get("success")))
        _evaluate_trigger_jobs(job.id)
        self.finish(json.dumps(result))

# ── extension wiring ────────────────────────────────────────────────────────
def setup_handlers(web_app):
    base = web_app.settings["base_url"]
    host = ".*$"
    web_app.add_handlers(host, [
        (url_path_join(base, "pipeline-scheduler", "jobs"), SchedulerListHandler),
        (url_path_join(base, "pipeline-scheduler", "jobs", "(.+)"), SchedulerJobHandler),
        (url_path_join(base, "pipeline-scheduler", "run",  "(.+)"), SchedulerRunHandler),
        (url_path_join(base, "pipeline-scheduler", "runs"), SchedulerRunsHandler),
        (url_path_join(base, "pipeline-scheduler", "runs", "(.+)"), SchedulerRunDetailHandler),
        (url_path_join(base, "pipeline-scheduler", "config"), SchedulerConfigHandler)
    ])

def _jupyter_server_extension_paths():
    return [{"module": "pipeline_scheduler.handler"}]

def _on_job_event(event):
    try:
        job_id = getattr(event, "job_id", None)
        if not job_id:
            return
        success = getattr(event, "exception", None) is None
        _record_job_status(job_id, success)
        _evaluate_trigger_jobs(job_id)
    except Exception:
        logger.exception("Error while evaluating trigger jobs")

def load_jupyter_server_extension(nb_server_app):
    """Initialise the pipeline-scheduler extension."""
    global _AMPHI_ROOT, logger

    _AMPHI_ROOT = (
        getattr(nb_server_app, "preferred_dir", None)
        or getattr(nb_server_app, "root_dir", None)
        or os.getcwd()
    )
    # reuse Jupyter's logger so you actually see messages
    logger = nb_server_app.log

    nb_server_app.log.info("🚀 _AMPHI_ROOT resolved to %s", _AMPHI_ROOT)

    amphi_data_dir = os.path.join(_AMPHI_ROOT, ".amphi")
    os.makedirs(amphi_data_dir, exist_ok=True)
    sqlite_path = os.path.join(amphi_data_dir, "scheduler.sqlite")
    scheduler.configure(
        executors={
            "default": ThreadPoolExecutor(max_workers=10),
            "processpool": ProcessPoolExecutor(max_workers=2),
        },
        job_defaults={"coalesce": True, "max_instances": 10},
        jobstores={"default": SQLAlchemyJobStore(url=f"sqlite:///{sqlite_path}")},
        # timezone="Europe/Zurich",
    )
    _init_runs_store(sqlite_path)
    scheduler.start()
    scheduler.add_listener(_on_job_event, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)
    setup_handlers(nb_server_app.web_app)
    nb_server_app.log.info("🚀 Pipeline Scheduler extension loaded")
