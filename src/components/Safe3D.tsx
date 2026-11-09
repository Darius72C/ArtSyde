"use client";

import { Component, useSyncExternalStore, type ReactNode } from "react";
import { reportClientError } from "@/server/client-log";

/*
 * Keeps a 3D scene from taking the whole page down.
 *
 * Some devices can't show the t-shirt in 3D: WebGL turned off or blocked (hardware acceleration off, an old or
 * blocklisted graphics driver, some headless browsers), or no WebAssembly (needed to unpack the compressed
 * model; turned off by some hardened browsers, iOS Lockdown Mode, some bots). Without this wrapper the error
 * reached app/error.tsx: the visitor got the "Un souci de notre côté" page and the journal a "Page en erreur".
 * Now the scene is replaced by `fallback`, and only an error on a device that *can* do 3D is reported.
 */

let support: boolean | null = null;

/** WebAssembly and a WebGL context, checked once per visit. */
function can3D() {
  if (support !== null) return support;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    support = typeof WebAssembly === "object" && Boolean(gl);
    // Hand the test context back at once: browsers cap how many can be open.
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    support = false;
  }
  return support;
}

const noop = () => () => {};

class Catch3D extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
    // The device passed the check, so this is a real bug worth seeing in the journal.
    void reportClientError("page.crash", `3D : ${error instanceof Error ? error.message : String(error)}`, { path: location.pathname }).catch(() => {});
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** A quiet note in place of the 3D view, filling the space the scene had. */
export function No3D({ text = "L'aperçu 3D n'est pas disponible sur cet appareil." }: { text?: string }) {
  return (
    <div className="flex h-full min-h-40 w-full items-center justify-center p-6 text-center text-sm text-muted" role="note">
      {text}
    </div>
  );
}

/** Renders `children` (a <Canvas>) only where 3D works, and falls back to `fallback` if the scene still fails. */
export function Safe3D({ children, fallback = <No3D /> }: { children: ReactNode; fallback?: ReactNode }) {
  // null on the server and during hydration, then the device's answer.
  const ok = useSyncExternalStore(noop, can3D, () => null);
  if (ok === null) return null;
  if (!ok) return fallback;
  return <Catch3D fallback={fallback}>{children}</Catch3D>;
}
