import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIMULATION_CONFIG,
  SIMULATION_CATEGORIES,
  STORAGE_KEYS,
  type CategoryId,
} from "@/app/lib/analysis";

const CATEGORY_IDS: CategoryId[] = [
  "sw-engineer",
  "data-analyst",
  "product-mgr",
  "marketing",
  "ui-ux",
  "general",
];

describe("simulation setup data", () => {
  it("exposes category-specific question sets", () => {
    for (const id of CATEGORY_IDS) {
      const category = SIMULATION_CATEGORIES[id];
      expect(category.questions.length).toBeGreaterThanOrEqual(3);
      expect(category.questionTopic.length).toBeGreaterThan(10);
      expect(category.categoryLabel.length).toBeGreaterThan(0);
    }
  });

  it("keeps default SW engineer config aligned with category map", () => {
    expect(SIMULATION_CATEGORIES["sw-engineer"].questions).toEqual(
      DEFAULT_SIMULATION_CONFIG.questions,
    );
  });
});

describe("client storage keys", () => {
  it("uses stable session and history keys for the main flow", () => {
    expect(STORAGE_KEYS.simulationConfig).toBe("lumenSimulationConfig");
    expect(STORAGE_KEYS.analysisResult).toBe("lumenAnalysisResult");
    expect(STORAGE_KEYS.history).toBe("lumenHistory");
    expect(STORAGE_KEYS.selectedSessionId).toBe("lumenSelectedSessionId");
  });
});
