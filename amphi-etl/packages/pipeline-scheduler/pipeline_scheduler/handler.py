# handler.py  (backend)  ─────────────────────────────────────
import os, json, logging, datetime, subprocess
import tornado
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join

logger = logging.getLogger(__name__)

# ── helpers ────────────────────────────────────────────────────────────────
def _make_trigger(body: dict):
    """Return (trigger, schedule_type)."""
    kind = body.get("schedule_type", "date")

    if kind == "date":
        iso = body.get("run_date")
        if not iso:
            raise ValueError("run_date is required for date trigger")
        run_date = datetime.datetime.fromisoformat(iso)
        return DateTrigger(run_date=run_date), "date"

    if kind == "interval":
        secs = body.get("interval_seconds")
        if secs is None:
            raise ValueError("interval_seconds is required for interval trigger")
        return IntervalTrigger(seconds=int(secs)), "interval"

    if kind == "cron":
        expr = body.get("cron_expression")
        if not expr:
            raise ValueError("cron_expression is required for cron trigger")
        # standard 5-field crontab string → CronTrigger
        return CronTrigger.from_crontab(expr), "cron"

    raise ValueError(f"Invalid schedule_type: {kind}")

def _cron_to_crontab(trigger: CronTrigger) -> str:
    """Convert a CronTrigger to a 5-field crontab string (minute hour dom mon dow)."""
    minute = str(trigger.fields[6])      # APS fields order: year,mon,day,week,dow,hour,min,sec
    hour   = str(trigger.fields[5])
    dom    = str(trigger.fields[2])
    month  = str(trigger.fields[1])
    dow    = str(trigger.fields[4])
    return f"{minute} {hour} {dom} {month} {dow}"

def _serialise(job):
    """Return a dict with a stable shape for both APScheduler 3.x and 4.x."""
    # APS 3.x -> next_run_time | APS 4.x -> next_fire_time
    next_time = getattr(job, "next_run_time", getattr(job, "next_fire_time", None))

    base = {
        "id": job.id,
        "name": job.name,
        "next_run_time": next_time.isoformat() if next_time else None,
        "pipeline_path": job.args[0] if job.args else None,
        "trigger": str(job.trigger),
    }

    if isinstance(job.trigger, DateTrigger):
        base.update(
            schedule_type="date",
            run_date=job.kwargs.get("run_date") or job.trigger.run_date.isoformat(),
        )
    elif isinstance(job.trigger, IntervalTrigger):
        base.update(
            schedule_type="interval",
            interval_seconds=job.kwargs.get("interval_seconds")
            or int(job.trigger.interval.total_seconds()),
        )
    elif isinstance(job.trigger, CronTrigger):
        cron_expr = job.kwargs.get("cron_expression") or _cron_to_crontab(job.trigger)
        base.update(schedule_type="cron", cron_expression=cron_expr)

    return base


scheduler = BackgroundScheduler()

_AMPHI_ROOT = None      # will be filled once Jupyter tells us where it lives


def _amphi_dir() -> str:
    """Folder given with --notebook-dir / --root-dir when JupyterLab was started."""
    return _AMPHI_ROOT or os.getcwd()     # sane fallback for unit tests/CLI

# ── task runner ─────────────────────────────────────────────────────────────
def run_pipeline(pipeline_or_code, **_meta):
    """
    Execute the scheduled pipeline.

    * If *pipeline_or_code* points to a file that exists, run it with
      `python <file>`.
    * Otherwise treat the string as raw Python and run it with
      `python -c "<code>"`.
    """
    try:
        if os.path.isfile(pipeline_or_code):
            abs_path = (
                pipeline_or_code
                if os.path.isabs(pipeline_or_code)
                else os.path.join(_AMPHI_ROOT, pipeline_or_code)
            )
            cmd = ["python", abs_path]
        else:
            cmd = ["python", "-c", pipeline_or_code]

        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        logger.info(res.stdout)
        return {"success": True, "output": res.stdout}
    except subprocess.CalledProcessError as e:
        logger.error(e.stderr)
        return {"success": False, "error": e.stderr}


class SchedulerConfigHandler(APIHandler):
    """Tiny read-only endpoint that tells the plugin where the DB lives."""
    @tornado.web.authenticated
    async def get(self):
        self.finish(json.dumps({"amphi_dir": _amphi_dir()}))

# ── HTTP handlers ───────────────────────────────────────────────────────────
class SchedulerListHandler(APIHandler):
    # Single, non-duplicated implementations
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
            body = self.get_json_body() or {}
            # Accept raw Python code or a file path
            pipeline = body.get("python_code") or body.get("pipeline_path")
            if not pipeline:
                raise ValueError("pipeline_path or python_code is required")

            trigger, kind = _make_trigger(body)
            kwargs = {}
            if kind == "cron":
                kwargs["cron_expression"] = body["cron_expression"]
            elif kind == "interval":
                kwargs["interval_seconds"] = body["interval_seconds"]
            elif kind == "date":
                kwargs["run_date"] = body["run_date"]

            job = scheduler.add_job(
                run_pipeline,
                trigger=trigger,
                args=[pipeline],
                kwargs=kwargs,
                misfire_grace_time=60,
                id=body.get("id"),
                name=body.get("name", f"job_{datetime.datetime.now():%Y%m%d%H%M%S}"),
                replace_existing=bool(body.get("id")),
            )
            self.finish(json.dumps(_serialise(job)))
        except Exception as e:
            logger.exception("Error creating job")
            self.set_status(400)
            self.finish(json.dumps({"error": str(e)}))

    @tornado.web.authenticated
    async def get(self):
        try:
            self.finish(json.dumps({"jobs": [_serialise(j) for j in scheduler.get_jobs()]}))
        except Exception as e:
            logger.exception("Error listing jobs")
            self.set_status(500); self.finish(json.dumps({"error": str(e)}))

    @tornado.web.authenticated
    async def post(self):
        try:
            body = self.get_json_body() or {}
            pipeline = body.get("pipeline_path")
            if not pipeline:
                raise ValueError("pipeline_path is required")

            trigger, kind = _make_trigger(body)

            # keep original parameters so we can round-trip them later
            kwargs = {}
            if kind == "cron":
                kwargs["cron_expression"] = body["cron_expression"]
            elif kind == "interval":
                kwargs["interval_seconds"] = body["interval_seconds"]
            elif kind == "date":
                kwargs["run_date"] = body["run_date"]

            job = scheduler.add_job(
                run_pipeline,
                trigger=trigger,
                args=[pipeline],
                kwargs=kwargs,
                misfire_grace_time=60,                           # avoid “missed by 1 s” errors
                id=body.get("id"),
                name=body.get("name", f"job_{datetime.datetime.now():%Y%m%d%H%M%S}"),
                replace_existing=bool(body.get("id"))            # true if updating
            )
            self.finish(json.dumps(_serialise(job)))

        except Exception as e:
            logger.exception("Error creating job")
            self.set_status(400); self.finish(json.dumps({"error": str(e)}))

class SchedulerJobHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self, job_id):
        job = scheduler.get_job(job_id)
        if not job:
            self.set_status(404); self.finish(json.dumps({"error": "Job not found"})); return
        self.finish(json.dumps(_serialise(job)))

    @tornado.web.authenticated
    async def delete(self, job_id):
        try:
            scheduler.remove_job(job_id)
            self.finish(json.dumps({"success": True}))
        except Exception as e:
            self.set_status(404); self.finish(json.dumps({"error": str(e)}))

class SchedulerRunHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self, job_id):
        job = scheduler.get_job(job_id)
        if not job:
            self.set_status(404); self.finish(json.dumps({"error": "Job not found"})); return
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
        (url_path_join(base, "pipeline-scheduler", "config"), SchedulerConfigHandler)  # ← add this
    ])

def _jupyter_server_extension_paths():
    return [{"module": "pipeline_scheduler.handler"}]

def load_jupyter_server_extension(nb_server_app):
    """Initialise the pipeline-scheduler extension."""
    global _AMPHI_ROOT

    # 1. Work out the workspace directory in a way that survives Jupyter-Server v1→v2
    _AMPHI_ROOT = (
        getattr(nb_server_app, "preferred_dir", None)        # Jupyter-Server ≤2.4
        or getattr(nb_server_app, "root_dir", None)          # Jupyter-Server ≥2.5
        or os.getcwd()                                       # last-ditch fallback
    )
    nb_server_app.log.info("🚀 _AMPHI_ROOT resolved to %s", _AMPHI_ROOT)

    # 2. Configure APScheduler (DB goes under that root)
    amphi_data_dir = os.path.join(_AMPHI_ROOT, ".amphi")
    os.makedirs(amphi_data_dir, exist_ok=True)          # create once, no-op if present
    sqlite_path = os.path.join(amphi_data_dir, "scheduler.sqlite")
    scheduler.configure(jobstores={"default": SQLAlchemyJobStore(url=f"sqlite:///{sqlite_path}")})
    scheduler.start()

    # 3. Wire HTTP handlers
    setup_handlers(nb_server_app.web_app)
    nb_server_app.log.info("🚀 Pipeline Scheduler extension loaded")
