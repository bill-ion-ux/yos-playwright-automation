import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtractedEntry, CallEntry, ChainStep, Value } from "../parser/codegen_parser";

export interface Finding {
    check: string;
    line: number;
    message: string;
}

function isCall(e: ExtractedEntry): e is CallEntry {
    return e.kind === "call";
}

function stringArgs(step: ChainStep): string[] {
        return step.args.flatMap((a) => (a.type === "string" ? [a.value as string] : []));
}

function collectChains(chain: ChainStep[]): ChainStep[][] {
    const found: ChainStep[][] = [chain];
    for (const step of chain) {
        for (const arg of step.args) {
            found.push(...chainsInValue(arg));
        }
    }
    return found;
}

function chainsInValue(v: Value): ChainStep[][] {
    if (v.type === "call") return collectChains(v.chain);
    if (v.type === "array") return v.elements.flatMap(chainsInValue);
    if (v.type === "object") return Object.values(v.properties).flatMap(chainsInValue);
    if (v.type === "propertyAccess") return chainsInValue(v.object);
    return [];
}

function getName(args: Value[]): string | undefined {
    for (const a of args) {
        if(a.type === "object"){
            if(a.type === "object"){
                const name = a.properties.name;
                if(name?.type === "string"){
                    return name.value;
                }
            }
        }
    }
    return undefined;
}

/**
 * CLAUDE.md: "Replace any generated positional CSS (div:nth-child(15))
 * with a semantic locator." The device/plan catalogues are server-controlled
 * and reorder, so an index-based selector silently points at the wrong
 * element once the list changes (see docs/playwright-test-authoring/
 * 02-yos-ars-43-failure-analysis.md).
 */
const POSITIONAL_CSS = /nth-child|nth-of-type/;

function checkPositionalLocators(entries: ExtractedEntry[]): Finding[] {
    const findings: Finding[] = [];
    entries.filter(isCall).forEach((entry) => {
        collectChains(entry.chain).forEach((chain) => {     
            chain.forEach((step) => {                        
            stringArgs(step).forEach((arg) => {
                if (POSITIONAL_CSS.test(arg)) {
                    findings.push({
                        check: "positional-locator",
                        line: entry.location.line,
                        message: `"${step.method}" uses a positional selector: ${arg}`,
                    });
                }
            });
            });
        });                                                  
    });

    return findings;
}

/**
 * CLAUDE.md: a field the site auto-fills (DOB from MyKad, State/City from
 * postcode) should be asserted with toHaveValue, not filled — it's readonly
 * in the DOM, and attempting to fill it throws (see the WDIO setValue()
 * "invalid element state" case in todo/2026-09-10-Thursday.md).
 */
const AUTO_FILLED_FIELD_NAMES = /date of birth|^state\b|^city\b/i;

function checkAutoFilledFields(entries: ExtractedEntry[]): Finding[] {
    const findings: Finding[] = [];
    entries.filter(isCall).forEach((entry) => {
        entry.chain.forEach((step, i) => {
            if (step.method !== "fill") return;
            const locatorStep = entry.chain[i - 1];
            if (!locatorStep) return;
            const name = getName(locatorStep.args);
            if (name && AUTO_FILLED_FIELD_NAMES.test(name)) {
                findings.push({
                    check: "auto-filled-field",
                    line: entry.location.line,
                    message: `"${name}" is site-autofilled — assert with toHaveValue instead of .fill()`,
                });
            }
        });
    });
    return findings;
}

/**
 * CLAUDE.md: "regex (not literals) for volatile values like order numbers."
 * A literal match on a server-generated value is a guaranteed future flake.
 */
const VOLATILE_VALUE = /^[A-Z]{2,6}\d{4,}$/;
const ASSERTION_METHODS = new Set(["toHaveText", "toContainText", "toBe"]);
function checkLiteralVolatileValues(entries: ExtractedEntry[]): Finding[] {
    const findings: Finding[] = [];

    entries.filter(isCall).forEach((entry) => {
        if (entry.root !== "expect") return;

        entry.chain.forEach((step) => {
            if (!ASSERTION_METHODS.has(step.method)) return;

            step.args.forEach((arg) => {
                if (
                    arg.type === "string" &&
                    VOLATILE_VALUE.test(arg.value)
                ) {
                    findings.push({
                        check: "literal-volatile-value",
                        line: entry.location.line,
                        message: `"${step.method}" asserts a literal that looks generated ("${arg.value}") — use a regex instead`,
                    });
                }
            });
        });
    });

    return findings;
}

const CHECKS = [checkPositionalLocators, checkAutoFilledFields, checkLiteralVolatileValues];

export function runChecks(entries: ExtractedEntry[]): Finding[] {
    return CHECKS.flatMap((check) => check(entries)).sort((a, b) => a.line - b.line);
}

function run() {
    const inDir = "agents/restructuring/parser/output";
    const outDir = "agents/restructuring/decision/output";

    if (!fs.existsSync(inDir)) {
        throw new Error(`${inDir} doesn't exist — run the parser first.`);
    }

    const target = process.argv[2];
    const files = target ? [target] : fs.readdirSync(inDir).filter((f) => f.endsWith(".json"));

    if (files.length === 0) {
        throw new Error(`No JSON files found in ${inDir} — run the parser first.`);
    }

    fs.mkdirSync(outDir, { recursive: true });

    files.forEach((f) => {
        const entries: ExtractedEntry[] = JSON.parse(fs.readFileSync(path.join(inDir, f), "utf-8"));
        const findings = runChecks(entries);
        fs.writeFileSync(path.join(outDir, f), JSON.stringify(findings, null, 2));
    });
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
    run();
}
