import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadCurriculum } from "@/lib/yaml/loadCurriculum";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "curio-yaml-"));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeYaml(name: string, contents: string): string {
  const p = path.join(tmpDir, name);
  writeFileSync(p, contents, "utf8");
  return p;
}

const validYaml = `
id: c-test
title: Test Curriculum
description: A test curriculum
domain: gastronomia
modules:
  - id: m1
    weekNumber: 1
    title: Mod 1
    description: First module
    prerequisites: []
    concepts:
      - id: c1.1
        title: Concept 1
        description: First concept
        difficulty: 2
  - id: m2
    weekNumber: 2
    title: Mod 2
    description: Second module
    prerequisites: [m1]
    concepts:
      - id: c2.1
        title: Concept 2
        description: Second concept
        difficulty: 3
`;

describe("loadCurriculum", () => {
  it("loads and validates a well-formed YAML", () => {
    const file = writeYaml("ok.yaml", validYaml);
    const c = loadCurriculum(file);
    expect(c.id).toBe("c-test");
    expect(c.modules).toHaveLength(2);
    expect(c.modules[0]?.concepts[0]?.difficulty).toBe(2);
    expect(c.modules[1]?.prerequisites).toEqual(["m1"]);
  });

  it("throws a readable error when validation fails", () => {
    const bad = `
id: c-bad
title: Bad
description: Bad
domain: gastronomia
modules:
  - id: m1
    weekNumber: 1
    title: Mod 1
    description: First module
    prerequisites: []
    concepts:
      - id: c1.1
        title: Concept 1
        description: First concept
        difficulty: 9
`;
    const file = writeYaml("bad.yaml", bad);
    expect(() => loadCurriculum(file)).toThrowError(/difficulty/i);
  });

  it("rejects duplicate module ids", () => {
    const dup = `
id: c-dup
title: Dup
description: Dup
domain: gastronomia
modules:
  - id: m1
    weekNumber: 1
    title: Mod 1
    description: m1
    prerequisites: []
    concepts:
      - id: c1.1
        title: c1
        description: c1
        difficulty: 1
  - id: m1
    weekNumber: 2
    title: Mod 1 again
    description: m1
    prerequisites: []
    concepts:
      - id: c2.1
        title: c2
        description: c2
        difficulty: 1
`;
    const file = writeYaml("dup-mod.yaml", dup);
    expect(() => loadCurriculum(file)).toThrowError(/duplicate/i);
  });

  it("rejects duplicate concept ids within a module", () => {
    const dup = `
id: c-dup
title: Dup
description: Dup
domain: gastronomia
modules:
  - id: m1
    weekNumber: 1
    title: Mod 1
    description: m1
    prerequisites: []
    concepts:
      - id: c1.1
        title: c1
        description: c1
        difficulty: 1
      - id: c1.1
        title: c1 again
        description: c1
        difficulty: 2
`;
    const file = writeYaml("dup-concept.yaml", dup);
    expect(() => loadCurriculum(file)).toThrowError(/duplicate/i);
  });

  it("throws a clear error if file does not exist", () => {
    expect(() => loadCurriculum(path.join(tmpDir, "missing.yaml"))).toThrowError(
      /not found|ENOENT/i,
    );
  });
});
