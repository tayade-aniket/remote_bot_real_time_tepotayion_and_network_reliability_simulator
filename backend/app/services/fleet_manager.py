import asyncio
import time
from typing import Dict, List, Optional, Any
from app.simulation.robot_engine import RobotEngine
from app.simulation.environment import VirtualEnvironment
from app.networking.impairment import NetworkSimulator
from app.networking.metrics import NetworkMetricsTracker
from app.core.config import settings
from app.core.logging import logger

class FleetManager:
    """
    Central service maintaining virtual robot instances, their physics loops,
    and associated network simulators.
    """
    def __init__(self):
        self.robots: Dict[str, RobotEngine] = {}
        self.network_sims: Dict[str, NetworkSimulator] = {}
        self.metrics_trackers: Dict[str, NetworkMetricsTracker] = {}
        self.shared_environment = VirtualEnvironment()
        self._running = False
        self._physics_task: Optional[asyncio.Task] = None
        
        # Initialize default fleet
        self._initialize_default_fleet()

    def _initialize_default_fleet(self):
        self.add_robot("robot_alpha", "RemoteBot Alpha", initial_x=-4.0, initial_y=-4.0, initial_theta=0.0)
        self.add_robot("robot_beta", "RemoteBot Beta", initial_x=4.0, initial_y=-4.0, initial_theta=3.14)
        self.add_robot("robot_gamma", "RemoteBot Gamma (Scout)", initial_x=-4.0, initial_y=4.0, initial_theta=1.57)

    def add_robot(
        self,
        robot_id: str,
        name: str,
        initial_x: float = -3.0,
        initial_y: float = -3.0,
        initial_theta: float = 0.0
    ) -> RobotEngine:
        if robot_id in self.robots:
            return self.robots[robot_id]

        engine = RobotEngine(
            robot_id=robot_id,
            name=name,
            initial_x=initial_x,
            initial_y=initial_y,
            initial_theta=initial_theta,
            environment=self.shared_environment
        )
        self.robots[robot_id] = engine
        self.network_sims[robot_id] = NetworkSimulator(robot_id)
        self.metrics_trackers[robot_id] = NetworkMetricsTracker(robot_id)
        
        logger.info(f"Initialized robot {robot_id} ({name}) at ({initial_x}, {initial_y})")
        return engine

    def get_robot(self, robot_id: str) -> Optional[RobotEngine]:
        return self.robots.get(robot_id)

    def get_network_sim(self, robot_id: str) -> Optional[NetworkSimulator]:
        return self.network_sims.get(robot_id)

    def get_metrics_tracker(self, robot_id: str) -> Optional[NetworkMetricsTracker]:
        return self.metrics_trackers.get(robot_id)

    def delete_robot(self, robot_id: str) -> bool:
        if robot_id in self.robots:
            del self.robots[robot_id]
            del self.network_sims[robot_id]
            del self.metrics_trackers[robot_id]
            return True
        return False

    def list_robots(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": r.robot_id,
                "name": r.name,
                "status": r.operating_mode,
                "battery_level": round(r.battery_level, 2),
                "position": {"x": round(r.x, 2), "y": round(r.y, 2)},
                "heading": round(r.theta, 2),
                "linear_velocity": round(r.linear_velocity, 2),
                "angular_velocity": round(r.angular_velocity, 2),
                "is_estopped": r.is_estopped,
                "lease_holder": r.lease_holder,
                "lease_active": r.is_lease_valid()
            }
            for r in self.robots.values()
        ]

    async def start(self):
        """Starts the asynchronous fixed-timestep physics simulation loop."""
        if self._running:
            return
        self._running = True
        self._physics_task = asyncio.create_task(self._physics_loop())
        logger.info(f"Started physics simulation loop at {settings.SIMULATION_HZ} Hz")

    async def stop(self):
        self._running = False
        if self._physics_task:
            self._physics_task.cancel()
            try:
                await self._physics_task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped physics simulation loop")

    async def _physics_loop(self):
        """
        Continuous fixed-timestep differential-drive physics integration loop.
        Wrapped in defensive try/catch to maintain system uptime even if a numerical anomaly occurs.
        """
        dt = 1.0 / settings.SIMULATION_HZ
        while self._running:
            try:
                start_time = time.monotonic()
                
                # Step every robot in the fleet
                for engine in list(self.robots.values()):
                    try:
                        engine.step(dt)
                    except Exception as e:
                        logger.error(f"Error stepping robot {engine.robot_id}: {e}", exc_info=True)

                elapsed = time.monotonic() - start_time
                sleep_time = max(0.001, dt - elapsed)
                await asyncio.sleep(sleep_time)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unhandled exception in fleet physics loop: {e}", exc_info=True)
                await asyncio.sleep(dt)

fleet_manager = FleetManager()
