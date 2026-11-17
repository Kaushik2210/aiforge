"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { descentPath, loss, lossRange, pointAt, type Pt } from "@/lib/landscape";

export interface LossSceneHandle {
  /** Move the ball to a fraction (0 to 1) of its descent and redraw. */
  setProgress: (t: number) => void;
}

interface Props {
  /** The fraction of the descent drawn first. 1 is the finished run (a still frame). */
  initialProgress?: number;
  /** Let the pointer tilt the camera a little. Off for reduced motion and Focus mode. */
  parallax?: boolean;
  /** Called once if the browser cannot draw WebGL, so the page can show its poster instead. */
  onUnavailable?: () => void;
}

const SURFACE = 8; // the surface spans -4..4 on x and z
const SEGMENTS = 150;
const HEIGHT_SCALE = 1.15;

/** Read a colour token from the page so the scene follows light and dark themes. */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

/**
 * The loss landscape drawn with three.js: a contour-lined surface, a glowing ball and its trail.
 * It draws only when something changes (progress, pointer, size), never in a continuous loop, so
 * it costs almost nothing while the page is still. One WebGL context, released on unmount.
 * The picture is decoration: the page text says what it shows.
 */
export const LossScene = forwardRef<LossSceneHandle, Props>(function LossScene(
  { initialProgress = 1, parallax = false, onUnavailable },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<LossSceneHandle>({ setProgress: () => {} });
  const unavailableRef = useRef(onUnavailable);
  unavailableRef.current = onUnavailable;

  useImperativeHandle(ref, () => ({ setProgress: (t) => apiRef.current.setProgress(t) }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    void import("three").then((THREE) => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        unavailableRef.current?.();
        return;
      }
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);

      const lineColor = new THREE.Color(token("--c-accent", "#5cc8ff"));
      const deepColor = new THREE.Color(token("--c-primary", "#7cf0c6"));
      const highColor = new THREE.Color(token("--c-xp", "#ffbe5c"));
      const baseColor = new THREE.Color(token("--c-surface-2", "#121a2d"));
      const range = lossRange();

      // --- the surface ---
      const geo = new THREE.PlaneGeometry(SURFACE, SURFACE, SEGMENTS, SEGMENTS);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, loss(pos.getX(i), pos.getZ(i)) * HEIGHT_SCALE);
      }
      geo.computeVertexNormals();
      const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          uMin: { value: range.min * HEIGHT_SCALE },
          uMax: { value: range.max * HEIGHT_SCALE },
          uLine: { value: lineColor },
          uDeep: { value: deepColor },
          uHigh: { value: highColor },
          uBase: { value: baseColor },
        },
        vertexShader: /* glsl */ `
          varying float vH;
          varying vec3 vN;
          varying vec2 vXZ;
          void main() {
            vH = position.y;
            vN = normalize(normalMatrix * normal);
            vXZ = position.xz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uMin; uniform float uMax;
          uniform vec3 uLine; uniform vec3 uDeep; uniform vec3 uHigh; uniform vec3 uBase;
          varying float vH; varying vec3 vN; varying vec2 vXZ;
          float lines(float v, float scale) {
            float x = v * scale;
            float w = fwidth(x);
            return 1.0 - clamp(abs(fract(x - 0.5) - 0.5) / max(w, 1e-4), 0.0, 1.0);
          }
          void main() {
            float t = clamp((vH - uMin) / (uMax - uMin), 0.0, 1.0);
            vec3 tint = mix(uDeep, uHigh, smoothstep(0.15, 0.95, t));
            float contour = lines(vH, 7.0);
            float grid = max(lines(vXZ.x, 1.0), lines(vXZ.y, 1.0)) * 0.35;
            float edge = 1.0 - smoothstep(3.2, 4.0, max(abs(vXZ.x), abs(vXZ.y)));
            float light = 0.55 + 0.45 * clamp(dot(normalize(vN), normalize(vec3(0.3, 1.0, 0.4))), 0.0, 1.0);
            vec3 col = uBase * light * 0.9 + tint * 0.22 * (1.0 - t * 0.4);
            col = mix(col, mix(uLine, tint, 0.55), clamp(contour * 0.85 + grid, 0.0, 1.0));
            gl_FragColor = vec4(col, edge * 0.97);
          }`,
      });
      const surface = new THREE.Mesh(geo, material);
      scene.add(surface);

      // --- the ball, its glow and its trail ---
      const path: Pt[] = descentPath();
      const ballColor = new THREE.Color(token("--c-primary", "#7cf0c6"));
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 32, 32),
        new THREE.MeshBasicMaterial({ color: ballColor }),
      );
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 24, 24),
        new THREE.MeshBasicMaterial({ color: ballColor, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      scene.add(ball, glow);

      const trailPositions = new Float32Array(path.length * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
      const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: ballColor, transparent: true, opacity: 0.9 }));
      scene.add(trail);

      // --- drawing on demand ---
      let progress = initialProgress;
      let width = 0;
      let height = 0;
      let pointerX = 0;
      let pointerY = 0;
      let frame = 0;

      const at = (p: Pt): [number, number, number] => [p.x, p.y * HEIGHT_SCALE + 0.16, p.z];

      const draw = () => {
        frame = 0;
        const t = Math.min(1, Math.max(0, progress));
        const here = pointAt(path, t);
        const [bx, by, bz] = at(here);
        ball.position.set(bx, by, bz);
        glow.position.set(bx, by, bz);

        const shown = Math.floor(t * (path.length - 1));
        for (let i = 0; i <= shown; i++) {
          const [x, y, z] = at(path[i]!);
          trailPositions[i * 3] = x;
          trailPositions[i * 3 + 1] = y + 0.02;
          trailPositions[i * 3 + 2] = z;
        }
        // the last trail point is the blended ball position, so the line meets the ball
        trailPositions[(shown + 1) * 3] = bx;
        trailPositions[(shown + 1) * 3 + 1] = by;
        trailPositions[(shown + 1) * 3 + 2] = bz;
        (trailGeo.attributes.position as InstanceType<typeof THREE.BufferAttribute>).needsUpdate = true;
        trailGeo.setDrawRange(0, Math.min(path.length, shown + 2));

        // the camera swings round the surface and closes in as the ball descends
        const angle = THREE.MathUtils.lerp(-0.7, 0.55, t) + pointerX * 0.12;
        const dist = THREE.MathUtils.lerp(11.5, 8.2, t);
        const lift = THREE.MathUtils.lerp(7.2, 4.6, t) + pointerY * 0.5;
        camera.position.set(Math.sin(angle) * dist, lift, Math.cos(angle) * dist);
        camera.lookAt(bx * 0.45, by * 0.4 - 0.3, bz * 0.45);

        renderer.render(scene, camera);
      };
      const request = () => {
        if (!frame && !disposed) frame = requestAnimationFrame(draw);
      };

      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (w === 0 || h === 0 || (w === width && h === height)) return;
        width = w;
        height = h;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // a narrow screen needs a wider view so the whole surface stays in frame
        camera.fov = w / h < 0.9 ? 58 : 38;
        camera.updateProjectionMatrix();
        request();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();

      const onPointer = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        pointerX = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
        pointerY = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
        request();
      };
      if (parallax) window.addEventListener("pointermove", onPointer, { passive: true });

      apiRef.current = {
        setProgress: (t) => {
          progress = Number.isFinite(t) ? t : 0;
          request();
        },
      };
      request();

      cleanup = () => {
        observer.disconnect();
        window.removeEventListener("pointermove", onPointer);
        cancelAnimationFrame(frame);
        geo.dispose();
        material.dispose();
        trailGeo.dispose();
        ball.geometry.dispose();
        glow.geometry.dispose();
        (ball.material as InstanceType<typeof THREE.Material>).dispose();
        (glow.material as InstanceType<typeof THREE.Material>).dispose();
        (trail.material as InstanceType<typeof THREE.Material>).dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        apiRef.current = { setProgress: () => {} };
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
    // the scene is built once; theme changes remount it through the key the parent sets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parallax]);

  return <div ref={hostRef} aria-hidden="true" className="loss-scene" />;
});
