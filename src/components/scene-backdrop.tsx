"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/*
 * Live 3D background (WebGL, no dependencies).
 * A fragment shader ray-marches a cluster of liquid-chrome blobs that merge and
 * flow into each other, lit by a dark studio environment (soft top light, cool
 * key light, white rim). The cluster:
 *  - slowly turns toward the cursor,
 *  - morphs as you scroll the page,
 *  - takes a different arrangement, size and position on each page.
 * Rendered at reduced resolution (it's a soft background) and paused while the
 * tab is hidden. Reduced motion / "Reduce visual effects" render one still frame.
 * If WebGL is unavailable, the CSS glow layers underneath remain as a fallback.
 */

const ROUTES = [
  "/", "/dashboard", "/transactions", "/analytics", "/approvals", "/agreements", "/policies",
  "/agents", "/security", "/audit", "/demo", "/developers", "/settings"
];

/** Per-page variation: blob motion seed, on-screen position and size. */
function layoutFor(path: string) {
  const found = ROUTES.findIndex(r => (r === "/" ? path === "/" : path === r || path.startsWith(`${r}/`)));
  const i = Math.max(0, found);
  const positions: [number, number][] = [[0.55, -0.02], [0.62, 0.2], [0.5, -0.16], [0.66, 0.04]];
  return { seed: i * 1.37 + 0.5, shift: positions[i % positions.length], scale: 1 - (i % 3) * 0.08 };
}

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform vec2 uMouse;   // -1..1
uniform vec2 uShift;   // where the cluster sits on screen
uniform float uScale;
uniform float uSeed;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// value noise + fbm for the flowing liquid current
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

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float map(vec3 p) {
  p /= uScale;
  p.xz *= rot(uMouse.x * 0.6 + uTime * 0.18);
  p.yz *= rot(-uMouse.y * 0.35 + sin(uTime * 0.21) * 0.25);
  float d = 1e5;
  float t0 = uTime * 0.55 + uScroll * 0.0015 + uSeed;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float t = t0 + fi * 1.73;
    vec3 c = vec3(
      sin(t * 0.9 + fi * 0.7) * 1.25,
      cos(t * 0.7 + fi * 2.1) * 0.85,
      sin(t * 0.55 + fi * 1.3) * 0.9
    );
    float r = 0.48 + 0.16 * sin(fi * 2.7 + uSeed);
    d = smin(d, length(p - c) - r, 0.65);
  }
  return d * uScale;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// navy studio: soft overhead box, blue key light, white rim, faint blue floor bounce
vec3 env(vec3 r) {
  float y = r.y * 0.5 + 0.5;
  vec3 col = mix(vec3(0.02, 0.04, 0.09), vec3(0.08, 0.13, 0.26), y);
  col += vec3(0.92, 0.96, 1.0) * smoothstep(0.86, 1.0, r.y) * 1.05;
  col += vec3(0.35, 0.58, 1.0) * pow(max(0.0, dot(r, normalize(vec3(-0.8, 0.35, 0.5)))), 14.0) * 1.6;
  col += vec3(0.9, 0.94, 1.0) * pow(max(0.0, dot(r, normalize(vec3(0.9, 0.15, 0.2)))), 36.0) * 1.0;
  col += vec3(0.4, 0.55, 0.9) * smoothstep(0.05, 0.0, abs(r.y - 0.12)) * 0.35;
  col += vec3(0.05, 0.1, 0.25) * smoothstep(-0.2, -1.0, r.y);
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 q = uv - uShift;

  // backdrop: midnight-navy gradient
  vec3 col = mix(vec3(0.02, 0.04, 0.10), vec3(0.05, 0.10, 0.21), smoothstep(-0.6, 0.6, uv.y));

  // flowing liquid current across the whole screen (domain-warped noise), drifting
  // continuously and bending away from the cursor
  float ft = uTime * 0.09 + uScroll * 0.0004 + uSeed * 0.3;
  vec2 fp = uv * 1.5 + uMouse * vec2(-0.25, 0.18);
  vec2 w1 = vec2(fbm(fp + vec2(0.0, ft)), fbm(fp + vec2(5.2, 1.3) - ft));
  vec2 w2 = vec2(fbm(fp + 3.0 * w1 + vec2(1.7, 9.2) + ft * 1.3), fbm(fp + 3.0 * w1 + vec2(8.3, 2.8) - ft));
  float f = fbm(fp + 3.5 * w2);
  vec3 current = mix(vec3(0.03, 0.07, 0.18), vec3(0.10, 0.28, 0.70), smoothstep(0.35, 0.85, f));
  current += vec3(0.35, 0.6, 1.0) * pow(smoothstep(0.62, 0.95, f), 3.0) * 0.55;   // bright silk crests
  col = mix(col, current, 0.75);

  // blue halo behind the chrome cluster + a second pool bottom-left
  col += vec3(0.12, 0.28, 0.65) * exp(-dot(q, q) * 2.6) * 0.45;
  col += vec3(0.05, 0.12, 0.32) * exp(-dot(uv + vec2(0.6, 0.5), uv + vec2(0.6, 0.5)) * 2.0) * 0.5;

  vec3 ro = vec3(0.0, 0.0, 6.5);
  vec3 rd = normalize(vec3(q, -1.9));
  float t = 0.0;
  float d = 0.0;
  bool hit = false;
  for (int i = 0; i < 80; i++) {
    d = map(ro + rd * t);
    if (d < 0.0015) { hit = true; break; }
    t += d;
    if (t > 14.0) break;
  }

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 r = reflect(rd, n);
    float fres = pow(1.0 - max(0.0, dot(n, -rd)), 3.0);
    float ao = clamp(map(p + n * 0.25) / 0.25, 0.0, 1.0);
    vec3 metal = env(r) * mix(0.55, 1.15, fres) * (0.55 + 0.45 * ao);
    col = metal + vec3(0.01, 0.02, 0.05);
  }

  // tone + vignette
  col = col / (1.0 + col);
  col = pow(col, vec3(0.85));
  col *= 1.0 - 0.35 * dot(uv * 0.7, uv * 0.7);
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
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // one oversized triangle covering the screen
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u("uRes"), uTime = u("uTime"), uScroll = u("uScroll"), uMouse = u("uMouse");
    const uShift = u("uShift"), uScale = u("uScale"), uSeed = u("uSeed");

    const layout = layoutFor(pathname);
    gl.uniform1f(uSeed, layout.seed);

    // Only the app's own "Reduce visual effects" switch freezes the scene; the
    // system reduced-motion preference slows it right down instead.
    let savedReduced = false;
    try { savedReduced = localStorage.getItem("payshark:effects") === "reduced"; } catch {}
    const still = document.documentElement.dataset.effects === "reduced" || savedReduced;
    const speed = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.35 : 1;

    let w = 0, h = 0;
    const resize = () => {
      // soft background → render at ~half resolution, capped for large screens
      const quality = Math.min(0.6, 1100 / Math.max(window.innerWidth, 1));
      w = Math.max(1, Math.round(window.innerWidth * quality));
      h = Math.max(1, Math.round(window.innerHeight * quality));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      const mobile = window.innerWidth < 768;
      const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
      // keep the cluster on the right on wide screens, top-centre on phones
      const sx = mobile ? 0 : Math.min(layout.shift[0], aspect * 0.5 - 0.25);
      const sy = mobile ? 0.28 : layout.shift[1];
      gl.uniform2f(uShift, sx, sy);
      gl.uniform1f(uScale, mobile ? layout.scale * 0.7 : layout.scale);
    };
    resize();

    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      gl.uniform1f(uTime, still ? 6 : ((now - start) / 1000) * speed);
      gl.uniform1f(uScroll, window.scrollY);
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
