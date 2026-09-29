import { Project, SourceFile, Node, ts } from "ts-morph";
import * as fs from "node:fs"; // import Node's filesystem API to write the output JSON files
import * as path from "node:path"; // import Node's path API to manipulate file paths


/*
- unwindChain takes a chained call like page.getByRole(...).click(), starts from the outermost call, and produces an array with one { method, args } per call.
- resolveValue turns each argument node into plain data by checking what type of node it is.
- extractCalls traverses every node, keeps only the ones that are calls or variable declarations, and collects the results into the entries array.
*/
export type Value =
    | {
          type: "string";
          value: string;
      }
    | {
          type: "number";
          value: number;
      }
    | {
          type: "boolean";
          value: boolean;
      }
    | {
          type: "identifier";
          name: string;
      }
    | {
          type: "identifier";
          name: string;
      }
    | {
          type: "propertyAccess";
          object: Value;
          property: string;
      }
    | {
          type: "call";
          root: string;
          chain: ChainStep[];
      }
    | {
          type: "regex";
          value: string;
      }
    | {
          type: "array";
          elements: Value[];
      }
    | {
          type: "object";
          properties: Record<string, Value>;
      }
    | {
          type: "function";
      }
    | {
          type: "raw";
          source: string;
      };

export interface ChainStep {
    method: string;
    args: Value[];
}

export interface SourceRange {
    line: number;
    start: number;
    end: number;
}

export interface CallEntry {
    kind: "call";
    location: SourceRange;
    root: string;
    chain: ChainStep[];
    assignTo?: string;
}


export interface AssignEntry {
    kind: "assign";
    location: SourceRange;
    assignTo: string;
    value: Value;
}
export type ExtractedEntry = CallEntry | AssignEntry;

//Take one call expression and break its fluent chain into structured stepss
//We turn the nested ast expression into a flat array of steps with each step method and arg
function unwindChain(call: Node): { root: string; chain: ChainStep[] } {
    const chain: ChainStep[] = [];
    let current: Node = call;

    while (Node.isCallExpression(current)) {
        const callee = current.getExpression();
        const args = current.getArguments().map(resolveValue);
        const method = Node.isPropertyAccessExpression(callee) ? callee.getName() : callee.getText();
        chain.unshift({ method, args });
        current = Node.isPropertyAccessExpression(callee) ? callee.getExpression() : callee;
    }

    return { root: current.getText(), chain };
}

// Turns an argument node into real data: literal values where possible,
// a nested {root, chain} for a call expression, raw source text otherwise. */
function resolveValue(node: Node): Value {
    // page.locator("#username")
    if (Node.isCallExpression(node)) {
        const { root, chain } = unwindChain(node);

        return {
            type: "call",
            root,
            chain,
        };
    }

    // String:
    if (
        Node.isStringLiteral(node) ||
        Node.isNoSubstitutionTemplateLiteral(node)
    ) {
        return {
            type: "string",
            value: node.getLiteralValue(),
        };
    }

    // Number:
    if (Node.isNumericLiteral(node)) {
        return {
            type: "number",
            value: node.getLiteralValue(),
        };
    }

    // Regex:
    if (Node.isRegularExpressionLiteral(node)) {
        return {
            type: "regex",
            value: node.getText(),
        };
    }

    // Negative / positive number:
    if (Node.isPrefixUnaryExpression(node)) {
        const operand = node.getOperand();

        if (Node.isNumericLiteral(operand)) {
            const value = operand.getLiteralValue();

            if (node.getOperatorToken() === ts.SyntaxKind.MinusToken) {
                return {
                    type: "number",
                    value: -value,
                };
            }

            if (node.getOperatorToken() === ts.SyntaxKind.PlusToken) {
                return {
                    type: "number",
                    value,
                };
            }
        }
    }

    // true / false
    if (node.getKind() === ts.SyntaxKind.TrueKeyword) {
        return {
            type: "boolean",
            value: true,
        };
    }

    if (node.getKind() === ts.SyntaxKind.FalseKeyword) {
        return {
            type: "boolean",
            value: false,
        };
    }

    // Variable:
    // username
    if (Node.isIdentifier(node)) {
        return {
            type: "identifier",
            name: node.getText(),
        };
    }

    // Property access:
    // selectors.loginButton
    if (Node.isPropertyAccessExpression(node)) {
        return {
            type: "propertyAccess",
            object: resolveValue(node.getExpression()),
            property: node.getName(),
        };
    }

    // Object:
    // { username: "Nabil", age: 20 }
    if (Node.isObjectLiteralExpression(node)) {
        const properties: Record<string, Value> = {};

        node.getProperties().forEach((prop) => {
            if (Node.isPropertyAssignment(prop)) {
                const initializer = prop.getInitializer();

                if (initializer) {
                    properties[prop.getName()] = resolveValue(initializer);
                }
            }
        });

        return {
            type: "object",
            properties,
        };
    }

    // Array:
    // ["a", "b", username]
    if (Node.isArrayLiteralExpression(node)) {
        return {
            type: "array",
            elements: node.getElements().map(resolveValue),
        };
    }

    // Function:
    if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
        return {
            type: "function",
        };
    }

    // Fallback:
    return {
        type: "raw",
        source: node.getText(),
    };
}

/** Unwraps a leading `await`, if present, to get at the underlying expression. */
function unwrapAwait(node: Node): Node {
    return Node.isAwaitExpression(node) ? node.getExpression() : node;
}

export function extractCalls(file: SourceFile): ExtractedEntry[] {
    const entries: ExtractedEntry[] = [];

    file.forEachDescendant((node) => {
        if (Node.isExpressionStatement(node)) {
            const expr = unwrapAwait(node.getExpression());

            if (!Node.isCallExpression(expr)) return;

            const { root, chain } = unwindChain(expr);

            entries.push({
                kind: "call",
                location: {
                    line: expr.getStartLineNumber(),
                    start: expr.getStart(),
                    end: expr.getEnd(),
                },
                root,
                chain,
            });

            return;
        }

        if (Node.isVariableDeclaration(node)) {
            const initializer = node.getInitializer();

            if (!initializer) return;

            const assignTo = node.getName();
            const value = unwrapAwait(initializer);

            if (Node.isCallExpression(value)) {
                const { root, chain } = unwindChain(value);

                entries.push({
                    kind: "call",
                    location: {
                        line: value.getStartLineNumber(),
                        start: value.getStart(),
                        end: value.getEnd(),
                    },
                    root,
                    chain,
                    assignTo,
                });
            } else {
                entries.push({
                    kind: "assign",
                    location: {
                        line: node.getStartLineNumber(),
                        start: node.getStart(),
                        end: node.getEnd(),
                    },
                    assignTo,
                    value: resolveValue(value),
                });
            }
        }
    });

    entries.sort((a, b) => a.location.line - b.location.line);

    return entries;
}

function run() {
    const project = new Project({
        tsConfigFilePath: "tsconfig.json",
        skipAddingFilesFromTsConfig: true,
    });

    const target = process.argv[2] ?? "incoming-scripts/**/*.spec.ts";
    const sourceFiles: SourceFile[] = project.addSourceFilesAtPaths(target);

    if (sourceFiles.length === 0) {
        throw new Error(`No files matched "${target}" — check the path (quote it if it contains spaces).`);
    }

    const outDir = "agents/restructuring/parser/output";
    fs.mkdirSync(outDir, { recursive: true });

    sourceFiles.forEach((file) => {
        const calls = extractCalls(file);
        const relPath = path.relative("incoming-scripts", file.getFilePath());
        const safeName = relPath.replace(/\.spec\.ts$/, "").split(path.sep).join("__");
        fs.writeFileSync(path.join(outDir, `${safeName}.json`), JSON.stringify(calls, null, 2));
    });
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
    run();
}
