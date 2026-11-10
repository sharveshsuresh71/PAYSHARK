"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/*
 * Live 3D backdrop (canvas). Every page has its own scene, chosen by route:
 *
 *   /              terrain   flowing wave terrain, payment pulses, globe
 *   /dashboard     globe     large wireframe globe, payment arcs, orbit rings
 *   /transactions  ledger    transaction cards streaming toward you over a floor grid
 *   /analytics     bars      3D bar-chart field rising and falling
 *   /agents        network   rotating constellation of agent nodes with signal pulses
 *   /audit         chain     hash-linked blocks being sealed one after another
 *   /approvals     helix     double helix with approved rungs
 *   /policies      lattice   rule lattice with an evaluation plane sweeping through
 *   /agreements    sheets    fanned contract pages, one signed
 *   /developers    tunnel    twisting wireframe tunnel with code dashes
 *   /security      shield    nested icosahedra inside two guard rings
 *   /settings      orbits    inclined orbits around a core
 *   /demo          ribbons   silk ribbons of flowing value
 *
 * Stage: deep background with drifting signal-blue glows, dashed vertical
 * guides and fine grain; the 3D scene is drawn faintly on top. Shared on all
 * scenes: a cursor light, drifting specks, pointer parallax and scroll motion.
 * Each page starts on its own scene; every ~1.1 viewports of scrolling the next
 * scene sweeps in behind a diagonal light edge and the key glow moves.
 * Reduced motion / Settings → "Reduce visual effects" render still frames
 * (the scene still changes as you scroll, without the wipe).
 */

/** Navy ink for wireframes, signal blue for live elements, red for flagged items. */
const INK = "170,170,180";
const SIGNAL = "240,240,245";
const RED = "248,113,113";
const PANEL_FILL = "rgba(19,19,22,.6)";

export type SceneKind =
  | "terrain" | "globe" | "ledger" | "bars" | "network" | "chain" | "helix"
  | "lattice" | "sheets" | "tunnel" | "shield" | "orbits" | "ribbons";

const ROUTE_SCENES: [string, SceneKind][] = [
  ["/dashboard", "globe"],
  ["/transactions", "ledger"],
  ["/analytics", "bars"],
  ["/agents", "network"],
  ["/audit", "chain"],
  ["/approvals", "helix"],
  ["/policies", "lattice"],
  ["/agreements", "sheets"],
  ["/developers", "tunnel"],
  ["/security", "shield"],
  ["/settings", "orbits"],
  ["/demo", "ribbons"]
];

export function sceneForPath(path: string): SceneKind {
  const hit = ROUTE_SCENES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return hit ? hit[1] : "terrain";
}

/**
 * Per-page stage composition: diagonal glass slices (left/width in % of the
 * viewport, optional tone), a wireframe triangle (points in a 0–100 box), the
 * position of the white key light, and the HUD label / outlined watermark.
 */
type Slice = { left: number; width: number; tone?: "steel" | "ink" };
type SceneMeta = { code: string; mark: string; hud: string; skew: number; slices: Slice[]; tri: string; glowX: number; markX: number };

const SCENE_META: Record<SceneKind, SceneMeta> = {
  terrain: { code: "00", mark: "Control", hud: "Payment terrain", skew: -24, slices: [{ left: 8, width: 14 }, { left: 58, width: 22, tone: "steel" }, { left: 84, width: 3, tone: "ink" }], tri: "6,94 44,16 72,94", glowX: 72, markX: 3 },
  globe: { code: "01", mark: "Command", hud: "Global settlement", skew: -30, slices: [{ left: -6, width: 30 }, { left: 38, width: 5, tone: "ink" }, { left: 50, width: 20, tone: "steel" }], tri: "40,8 98,84 22,78", glowX: 64, markX: 2 },
  ledger: { code: "02", mark: "Ledger", hud: "Transaction stream", skew: 20, slices: [{ left: 12, width: 8, tone: "ink" }, { left: 30, width: 26 }, { left: 74, width: 12, tone: "steel" }], tri: "2,20 60,6 30,96", glowX: 30, markX: 40 },
  bars: { code: "03", mark: "Metrics", hud: "Signal analytics", skew: -16, slices: [{ left: 0, width: 18, tone: "steel" }, { left: 46, width: 30 }, { left: 88, width: 4, tone: "ink" }], tri: "55,96 80,14 100,70", glowX: 50, markX: 4 },
  network: { code: "04", mark: "Agents", hud: "Agent constellation", skew: 26, slices: [{ left: 20, width: 24 }, { left: 60, width: 6, tone: "ink" }, { left: 70, width: 22, tone: "steel" }], tri: "14,12 92,40 36,92", glowX: 64, markX: 30 },
  chain: { code: "05", mark: "Audit", hud: "Hash chain", skew: -34, slices: [{ left: 4, width: 10, tone: "ink" }, { left: 24, width: 34 }, { left: 80, width: 14, tone: "steel" }], tri: "0,60 50,4 100,60", glowX: 50, markX: 48 },
  helix: { code: "06", mark: "Approve", hud: "Approval helix", skew: 14, slices: [{ left: 6, width: 22, tone: "steel" }, { left: 42, width: 18 }, { left: 78, width: 6, tone: "ink" }], tri: "10,4 96,30 50,98", glowX: 40, markX: 6 },
  lattice: { code: "07", mark: "Policy", hud: "Rule lattice", skew: -22, slices: [{ left: 30, width: 8, tone: "ink" }, { left: 44, width: 28 }, { left: 86, width: 14, tone: "steel" }], tri: "62,6 98,96 26,96", glowX: 70, markX: 3 },
  sheets: { code: "08", mark: "Contract", hud: "Agreement stack", skew: 30, slices: [{ left: -2, width: 26 }, { left: 34, width: 4, tone: "ink" }, { left: 62, width: 26, tone: "steel" }], tri: "4,96 30,8 96,52", glowX: 58, markX: 36 },
  tunnel: { code: "09", mark: "Build", hud: "Developer tunnel", skew: -40, slices: [{ left: 10, width: 18, tone: "steel" }, { left: 40, width: 22 }, { left: 70, width: 4, tone: "ink" }], tri: "50,2 96,98 4,98", glowX: 50, markX: 3 },
  shield: { code: "10", mark: "Secure", hud: "Defense core", skew: 22, slices: [{ left: 0, width: 14, tone: "ink" }, { left: 16, width: 30 }, { left: 70, width: 20, tone: "steel" }], tri: "64,4 100,50 64,96", glowX: 66, markX: 3 },
  orbits: { code: "11", mark: "Settings", hud: "System orbits", skew: -18, slices: [{ left: 24, width: 16 }, { left: 50, width: 4, tone: "ink" }, { left: 60, width: 30, tone: "steel" }], tri: "2,8 98,8 50,94", glowX: 62, markX: 4 },
  ribbons: { code: "12", mark: "Demo", hud: "Value flow", skew: 34, slices: [{ left: 4, width: 20, tone: "steel" }, { left: 36, width: 30 }, { left: 84, width: 10, tone: "ink" }], tri: "0,96 46,30 100,96", glowX: 50, markX: 30 }
};

/* -------------------------------------------------------------------------- */
/* 3D helpers                                                                  */
/* -------------------------------------------------------------------------- */

type V3 = { x: number; y: number; z: number };
type P2 = { x: number; y: number };
type Frame = {
  ctx: CanvasRenderingContext2D;
  w: number; h: number; t: number; dt: number;
  px: number; py: number; lift: number; scroll: number; mobile: boolean;
};
type Draw = (f: Frame) => void;

const rotX = (p: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
};
const rotY = (p: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
};
const rotZ = (p: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
};

/** Perspective camera for object scenes: screen centre, focal length, camera distance. */
type Cam = { cx: number; cy: number; f: number; d: number };
type SP = P2 & { z: number; k: number };
const toScreen = (p: V3, c: Cam): SP => {
  const k = c.f / Math.max(0.2, c.d + p.z);
  return { x: c.cx + p.x * k, y: c.cy + p.y * k, z: p.z, k };
};
/** 0 = far side, 1 = nearest side, for points within ±r of the object centre. */
const front = (z: number, r = 1) => Math.min(1, Math.max(0, (r - z) / (2 * r)));
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Pointer + scroll → gentle view rotation, shared by object scenes. */
const view = (f: Frame) => ({
  ax: (f.py / f.h - 0.5) * 0.35 + f.scroll * 0.0006,
  ay: (f.px / f.w - 0.5) * 0.6
});

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  if (r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function seg(ctx: CanvasRenderingContext2D, a: P2, b: P2, rgb: string, alpha: number, width = 1) {
  ctx.strokeStyle = `rgba(${rgb},${alpha})`;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
function path(ctx: CanvasRenderingContext2D, pts: P2[], close = false) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close) ctx.closePath();
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
const lerp2 = (a: P2, b: P2, u: number): P2 => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/* -------------------------------------------------------------------------- */
/* Globe (landing + dashboard)                                                 */
/* -------------------------------------------------------------------------- */

/** Globe nodes as [latitude, longitude] in degrees, and arcs between node indexes. */
const NODES: [number, number][] = [
  [40, -74], [51, 0], [35, 139], [1, 103], [-33, 151], [-23, -46], [19, 72], [37, -122],
  [55, 37], [-1, 36], [25, 55], [-34, 18]
];
const ARCS: [number, number][] = [[0, 1], [1, 6], [6, 3], [3, 2], [2, 7], [7, 0], [3, 4], [0, 5], [1, 8], [9, 10], [10, 6], [11, 9], [5, 11]];

const sphere = (lat: number, lon: number, rot: number, r: number) => {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180 + rot;
  const x = Math.cos(la) * Math.sin(lo);
  let y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
  const tilt = 0.38; // tilt the globe toward the viewer
  const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
  z = y * Math.sin(tilt) + z * Math.cos(tilt);
  y = y2;
  return { x: x * r, y: -y * r, z }; // z > 0 faces the viewer
};

function drawGlobe(ctx: CanvasRenderingContext2D, gx: number, gy: number, R: number, t: number, opts: { step: number; nodes: number; arcs: number }) {
  const rot = t * 0.12;
  const halo = ctx.createRadialGradient(gx, gy, R * 0.6, gx, gy, R * 1.5);
  halo.addColorStop(0, `rgba(${INK},.22)`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(gx - R * 1.5, gy - R * 1.5, R * 3, R * 3);

  const line = (pointsOf: (s: number) => V3, steps: number) => {
    for (let s = 0; s < steps; s++) {
      const p1 = pointsOf(s / steps), p2 = pointsOf((s + 1) / steps);
      const isFront = (p1.z + p2.z) / 2 > 0;
      seg(ctx, { x: gx + p1.x, y: gy + p1.y }, { x: gx + p2.x, y: gy + p2.y }, INK, isFront ? 0.5 : 0.1, 1);
    }
  };
  for (let lat = -90 + opts.step; lat < 90; lat += opts.step) line(s => sphere(lat, s * 360, rot, R), 56);
  for (let lon = 0; lon < 360; lon += opts.step) line(s => sphere(-90 + s * 180, lon, rot, R), 36);

  ARCS.slice(0, opts.arcs).forEach(([a, b], idx) => {
    const [la1, lo1] = NODES[a], [la2, lo2] = NODES[b];
    const phase = (t * 0.25 + idx * 0.17) % 1.4; // 0..1 draws, 1..1.4 rests
    const progress = Math.min(phase, 1);
    const steps = 28;
    ctx.beginPath();
    let head: V3 = { x: 0, y: 0, z: 0 };
    for (let s = 0; s <= steps * progress; s++) {
      const u = s / steps;
      const p = sphere(la1 + (la2 - la1) * u, lo1 + (lo2 - lo1) * u, rot, R * (1 + 0.22 * Math.sin(Math.PI * u)));
      head = p;
      if (s) ctx.lineTo(gx + p.x, gy + p.y);
      else ctx.moveTo(gx + p.x, gy + p.y);
    }
    ctx.strokeStyle = `rgba(${SIGNAL},${head.z > -0.2 ? 0.75 : 0.15})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    if (progress < 1 && head.z > -0.2) glow(ctx, gx + head.x, gy + head.y, 6, SIGNAL, 1);
  });

  NODES.slice(0, opts.nodes).forEach(([lat, lon]) => {
    const p = sphere(lat, lon, rot, R);
    if (p.z >= 0) glow(ctx, gx + p.x, gy + p.y, 9, SIGNAL, 0.95);
  });
}

/* -------------------------------------------------------------------------- */
/* Scenes                                                                      */
/* -------------------------------------------------------------------------- */

/** Landing: wave terrain with payment pulses and a small globe. */
function terrainScene(): Draw {
  const pulses = Array.from({ length: 7 }, (_, i) => ({ row: 6 + ((i * 5) % 24), pos: (i * 0.37) % 1, speed: 0.05 + (i % 3) * 0.018 }));
  const NEAR = 1.4, FAR = 16, SPAN = 11, CAM_H = 1.25;

  return f => {
    const { ctx, w, h, t, dt, px, py, lift, scroll, mobile } = f;
    const cols = mobile ? 40 : 72, rows = mobile ? 22 : 34;
    for (const p of pulses) {
      p.pos += p.speed * dt;
      if (p.pos > 1) { p.pos = 0; p.row = 6 + ((p.row + 7) % Math.max(1, rows - 6)); }
    }
    const horizon = h * 0.46, focal = h * 0.95;
    const camX = (px / w - 0.5) * -0.9;
    const flow = scroll * 0.004 + t * 0.35;
    const project = (x: number, y: number, z: number) => ({ sx: w / 2 + ((x - camX) * focal) / z, sy: horizon + ((CAM_H - y) * focal) / z });

    let cxw = 999, czw = 999;
    if (py > horizon + 4) {
      czw = (CAM_H * focal) / (py - horizon);
      cxw = ((px - w / 2) * czw) / focal + camX;
    }
    const curLift = czw < FAR ? lift : 0;
    const height = (x: number, z: number) => {
      const zz = z + flow;
      let y = 0.2 * Math.sin(x * 0.55 + t * 0.5) * Math.cos(zz * 0.42 - t * 0.3) + 0.09 * Math.sin((x + zz) * 0.9 - t * 0.7);
      if (curLift > 0) {
        const d = Math.hypot(x - cxw, z - czw);
        y += curLift * 0.55 * Math.exp(-(d * d) / 2.2) * (0.75 + 0.25 * Math.cos(d * 3 - t * 3.5));
      }
      return y;
    };

    const pts: { sx: number; sy: number; y: number }[][] = [];
    for (let r = 0; r < rows; r++) {
      const z = FAR - (r / (rows - 1)) * (FAR - NEAR);
      const depth = 1 - (z - NEAR) / (FAR - NEAR);
      const row: { sx: number; sy: number; y: number }[] = [];
      for (let c = 0; c < cols; c++) {
        const x = -SPAN + (c / (cols - 1)) * SPAN * 2;
        const y = height(x, z);
        row.push({ ...project(x, y, z), y });
      }
      pts.push(row);
      ctx.beginPath();
      row.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
      ctx.strokeStyle = `rgba(${INK},${0.1 + depth * 0.45})`;
      ctx.lineWidth = 0.7 + depth * 1.1;
      ctx.stroke();
      for (let c = 0; c < cols; c += 2) {
        const p = row[c];
        const g = Math.max(0, p.y) * 2.2;
        const size = 0.8 + depth * 2 + g;
        ctx.fillStyle = g > 0.35 ? `rgba(${SIGNAL},${0.5 + depth * 0.5})` : `rgba(${INK},${0.25 + depth * 0.6})`;
        ctx.fillRect(p.sx - size / 2, p.sy - size / 2, size, size);
      }
    }

    for (const pulse of pulses) {
      const row = pts[Math.min(pulse.row, pts.length - 1)];
      const fpos = clamp01(pulse.pos) * (cols - 1);
      const i = Math.min(Math.floor(fpos), cols - 1), k = fpos - i;
      const a = row?.[i], b = row?.[Math.min(i + 1, cols - 1)];
      if (!a || !b) continue;
      const x = a.sx + (b.sx - a.sx) * k, y = a.sy + (b.sy - a.sy) * k;
      const depth = pulse.row / rows;
      glow(ctx, x, y, 10 + depth * 22, SIGNAL, 0.9);
      const start = Math.max(0, i - 6);
      ctx.beginPath();
      for (let j = start; j <= i; j++) {
        if (j === start) ctx.moveTo(row[j].sx, row[j].sy);
        else ctx.lineTo(row[j].sx, row[j].sy);
      }
      ctx.lineTo(x, y);
      const trail = ctx.createLinearGradient(row[start].sx, row[start].sy, x, y);
      trail.addColorStop(0, "rgba(0,0,0,0)");
      trail.addColorStop(1, `rgba(${SIGNAL},.8)`);
      ctx.strokeStyle = trail;
      ctx.lineWidth = 1.5 + depth * 1.5;
      ctx.stroke();
    }

    if (!mobile) {
      const R = Math.min(w, h) * 0.24;
      const gx = w * 0.82 + (px / w - 0.5) * -24;
      const gy = h * 0.3 + (py / h - 0.5) * -16 - Math.min(scroll, 600) * 0.05;
      drawGlobe(ctx, gx, gy, R, t, { step: 30, nodes: 8, arcs: 8 });
    }
  };
}

/** Dashboard: a large globe with two inclined orbit rings and satellites. */
function globeScene(): Draw {
  return f => {
    const { ctx, w, h, t, px, py, scroll, mobile } = f;
    const R = Math.min(w, h) * (mobile ? 0.34 : 0.33);
    const gx = w * (mobile ? 0.5 : 0.66) + (px / w - 0.5) * -30;
    const gy = h * 0.54 + (py / h - 0.5) * -20 - Math.min(scroll, 600) * 0.06;
    const ring = (tilt: number, spin: number, sats: number, speed: number, back: boolean) => {
      for (let s = 0; s < 96; s++) {
        const u1 = (s / 96) * Math.PI * 2, u2 = ((s + 1) / 96) * Math.PI * 2;
        const a = rotZ(rotX({ x: Math.cos(u1) * 1.45, y: 0, z: Math.sin(u1) * 1.45 }, tilt), spin);
        const b = rotZ(rotX({ x: Math.cos(u2) * 1.45, y: 0, z: Math.sin(u2) * 1.45 }, tilt), spin);
        if ((a.z + b.z > 0) !== back) continue; // z > 0 = behind the globe
        seg(ctx, { x: gx + a.x * R, y: gy + a.y * R }, { x: gx + b.x * R, y: gy + b.y * R }, INK, back ? 0.12 : 0.4, 1);
      }
      for (let k = 0; k < sats; k++) {
        const u = t * speed + (k * Math.PI * 2) / sats;
        const p = rotZ(rotX({ x: Math.cos(u) * 1.45, y: 0, z: Math.sin(u) * 1.45 }, tilt), spin);
        if ((p.z > 0) === back) glow(ctx, gx + p.x * R, gy + p.y * R, back ? 5 : 9, SIGNAL, back ? 0.4 : 0.95);
      }
    };
    ring(1.25, -0.35, 3, 0.35, true);
    ring(1.1, 0.5, 2, -0.28, true);
    drawGlobe(ctx, gx, gy, R, t, { step: 20, nodes: NODES.length, arcs: ARCS.length });
    ring(1.25, -0.35, 3, 0.35, false);
    ring(1.1, 0.5, 2, -0.28, false);
  };
}

/** Transactions: cards streaming toward the viewer over a perspective floor grid. */
function ledgerScene(): Draw {
  const cards = Array.from({ length: 24 }, (_, i) => ({
    lane: ((i * 5) % 7) - 3,
    y: 0.35 + (i % 3) * 0.6,
    z0: (i * 7.3) % 20,
    speed: 0.9 + (i % 4) * 0.15,
    paid: i % 4 === 0,
    flagged: i % 7 === 3
  }));
  return f => {
    const { ctx, w, h, t, px, scroll, mobile } = f;
    const hz = h * 0.4, foc = h * 0.9, camH = 1.6, camX = (px / w - 0.5) * -1.2;
    const P = (x: number, y: number, z: number): P2 => ({ x: w / 2 + ((x - camX) * foc) / z, y: hz + ((camH - y) * foc) / z });
    const flow = t * 1.1 + scroll * 0.004;

    for (let i = 0; i < 24; i++) {
      const z = 1 + ((((i - flow) % 24) + 24) % 24);
      seg(ctx, P(-16, 0, z), P(16, 0, z), INK, 0.04 + 0.32 * (1 - z / 25), 1);
    }
    for (let x = -14; x <= 14; x += 1.75) seg(ctx, P(x, 0, 1), P(x, 0, 25), INK, 0.1, 1);

    const list = cards
      .map(c => ({ c, z: 1.2 + ((((c.z0 - t * c.speed - scroll * 0.004) % 20) + 20) % 20) }))
      .sort((a, b) => b.z - a.z);
    for (const { c, z } of list) {
      const fade = clamp01((21.2 - z) / 5) * clamp01((z - 1.2) / 1.4);
      const x = c.lane * (mobile ? 1.6 : 2.1);
      const tl = P(x - 0.75, c.y + 0.85, z), br = P(x + 0.75, c.y, z);
      const cw = br.x - tl.x, ch = br.y - tl.y;
      if (tl.x > w || br.x < 0 || fade <= 0) continue;
      ctx.globalAlpha = fade;
      roundRect(ctx, tl.x, tl.y, cw, ch, ch * 0.12);
      ctx.fillStyle = PANEL_FILL;
      ctx.fill();
      ctx.strokeStyle = `rgba(${INK},.6)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = `rgba(${INK},.55)`;
      ctx.fillRect(tl.x + cw * 0.1, tl.y + ch * 0.2, cw * 0.42, Math.max(1, ch * 0.08));
      ctx.fillStyle = `rgba(${INK},.28)`;
      ctx.fillRect(tl.x + cw * 0.1, tl.y + ch * 0.44, cw * 0.62, Math.max(1, ch * 0.06));
      const dot = c.flagged ? RED : c.paid ? SIGNAL : INK;
      ctx.fillStyle = `rgba(${dot},.85)`;
      ctx.fillRect(tl.x + cw * 0.58, tl.y + ch * 0.7, cw * 0.32, Math.max(1, ch * 0.1));
      glow(ctx, tl.x + cw * 0.86, tl.y + ch * 0.24, Math.max(2, ch * 0.14), dot, 0.9);
      ctx.globalAlpha = 1;
    }
  };
}

/** Analytics: a field of 3D bars whose heights ripple like live metrics. */
function barsScene(): Draw {
  return f => {
    const { ctx, w, h, t, px, mobile } = f;
    const NX = mobile ? 7 : 13, NZ = mobile ? 6 : 9;
    const hz = h * 0.3, foc = h * 0.95, camH = 3.2, camX = (px / w - 0.5) * -1.4;
    const P = (x: number, y: number, z: number): P2 => ({ x: w / 2 + ((x - camX) * foc) / z, y: hz + ((camH - y) * foc) / z });
    const hw = 0.32;
    const xs = Array.from({ length: NX }, (_, i) => (i - (NX - 1) / 2) * 1.1).sort((a, b) => Math.abs(b - camX) - Math.abs(a - camX));

    for (let iz = NZ - 1; iz >= 0; iz--) {
      const z = 4 + iz * 1.1;
      const depth = 1 - iz / NZ;
      for (const x of xs) {
        const v = 0.5 + 0.5 * Math.sin(x * 0.55 + t * 0.9 + iz * 0.4) * Math.cos(iz * 0.5 - t * 0.6);
        const hgt = 0.25 + v * 2.2;
        const zf = z - hw, zb = z + hw;
        const sx = x > camX ? x - hw : x + hw;
        // side
        path(ctx, [P(sx, 0, zf), P(sx, 0, zb), P(sx, hgt, zb), P(sx, hgt, zf)], true);
        ctx.fillStyle = `rgba(${INK},${0.05 + depth * 0.08})`;
        ctx.fill();
        // front
        path(ctx, [P(x - hw, 0, zf), P(x + hw, 0, zf), P(x + hw, hgt, zf), P(x - hw, hgt, zf)], true);
        ctx.fillStyle = `rgba(${INK},${0.07 + depth * 0.1 + v * 0.1})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${INK},${0.2 + depth * 0.35})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        // top
        path(ctx, [P(x - hw, hgt, zf), P(x + hw, hgt, zf), P(x + hw, hgt, zb), P(x - hw, hgt, zb)], true);
        ctx.fillStyle = `rgba(${v > 0.75 ? SIGNAL : INK},${0.2 + v * 0.5 * depth + 0.1})`;
        ctx.fill();
      }
    }
  };
}

/** Agents: a rotating constellation of nodes with signals running along links. */
function networkScene(): Draw {
  const N = 52;
  const pts: V3[] = Array.from({ length: N }, (_, i) => {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.39996;
    const rad = 0.75 + (((i * 37) % 10) / 10) * 0.45;
    return { x: Math.cos(th) * r * rad, y: y * rad, z: Math.sin(th) * r * rad };
  });
  const edges: [number, number][] = [];
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++)
      if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y, pts[i].z - pts[j].z) < 0.62) edges.push([i, j]);

  return f => {
    const { ctx, w, h, t, mobile } = f;
    const { ax, ay } = view(f);
    const cam: Cam = { cx: w * (mobile ? 0.5 : 0.64), cy: h * 0.52, f: Math.min(w, h) * 1.05, d: 3.4 };
    const S = pts.map(p => toScreen(rotX(rotY(p, t * 0.12 + ay), ax + 0.2), cam));
    glow(ctx, cam.cx, cam.cy, Math.min(w, h) * 0.22, INK, 0.18);
    for (const [a, b] of edges) seg(ctx, S[a], S[b], INK, 0.06 + front((S[a].z + S[b].z) / 2, 1.2) * 0.4, 1);
    if (edges.length) {
      for (let k = 0; k < 12; k++) {
        const [a, b] = edges[(k * 7) % edges.length];
        const u = (t * 0.5 + k * 0.13) % 1;
        const p = lerp2(S[a], S[b], u);
        glow(ctx, p.x, p.y, 7, SIGNAL, 0.35 + front((S[a].z + S[b].z) / 2, 1.2) * 0.6);
      }
    }
    for (const p of S) {
      const fr = front(p.z, 1.2);
      glow(ctx, p.x, p.y, 3 + fr * 7, fr > 0.7 ? SIGNAL : INK, 0.3 + fr * 0.65);
    }
  };
}

/** Audit: hash-linked blocks; one block at a time is sealed and lights up. */
function chainScene(): Draw {
  const CUBE: V3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) CUBE.push({ x, y, z });
  const CE: [number, number][] = [];
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const diff = +(CUBE[i].x !== CUBE[j].x) + +(CUBE[i].y !== CUBE[j].y) + +(CUBE[i].z !== CUBE[j].z);
      if (diff === 1) CE.push([i, j]);
    }

  return f => {
    const { ctx, w, h, t, mobile } = f;
    const { ax, ay } = view(f);
    const n = mobile ? 6 : 9;
    const cam: Cam = { cx: w / 2, cy: h * 0.55, f: w * (mobile ? 0.9 : 0.62), d: 9 };
    const active = Math.floor(t * 1.2) % n;
    const centers = Array.from({ length: n }, (_, i) => {
      const u = i - (n - 1) / 2;
      return rotX(rotY({ x: u * 1.55, y: 0.45 * Math.sin(i * 0.8 + t * 0.6), z: 0.9 * Math.cos(i * 0.8 + t * 0.6) }, ay * 0.6 - 0.25), ax + 0.15);
    });
    const C = centers.map(c => toScreen(c, cam));
    for (let i = 0; i < n - 1; i++) {
      const sealed = i < active;
      seg(ctx, { x: C[i].x, y: C[i].y - 3 }, { x: C[i + 1].x, y: C[i + 1].y - 3 }, sealed ? SIGNAL : INK, sealed ? 0.55 : 0.25, 1);
      seg(ctx, { x: C[i].x, y: C[i].y + 3 }, { x: C[i + 1].x, y: C[i + 1].y + 3 }, sealed ? SIGNAL : INK, sealed ? 0.55 : 0.25, 1);
    }
    if (active > 0) {
      const p = lerp2(C[active - 1], C[active], (t * 1.2) % 1);
      glow(ctx, p.x, p.y, 10, SIGNAL, 0.95);
    }
    centers.forEach((c, i) => {
      const lit = i === active ? 1 : i < active ? 0.55 : 0.2;
      const sz = 0.42;
      const corners = CUBE.map(q => {
        const p = rotY(rotX({ x: q.x * sz, y: q.y * sz, z: q.z * sz }, t * 0.5 + i), t * 0.4 + i * 0.7);
        return toScreen({ x: p.x + c.x, y: p.y + c.y, z: p.z + c.z }, cam);
      });
      for (const [a, b] of CE) seg(ctx, corners[a], corners[b], i === active ? SIGNAL : INK, 0.2 + lit * 0.6, i === active ? 1.6 : 1);
      if (i === active) glow(ctx, C[i].x, C[i].y, 46, SIGNAL, 0.35);
    });
  };
}

/** Approvals: a double helix; every third rung is an approved (lime) link. */
function helixScene(): Draw {
  return f => {
    const { ctx, w, h, t, mobile } = f;
    const { ax, ay } = view(f);
    const cam: Cam = { cx: w / 2, cy: h * 0.56, f: w * (mobile ? 0.8 : 0.5), d: 9 };
    const steps = mobile ? 40 : 72, span = 8;
    const A: SP[] = [], B: SP[] = [];
    for (let s = 0; s < steps; s++) {
      const u = -span + (s / (steps - 1)) * 2 * span;
      const ph = u * 0.7 + t * 0.6;
      const tf = (p: V3) => toScreen(rotX(rotY(p, ay * 0.5), ax * 0.6 + 0.1), cam);
      A.push(tf({ x: u, y: Math.cos(ph) * 1.1, z: Math.sin(ph) * 1.1 }));
      B.push(tf({ x: u, y: Math.cos(ph + Math.PI) * 1.1, z: Math.sin(ph + Math.PI) * 1.1 }));
    }
    for (let s = 0; s < steps; s += 3) {
      const approved = s % 9 === 0;
      seg(ctx, A[s], B[s], approved ? SIGNAL : INK, approved ? 0.6 : 0.18, approved ? 1.4 : 1);
    }
    for (const strand of [A, B]) {
      for (let s = 0; s < steps - 1; s++) seg(ctx, strand[s], strand[s + 1], INK, 0.12 + front((strand[s].z + strand[s + 1].z) / 2, 1.2) * 0.6, 1.4);
      for (let s = 0; s < steps; s += 3) {
        const fr = front(strand[s].z, 1.2);
        glow(ctx, strand[s].x, strand[s].y, 3 + fr * 6, s % 9 === 0 ? SIGNAL : INK, 0.3 + fr * 0.6);
      }
    }
  };
}

/** Policies: a rule lattice with an evaluation plane sweeping through it. */
function latticeScene(): Draw {
  return f => {
    const { ctx, w, h, t, mobile } = f;
    const { ax, ay } = view(f);
    const cam: Cam = { cx: w * (mobile ? 0.5 : 0.64), cy: h * 0.52, f: Math.min(w, h) * 1.1, d: 4.6 };
    const T = (p: V3) => toScreen(rotX(rotY(p, t * 0.1 + ay + 0.6), ax + 0.45), cam);
    const s = 0.5;
    const sweep = -1.3 + ((t * 0.35) % 1) * 2.6;
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 5; j++) {
        const a = (i - 2) * s, b = (j - 2) * s;
        for (const [p, q] of [
          [{ x: -1, y: a, z: b }, { x: 1, y: a, z: b }],
          [{ x: a, y: -1, z: b }, { x: a, y: 1, z: b }],
          [{ x: a, y: b, z: -1 }, { x: a, y: b, z: 1 }]
        ] as [V3, V3][]) {
          const P = T(p), Q = T(q);
          seg(ctx, P, Q, INK, 0.05 + front((P.z + Q.z) / 2, 1.4) * 0.22, 1);
        }
      }
    const plane = [T({ x: sweep, y: -1.15, z: -1.15 }), T({ x: sweep, y: 1.15, z: -1.15 }), T({ x: sweep, y: 1.15, z: 1.15 }), T({ x: sweep, y: -1.15, z: 1.15 })];
    path(ctx, plane, true);
    ctx.fillStyle = `rgba(${SIGNAL},.05)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${SIGNAL},.5)`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 5; j++)
        for (let k = 0; k < 5; k++) {
          const x = (i - 2) * s;
          const near = Math.max(0, 1 - Math.abs(x - sweep) / 0.35);
          const p = T({ x, y: (j - 2) * s, z: (k - 2) * s });
          const fr = front(p.z, 1.4);
          glow(ctx, p.x, p.y, 2 + fr * 3 + near * 6, near > 0.3 ? SIGNAL : INK, 0.25 + fr * 0.35 + near * 0.4);
        }
  };
}

/** Agreements: fanned contract pages turning slowly; the last page is signed. */
function sheetsScene(): Draw {
  return f => {
    const { ctx, w, h, t, mobile } = f;
    const { ax, ay } = view(f);
    const cam: Cam = { cx: w * (mobile ? 0.5 : 0.6), cy: h * 0.52, f: Math.min(w, h) * 1.05, d: 5.2 };
    const n = 7, W = 1.5, H = 1;
    const T = (p: V3) => toScreen(rotX(rotY(p, ay + Math.sin(t * 0.2) * 0.15 - 0.35), ax + 0.2), cam);
    const pages = Array.from({ length: n }, (_, i) => {
      const base = -1.1 + i * 0.37 + 0.12 * Math.sin(t * 0.5 + i * 0.5);
      const pt = (u: number, v: number) => T({ x: Math.cos(base) * u * W - 0.4, y: v, z: Math.sin(base) * u * W });
      return { i, pt, z: pt(0.5, 0).z };
    }).sort((a, b) => b.z - a.z);
    for (const { i, pt } of pages) {
      path(ctx, [pt(0, -H), pt(1, -H), pt(1, H), pt(0, H)], true);
      ctx.fillStyle = PANEL_FILL;
      ctx.fill();
      ctx.strokeStyle = `rgba(${INK},.5)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      for (let l = 0; l < 6; l++) {
        const v = -H + 0.32 + l * 0.24;
        seg(ctx, pt(0.12, v), pt(l === 5 ? 0.5 : 0.88, v), INK, 0.3, 1);
      }
      if (i === n - 1) {
        const a = pt(0.55, H - 0.22), b = pt(0.9, H - 0.22);
        seg(ctx, a, b, SIGNAL, 0.8, 1.2);
        glow(ctx, b.x, b.y, 10, SIGNAL, 0.8);
      }
    }
  };
}

/** Developers: a twisting wireframe tunnel with code dashes on its walls. */
function tunnelScene(): Draw {
  return f => {
    const { ctx, w, h, t, px, py, scroll } = f;
    const cx = w / 2 + (px / w - 0.5) * -60, cy = h / 2 + (py / h - 0.5) * -40;
    const foc = Math.min(w, h) * 0.9, N = 16;
    const rings = Array.from({ length: N }, (_, i) => {
      const z = ((((i - t * 1.4 - scroll * 0.01) % N) + N) % N) + 0.6;
      const tw = z * 0.08 + t * 0.05;
      const corners = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([a, b]) => {
        const x = (a * Math.cos(tw) - b * Math.sin(tw)) * 2.4, y = (a * Math.sin(tw) + b * Math.cos(tw)) * 1.4;
        return { x: cx + (x * foc) / z, y: cy + (y * foc) / z };
      });
      return { i, z, corners };
    }).sort((a, b) => b.z - a.z);
    rings.forEach((r, idx) => {
      const alpha = clamp01((N - r.z) / 4) * (0.08 + 0.5 * (1 - r.z / N));
      path(ctx, r.corners, true);
      ctx.strokeStyle = `rgba(${INK},${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      const next = rings[idx + 1];
      if (next) for (let c = 0; c < 4; c++) seg(ctx, r.corners[c], next.corners[c], INK, alpha * 0.6, 1);
      for (let d = 0; d < 3; d++) {
        const u = ((r.i * 0.29 + d * 0.31) % 0.8) + 0.05;
        const len = 0.06 + ((r.i + d) % 3) * 0.04;
        const wall = (r.i + d) % 4;
        const a = r.corners[wall], b = r.corners[(wall + 1) % 4];
        seg(ctx, lerp2(a, b, u), lerp2(a, b, Math.min(1, u + len)), d === 0 ? SIGNAL : INK, alpha * 1.6, 2);
      }
    });
  };
}

/** Security: nested counter-rotating icosahedra inside two guard rings. */
function shieldScene(): Draw {
  const PHI = (1 + Math.sqrt(5)) / 2;
  const RAW: V3[] = ([
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI],
    [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
  ] as const).map(([x, y, z]) => ({ x, y, z }));
  const len = Math.hypot(1, PHI);
  const ICO = RAW.map(p => ({ x: p.x / len, y: p.y / len, z: p.z / len }));
  const IE: [number, number][] = [];
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++)
      if (Math.abs(Math.hypot(RAW[i].x - RAW[j].x, RAW[i].y - RAW[j].y, RAW[i].z - RAW[j].z) - 2) < 0.01) IE.push([i, j]);

  return f => {
    const { ctx, w, h, t, mobile } = f;
    const { ax, ay } = view(f);
    const cam: Cam = { cx: w * (mobile ? 0.5 : 0.66), cy: h * 0.5, f: Math.min(w, h) * 1.0, d: 4 };
    glow(ctx, cam.cx, cam.cy, Math.min(w, h) * 0.2, SIGNAL, 0.16);
    const solid = (r: number, spin: number, rgb: string, a: number) => {
      const S = ICO.map(p => toScreen(rotX(rotY({ x: p.x * r, y: p.y * r, z: p.z * r }, spin + ay), ax + 0.3), cam));
      for (const [i, j] of IE) seg(ctx, S[i], S[j], rgb, a * (0.25 + front((S[i].z + S[j].z) / 2, r) * 0.75), 1.1);
      for (const p of S) glow(ctx, p.x, p.y, 3 + front(p.z, r) * 5, rgb, 0.4 + front(p.z, r) * 0.5);
    };
    const ring = (tilt: number, roll: number, speed: number) => {
      const pts: SP[] = [];
      for (let s = 0; s <= 80; s++) {
        const u = (s / 80) * Math.PI * 2;
        pts.push(toScreen(rotX(rotZ(rotX({ x: Math.cos(u) * 1.5, y: 0, z: Math.sin(u) * 1.5 }, tilt), roll), ax * 0.5), cam));
      }
      for (let s = 0; s < 80; s++) seg(ctx, pts[s], pts[s + 1], INK, 0.08 + front((pts[s].z + pts[s + 1].z) / 2, 1.5) * 0.4, 1);
      const k = Math.floor((((t * speed) % 1) + 1) % 1 * 80);
      glow(ctx, pts[k].x, pts[k].y, 9, SIGNAL, 0.9);
    };
    ring(1.2, 0.5, 0.12);
    solid(1, t * 0.15, INK, 0.9);
    solid(0.5, -t * 0.3, SIGNAL, 0.9);
    ring(1.2, -0.6, -0.09);
  };
}

/** Settings: inclined orbits around a glowing core. */
function orbitsScene(): Draw {
  return f => {
    const { ctx, w, h, t, mobile } = f;
    const { ax, ay } = view(f);
    const cam: Cam = { cx: w * (mobile ? 0.5 : 0.62), cy: h * 0.52, f: Math.min(w, h) * 1.0, d: 5 };
    glow(ctx, cam.cx, cam.cy, 70, SIGNAL, 0.45);
    glow(ctx, cam.cx, cam.cy, 18, "255,255,255", 0.95);
    for (let k = 0; k < 5; k++) {
      const R = 0.55 + k * 0.38, inc = 0.3 + k * 0.17, node = k * 1.3;
      const P = (u: number) => toScreen(rotY(rotX(rotY({ x: Math.cos(u) * R, y: 0, z: Math.sin(u) * R }, node), inc + ax), ay), cam);
      let prev = P(0);
      for (let s = 1; s <= 72; s++) {
        const cur = P((s / 72) * Math.PI * 2);
        seg(ctx, prev, cur, INK, 0.08 + front((prev.z + cur.z) / 2, R) * 0.35, 1);
        prev = cur;
      }
      const p = P(t * (0.5 / (k + 1)) + k);
      glow(ctx, p.x, p.y, 5 + front(p.z, R) * 7, k % 2 ? INK : SIGNAL, 0.5 + front(p.z, R) * 0.5);
    }
  };
}

/** Demo: silk ribbons of flowing value. */
function ribbonsScene(): Draw {
  return f => {
    const { ctx, w, h, t, mobile } = f;
    const { ax, ay } = view(f);
    const cam: Cam = { cx: w / 2, cy: h * 0.55, f: w * (mobile ? 0.7 : 0.45), d: 8 };
    const R = mobile ? 3 : 5, L = 8, steps = mobile ? 50 : 90;
    for (let r = 0; r < R; r++) {
      for (let l = 0; l < L; l++) {
        const off = (l / (L - 1) - 0.5) * 0.55;
        const pts: P2[] = [];
        for (let s = 0; s < steps; s++) {
          const x = -9 + (s / (steps - 1)) * 18;
          const th = x * 0.28 + t * 0.35 + r * 0.9;
          const y0 = (r - (R - 1) / 2) * 0.75 + 0.55 * Math.sin(x * 0.42 + t * 0.55 + r * 1.3);
          const z0 = 0.9 * Math.cos(x * 0.35 + t * 0.45 + r);
          pts.push(toScreen(rotY(rotX({ x, y: y0 + Math.cos(th) * off, z: z0 + Math.sin(th) * off }, ax * 0.5), ay * 0.4), cam));
        }
        path(ctx, pts);
        const edge = l === 0 || l === L - 1;
        ctx.strokeStyle = `rgba(${r % 2 ? INK : SIGNAL},${edge ? 0.4 : 0.12})`;
        ctx.lineWidth = edge ? 1.2 : 1;
        ctx.stroke();
      }
    }
  };
}

/**
 * Silk valley (used on every page): fine silver lines forming a curved surface
 * that rises into walls on both sides, rippling slowly, like brushed silk.
 * `seed` gives each page its own curvature, ripple, tilt and phase.
 */
function silkScene(seed: number): Draw {
  const width = 0.06 + ((seed * 37) % 10) / 200;          // how steeply the walls rise
  const freq = 0.35 + ((seed * 53) % 10) / 40;            // ripple frequency across the surface
  const tilt = ((((seed * 29) % 10) / 10) - 0.5) * 1.6;   // camera offset left/right
  const phase = seed * 1.7;

  return f => {
    const { ctx, w, h, t, px, scroll, mobile } = f;
    const rows = mobile ? 34 : 64, cols = mobile ? 48 : 96;
    const horizon = h * 0.42, foc = h * 0.9, camH = 1.1;
    const camX = tilt + (px / w - 0.5) * -0.8;
    const flow = t * 0.25 + scroll * 0.002;
    const height = (x: number, z: number) =>
      width * x * x * (1 + 0.25 * Math.sin(z * 0.25 + flow + phase)) +
      0.18 * Math.sin(x * freq + z * 0.35 - flow * 2 + phase);

    for (let r = 0; r < rows; r++) {
      const z = 22 - (r / (rows - 1)) * 20.5; // far → near
      const near = 1 - (z - 1.5) / 20.5;
      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        const x = -11 + (c / (cols - 1)) * 22;
        const sx = w / 2 + ((x - camX) * foc) / z;
        const sy = horizon + ((camH - height(x, z)) * foc) / z;
        if (c) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
      }
      // the walls catch the light; the valley floor stays dark
      const a = 0.035 + near * 0.26;
      const sheen = ctx.createLinearGradient(0, 0, w, 0);
      sheen.addColorStop(0, `rgba(230,230,236,${Math.min(1, a * 1.8)})`);
      sheen.addColorStop(0.5, `rgba(230,230,236,${a * 0.35})`);
      sheen.addColorStop(1, `rgba(230,230,236,${Math.min(1, a * 1.8)})`);
      ctx.strokeStyle = sheen;
      ctx.lineWidth = 0.6 + near * 0.8;
      ctx.stroke();
    }
  };
}

const SCENES: Record<SceneKind, () => Draw> = {
  terrain: terrainScene,
  globe: globeScene,
  ledger: ledgerScene,
  bars: barsScene,
  network: networkScene,
  chain: chainScene,
  helix: helixScene,
  lattice: latticeScene,
  sheets: sheetsScene,
  tunnel: tunnelScene,
  shield: shieldScene,
  orbits: orbitsScene,
  ribbons: ribbonsScene
};

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

/** Every scene, in the order the stage cycles through them. */
const SCENE_ORDER = Object.keys(SCENES) as SceneKind[];
/** A page starts on its own scene, then continues through all the others. */
const sequenceFor = (first: SceneKind) => {
  const i = SCENE_ORDER.indexOf(first);
  return [...SCENE_ORDER.slice(i), ...SCENE_ORDER.slice(0, i)];
};
/** Scroll distance (in viewport heights) that brings in the next scene. */
const SCROLL_STEP = 1.1;
const WIPE_S = 0.9;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

export function SceneBackdrop({ className, scene }: { className?: string; scene?: SceneKind }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const kind = scene ?? sceneForPath(pathname ?? "/");
  // The scene currently on stage — moves the key glow to that scene's position.
  const [shown, setShown] = useState<SceneKind>(kind);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const still =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.effects === "reduced";

    const sequence = sequenceFor(kind);
    const drawers = new Map<SceneKind, Draw>();
    const drawerFor = (k: SceneKind) => {
      let d = drawers.get(k);
      // every page draws the silk valley, each with its own variation (seeded by scene)
      if (!d) { d = silkScene(SCENE_ORDER.indexOf(k) + 1); drawers.set(k, d); }
      return d;
    };
    let index = 0;
    let current = drawerFor(sequence[0]);
    let previous: Draw | null = null;
    let wipe = 1; // 0 → 1 while the next scene sweeps in
    setShown(sequence[0]);

    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let tx = w * 0.5, ty = h * 0.6, px = tx, py = ty, pointerActive = false;
    let scroll = window.scrollY;
    const onMove = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; pointerActive = true; };
    const onLeave = () => { pointerActive = false; };

    // drifting specks filling the volume (evenly seeded, no Math.random)
    const MOTES = Array.from({ length: 40 }, (_, i) => ({
      x: ((((i * 37) % 100) / 100) - 0.5) * 18,
      y: (((i * 53) % 100) / 100) * 6 - 0.6,
      z: 1 + (((i * 71) % 100) / 100) * 15,
      s: 0.6 + ((i * 29) % 10) / 10
    }));

    let raf = 0, last = performance.now(), t = 0, lift = 0;

    /** Which scene should be on stage: one step per SCROLL_STEP viewports, plus the idle timer. */
    const targetIndex = () => Math.floor(scroll / Math.max(1, h * SCROLL_STEP)) % sequence.length;
    const goTo = (next: number) => {
      if (next === index) return;
      index = next;
      previous = still ? null : current;
      current = drawerFor(sequence[index]);
      wipe = still ? 1 : 0;
      setShown(sequence[index]);
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      px += (tx - px) * 0.08;
      py += (ty - py) * 0.08;
      lift += ((pointerActive ? 1 : 0) - lift) * 0.05;

      // cursor spotlight (white light on the silver stage)
      glow(ctx, px, py, 380, SIGNAL, 0.12 * (0.35 + lift * 0.65));

      // drifting specks — small crisp HUD crosses
      const camX = (px / w - 0.5) * -0.9, focal = h * 0.95;
      for (const m of MOTES) {
        const z = ((((m.z - t * 0.6 - scroll * 0.003) % 15) + 15) % 15) + 1;
        const sx = w / 2 + ((m.x - camX) * focal) / z;
        const sy = h * 0.42 - ((m.y + Math.sin(t * 0.5 + m.x) * 0.15) * focal) / z;
        if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
        const near = 1 - (z - 1) / 15;
        const r = (1 + near * 3) * m.s;
        const rgb = near > 0.7 ? SIGNAL : INK;
        seg(ctx, { x: sx - r, y: sy }, { x: sx + r, y: sy }, rgb, 0.15 + near * 0.45, 1);
        seg(ctx, { x: sx, y: sy - r }, { x: sx, y: sy + r }, rgb, 0.15 + near * 0.45, 1);
      }

      const frame: Frame = { ctx, w, h, t, dt, px, py, lift, scroll, mobile: w < 768 };
      if (!previous || wipe >= 1) {
        previous = null;
        current(frame);
        return;
      }

      // Diagonal wipe: the new scene sweeps in from the left behind a slanted light edge.
      const p = easeInOut(wipe);
      const slant = h * 0.45;
      const edge = -slant + p * (w + slant * 2);
      ctx.save();
      path(ctx, [{ x: edge, y: 0 }, { x: w + 10, y: 0 }, { x: w + 10, y: h }, { x: edge - slant, y: h }], true);
      ctx.clip();
      previous(frame);
      ctx.restore();

      ctx.save();
      path(ctx, [{ x: -10, y: 0 }, { x: edge, y: 0 }, { x: edge - slant, y: h }, { x: -10, y: h }], true);
      ctx.clip();
      current(frame);
      ctx.restore();

      // the light edge: white band, signal-blue line, thin red line
      const band = ctx.createLinearGradient(edge - 60, 0, edge, 0);
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(1, "rgba(255,255,255,.7)");
      path(ctx, [{ x: edge - 60, y: 0 }, { x: edge, y: 0 }, { x: edge - slant, y: h }, { x: edge - slant - 60, y: h }], true);
      ctx.fillStyle = band;
      ctx.fill();
      seg(ctx, { x: edge, y: 0 }, { x: edge - slant, y: h }, SIGNAL, 0.95, 2);
      seg(ctx, { x: edge + 7, y: 0 }, { x: edge + 7 - slant, y: h }, INK, 0.5, 1);
    };

    const loop = (now: number) => {
      // rAF timestamps can precede `last` on the first frame → clamp to [0, 50ms]
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      t += dt;
      if (wipe < 1) wipe = Math.min(1, wipe + dt / WIPE_S);
      else goTo(targetIndex());
      draw(dt);
      raf = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      scroll = window.scrollY;
      if (still) { goTo(targetIndex()); draw(0); }
    };
    const onResize = () => { resize(); if (still) draw(0); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    if (still) {
      t = 4;
      goTo(targetIndex());
      draw(0);
      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
      };
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [kind]);

  const meta = SCENE_META[shown];
  return (
    <div
      className={cn("scene-backdrop", className)}
      data-scene={shown}
      aria-hidden
      style={{ "--glow-x": `${meta.glowX}%` } as React.CSSProperties}
    >
      <div className="scene-glow scene-glow-a" />
      <div className="scene-glow scene-glow-b" />
      <canvas ref={canvasRef} className="scene-canvas absolute inset-0" />
      <div className="scene-beam" />
      <div className="scene-grain" />
      <div className="scene-vignette" />
    </div>
  );
}
