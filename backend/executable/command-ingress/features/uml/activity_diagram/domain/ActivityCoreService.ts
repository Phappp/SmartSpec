import { ActivityDiagramDTO, ActivityEdge, ActivityNode } from './interfaces';
import { Types } from 'mongoose';

export class ActivityCoreService {
  // Helper để normalize ID (hỗ trợ cả ObjectId và string)
  private normalizeId(id: any): string {
    if (!id) return '';
    if (Types.ObjectId.isValid(id)) {
      return id.toString();
    }
    if (typeof id === 'object' && id.toString) {
      return id.toString();
    }
    return String(id);
  }

  validate(nodes: ActivityNode[] = [], edges: ActivityEdge[] = []) {
    const errors: string[] = [];
    // Normalize node IDs để hỗ trợ cả ObjectId và string
    const nodeIds = new Set(nodes.map(n => {
      // Nếu node có _id (ObjectId), dùng _id, nếu không dùng id (string)
      const nodeId = (n as any)._id || n.id;
      return this.normalizeId(nodeId);
    }));

    /* ----------------------------------------------------
    * 1. Basic Presence Rules
    * -------------------------------------------------- */
    const starts = nodes.filter(n => n.type === 'start');
    const ends = nodes.filter(n => n.type === 'end');

    if (starts.length !== 1)
      errors.push("Activity diagram must contain exactly one Start node.");

    if (ends.length < 1)
      errors.push("Activity diagram must contain at least one End node.");

    /* ----------------------------------------------------
    * 2. Edge Validity Rules
    * -------------------------------------------------- */
    for (const e of edges) {
      const fromId = this.normalizeId((e as any).from || e.from);
      const toId = this.normalizeId((e as any).to || e.to);
      if (!nodeIds.has(fromId))
        errors.push(`Edge 'from=${fromId}' references a non-existing node.`);
      if (!nodeIds.has(toId))
        errors.push(`Edge 'to=${toId}' references a non-existing node.`);
    }

    /* ----------------------------------------------------
    * 3. Node-Specific UML Rules
    * -------------------------------------------------- */
    nodes.forEach((node) => {
      const nodeId = this.normalizeId((node as any)._id || node.id);
      const outEdges = edges.filter(e => {
        const edgeFrom = this.normalizeId((e as any).from || e.from);
        return edgeFrom === nodeId;
      });
      const inEdges = edges.filter(e => {
        const edgeTo = this.normalizeId((e as any).to || e.to);
        return edgeTo === nodeId;
      });

      switch (node.type) {

        case "start":
          if (inEdges.length !== 0)
            errors.push(`Start node '${nodeId}' must not have incoming edges.`);
          if (outEdges.length !== 1)
            errors.push(`Start node '${nodeId}' must have exactly 1 outgoing edge.`);
          break;

        case "end":
          if (outEdges.length !== 0)
            errors.push(`End node '${nodeId}' must not have outgoing edges.`);
          break;

        case "decision":
          if (outEdges.length < 2)
            errors.push(`Decision node '${nodeId}' must have at least 2 outgoing edges.`);
          break;

        case "merge":
          if (inEdges.length < 2)
            errors.push(`Merge node '${nodeId}' must have at least 2 incoming edges.`);
          break;

        case "fork":
          if (outEdges.length < 2)
            errors.push(`Fork node '${nodeId}' must output at least 2 flows.`);
          if (inEdges.length !== 1)
            errors.push(`Fork node '${nodeId}' must have exactly 1 incoming edge.`);
          break;

        case "join":
          if (inEdges.length < 2)
            errors.push(`Join node '${nodeId}' must have at least 2 incoming edges.`);
          if (outEdges.length !== 1)
            errors.push(`Join node '${nodeId}' must have exactly 1 outgoing edge.`);
          break;
      }
    });

    /* ----------------------------------------------------
    * 4. Optional: Floating Nodes (Not Connected)
    * -------------------------------------------------- */
    nodes.forEach((node) => {
      const nodeId = this.normalizeId((node as any)._id || node.id);
      const hasConnection = edges.some(e => {
        const edgeFrom = this.normalizeId((e as any).from || e.from);
        const edgeTo = this.normalizeId((e as any).to || e.to);
        return edgeFrom === nodeId || edgeTo === nodeId;
      });
      if (!hasConnection)
        errors.push(`Node '${nodeId}' is isolated and not connected to the diagram.`);
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  renderSvg(diagram: Pick<ActivityDiagramDTO, 'nodes' | 'edges' | 'lanes' | 'name'>): string {
    const nodes = diagram.nodes || [];
    // Filter edges - hỗ trợ cả ObjectId và string
    const edges = (diagram.edges || []).filter(e => {
      const fromId = this.normalizeId((e as any).from || e.from);
      const toId = this.normalizeId((e as any).to || e.to);
      return nodes.find(n => {
        const nodeId = this.normalizeId((n as any)._id || n.id);
        return nodeId === fromId;
      }) && nodes.find(n => {
        const nodeId = this.normalizeId((n as any)._id || n.id);
        return nodeId === toId;
      });
    });
    const lanes = diagram.lanes || [];

    // ============================
    // 1) BFS Layering Top-Down
    // ============================
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) throw new Error("Missing start node");

    const layerMap: Record<string, number> = {};
    nodes.forEach(n => {
      const nodeId = this.normalizeId((n as any)._id || n.id);
      layerMap[nodeId] = Infinity;
    });
    const startNodeId = this.normalizeId((startNode as any)._id || startNode.id);
    layerMap[startNodeId] = 0;

    const queue = [startNodeId];
    while (queue.length) {
      const curr = queue.shift()!;
      const currLayer = layerMap[curr];

      edges
        .filter(e => {
          const edgeFrom = this.normalizeId((e as any).from || e.from);
          return edgeFrom === curr;
        })
        .forEach(e => {
          const edgeTo = this.normalizeId((e as any).to || e.to);
          if (layerMap[edgeTo] > currLayer + 1) {
            layerMap[edgeTo] = currLayer + 1;
            queue.push(edgeTo);
          }
        });
    }

    const maxLayer = Math.max(...Object.values(layerMap));
    nodes
      .filter(n => n.type === 'end')
      .forEach(n => {
        const nodeId = this.normalizeId((n as any)._id || n.id);
        layerMap[nodeId] = maxLayer + 1;
      });

    // ============================
    // 2) Build layers
    // ============================
    const layers: string[][] = [];
    Object.entries(layerMap).forEach(([id, layer]) => {
      if (!layers[layer]) layers[layer] = [];
      layers[layer].push(id);
    });

    // ============================
    // 3) Node sizes & positions
    // ============================
    const positions: Record<string, { x: number; y: number; w: number; h: number }> = {};

    const layerGap = 140;
    const nodeGapX = 40;
    let canvasWidth = 1400;
    let canvasHeight = 0;

    layers.forEach((layerNodes, layerIdx) => {
      const nodeBoxes = layerNodes.map(id => {
        const node = nodes.find(n => {
          const nodeId = this.normalizeId((n as any)._id || n.id);
          return nodeId === id;
        })!;
        let w = Math.max(80, (node.label?.length || id.length) * 7 + 30);
        let h = 40;

        if (node.type === 'start' || node.type === 'end') {
          const size = Math.max(w, h);
          w = size * 1.2;
          h = size * 1.2;
        } else if (node.type === 'decision') {
          w *= 1.3;
          h *= 1.3;
        } else if (node.type === 'fork' || node.type === 'join') {
          w = 120;
          h = 16;
        } else if (node.type === 'object') {
          w *= 1.1;
          h = 48;
        }

        return { id, w, h };
      });

      const totalWidth =
        nodeBoxes.reduce((a, b) => a + b.w, 0) +
        nodeGapX * (nodeBoxes.length - 1);

      if (totalWidth + 100 > canvasWidth) canvasWidth = totalWidth + 100;

      let startX = canvasWidth / 2 - totalWidth / 2;
      const yBase = 100 + layerIdx * layerGap;

      nodeBoxes.forEach(b => {
        const x = startX + b.w / 2;
        const y = yBase;

        positions[b.id] = { x, y, w: b.w, h: b.h };
        startX += b.w + nodeGapX;

        canvasHeight = Math.max(canvasHeight, y + b.h / 2 + 80);
      });
    });

    // =======================================
    // 4) Render Swimlanes (background bands)
    // =======================================
    const laneEls = lanes
      .map((lane, idx) => {
        const laneWidth = canvasWidth;
        const laneHeight = canvasHeight / lanes.length;
        const y = idx * laneHeight;

        return `
          <g>
            <rect x="0" y="${y}" width="${laneWidth}" height="${laneHeight}"
              fill="${idx % 2 === 0 ? "#f5f5f5" : "#e9e9e9"}" stroke="#ccc"/>
            <text x="20" y="${y + 30}" font-size="16" fill="#111" font-weight="bold">
              ${lane.name}
            </text>
          </g>
        `;
      })
      .join("\n");

    // ============================
    // 5) Node render
    // ============================
    const nodeEls = nodes
      .map(n => {
        const nodeId = this.normalizeId((n as any)._id || n.id);
        const p = positions[nodeId];
        if (!p) return "";

        const label = n.label || nodeId;
        let shape = "";
        let fontSize = 12;

        switch (n.type) {
          case "start":
            shape = `<circle cx="${p.x}" cy="${p.y}" r="${p.w / 2}" fill="#22c55e" stroke="#14532d" stroke-width="2"/>`;
            break;
          case "end":
            shape = `<circle cx="${p.x}" cy="${p.y}" r="${p.w / 2}" fill="#ef4444" stroke="#7f1d1d" stroke-width="2"/>`;
            break;
          case "decision":
            shape = `
              <polygon points="${p.x - p.w / 2},${p.y}
                ${p.x},${p.y - p.h / 2}
                ${p.x + p.w / 2},${p.y}
                ${p.x},${p.y + p.h / 2}"
                fill="#fde68a" stroke="#b45309" stroke-width="2"
              />
            `;
            break;
          case "fork":
          case "join":
            shape = `
              <rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}"
                width="${p.w}" height="${p.h}"
                fill="#000" stroke="#000"/>
            `;
            break;
          case "object":
            shape = `
              <rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}"
                width="${p.w}" height="${p.h}"
                fill="#dbeafe" stroke="#1e3a8a" stroke-width="2" rx="6"/>
            `;
            break;
          case "swimlane":
            return ""; // swimlane là background → đã render ở laneEls
          default:
            shape = `
              <rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}"
                width="${p.w}" height="${p.h}"
                rx="8" ry="8" fill="#fff" stroke="#111"
              />
            `;
        }

        return `
          <g>
            ${shape}
            <text x="${p.x}" y="${p.y}" font-size="${fontSize}"
              text-anchor="middle" alignment-baseline="middle" fill="#111">
              ${label}
            </text>
          </g>
        `;
      })
      .join("\n");

    // ============================
    // 6) Edge render
    // ============================
    const edgeEls = edges
      .map(e => {
        const fromId = this.normalizeId((e as any).from || e.from);
        const toId = this.normalizeId((e as any).to || e.to);
        const from = positions[fromId];
        const to = positions[toId];
        if (!from || !to) return "";

        const startX = from.x;
        const startY = from.y + from.h / 2;
        const endX = to.x;
        const endY = to.y - to.h / 2;

        const midY = (startY + endY) / 2;

        const pathD = `
          M ${startX} ${startY}
          C ${startX} ${midY},
            ${endX} ${midY},
            ${endX} ${endY}
        `;

        const textLabel =
          e.condition || e.guard || e.trigger || null;

        return `
          <g>
            <path d="${pathD}" fill="none" stroke="#555" stroke-width="1.4" marker-end="url(#arrow)"/>
            ${
              textLabel
                ? `<text x="${(startX + endX) / 2}" y="${midY - 6}"
                    font-size="11" text-anchor="middle" fill="#374151">
                    ${textLabel}
                  </text>`
                : ""
            }
          </g>
        `;
      })
      .join("\n");

    // ============================
    // 7) SVG Output
    // ============================
    return `
      <?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg"
        width="${canvasWidth}" height="${canvasHeight}"
        viewBox="0 0 ${canvasWidth} ${canvasHeight}">

        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10"
            refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#555"/>
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="#fafafa"/>

        ${laneEls}
        ${edgeEls}
        ${nodeEls}

      </svg>
    `;
  }
}


