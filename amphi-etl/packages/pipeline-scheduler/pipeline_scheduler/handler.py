# handler.py  (backend)  ─────────────────────────────────────
import os, json, logging, subprocess
import sys
import tornado
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor, ProcessPoolExecutor
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

    raise ValueError(f"Invalid schedule_type: {kind}")

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

# ── task runner ─────────────────────────────────────────────────────────────
def run_pipeline(pipeline_or_code, **_meta):
    """
    Execute the scheduled pipeline.

    * If *pipeline_or_code* points to a file that exists (relative to _AMPHI_ROOT if needed), run it with
      the current Python interpreter.
    * Otherwise treat the string as raw Python and run it with: python -c "<code>".
    """
    try:
        root = _AMPHI_ROOT or os.getcwd()

        # Build an absolute candidate and only then decide if it is a file
        candidate = pipeline_or_code
        if not os.path.isabs(candidate):
            candidate = os.path.join(root, pipeline_or_code)

        if os.path.isfile(candidate):
            cmd = [sys.executable, candidate]
        else:
            cmd = [sys.executable, "-c", pipeline_or_code]

        # Run inside the workspace root so relative IO in scripts works
        res = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=root,
        )

        success = (res.returncode == 0)

        if success:
            logger.info("Pipeline OK (exit %s)\nSTDOUT:\n%s", res.returncode, res.stdout)
            if res.stderr:
                logger.warning("Pipeline STDERR:\n%s", res.stderr)
        else:
            logger.error("Pipeline FAILED (exit %s)\nSTDOUT:\n%s\nSTDERR:\n%s",
                         res.returncode, res.stdout, res.stderr)

        return {
            "success": success,
            "output": res.stdout,
            "error": res.stderr if res.stderr else None,
            "exit_code": res.returncode,
        }

    except Exception as e:
        logger.exception("Exception while running pipeline")
        return {"success": False, "error": str(e)}


class SchedulerConfigHandler(APIHandler):
    """Tiny read-only endpoint that tells the plugin where the DB lives."""
    @tornado.web.authenticated
    async def get(self):
        self.finish(json.dumps({"amphi_dir": _amphi_dir()}))

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
            
            # Determine what to execute: python_code takes precedence over pipeline_path
            executable = body.get("python_code") or body.get("pipeline_path")
            if not executable:
                raise ValueError("Either pipeline_path or python_code is required")
            
            # Store the original pipeline_path for display purposes
            pipeline_path = body.get("pipeline_path", "")

            trigger, kind = _make_trigger(body)

            # runtime controls (with sensible defaults)
            max_instances = int(body.get("max_instances", 2))
            coalesce      = bool(body.get("coalesce", True))
            misfire_grace = int(body.get("misfire_grace_time", 60))

            # Keep original parameters so we can round-trip them later
            kwargs = {"pipeline_path": pipeline_path}
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

            job = scheduler.add_job(
                run_pipeline,
                trigger=trigger,
                args=[executable],
                kwargs=kwargs,
                misfire_grace_time=misfire_grace,
                coalesce=coalesce,
                max_instances=max_instances,
                id=body.get("id"),
                name=body.get("name", f"job_{dt.datetime.now():%Y%m%d%H%M%S}"),
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
        result = run_pipeline(job.args[0], **job.kwargs)
        self.finish(json.dumps(result))

# ── extension wiring ────────────────────────────────────────────────────────
def setup_handlers(web_app):
    base = web_app.settings["base_url"]
    host = ".*$"
    web_app.add_handlers(host, [
        (url_path_join(base, "pipeline-scheduler", "jobs"), SchedulerListHandler),
        (url_path_join(base, "pipeline-scheduler", "jobs", "(.+)"), SchedulerJobHandler),
        (url_path_join(base, "pipeline-scheduler", "run",  "(.+)"), SchedulerRunHandler),
        (url_path_join(base, "pipeline-scheduler", "config"), SchedulerConfigHandler)
    ])

def _jupyter_server_extension_paths():
    return [{"module": "pipeline_scheduler.handler"}]

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
    scheduler.start()
    setup_handlers(nb_server_app.web_app)
    nb_server_app.log.info("🚀 Pipeline Scheduler extension loaded")