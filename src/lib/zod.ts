import { z } from "zod";

// Production CSP disallows JavaScript eval. Zod's default JIT capability probe
// emits a CSP violation even when it catches the error and falls back.
z.config({ jitless: true });

export { z };
