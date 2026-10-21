export interface NavNode {
  id: string;
  x: number;
  z: number;
  neighbors: string[];
}

export class NavigationNetwork {
  public nodes: Map<string, NavNode> = new Map();

  constructor() {
    this.buildGraph();
  }

  private addNode(id: string, x: number, z: number, neighbors: string[]) {
    this.nodes.set(id, { id, x, z, neighbors });
  }

  private buildGraph() {
    // 1. Residential District Sidewalks & House Entrances
    this.addNode('home_ani_front', -38, -48, ['res_avenue_west', 'res_ani_door']);
    this.addNode('res_ani_door', -38, -38, ['home_ani_front']);

    this.addNode('home_vaishu_front', -26, -48, ['res_avenue_west', 'res_vaishu_door']);
    this.addNode('res_vaishu_door', -26, -38, ['home_vaishu_front']);

    this.addNode('home_chirag_front', -14, -48, ['res_avenue_west', 'school_avenue_center', 'res_chirag_door']);
    this.addNode('res_chirag_door', -14, -38, ['home_chirag_front']);

    this.addNode('home_shreya_front', -5, -48, ['school_avenue_center', 'res_shreya_door']);
    this.addNode('res_shreya_door', -5, -38, ['home_shreya_front']);

    this.addNode('home_zan_front', 10, -48, ['school_avenue_center', 'res_avenue_east', 'res_zan_door']);
    this.addNode('res_zan_door', 10, -38, ['home_zan_front']);

    this.addNode('home_shagun_front', 25, -48, ['res_avenue_east', 'res_shagun_door']);
    this.addNode('res_shagun_door', 25, -38, ['home_shagun_front']);

    this.addNode('home_jatin_front', 40, -48, ['res_avenue_east', 'res_jatin_door']);
    this.addNode('res_jatin_door', 40, -38, ['home_jatin_front']);

    this.addNode('res_avenue_west', -30, -52, ['home_ani_front', 'home_vaishu_front', 'home_chirag_front', 'school_avenue_center']);
    this.addNode('res_avenue_east', 25, -52, ['home_zan_front', 'home_shagun_front', 'home_jatin_front', 'school_avenue_center']);

    // 2. School Entrance & Interior Corridors
    this.addNode('school_avenue_center', 0, -52, ['main_avenue_north', 'school_gate', 'res_avenue_west', 'res_avenue_east']);
    this.addNode('school_gate', 0, -60, ['school_avenue_center', 'school_lobby']);
    this.addNode('school_lobby', 0, -68, ['school_gate', 'school_corridor_center']);

    this.addNode('school_corridor_center', 0, -78, ['school_lobby', 'school_class_a', 'school_corridor_east', 'school_corridor_west']);
    this.addNode('school_class_a', 0, -85, ['school_corridor_center']);

    this.addNode('school_corridor_west', -12, -78, ['school_corridor_center', 'school_library', 'school_class_b']);
    this.addNode('school_library', -20, -85, ['school_corridor_west']);
    this.addNode('school_class_b', -2, -95, ['school_corridor_west']);

    this.addNode('school_corridor_east', 14, -78, ['school_corridor_center', 'school_canteen', 'school_sports_exit']);
    this.addNode('school_canteen', 20, -85, ['school_corridor_east']);
    this.addNode('school_sports_exit', 32, -78, ['school_corridor_east', 'sports_pitch']);
    this.addNode('sports_pitch', 55, -75, ['school_sports_exit']);

    // 3. Central Avenue Sidewalk Network (North-South)
    this.addNode('main_avenue_north', 0, -45, ['school_avenue_center', 'avenue_sw_west_n', 'avenue_sw_east_n']);
    this.addNode('avenue_sw_west_n', -10, -30, ['main_avenue_north', 'avenue_sw_west_mid']);
    this.addNode('avenue_sw_east_n', 10, -30, ['main_avenue_north', 'avenue_sw_east_mid']);

    this.addNode('avenue_sw_west_mid', -10, 0, ['avenue_sw_west_n', 'downtown_plaza_west', 'avenue_sw_west_s']);
    this.addNode('avenue_sw_east_mid', 10, 0, ['avenue_sw_east_n', 'downtown_plaza_east', 'avenue_sw_east_s']);

    // 4. Downtown Plaza, Mall, Cafe & Park
    this.addNode('downtown_plaza_center', 0, 0, ['downtown_plaza_west', 'downtown_plaza_east', 'avenue_sw_west_mid', 'avenue_sw_east_mid']);
    this.addNode('downtown_plaza_west', -15, 0, ['downtown_plaza_center', 'cafe_entrance', 'park_path_main']);
    this.addNode('downtown_plaza_east', 15, 0, ['downtown_plaza_center', 'mall_entrance', 'arcade_path']);

    this.addNode('cafe_entrance', -18, 14, ['downtown_plaza_west', 'cafe_interior']);
    this.addNode('cafe_interior', -22, 16, ['cafe_entrance']);

    this.addNode('park_path_main', -25, -10, ['downtown_plaza_west', 'park_gazebo']);
    this.addNode('park_gazebo', -32, -10, ['park_path_main']);

    this.addNode('mall_entrance', 22, -8, ['downtown_plaza_east', 'mall_interior']);
    this.addNode('mall_interior', 25, -18, ['mall_entrance']);

    this.addNode('arcade_path', 22, 16, ['downtown_plaza_east', 'arcade_interior']);
    this.addNode('arcade_interior', 28, 22, ['arcade_path']);

    // 5. Southern Avenue Sidewalks & Beach Waterfront
    this.addNode('avenue_sw_west_s', -10, 35, ['avenue_sw_west_mid', 'coastal_west']);
    this.addNode('avenue_sw_east_s', 10, 35, ['avenue_sw_east_mid', 'coastal_east']);

    this.addNode('coastal_center', 0, 60, ['avenue_sw_west_s', 'avenue_sw_east_s', 'coastal_west', 'coastal_east', 'beach_boardwalk_mid']);
    this.addNode('coastal_west', -25, 60, ['coastal_center', 'avenue_sw_west_s', 'beach_boardwalk_west']);
    this.addNode('coastal_east', 25, 60, ['coastal_center', 'avenue_sw_east_s', 'beach_boardwalk_east']);

    this.addNode('beach_boardwalk_mid', 0, 75, ['coastal_center', 'beach_pier', 'beach_boardwalk_west', 'beach_boardwalk_east']);
    this.addNode('beach_boardwalk_west', -25, 75, ['beach_boardwalk_mid', 'coastal_west']);
    this.addNode('beach_boardwalk_east', 25, 75, ['beach_boardwalk_mid', 'coastal_east']);
    this.addNode('beach_pier', 0, 95, ['beach_boardwalk_mid']);
  }

  public findNearestNode(x: number, z: number): NavNode {
    let bestNode: NavNode | null = null;
    let bestDist = Infinity;

    for (const node of this.nodes.values()) {
      const d = Math.hypot(node.x - x, node.z - z);
      if (d < bestDist) {
        bestDist = d;
        bestNode = node;
      }
    }
    return bestNode || this.nodes.get('school_avenue_center')!;
  }

  /**
   * Breadth-First Search (BFS) shortest path on the waypoint graph
   */
  public findPath(startX: number, startZ: number, targetX: number, targetZ: number): { x: number; z: number }[] {
    const startNode = this.findNearestNode(startX, startZ);
    const endNode = this.findNearestNode(targetX, targetZ);

    if (startNode.id === endNode.id) {
      return [{ x: targetX, z: targetZ }];
    }

    const queue: string[] = [startNode.id];
    const visited = new Set<string>([startNode.id]);
    const cameFrom = new Map<string, string>();

    let found = false;
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === endNode.id) {
        found = true;
        break;
      }

      const node = this.nodes.get(currentId);
      if (!node) continue;

      for (const neighborId of node.neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          cameFrom.set(neighborId, currentId);
          queue.push(neighborId);
        }
      }
    }

    if (!found) {
      return [{ x: endNode.x, z: endNode.z }, { x: targetX, z: targetZ }];
    }

    // Reconstruct path
    const pathIds: string[] = [];
    let curr: string | undefined = endNode.id;
    while (curr) {
      pathIds.unshift(curr);
      curr = cameFrom.get(curr);
    }

    const pathPoints = pathIds.map((id) => {
      const n = this.nodes.get(id)!;
      return { x: n.x, z: n.z };
    });

    pathPoints.push({ x: targetX, z: targetZ });
    return pathPoints;
  }
}

export const navigationNetwork = new NavigationNetwork();
