import logging
import sys
from typing import Any, Dict
import json
from datetime import datetime, timezone

class StructuredJsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "robot_id"):
            log_obj["robot_id"] = record.robot_id
        if hasattr(record, "operator_id"):
            log_obj["operator_id"] = record.operator_id
        if hasattr(record, "event_type"):
            log_obj["event_type"] = record.event_type
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredJsonFormatter())
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = [handler]
    
    # Silence overly verbose uvicorn access logs if desired
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

logger = logging.getLogger("remotebot")
