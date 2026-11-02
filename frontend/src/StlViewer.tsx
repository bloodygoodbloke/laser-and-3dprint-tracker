import { useEffect, useRef, useState } from "react";

const MAX_TRIANGLES = 40000;

// Returns flat [x,y,z, x,y,z, x,y,z, ...] triangle vertices from a binary or ASCII STL.
export function parseStl(buffer: ArrayBuffer): Float32Array {
  if (buffer.byteLength >= 84) {
    const count = new DataView(buffer).getUint32(80, true);
    if (84 + count * 50 === buffer.byteLength) {
      const view = new DataView(buffer);
      const out = new Float32Array(count * 9);
      for (let t = 0; t < count; t += 1) {
        const base = 84 + t * 50 + 12;
        for (let v = 0; v < 9; v += 1) out[t * 9 + v] = view.getFloat32(base + v * 4, true);
      }
      return out;
    }
  }
  const text = new TextDecoder().decode(buffer);
  const values: number[] = [];
  const pattern = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi;
  let match = pattern.exec(text);
  while (match) {
    values.push(Number(match[1]), Number(match[2]), Number(match[3]));
    match = pattern.exec(text);
  }
  return Float32Array.from(values.slice(0, values.length - (values.length % 9)));
}

export default function StlViewer({ data, label }: { data: ArrayBuffer; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState("");
  const [rotation, setRotation] = useState({ yaw: -0.7, pitch: 1.0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const meshRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    try {
      const raw = parseStl(data);
      if (raw.length < 9) throw new Error("empty");
      const triangles = raw.length / 9;
      const stride = Math.max(1, Math.ceil(triangles / MAX_TRIANGLES));
      const kept: number[] = [];
      for (let t = 0; t < triangles; t += stride) for (let v = 0; v < 9; v += 1) kept.push(raw[t * 9 + v]);
      const mesh = new Float32Array(kept);
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < mesh.length; i += 3) for (let a = 0; a < 3; a += 1) {
        min[a] = Math.min(min[a], mesh[i + a]);
        max[a] = Math.max(max[a], mesh[i + a]);
      }
      const centre = min.map((m, a) => (m + max[a]) / 2);
      const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
      for (let i = 0; i < mesh.length; i += 3) for (let a = 0; a < 3; a += 1) mesh[i + a] = (mesh[i + a] - centre[a]) / size;
      meshRef.current = mesh;
      setError("");
      setRotation((current) => ({ ...current }));
    } catch {
      meshRef.current = null;
      setError("This STL file could not be read.");
    }
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mesh = meshRef.current;
    if (!canvas || !mesh) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const cy = Math.cos(rotation.yaw);
    const sy = Math.sin(rotation.yaw);
    const cp = Math.cos(rotation.pitch);
    const sp = Math.sin(rotation.pitch);
    // Rotate about Z (yaw) then X (pitch); STL is Z-up so pitch ~ 1 rad shows the model from above-front.
    const project = (x: number, y: number, z: number): [number, number, number] => {
      const x1 = x * cy - y * sy;
      const y1 = x * sy + y * cy;
      return [x1, y1 * cp - z * sp, y1 * sp + z * cp];
    };

    const count = mesh.length / 9;
    const faces: Array<{ pts: number[]; depth: number; shade: number }> = [];
    for (let t = 0; t < count; t += 1) {
      const p = [0, 1, 2].map((v) => project(mesh[t * 9 + v * 3], mesh[t * 9 + v * 3 + 1], mesh[t * 9 + v * 3 + 2]));
      const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2];
      const vx = p[2][0] - p[0][0], vy = p[2][1] - p[0][1], vz = p[2][2] - p[0][2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz) || 1;
      const shade = 0.25 + 0.75 * Math.abs((nx * -0.3 + ny * 0.4 + nz * 0.85) / length);
      faces.push({ pts: [p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]], depth: p[0][2] + p[1][2] + p[2][2], shade });
    }
    faces.sort((a, b) => a.depth - b.depth);

    const scale = Math.min(width, height) * 0.8;
    for (const face of faces) {
      const level = Math.round(70 + 170 * face.shade);
      ctx.fillStyle = `rgb(${level}, ${level + 10}, ${Math.min(255, level + 30)})`;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.moveTo(width / 2 + face.pts[0] * scale, height / 2 - face.pts[1] * scale);
      ctx.lineTo(width / 2 + face.pts[2] * scale, height / 2 - face.pts[3] * scale);
      ctx.lineTo(width / 2 + face.pts[4] * scale, height / 2 - face.pts[5] * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }, [rotation, data]);

  if (error) return <p className="p-3 text-sm text-amber-300">{error}</p>;

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={400}
      role="img"
      aria-label={`${label} 3D preview. Drag to rotate.`}
      className="block h-auto w-full cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerUp={() => { dragRef.current = null; }}
      onPointerMove={(event) => {
        const start = dragRef.current;
        if (!start) return;
        dragRef.current = { x: event.clientX, y: event.clientY };
        setRotation((current) => ({ yaw: current.yaw + (event.clientX - start.x) * 0.01, pitch: Math.min(Math.PI, Math.max(0, current.pitch + (event.clientY - start.y) * 0.01)) }));
      }}
    />
  );
}
