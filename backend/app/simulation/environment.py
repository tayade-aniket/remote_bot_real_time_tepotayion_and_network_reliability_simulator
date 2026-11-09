import math
from typing import List, Dict, Any, Tuple, Optional
from collections import deque

class CircularObstacle:
    def __init__(self, x: float, y: float, radius: float, name: str = "Pillar"):
        self.x = x
        self.y = y
        self.radius = radius
        self.name = name

    def intersects(self, robot_x: float, robot_y: float, robot_radius: float) -> bool:
        dist_sq = (self.x - robot_x) ** 2 + (self.y - robot_y) ** 2
        min_dist = self.radius + robot_radius
        return dist_sq < (min_dist ** 2)

    def to_dict(self) -> Dict[str, Any]:
        return {"type": "circle", "x": self.x, "y": self.y, "radius": self.radius, "name": self.name}


class RectangularObstacle:
    def __init__(self, x: float, y: float, width: float, height: float, name: str = "Barrier"):
        # (x, y) is top-left corner
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.name = name

    def intersects(self, robot_x: float, robot_y: float, robot_radius: float) -> bool:
        # Closest point on rectangle to circle center
        closest_x = max(self.x, min(robot_x, self.x + self.width))
        closest_y = max(self.y, min(robot_y, self.y + self.height))
        
        distance_sq = (robot_x - closest_x) ** 2 + (robot_y - closest_y) ** 2
        return distance_sq < (robot_radius ** 2)

    def to_dict(self) -> Dict[str, Any]:
        return {"type": "rect", "x": self.x, "y": self.y, "width": self.width, "height": self.height, "name": self.name}


class VirtualEnvironment:
    """
    2D Simulation Environment with boundary walls and static obstacles.
    Default arena is 30m x 30m centered at (0, 0): [-15, 15] meters.
    """
    def __init__(
        self,
        min_x: float = -15.0,
        max_x: float = 15.0,
        min_y: float = -15.0,
        max_y: float = 15.0
    ):
        self.min_x = min_x
        self.max_x = max_x
        self.min_y = min_y
        self.max_y = max_y
        
        self.obstacles: List[Any] = []
        self._setup_default_obstacles()

    def _setup_default_obstacles(self):
        """Populate virtual arena with realistic warehouse/lab obstacles."""
        # Central circular column
        self.obstacles.append(CircularObstacle(0.0, 0.0, 1.2, name="Central Pillar"))
        
        # Quadrant pillars
        self.obstacles.append(CircularObstacle(-7.0, -7.0, 0.9, name="Column SW"))
        self.obstacles.append(CircularObstacle(7.0, -7.0, 0.9, name="Column SE"))
        self.obstacles.append(CircularObstacle(-7.0, 7.0, 0.9, name="Column NW"))
        self.obstacles.append(CircularObstacle(7.0, 7.0, 0.9, name="Column NE"))
        
        # Rectangular storage partitions / walls
        self.obstacles.append(RectangularObstacle(-11.0, -2.0, 4.0, 0.8, name="Wall West"))
        self.obstacles.append(RectangularObstacle(7.0, -2.0, 4.0, 0.8, name="Wall East"))
        self.obstacles.append(RectangularObstacle(-2.0, 8.0, 4.0, 0.8, name="Pallet Rack North"))
        self.obstacles.append(RectangularObstacle(-2.0, -9.0, 4.0, 0.8, name="Pallet Rack South"))

    def check_collision(
        self,
        candidate_x: float,
        candidate_y: float,
        robot_radius: float = 0.35
    ) -> Tuple[bool, Optional[str]]:
        """
        Returns (is_collision, collision_description)
        Checks both arena boundary limits and obstacle intersections.
        """
        # 1. Boundary walls check
        if (candidate_x - robot_radius) < self.min_x:
            return True, "Collided with West boundary wall"
        if (candidate_x + robot_radius) > self.max_x:
            return True, "Collided with East boundary wall"
        if (candidate_y - robot_radius) < self.min_y:
            return True, "Collided with South boundary wall"
        if (candidate_y + robot_radius) > self.max_y:
            return True, "Collided with North boundary wall"

        # 2. Obstacles check
        for obs in self.obstacles:
            if obs.intersects(candidate_x, candidate_y, robot_radius):
                return True, f"Collided with obstacle '{obs.name}'"

        return False, None

    def get_obstacles_metadata(self) -> List[Dict[str, Any]]:
        return [obs.to_dict() for obs in self.obstacles]
