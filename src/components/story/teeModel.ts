import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { TEE_ASPECT } from "./teeOutline";

/*
 * The t-shirt: "Oversized t-shirt" by kylelhb (Sketchfab), CC BY 4.0 — credited in the footer.
 * Optimised from the original 37 MB file with gltf-transform (simplified to ~64k triangles,
 * meshopt geometry, 2048 px WebP textures). Front faces +z.
 */
export const MODEL_URL = "/models/tshirt.glb";
useGLTF.preload(MODEL_URL);

/** Scene units: the tee is normalised to this height and centred on the origin. */
export const TEE_HEIGHT = 2.9;
export const TEE_WIDTH = TEE_HEIGHT * TEE_ASPECT;

/** The model's geometry, upright, centred and scaled; plus its fabric maps. */
export function useTeeModel() {
  const { scene } = useGLTF(MODEL_URL);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    let src: THREE.Mesh | undefined;
    scene.traverse((o) => {
      if (!src && (o as THREE.Mesh).isMesh) src = o as THREE.Mesh;
    });
    if (!src) throw new Error("tshirt.glb has no mesh");
    const g = src.geometry.clone();
    // Positions and normals are quantised (16 / 8-bit) in the file: switch them to floats
    // before baking the node transforms in, or they would clamp.
    for (const name of ["position", "normal"] as const) {
      const a = g.getAttribute(name);
      const f = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) f.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3);
      g.setAttribute(name, new THREE.BufferAttribute(f, 3));
    }
    g.applyMatrix4(src.matrixWorld);
    g.computeBoundingBox();
    const c = g.boundingBox!.getCenter(new THREE.Vector3());
    g.translate(-c.x, -c.y, -c.z);
    const s = TEE_HEIGHT / (g.boundingBox!.max.y - g.boundingBox!.min.y);
    g.scale(s, s, s);
    g.computeBoundingBox();
    const m = src.material as THREE.MeshStandardMaterial;
    return { geometry: g, box: g.boundingBox!.clone(), maps: { map: m.map, normalMap: m.normalMap, normalScale: m.normalScale.clone(), roughnessMap: m.roughnessMap } };
  }, [scene]);
}

/**
 * Fabric material with the two print canvases projected onto it, front to back across the
 * tee's bounding box: the same rectangle as the studio's 2D print area. The print is mixed into
 * the fabric colour before lighting, so it follows the folds and shading like real ink.
 */
export function printMaterial(box: THREE.Box3, front: THREE.Texture, back: THREE.Texture) {
  const uniforms = {
    uPrintFront: { value: front },
    uPrintBack: { value: back },
    uPrintBox: { value: new THREE.Vector4(box.min.x, box.min.y, box.max.x - box.min.x, box.max.y - box.min.y) },
    uFrontOpacity: { value: 1 },
    uBackOpacity: { value: 1 },
  };
  // Cotton: fully rough, with a soft sheen in the fabric's own colour (see tintSheen), never a grey veil.
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 1, metalness: 0, sheen: 0.4, sheenRoughness: 0.85, envMapIntensity: 0.55, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPrintPos;\nvarying vec3 vPrintNormal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPrintPos = position;\nvPrintNormal = normal;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vPrintPos;\nvarying vec3 vPrintNormal;\nuniform sampler2D uPrintFront;\nuniform sampler2D uPrintBack;\nuniform vec4 uPrintBox;\nuniform float uFrontOpacity;\nuniform float uBackOpacity;",
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        // Print only on the outside of the fabric (not inside the collar or the sleeves).
        if (gl_FrontFacing) {
          vec2 puv = (vPrintPos.xy - uPrintBox.xy) / uPrintBox.zw;
          if (vPrintNormal.z >= 0.0) {
            vec4 p = texture2D(uPrintFront, puv);
            diffuseColor.rgb = mix(diffuseColor.rgb, p.rgb, p.a * uFrontOpacity);
          } else {
            vec4 p = texture2D(uPrintBack, vec2(1.0 - puv.x, puv.y)); // seen from behind, left and right swap
            diffuseColor.rgb = mix(diffuseColor.rgb, p.rgb, p.a * uBackOpacity);
          }
        }`,
      );
  };
  mat.customProgramCacheKey = () => "tee-print";
  return { mat, uniforms };
}

/**
 * Sheen in the tee's own colour, slightly lighter: how cotton catches the light. A small floor of
 * light keeps dark tees readable (folds, edges) without greying them. Call after changing `mat.color`.
 */
export function tintSheen(mat: THREE.MeshPhysicalMaterial) {
  mat.sheenColor.copy(mat.color).lerp(WHITE, 0.15);
  mat.sheenColor.r = Math.min(1, mat.sheenColor.r + SHEEN_FLOOR);
  mat.sheenColor.g = Math.min(1, mat.sheenColor.g + SHEEN_FLOOR);
  mat.sheenColor.b = Math.min(1, mat.sheenColor.b + SHEEN_FLOOR);
}
const WHITE = new THREE.Color("#ffffff");
const SHEEN_FLOOR = 0.08; // linear

/**
 * Colour-true rendering for the tee scenes: Khronos PBR Neutral tone mapping keeps a product's
 * colours as chosen (the default filmic curve dulls reds and lifts blacks). Use in `onCreated`.
 */
export function colorTrue(gl: THREE.WebGLRenderer) {
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1.12; // the fabric's lit side lands on the chosen colour, folds stay darker
}

/** Home page demo prints, drawn on full print-area canvases at chest / upper-back height. */
export function stickerTexture(kind: "front" | "back", ink = "#efe9df") {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = Math.round(1024 / TEE_ASPECT);
  const x = c.getContext("2d")!;
  const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "serif";
  x.fillStyle = ink;
  x.textAlign = "center";
  x.textBaseline = "middle";
  if (kind === "front") {
    x.font = `400 40px ${serif}`;
    if ("letterSpacing" in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "12px";
    x.fillText("ARTSYDE", 518, c.height * 0.27);
    x.fillRect(492, c.height * 0.27 + 34, 52, 2);
  } else {
    x.font = `italic 300 84px ${serif}`;
    x.fillText("Atelier", 512, c.height * 0.24);
  }
  return canvasTexture(c);
}

/** No print at all (a plain tee). */
export function emptyTexture() {
  return canvasTexture(Object.assign(document.createElement("canvas"), { width: 1, height: 1 }));
}

export function canvasTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
