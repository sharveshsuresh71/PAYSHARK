"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { allNavItems, isActivePath } from "./nav-config";
import { guideState } from "./swipe-nav";
import { cn } from "@/lib/cn";

/*
 * Live 3D background (WebGL ray-marching, no dependencies).
 *
 * Every page has its own subject, colour and motion:
 *   Overview      → glass payment card with orbiting gold coins
 *   Transactions  → a helix of coins and cards streaming around a core
 *   Analytics     → a 3D bar chart whose bars rise as you scroll
 *   Review Center → a stack of review sheets that fans open, check mark on top
 *   Agreements    → a booklet whose pages turn, with signature line and gold seal
 *   Policies      → gyroscope rings that lock into alignment
 *   AI Agents     → a glowing agent network with data pulses
 *   Security      → a shield with a scanning ring
 *   Audit Trail   → a hash chain; the "verified" link travels along it
 *   Attack Sim.   → a red shield fending off incoming threats
 *   Developers    → an API hub with endpoint blocks in orbit
 *   Settings      → interlocking gears
 *
 * The sky is a river of colour: as you scroll from the top of a page to the
 * bottom it flows through morning, noon, dusk, evening and night (sun, then
 * moon, then stars). The next page starts again at morning.
 *
 * Scrolling drives the scene: the object turns and transforms with scroll
 * progress, the colour shifts toward the next page's colour, a stream of light
 * flows down to a portal, and at the bottom (or when pulling past the end, see
 * NextPageGuide) the object dives into the portal. On arrival, the next page's
 * object rises out of it.
 *
 * Rendered at reduced resolution and paused while the tab is hidden. The system
 * reduced-motion preference slows it down; Settings → "Reduce visual effects"
 * renders still frames. If WebGL is unavailable the CSS glow layers remain.
 */

type Rgb = [number, number, number];
interface SceneConfig {
  scene: number;   // which subject the shader draws
  variant: number; // alternate arrangement of a shared subject
  hue: Rgb;        // page accent colour (0..1)
  shift: [number, number]; // where the subject sits on wide screens
  scale: number;
  seed: number;
}

const SCENES: Record<string, SceneConfig> = {
  "/":             { scene: 0, variant: 0, hue: [0.23, 0.51, 0.96], shift: [0.55, -0.02], scale: 0.95, seed: 0.5 },
  "/dashboard":    { scene: 0, variant: 0, hue: [0.23, 0.51, 0.96], shift: [0.6, 0.1],    scale: 0.92, seed: 1.9 },
  "/transactions": { scene: 1, variant: 0, hue: [0.16, 0.74, 0.86], shift: [0.6, 0.02],   scale: 0.8,  seed: 3.1 },
  "/analytics":    { scene: 2, variant: 0, hue: [0.56, 0.45, 0.98], shift: [0.6, 0.04],   scale: 0.85, seed: 4.2 },
  "/approvals":    { scene: 3, variant: 0, hue: [0.22, 0.8, 0.56],  shift: [0.62, 0.02],  scale: 0.85, seed: 5.4 },
  "/agreements":   { scene: 3, variant: 1, hue: [0.95, 0.72, 0.36], shift: [0.58, 0.04],  scale: 0.85, seed: 6.6 },
  "/policies":     { scene: 4, variant: 0, hue: [0.4, 0.47, 1.0],   shift: [0.62, 0.06],  scale: 0.8,  seed: 7.3 },
  "/agents":       { scene: 5, variant: 0, hue: [0.28, 0.76, 1.0],  shift: [0.6, 0.04],   scale: 0.8,  seed: 8.8 },
  "/security":     { scene: 6, variant: 0, hue: [0.18, 0.84, 0.72], shift: [0.62, 0.04],  scale: 0.85, seed: 9.7 },
  "/audit":        { scene: 7, variant: 0, hue: [0.95, 0.6, 0.42],  shift: [0.6, 0.06],   scale: 0.7,  seed: 10.9 },
  "/demo":         { scene: 6, variant: 1, hue: [0.96, 0.32, 0.36], shift: [0.6, 0.04],   scale: 0.8,  seed: 12.1 },
  "/developers":   { scene: 5, variant: 1, hue: [0.82, 0.45, 0.95], shift: [0.6, 0.06],   scale: 0.8,  seed: 13.4 },
  "/settings":     { scene: 8, variant: 0, hue: [0.62, 0.72, 0.92], shift: [0.6, 0.02],   scale: 0.8,  seed: 14.2 }
};

function configFor(path: string): SceneConfig {
  if (path === "/") return SCENES["/"];
  const key = Object.keys(SCENES).find(k => k !== "/" && isActivePath(path, k));
  return SCENES[key ?? "/dashboard"];
}

/** The page the scroll guide leads to (same order as the swipe navigation). */
function nextConfigFor(path: string): SceneConfig {
  const i = allNavItems.findIndex(item => isActivePath(path, item.href));
  const next = allNavItems[(i + 1) % allNavItems.length];
  return SCENES[next.href] ?? SCENES["/dashboard"];
}

const VERT = `
attribute vec2 aPos;
/* time of day: 5 stops (morning · noon · dusk · evening · night), k runs 0..4 */
vec3 ramp5(float k, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) {
  vec3 r = mix(a, b, smoothstep(0.0, 1.0, k));
  r = mix(r, c, smoothstep(1.0, 2.0, k));
  r = mix(r, d, smoothstep(2.0, 3.0, k));
  return mix(r, e, smoothstep(3.0, 4.0, k));
}

void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;    // -1..1
uniform vec2 uShift;    // where the subject sits on screen
uniform float uScale;
uniform float uSeed;
uniform float uScene;
uniform float uVariant;
uniform float uP;       // scroll progress through the page, 0..1
uniform float uEnd;     // hand-off to the next page, 0..1
uniform float uIntro;   // entrance, 0..1
uniform vec3 uHueA;     // this page's colour
uniform vec3 uHueB;     // next page's colour

float T, P, S, E;
vec3 HUE;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

/* ---------- primitives ---------- */
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdCoin(vec3 p, float r, float h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - 0.012;
}
float sdTorus(vec3 p, float R, float r) { return length(vec2(length(p.xz) - R, p.y)) - r; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
void take(inout vec2 res, float d, float m) { if (d < res.x) res = vec2(d, m); }

/* world → subject space: floats, leans toward the cursor, turns with scroll */
vec3 toLocal(vec3 p) {
  p /= S;
  p.y -= sin(T * 0.6) * 0.06;
  p.xz *= rot(uMouse.x * 0.35 + P * 1.2);
  p.yz *= rot(-uMouse.y * 0.22);
  return p;
}
/* the payment card flips over as you scroll */
vec3 toCard(vec3 p) {
  p.xz *= rot(sin(T * 0.35 + uSeed) * 0.5 + P * 3.14159);
  p.yz *= rot(0.32 + sin(T * 0.27) * 0.14);
  p.xy *= rot(-0.12);
  return p;
}

/* materials: 1 card · 2 gold · 3 tinted glass · 4 glowing accent */

/* 0 — Overview: card + orbiting coins (orbit widens with scroll) */
vec2 sceneCard(vec3 p) {
  vec2 res = vec2(sdRoundBox(toCard(p), vec3(1.35, 0.85, 0.03), 0.12), 1.0);
  float spread = 1.0 + P * 0.35;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float a = T * 0.45 + fi * 1.2566 + uSeed + P * 2.5;
    vec3 q = p - vec3(cos(a) * 2.1 * spread, sin(a * 1.3 + fi) * 0.55, sin(a) * 1.25 * spread);
    q.xy *= rot(1.2 + fi);
    q.yz *= rot(T * 1.6 + fi * 2.0);
    take(res, sdCoin(q, 0.3, 0.032), 2.0);
  }
  return res;
}

/* 1 — Transactions: coins and cards streaming in a helix (stretches + speeds up with scroll) */
vec2 sceneFlow(vec3 p) {
  vec2 res = vec2(sdCapsule(p, vec3(0.0, -1.9, 0.0), vec3(0.0, 1.9, 0.0), 0.03), 4.0);
  float stretch = 0.3 + P * 0.1;
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    float a = fi * 0.78 + T * 0.6 + P * 5.0;
    float rad = 1.05 + 0.2 * sin(fi * 0.9 + T * 0.5) + P * 0.25;
    vec3 q = p - vec3(cos(a) * rad, (fi - 5.0) * stretch, sin(a) * rad);
    q.xz *= rot(a);
    q.xy *= rot(1.5708 + sin(T * 0.8 + fi) * 0.35);
    if (mod(fi, 3.0) < 0.5) take(res, sdRoundBox(q, vec3(0.3, 0.025, 0.19), 0.03), 3.0);
    else take(res, sdCoin(q, 0.24, 0.03), 2.0);
  }
  return res;
}

/* 2 — Analytics: 3D bar chart, bars rise as you scroll */
vec2 sceneBars(vec3 p) {
  p.xz *= rot(-0.55);
  p.y += 0.25;
  vec2 res = vec2(sdRoundBox(p - vec3(0.0, -0.95, 0.0), vec3(1.35, 0.025, 0.95), 0.025), 3.0);
  float grow = 0.3 + 0.7 * smoothstep(0.0, 0.75, P);
  for (int i = 0; i < 5; i++) {
    for (int j = 0; j < 3; j++) {
      float fi = float(i), fj = float(j);
      float h = (0.25 + 0.75 * (0.5 + 0.5 * sin(fi * 1.7 + fj * 2.3 + T * 0.9 + uSeed))) * grow * 0.75 + 0.04;
      vec3 q = p - vec3((fi - 2.0) * 0.5, -0.92 + h, (fj - 1.0) * 0.56);
      take(res, sdRoundBox(q, vec3(0.16, h, 0.16), 0.04), j == 1 ? 4.0 : 3.0);
    }
  }
  return res;
}

/* 3 — Review Center: sheets fan open (variant 0) · Agreements: booklet pages turn (variant 1) */
vec2 sceneSheets(vec3 p) {
  vec2 res = vec2(1e5, 3.0);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec3 q;
    if (uVariant < 0.5) {
      q = p - vec3(-0.85, -1.1, (fi - 2.0) * 0.07);
      q.xy *= rot(-(fi - 2.0) * (0.06 + 0.26 * P) - sin(T * 0.5 + fi) * 0.03);
      q -= vec3(0.85, 1.1, 0.0);
    } else {
      q = p;
      q.xz *= rot(-1.25 + fi * (0.12 + 0.48 * P) + sin(T * 0.45 + fi) * 0.05);
      q.x -= 0.82;
    }
    take(res, sdRoundBox(q, vec3(0.82, 1.08, 0.014), 0.06), 3.0);
    if (i == 4) {
      if (uVariant < 0.5) {
        vec3 c = q - vec3(0.0, 0.05, 0.05);
        take(res, min(sdCapsule(c, vec3(-0.32, 0.0, 0.0), vec3(-0.08, -0.26, 0.0), 0.05),
                      sdCapsule(c, vec3(-0.08, -0.26, 0.0), vec3(0.38, 0.32, 0.0), 0.05)), 4.0);
      } else {
        take(res, sdCapsule(q, vec3(-0.5, -0.62, 0.03), vec3(0.2, -0.62, 0.03), 0.018), 4.0);
        vec3 s = q - vec3(0.42, -0.6, 0.04);
        s.yz *= rot(1.5708);
        take(res, sdCoin(s, 0.18, 0.025), 2.0);
      }
    }
  }
  return res;
}

/* 4 — Policies: gyroscope rings that lock into alignment as you scroll */
vec2 sceneRings(vec3 p) {
  vec2 res = vec2(length(p) - 0.2, 4.0);
  float lock = smoothstep(0.2, 0.9, P);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float R = 1.45 - fi * 0.36;
    vec3 q = p;
    q.yz *= rot(mix(1.2 + fi * 0.9 + sin(T * (0.4 + fi * 0.15) + uSeed) * 0.8, 1.35, lock));
    q.xy *= rot(mix(fi * 1.1 + cos(T * (0.3 + fi * 0.2)) * 0.9, 0.0, lock));
    take(res, sdTorus(q, R, 0.05), i == 1 ? 2.0 : 3.0);
    float a = T * (0.8 - fi * 0.2) + fi * 2.0;
    take(res, length(q - vec3(cos(a), 0.0, sin(a)) * R) - 0.075, 4.0);
  }
  return res;
}

/* 5 — AI Agents: network (variant 0) · Developers: API hub with endpoint blocks (variant 1) */
vec3 nodePos(float fi) {
  float k = 0.85 + P * 0.4;
  vec3 wob = vec3(sin(T * 0.6 + fi), cos(T * 0.5 + fi * 1.3), sin(T * 0.4 + fi * 0.7)) * 0.07;
  if (uVariant < 0.5)
    return vec3(sin(fi * 2.4 + uSeed) * 1.45, cos(fi * 1.7 + uSeed * 2.0) * 0.95, sin(fi * 3.1 + 1.0) * 0.9) * k + wob;
  float a = fi / 6.0 * 6.2831 + T * 0.18;
  return vec3(cos(a) * 1.5, sin(fi * 2.0 + T * 0.7) * 0.28, sin(a) * 1.5) * k + wob;
}
vec2 sceneNetwork(vec3 p) {
  vec2 res = uVariant < 0.5 ? vec2(length(p) - 0.3, 4.0) : vec2(sdRoundBox(p, vec3(0.26), 0.06), 2.0);
  for (int i = 1; i <= 6; i++) {
    float fi = float(i);
    vec3 a = nodePos(fi);
    vec3 b = nodePos(i == 6 ? 1.0 : fi + 1.0);
    take(res, uVariant < 0.5 ? length(p - a) - 0.15 : sdRoundBox(p - a, vec3(0.12), 0.035), 3.0);
    take(res, sdCapsule(p, vec3(0.0), a, 0.014), 3.0);
    take(res, sdCapsule(p, a, b, 0.01), 3.0);
    take(res, length(p - a * fract(T * 0.45 + fi * 0.37)) - 0.045, 4.0);
  }
  return res;
}

/* 6 — Security: shield + scan ring (variant 0) · Attack Simulator: threats bounce off (variant 1) */
float sdShield(vec3 p) {
  float w = 0.95 * (0.3 + 0.7 * smoothstep(-1.25, 0.25, p.y));
  float d2 = max(abs(p.x) - w, abs(p.y + 0.15) - 1.1);
  float bulge = 0.13 * (1.0 - clamp(dot(p.xy, p.xy) * 0.45, 0.0, 1.0));
  vec2 q = vec2(d2, abs(p.z) - 0.04 - bulge);
  return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0))) * 0.7 - 0.04;
}
vec2 sceneShield(vec3 p) {
  vec2 res = vec2(sdShield(p), 3.0);
  vec3 e = p - vec3(0.0, 0.0, 0.17);
  if (uVariant < 0.5) {
    take(res, min(sdCapsule(e, vec3(-0.3, 0.02, 0.0), vec3(-0.07, -0.22, 0.0), 0.055),
                  sdCapsule(e, vec3(-0.07, -0.22, 0.0), vec3(0.34, 0.3, 0.0), 0.055)), 4.0);
  } else {
    take(res, min(sdCapsule(e, vec3(0.0, 0.32, 0.0), vec3(0.0, -0.08, 0.0), 0.06), length(e - vec3(0.0, -0.3, 0.0)) - 0.07), 4.0);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float a = T * 0.5 + fi * 1.5708;
      float r = 1.85 - 0.6 * pow(abs(sin(T * 0.9 + fi * 1.3)), 6.0);
      take(res, length(p - vec3(cos(a) * r, sin(a * 1.7 + fi) * 0.6, sin(a) * r * 0.6 + 0.3)) - 0.09, 4.0);
    }
  }
  vec3 s = p - vec3(0.0, sin(T * 0.9) * 1.05 - 0.1, 0.0);
  take(res, sdTorus(s, 1.35 + P * 0.25, 0.012), 4.0);
  return res;
}

/* 7 — Audit Trail: hash chain; the glowing "verified" link moves along, links part with scroll */
vec2 sceneChain(vec3 p) {
  p.yz *= rot(T * 0.25);
  vec2 res = vec2(1e5, 3.0);
  float active = floor(mod(T * 0.9, 5.0));
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec3 q = p - vec3((fi - 2.0) * 0.8 * (1.0 + P * 0.3), sin(fi * 1.1 + T * 0.8) * 0.1, 0.0);
    if (mod(fi, 2.0) > 0.5) q.yz *= rot(1.5708);
    vec3 a = vec3(max(abs(q.x) - 0.24, 0.0), q.y, q.z);
    float d = length(vec2(length(a.xy) - 0.3, a.z)) - 0.075;
    take(res, d, abs(fi - active) < 0.5 ? 4.0 : (mod(fi, 2.0) < 0.5 ? 2.0 : 3.0));
  }
  return res;
}

/* 8 — Settings: interlocking gears (turn with time and scroll) */
float sdGear(vec3 p, float R, float n) {
  float r = length(p.xy);
  float a = atan(p.y, p.x);
  float d2 = r - R - smoothstep(-0.35, 0.35, sin(a * n)) * 0.12;
  d2 = max(d2, R * 0.38 - r);
  vec2 q = vec2(d2 * 0.55, abs(p.z) - 0.09);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - 0.02;
}
vec2 sceneGears(vec3 p) {
  float spin = T * 0.35 + P * 3.0;
  vec3 a = p - vec3(-0.5, 0.0, 0.0);
  vec2 res = vec2(sdCapsule(a, vec3(0.0, 0.0, -0.25), vec3(0.0, 0.0, 0.25), 0.11), 4.0);
  a.xy *= rot(spin);
  take(res, sdGear(a, 0.85, 12.0), 3.0);
  vec3 b = p - vec3(0.58, 0.94, 0.0);
  b.xy *= rot(-spin * 12.0 / 7.0 + 0.3);
  take(res, sdGear(b, 0.5, 7.0), 2.0);
  vec3 c = p - vec3(0.42, -0.95, 0.0);
  c.xy *= rot(-spin * 2.0 + 0.1);
  take(res, sdGear(c, 0.4, 6.0), 3.0);
  return res;
}

// x = distance, y = material
vec2 map(vec3 p) {
  vec3 lp = toLocal(p);
  float b = length(lp) - 3.4;
  if (b > 0.5) return vec2(b * S, 0.0);
  vec2 r;
  if (uScene < 0.5) r = sceneCard(lp);
  else if (uScene < 1.5) r = sceneFlow(lp);
  else if (uScene < 2.5) r = sceneBars(lp);
  else if (uScene < 3.5) r = sceneSheets(lp);
  else if (uScene < 4.5) r = sceneRings(lp);
  else if (uScene < 5.5) r = sceneNetwork(lp);
  else if (uScene < 6.5) r = sceneShield(lp);
  else if (uScene < 7.5) r = sceneChain(lp);
  else r = sceneGears(lp);
  return vec2(r.x * S * 0.8, r.y);
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    map(p + e.xyy).x - map(p - e.xyy).x,
    map(p + e.yxy).x - map(p - e.yxy).x,
    map(p + e.yyx).x - map(p - e.yyx).x
  ));
}

// studio lighting: soft overhead box, key light in the page colour, white rim
vec3 env(vec3 r) {
  float y = r.y * 0.5 + 0.5;
  vec3 col = mix(vec3(0.02, 0.04, 0.09), vec3(0.08, 0.13, 0.26), y);
  col += vec3(0.92, 0.96, 1.0) * smoothstep(0.86, 1.0, r.y) * 1.05;
  col += mix(HUE, vec3(0.6, 0.75, 1.0), 0.3) * pow(max(0.0, dot(r, normalize(vec3(-0.8, 0.35, 0.5)))), 14.0) * 1.6;
  col += vec3(0.9, 0.94, 1.0) * pow(max(0.0, dot(r, normalize(vec3(0.9, 0.15, 0.2)))), 36.0) * 1.0;
  col += HUE * smoothstep(0.05, 0.0, abs(r.y - 0.12)) * 0.3;
  col += HUE * 0.12 * smoothstep(-0.2, -1.0, r.y);
  return col;
}

vec3 holoTint(float k) {
  vec3 holo = 0.5 + 0.5 * cos(6.2831 * (k + T * 0.04) + vec3(0.0, 1.8, 3.6));
  return mix(holo, HUE, 0.55);
}

// card face: holographic glass with engraving, chip, number dots and contactless mark
vec3 shadeCard(vec3 p, vec3 r, float fres) {
  vec3 lp = toCard(toLocal(p));
  vec2 cuv = lp.xy;
  float front = step(0.0, lp.z);
  vec3 refl = env(r);
  vec3 c = vec3(0.03, 0.06, 0.15) + refl * 0.55 + holoTint(fres * 0.8 + cuv.x * 0.12 + cuv.y * 0.08) * (0.15 + fres * 0.6);

  float g = abs(sin(cuv.x * 9.0 + sin(cuv.y * 6.0 + T * 0.3) * 1.5));
  c += HUE * smoothstep(0.07, 0.0, g) * 0.14 * front;

  vec2 chip = abs(cuv - vec2(-0.82, 0.16)) - vec2(0.22, 0.17);
  float inChip = step(max(chip.x, chip.y), 0.0) * front;
  vec3 gold = vec3(0.98, 0.8, 0.47) * (0.25 + refl * 0.9);
  float chipLines = smoothstep(0.012, 0.0, abs(cuv.y - 0.16)) + smoothstep(0.012, 0.0, abs(cuv.x + 0.82));
  c = mix(c, gold * (1.0 - 0.35 * chipLines), inChip);

  float gx = cuv.x + 1.1;
  float cell = fract(gx * 7.0) - 0.5;
  float inRow = step(0.0, gx) * step(gx, 2.27) * step(0.12, fract(gx * 1.75));
  float dots = smoothstep(0.32, 0.18, length(vec2(cell, (cuv.y + 0.32) * 7.0))) * inRow * front;
  c += vec3(0.85, 0.9, 1.0) * dots * 0.75;

  vec2 cm = cuv - vec2(0.98, 0.5);
  float arcs = 0.0;
  for (int k = 1; k <= 3; k++) {
    float rr = 0.06 * float(k);
    arcs += smoothstep(0.012, 0.0, abs(length(cm) - rr)) * step(0.0, cm.x) * step(abs(cm.y), cm.x * 1.2);
  }
  c += vec3(0.8, 0.88, 1.0) * arcs * 0.7 * front;

  float edge = smoothstep(0.08, 0.0, min(1.35 - abs(cuv.x), 0.85 - abs(cuv.y)));
  c += HUE * edge * 0.35;
  return c;
}

vec3 shade(vec3 p, vec3 rd, float mat) {
  vec3 n = calcNormal(p);
  vec3 r = reflect(rd, n);
  float fres = pow(1.0 - max(0.0, dot(n, -rd)), 3.0);
  if (mat < 1.5) return shadeCard(p, r, fres);
  if (mat < 2.5) return vec3(1.0, 0.82, 0.5) * (env(r) * 0.95 + 0.05) * (0.65 + 0.6 * fres);
  if (mat < 3.5) {
    return vec3(0.03, 0.05, 0.12) + env(r) * 0.5 + holoTint(fres * 0.8 + p.y * 0.15) * (0.1 + fres * 0.55) + HUE * fres * 0.3;
  }
  return HUE * 1.4 + vec3(0.25) + vec3(0.5) * fres;
}

void main() {
  T = uTime;
  P = uP;
  E = uEnd;
  // the sky is a river of colour that follows the scroll: morning -> night
  float K = clamp(P, 0.0, 1.0) * 4.0;
  vec3 skyTop = ramp5(K, vec3(0.34, 0.38, 0.78), vec3(0.08, 0.34, 0.76), vec3(0.30, 0.16, 0.52), vec3(0.12, 0.08, 0.32), vec3(0.02, 0.04, 0.11));
  vec3 skyBot = ramp5(K, vec3(0.86, 0.46, 0.44), vec3(0.20, 0.52, 0.76), vec3(0.92, 0.34, 0.20), vec3(0.36, 0.12, 0.40), vec3(0.05, 0.10, 0.22));
  vec3 river  = ramp5(K, vec3(1.00, 0.72, 0.48), vec3(0.18, 0.80, 1.00), vec3(1.00, 0.58, 0.18), vec3(0.66, 0.30, 0.90), vec3(0.16, 0.40, 0.90));
  vec3 orb    = ramp5(K, vec3(1.00, 0.78, 0.55), vec3(1.00, 0.97, 0.85), vec3(1.00, 0.52, 0.26), vec3(0.88, 0.72, 0.92), vec3(0.85, 0.92, 1.00));
  HUE = mix(uHueA, uHueB, clamp(smoothstep(0.55, 1.0, P) * 0.5 + E * 0.8, 0.0, 1.0));
  HUE = mix(HUE, river, 0.3);

  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 portal = vec2(uShift.x * 0.35, -0.38);
  // rises out of the portal on arrival, dives back into it on hand-off
  vec2 center = mix(vec2(uShift.x * 0.35, -0.8), uShift, uIntro);
  center = mix(center, portal, E * 0.8);
  S = uScale * mix(0.3, 1.0, uIntro) * (1.0 - E * 0.65);
  vec2 q = uv - center;

  // backdrop: midnight-navy gradient + flowing liquid current tinted with the page colour;
  // the current shifts and churns harder as you scroll
  vec3 col = mix(skyBot, skyTop, smoothstep(-0.6, 0.7, uv.y));
  float ft = uTime * 0.09 + P * 1.6 + uSeed * 0.3;
  vec2 fp = rot(uSeed * 0.7) * (uv * (1.2 + fract(uSeed * 0.37) * 0.8)) + uMouse * vec2(-0.25, 0.18);
  vec2 w1 = vec2(fbm(fp + vec2(0.0, ft)), fbm(fp + vec2(5.2, 1.3) - ft));
  vec2 w2 = vec2(fbm(fp + 3.0 * w1 + vec2(1.7, 9.2) + ft * 1.3), fbm(fp + 3.0 * w1 + vec2(8.3, 2.8) - ft));
  float f = fbm(fp + (3.5 + P * 1.5 + E * 2.0) * w2);
  vec3 current = mix(skyBot * 0.6, river * 0.8, smoothstep(0.35, 0.8, f));
  current += mix(river, vec3(1.0), 0.35) * pow(smoothstep(0.62, 0.95, f), 3.0) * 0.6;
  col = mix(col, current, 0.72);

  col += HUE * 0.45 * exp(-dot(q, q) * 2.6) * 0.45;
  col += HUE * 0.25 * exp(-dot(uv + vec2(0.6, 0.5), uv + vec2(0.6, 0.5)) * 2.0) * 0.5;

  // sun -> moon crossing the sky as you scroll, with stars after dusk
  float arcW = max(0.3, uRes.x / uRes.y * 0.5 - 0.12);
  vec2 bodyPos = vec2(mix(-1.0, 1.0, P) * arcW, -0.02 + 0.42 * sin(P * 3.14159));
  float bd = length(uv - bodyPos);
  col += orb * exp(-bd * bd * 14.0) * 0.55;
  col = mix(col, orb, (1.0 - smoothstep(0.042, 0.05, bd)) * 0.9);
  float starW = smoothstep(2.6, 3.8, K);
  vec2 sg = uv * 34.0;
  vec2 sid = floor(sg);
  float sh = hash(sid);
  vec2 soff = (vec2(hash(sid + 1.3), hash(sid + 7.7)) - 0.5) * 0.5;
  float star = step(0.94, sh) * (1.0 - smoothstep(0.0, 0.14, length(fract(sg) - 0.5 - soff)));
  col += vec3(0.8, 0.9, 1.0) * star * (0.6 + 0.4 * sin(T * 2.0 + sh * 50.0)) * starW * smoothstep(-0.15, 0.45, uv.y);

  // guide stream: particles flow from the subject down into the portal as you scroll
  float trail = smoothstep(0.3, 0.85, P) * 0.6 + E;
  vec3 glowB = mix(uHueB, vec3(1.0), 0.3);
  for (int k = 0; k < 10; k++) {
    float fk = float(k);
    float t = fract(T * 0.22 + fk / 10.0);
    vec2 pos = mix(center, portal, t) + vec2(sin(t * 3.14159 + fk) * 0.12 * (1.0 - t), 0.0);
    float d = length(uv - pos);
    col += glowB * exp(-d * d * 4000.0) * sin(t * 3.14159) * trail * 0.8;
  }

  // portal to the next page, in the next page's colour
  vec2 dp = uv - portal;
  float pr = length(dp);
  float vis = smoothstep(0.0, 0.25, E + trail * 0.3);
  float ringR = 0.03 + E * 0.16;
  float ang = atan(dp.y, dp.x);
  float rw = (pr - ringR) / (0.006 + E * 0.01);
  float ring = exp(-rw * rw);
  float swirl = pow(0.5 + 0.5 * sin(ang * 7.0 - T * 3.0 + pr * 30.0), 6.0) * exp(-pr * 6.0);
  float rays = pow(0.5 + 0.5 * sin(ang * 16.0 + T * 1.5), 12.0) * exp(-pr * 2.5) * smoothstep(ringR, ringR + 0.3, pr);
  col = mix(col, uHueB * 0.3 + col * 0.3, smoothstep(ringR, ringR * 0.5, pr) * vis * 0.8);
  col += uHueB * (ring * 1.4 + swirl * 0.6 * E + rays * 0.3 * E) * vis;

  // ray-march the subject
  vec3 ro = vec3(0.0, 0.0, 6.5);
  vec3 rd = normalize(vec3(q, -1.9));
  float t = 0.0;
  vec2 h = vec2(0.0);
  bool hit = false;
  for (int i = 0; i < 110; i++) {
    h = map(ro + rd * t);
    if (h.x < 0.0015) { hit = true; break; }
    t += h.x;
    if (t > 13.0) break;
  }
  if (hit) col = shade(ro + rd * t, rd, h.y);

  // tone + vignette
  col = col / (1.0 + col);
  col = pow(col, vec3(0.85));
  col *= 1.0 - 0.35 * dot(uv * 0.7, uv * 0.7);
  col *= mix(1.0, mix(0.78, 1.0, smoothstep(-0.7, 0.25, uv.x)), step(0.05, uShift.x));
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("SceneBackdrop shader:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function SceneBackdrop({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!canvas || !gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("SceneBackdrop link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // one oversized triangle covering the screen
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u("uRes"), uTime = u("uTime"), uMouse = u("uMouse"), uShift = u("uShift"), uScale = u("uScale");
    const uP = u("uP"), uEnd = u("uEnd"), uIntro = u("uIntro");

    const cfg = configFor(pathname);
    const next = nextConfigFor(pathname);
    gl.uniform1f(u("uSeed"), cfg.seed);
    gl.uniform1f(u("uScene"), cfg.scene);
    gl.uniform1f(u("uVariant"), cfg.variant);
    gl.uniform3f(u("uHueA"), ...cfg.hue);
    gl.uniform3f(u("uHueB"), ...next.hue);

    // Only the app's own "Reduce visual effects" switch freezes the scene; the
    // system reduced-motion preference slows it down instead.
    let savedReduced = false;
    try { savedReduced = localStorage.getItem("payshark:effects") === "reduced"; } catch {}
    const still = document.documentElement.dataset.effects === "reduced" || savedReduced;
    const speed = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.35 : 1;

    const resize = () => {
      // soft background → render at ~half resolution, capped for large screens
      const quality = Math.min(0.6, 1100 / Math.max(window.innerWidth, 1));
      const w = Math.max(1, Math.round(window.innerWidth * quality));
      const h = Math.max(1, Math.round(window.innerHeight * quality));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      const mobile = window.innerWidth < 768;
      const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
      // subject on the right on wide screens, top-centre on phones
      const sx = mobile ? 0 : Math.min(cfg.shift[0], aspect * 0.5 - 0.25);
      const sy = mobile ? 0.28 : cfg.shift[1];
      gl.uniform2f(uShift, sx, sy);
      gl.uniform1f(uScale, mobile ? cfg.scale * 0.7 : cfg.scale);
    };
    resize();

    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    let raf = 0;
    let progress = 0; // smoothed scroll progress
    let pull = 0;     // smoothed pull past the end (from NextPageGuide)
    const start = performance.now();
    const frame = (now: number) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const scrollable = max > 40;
      const target = scrollable ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress = still ? target : progress + (target - progress) * 0.07;
      pull = still ? guideState.pull : pull + (guideState.pull - pull) * 0.15;
      const end = Math.min(1, (scrollable ? smoothstep(0.8, 1, progress) * 0.5 : 0) + pull * 0.7);
      const intro = still ? 1 : 1 - Math.pow(1 - Math.min(1, (now - start) / 1400), 3);

      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      gl.uniform1f(uTime, still ? 6 : ((now - start) / 1000) * speed);
      gl.uniform1f(uP, progress);
      gl.uniform1f(uEnd, end);
      gl.uniform1f(uIntro, intro);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => {
      if (!document.hidden && !still) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
    };
    const onResize = () => { resize(); if (still) frame(performance.now()); };
    const onScrollStill = () => { if (still) frame(performance.now()); };

    canvas.dataset.ready = "true";
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScrollStill, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScrollStill);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [pathname]);

  return (
    <div className={cn("scene-backdrop", className)} aria-hidden>
      {/* CSS fallback light (visible if WebGL is unavailable) */}
      <div className="scene-glow scene-glow-a" />
      <div className="scene-glow scene-glow-b" />
      <canvas ref={canvasRef} className="scene-gl" />
      <div className="scene-veil" />
      <div className="scene-grain" />
    </div>
  );
}
