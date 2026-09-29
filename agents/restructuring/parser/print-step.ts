import * as fs from "node:fs";

/**
 * Prints parser output as one code-like line per entry, so it can be read
 * side by side with the original .spec.ts.
 * Usage (from repo root): npx tsx agents/restructuring/parser/print-steps.ts <output.json>
 */

type Step = { kind?: string; line: number; root?: string; chain?: Call[]; assignTo?: string; from?: string };
type Call = { method: string; args: unknown[] };

function renderValue(v: unknown): string {
    if (Array.isArray(v)) return `[${v.map(renderValue).join(", ")}]`;
    if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if ("root" in o && "chain" in o) return renderChain(o.root as string, o.chain as Call[]); // nested call
        if ("raw" in o) return String(o.raw);                                                    // variable / fallback
        if ("regex" in o) return String(o.regex);
        if ("function" in o) return "() => {…}";
        return `{ ${Object.entries(o).map(([k, val]) => `${k}: ${renderValue(val)}`).join(", ")} }`;
    }
    return JSON.stringify(v); // strings, numbers, booleans
}

function renderChain(root: string, chain: Call[]): string {
    const calls = chain.map((c) => `${c.method}(${c.args.map(renderValue).join(", ")})`);
    // expect(x) / test(...): the root is already the first call, so don't print it twice
    return chain[0]?.method === root ? calls.join(".") : [root, ...calls].join(".");
}

const file = process.argv[2];
if (!file) {
    console.error("Usage: npx tsx agents/restructuring/parser/print-steps.ts <path-to-output.json>");
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const steps: Step[] = Array.isArray(data) ? data : data.steps; // bare array, or { ..., steps } header

for (const s of steps) {
    const code = s.kind === "assign"
        ? `${s.assignTo} = await ${s.from}`
        : `${s.assignTo ? s.assignTo + " = " : ""}${renderChain(s.root ?? "", s.chain ?? [])}`;
    console.log(String(s.line).padStart(4), " ", code);
}