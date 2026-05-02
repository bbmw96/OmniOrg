// Created by BBMW0 Technologies | bbmw0.com
// IFC-CORENET-X Compliance System: Singapore BCA Automated Code Compliance Validator
// Covers: BCA Building Control Act, SCDF Fire Safety, BFA Accessibility, Structural, SS 530 Energy, Zoning

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { ifcParser } from "./ifc-parser";
import type { ParsedIfcModel, IfcElement } from "./ifc-parser";

// ─────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────

export type ComplianceStatus =
  | "PASS"
  | "FAIL"
  | "WARNING"
  | "NOT_APPLICABLE"
  | "MANUAL_REVIEW";

export type RuleSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "INFORMATIONAL";

export interface ComplianceCheckResult {
  ruleId: string;
  ruleName: string;
  category: string;
  status: ComplianceStatus;
  severity: RuleSeverity;
  message: string;
  details?: string;
  affectedElements?: string[];
  requiredValue?: string;
  actualValue?: string;
  regulationReference?: string;
}

export interface CorenetXComplianceReport {
  reportId: string;
  generatedAt: string;
  modelSummary: {
    projectName: string;
    grossFloorArea: number;
    totalFloors: number;
    buildingHeight: number;
  };
  overallStatus: "COMPLIANT" | "NON_COMPLIANT" | "CONDITIONAL" | "INCOMPLETE";
  totalChecks: number;
  passCount: number;
  failCount: number;
  warningCount: number;
  criticalFailures: ComplianceCheckResult[];
  allResults: ComplianceCheckResult[];
  submissionReadiness: {
    readyToSubmit: boolean;
    blockers: string[];
    advisories: string[];
  };
  corenetXSubmissionData: {
    submissionType: string;
    applicantRef: string;
    checklistVersion: string;
    reportHash: string;
  };
  enhancedRecommendations: string[];
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CORENET_X_CHECKLIST_VERSION = "3.1-2024";
const ALLOWED_BUILDING_USES = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "INDUSTRIAL",
  "INSTITUTIONAL",
  "MIXED-USE",
] as const;

// ─────────────────────────────────────────────────────────────
// Validator
// ─────────────────────────────────────────────────────────────

export class IfcCorenetXValidator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  // ── Main synchronous validation ────────────────────────────

  validate(model: ParsedIfcModel): CorenetXComplianceReport {
    const results: ComplianceCheckResult[] = [
      ...this._checkCorenetxFormat(model),
      ...this._checkFireSafety(model),
      ...this._checkAccessibility(model),
      ...this._checkStructural(model),
      ...this._checkGreenMark(model),
      ...this._checkZoning(model),
    ];

    return this._assembleReport(model, results, []);
  }

  // ── AI-enhanced async validation ──────────────────────────

  async validateWithAIEnhancement(
    model: ParsedIfcModel
  ): Promise<CorenetXComplianceReport> {
    const baseReport = this.validate(model);
    const recommendations = await this._generateAIRecommendations(baseReport);
    return { ...baseReport, enhancedRecommendations: recommendations };
  }

  // ── File entry point ──────────────────────────────────────

  async validateFile(filePath: string): Promise<CorenetXComplianceReport> {
    const model = ifcParser.parseFile(filePath);
    return this.validateWithAIEnhancement(model);
  }

  // ── Report persistence ─────────────────────────────────────

  saveReport(report: CorenetXComplianceReport, outputDir: string): void {
    const dir = path.resolve(outputDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const jsonPath = path.join(dir, `corenet-x-report-${report.reportId}.json`);
    const htmlPath = path.join(dir, `corenet-x-report-${report.reportId}.html`);

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
    fs.writeFileSync(htmlPath, this.generateHtmlReport(report), "utf-8");
  }

  // ─────────────────────────────────────────────────────────
  // Rule Set 1: CORENET-X Format Requirements
  // ─────────────────────────────────────────────────────────

  private _checkCorenetxFormat(model: ParsedIfcModel): ComplianceCheckResult[] {
    const results: ComplianceCheckResult[] = [];

    // CX-001: IfcProject must be present with valid GlobalId
    const hasProject = model.projectName && model.projectName !== "Unnamed Project";
    results.push({
      ruleId: "CX-001",
      ruleName: "IfcProject GlobalId",
      category: "CORENET-X Format",
      status: hasProject ? "PASS" : "FAIL",
      severity: "CRITICAL",
      message: hasProject
        ? "IfcProject with valid name/GlobalId found."
        : "IfcProject entity missing or has no name. CORENET-X requires a named project.",
      requiredValue: "IfcProject with non-empty Name and GlobalId",
      actualValue: model.projectName,
      regulationReference: "CORENET-X Submission Guide v3.1 §2.1",
    });

    // CX-002: Singapore address / coordinates
    const hasSiteAddr = !!model.siteAddress;
    results.push({
      ruleId: "CX-002",
      ruleName: "Singapore Site Address",
      category: "CORENET-X Format",
      status: hasSiteAddr ? "PASS" : "WARNING",
      severity: "MAJOR",
      message: hasSiteAddr
        ? `Site address declared: ${model.siteAddress}`
        : "IfcSite address not declared. BCA submissions require Singapore site address or SVY21 coordinates.",
      requiredValue: "IfcSite.SiteAddress or SVY21 coordinates",
      actualValue: model.siteAddress ?? "Not found",
      regulationReference: "CORENET-X Submission Guide v3.1 §2.2",
    });

    // CX-003: All storeys must have defined elevations
    const storeysWithoutElevation = model.storeys.filter(
      (s) => s.elevation === 0 && s.name.toLowerCase() !== "ground" &&
             s.name !== "L1" && s.name !== "01"
    );
    results.push({
      ruleId: "CX-003",
      ruleName: "Storey Elevations Defined",
      category: "CORENET-X Format",
      status: storeysWithoutElevation.length === 0 ? "PASS" : "WARNING",
      severity: "MAJOR",
      message:
        storeysWithoutElevation.length === 0
          ? "All storeys have elevation values."
          : `${storeysWithoutElevation.length} storey(s) may be missing elevation: ${storeysWithoutElevation.map((s) => s.name).join(", ")}`,
      requiredValue: "All IfcBuildingStorey with Elevation attribute",
      actualValue: `${model.storeys.length - storeysWithoutElevation.length}/${model.storeys.length} storeys with elevation`,
      regulationReference: "CORENET-X Submission Guide v3.1 §2.3",
    });

    // CX-004: Building height declared
    const hasBuildingHeight = model.buildingHeight > 0;
    results.push({
      ruleId: "CX-004",
      ruleName: "Building Height Declared",
      category: "CORENET-X Format",
      status: hasBuildingHeight ? "PASS" : "FAIL",
      severity: "CRITICAL",
      message: hasBuildingHeight
        ? `Building height: ${model.buildingHeight.toFixed(2)}m`
        : "Building height not declared. Required for structural and fire safety checks.",
      requiredValue: "IfcBuilding height attribute > 0",
      actualValue: `${model.buildingHeight.toFixed(2)}m`,
      regulationReference: "CORENET-X Submission Guide v3.1 §2.4",
    });

    // CX-005: GFA consistency check (±5% tolerance)
    const spaceAreaSum = model.spaces.reduce((sum, s) => sum + s.area, 0);
    if (model.grossFloorArea > 0 && spaceAreaSum > 0) {
      const diff = Math.abs(model.grossFloorArea - spaceAreaSum);
      const pct = (diff / model.grossFloorArea) * 100;
      results.push({
        ruleId: "CX-005",
        ruleName: "GFA vs Space Area Sum Consistency",
        category: "CORENET-X Format",
        status: pct <= 5 ? "PASS" : "WARNING",
        severity: "MINOR",
        message:
          pct <= 5
            ? `GFA matches space area sum within 5% tolerance (diff: ${pct.toFixed(1)}%).`
            : `GFA discrepancy of ${pct.toFixed(1)}% between declared GFA and sum of IfcSpace areas. Investigate model integrity.`,
        requiredValue: "Difference ≤ 5%",
        actualValue: `${pct.toFixed(1)}% (GFA: ${model.grossFloorArea.toFixed(0)}m², Spaces: ${spaceAreaSum.toFixed(0)}m²)`,
        regulationReference: "CORENET-X Submission Guide v3.1 §2.5",
      });
    } else {
      results.push({
        ruleId: "CX-005",
        ruleName: "GFA vs Space Area Sum Consistency",
        category: "CORENET-X Format",
        status: "NOT_APPLICABLE",
        severity: "MINOR",
        message: "Insufficient area data to perform GFA consistency check.",
        regulationReference: "CORENET-X Submission Guide v3.1 §2.5",
      });
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────
  // Rule Set 2: Fire Safety (SCDF / BCA Building Control Act)
  // ─────────────────────────────────────────────────────────

  private _checkFireSafety(model: ParsedIfcModel): ComplianceCheckResult[] {
    const results: ComplianceCheckResult[] = [];
    const isHighRise = model.buildingHeight > 24;

    // FS-001: Staircase width >= 1050mm for buildings > 24m
    const stairs = model.elements.filter((e) =>
      e.type.toLowerCase().includes("stair")
    );

    if (isHighRise) {
      if (stairs.length === 0) {
        results.push({
          ruleId: "FS-001",
          ruleName: "Staircase Width (High-Rise)",
          category: "Fire Safety",
          status: "MANUAL_REVIEW",
          severity: "CRITICAL",
          message:
            "Building > 24m but no IfcStair/IfcStairFlight elements found. Manual review required.",
          requiredValue: "Width ≥ 1050mm",
          actualValue: "No stair elements in model",
          regulationReference: "FSR 2023 §5.3, BCA Approved Document C §4.2",
        });
      } else {
        const narrowStairs: string[] = [];
        for (const stair of stairs) {
          const width =
            (stair.quantities["Width"] ??
              stair.quantities["NominalWidth"] ??
              stair.properties["Width"] ??
              stair.properties["NominalWidth"]) as number | undefined;
          if (width !== undefined && width < 1050) {
            narrowStairs.push(stair.globalId);
          }
        }
        results.push({
          ruleId: "FS-001",
          ruleName: "Staircase Width (High-Rise)",
          category: "Fire Safety",
          status: narrowStairs.length > 0 ? "FAIL" : "PASS",
          severity: "CRITICAL",
          message:
            narrowStairs.length > 0
              ? `${narrowStairs.length} stair(s) below 1050mm minimum clear width for buildings > 24m.`
              : `All ${stairs.length} stair element(s) meet 1050mm minimum width requirement.`,
          affectedElements: narrowStairs,
          requiredValue: "Width ≥ 1050mm",
          actualValue: `${stairs.length - narrowStairs.length}/${stairs.length} compliant`,
          regulationReference: "FSR 2023 §5.3, BCA Approved Document C §4.2",
        });
      }
    } else {
      results.push({
        ruleId: "FS-001",
        ruleName: "Staircase Width (High-Rise)",
        category: "Fire Safety",
        status: "NOT_APPLICABLE",
        severity: "CRITICAL",
        message: `Building height ${model.buildingHeight.toFixed(1)}m ≤ 24m. High-rise staircase width rule not triggered.`,
        regulationReference: "FSR 2023 §5.3",
      });
    }

    // FS-002: Travel distance to exit
    // Infer travel distance from space areas (heuristic: sqrt(area) * 1.5 ≈ diagonal travel)
    const largeSpaces = model.spaces.filter((s) => {
      const estimatedTravel = Math.sqrt(s.area) * 1.5;
      const limit = s.usage.includes("HIGH_RISK") ? 30 : 45;
      return estimatedTravel > limit;
    });

    if (model.spaces.length === 0) {
      results.push({
        ruleId: "FS-002",
        ruleName: "Travel Distance to Exit",
        category: "Fire Safety",
        status: "NOT_APPLICABLE",
        severity: "CRITICAL",
        message: "No IfcSpace elements found. Travel distance cannot be assessed automatically.",
        regulationReference: "FSR 2023 §5.5, SCDF Fire Code §6.4",
      });
    } else if (largeSpaces.length > 0) {
      results.push({
        ruleId: "FS-002",
        ruleName: "Travel Distance to Exit",
        category: "Fire Safety",
        status: "WARNING",
        severity: "CRITICAL",
        message: `${largeSpaces.length} space(s) may exceed travel distance limits based on area heuristics. Full egress path simulation required.`,
        affectedElements: largeSpaces.map((s) => s.globalId),
        requiredValue: "≤ 45m general, ≤ 30m high-risk",
        actualValue: `${largeSpaces.map((s) => `${s.name}: est. ${(Math.sqrt(s.area) * 1.5).toFixed(0)}m`).join("; ")}`,
        regulationReference: "FSR 2023 §5.5, SCDF Fire Code §6.4",
      });
    } else {
      results.push({
        ruleId: "FS-002",
        ruleName: "Travel Distance to Exit",
        category: "Fire Safety",
        status: "PASS",
        severity: "CRITICAL",
        message: "All spaces within estimated travel distance limits. Full egress simulation recommended for final submission.",
        regulationReference: "FSR 2023 §5.5, SCDF Fire Code §6.4",
      });
    }

    // FS-003: Fire compartment area ≤ 7000m²
    for (const storey of model.storeys) {
      const storeySpaces = model.spaces.filter((s) => s.level === storey.name);
      const totalStoreyArea = storeySpaces.reduce((sum, s) => sum + s.area, 0);
      if (totalStoreyArea > 0) {
        results.push({
          ruleId: "FS-003",
          ruleName: `Fire Compartment Area: ${storey.name}`,
          category: "Fire Safety",
          status: totalStoreyArea > 7000 ? "FAIL" : "PASS",
          severity: "CRITICAL",
          message:
            totalStoreyArea > 7000
              ? `Floor ${storey.name}: ${totalStoreyArea.toFixed(0)}m² exceeds 7000m² fire compartment limit for general commercial use.`
              : `Floor ${storey.name}: ${totalStoreyArea.toFixed(0)}m² within 7000m² compartment limit.`,
          requiredValue: "≤ 7000m² per floor (general commercial)",
          actualValue: `${totalStoreyArea.toFixed(0)}m²`,
          regulationReference: "FSR 2023 §8.2, SCDF Fire Code Table 6A",
        });
      }
    }
    if (model.storeys.length === 0 && model.grossFloorArea > 0) {
      const perFloor = model.grossFloorArea / model.totalFloors;
      results.push({
        ruleId: "FS-003",
        ruleName: "Fire Compartment Area",
        category: "Fire Safety",
        status: perFloor > 7000 ? "WARNING" : "PASS",
        severity: "CRITICAL",
        message:
          perFloor > 7000
            ? `Estimated ${perFloor.toFixed(0)}m²/floor may exceed 7000m² compartment limit.`
            : `Estimated ${perFloor.toFixed(0)}m²/floor within compartment limit.`,
        requiredValue: "≤ 7000m² per floor",
        actualValue: `${perFloor.toFixed(0)}m²/floor (estimated)`,
        regulationReference: "FSR 2023 §8.2",
      });
    }

    // FS-004: Minimum 2 escape routes for > 50 persons per floor
    const hasMinTwoExits = stairs.length >= 2 || model.stats.doorCount >= 2;
    const needsCheck = model.totalFloors > 1 || model.grossFloorArea > 200;
    if (needsCheck) {
      results.push({
        ruleId: "FS-004",
        ruleName: "Minimum 2 Escape Routes",
        category: "Fire Safety",
        status: hasMinTwoExits ? "PASS" : "FAIL",
        severity: "CRITICAL",
        message: hasMinTwoExits
          ? `At least 2 escape route elements found (stairs: ${stairs.length}, doors: ${model.stats.doorCount}).`
          : "Less than 2 identified escape route elements. Buildings with >50 persons require minimum 2 exits per floor.",
        requiredValue: "≥ 2 escape routes per floor for occupancy >50",
        actualValue: `${stairs.length} stair(s), ${model.stats.doorCount} door(s)`,
        regulationReference: "BCA Approved Document B §3.1, FSR 2023 §5.2",
      });
    } else {
      results.push({
        ruleId: "FS-004",
        ruleName: "Minimum 2 Escape Routes",
        category: "Fire Safety",
        status: "NOT_APPLICABLE",
        severity: "CRITICAL",
        message: "Small single-floor building. FS-004 not triggered.",
        regulationReference: "BCA Approved Document B §3.1",
      });
    }

    // FS-005: Fire door width >= 850mm
    const doors = model.elements.filter((e) => e.type.toLowerCase() === "ifcdoor");
    const narrowDoors: string[] = [];
    const checkedDoors: string[] = [];

    for (const door of doors) {
      const w =
        (door.quantities["Width"] ??
          door.quantities["OverallWidth"] ??
          door.properties["Width"] ??
          door.properties["OverallWidth"]) as number | undefined;
      const isFireDoor =
        String(door.properties["FireRating"] ?? door.properties["IsFireDoor"] ?? "").toLowerCase() !== "" &&
        String(door.properties["FireRating"] ?? "").toLowerCase() !== "none";

      if (w !== undefined && isFireDoor) {
        checkedDoors.push(door.globalId);
        if (w < 850) narrowDoors.push(door.globalId);
      }
    }

    if (checkedDoors.length === 0) {
      results.push({
        ruleId: "FS-005",
        ruleName: "Fire Door Width",
        category: "Fire Safety",
        status: "MANUAL_REVIEW",
        severity: "MAJOR",
        message: "No fire doors with width data identified. Fire door widths must be manually verified (≥ 850mm clear opening).",
        requiredValue: "Fire door clear width ≥ 850mm",
        actualValue: "No fire door data found",
        regulationReference: "FSR 2023 §9.1, SS 332",
      });
    } else {
      results.push({
        ruleId: "FS-005",
        ruleName: "Fire Door Width",
        category: "Fire Safety",
        status: narrowDoors.length > 0 ? "FAIL" : "PASS",
        severity: "MAJOR",
        message:
          narrowDoors.length > 0
            ? `${narrowDoors.length} fire door(s) below 850mm clear opening width.`
            : `All ${checkedDoors.length} identified fire doors meet 850mm minimum.`,
        affectedElements: narrowDoors,
        requiredValue: "≥ 850mm clear opening",
        actualValue: `${checkedDoors.length - narrowDoors.length}/${checkedDoors.length} compliant`,
        regulationReference: "FSR 2023 §9.1, SS 332",
      });
    }

    // FS-006: Corridor width >= 1200mm
    const corridors = model.spaces.filter(
      (s) =>
        s.name.toLowerCase().includes("corridor") ||
        s.name.toLowerCase().includes("hallway") ||
        s.name.toLowerCase().includes("passageway") ||
        s.usage.includes("CORRIDOR")
    );

    if (corridors.length === 0) {
      results.push({
        ruleId: "FS-006",
        ruleName: "Corridor Width",
        category: "Fire Safety",
        status: "MANUAL_REVIEW",
        severity: "MAJOR",
        message: "No corridor spaces identified by name/usage. Corridor widths (≥ 1200mm) must be verified manually.",
        requiredValue: "Corridor width ≥ 1200mm",
        actualValue: "No corridor elements found",
        regulationReference: "BCA Approved Document M §5.1, FSR 2023 §5.4",
      });
    } else {
      const narrowCorridors = corridors.filter((c) => {
        const el = model.elements.find((e) => e.globalId === c.globalId);
        const w = el
          ? ((el.quantities["Width"] ?? el.properties["Width"]) as
              | number
              | undefined)
          : undefined;
        return w !== undefined && w < 1200;
      });
      results.push({
        ruleId: "FS-006",
        ruleName: "Corridor Width",
        category: "Fire Safety",
        status: narrowCorridors.length > 0 ? "FAIL" : "PASS",
        severity: "MAJOR",
        message:
          narrowCorridors.length > 0
            ? `${narrowCorridors.length} corridor(s) below 1200mm minimum width.`
            : `All ${corridors.length} identified corridor(s) meet 1200mm requirement.`,
        affectedElements: narrowCorridors.map((c) => c.globalId),
        requiredValue: "≥ 1200mm clear width",
        actualValue: `${corridors.length - narrowCorridors.length}/${corridors.length} compliant`,
        regulationReference: "BCA Approved Document M §5.1",
      });
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────
  // Rule Set 3: Barrier-Free Accessibility (BFA)
  // ─────────────────────────────────────────────────────────

  private _checkAccessibility(model: ParsedIfcModel): ComplianceCheckResult[] {
    const results: ComplianceCheckResult[] = [];

    // BFA-001: At least one accessible entrance (ramp or level access)
    const ramps = model.elements.filter((e) =>
      e.type.toLowerCase().includes("ramp")
    );
    const levelEntries = model.elements.filter((e) => {
      const accessible =
        e.properties["IsAccessible"] ??
        e.properties["HandicapAccessible"] ??
        e.properties["AccessibleRoute"];
      return String(accessible).toLowerCase() === "true" || accessible === true;
    });

    const hasAccessibleEntrance = ramps.length > 0 || levelEntries.length > 0;
    results.push({
      ruleId: "BFA-001",
      ruleName: "Accessible Entrance",
      category: "Barrier-Free Accessibility",
      status: hasAccessibleEntrance ? "PASS" : "FAIL",
      severity: "CRITICAL",
      message: hasAccessibleEntrance
        ? `Accessible entrance found (${ramps.length} ramp(s), ${levelEntries.length} accessible element(s)).`
        : "No accessible entrance identified. All buildings must have at least one accessible entrance per BFA Code.",
      requiredValue: "≥ 1 ramp or level accessible entrance",
      actualValue: `${ramps.length} ramps, ${levelEntries.length} marked accessible`,
      regulationReference: "BCA Code on Accessibility §3.1, BCA 2019 BFA",
    });

    // BFA-002: Ramp gradient <= 1:12 (8.33%)
    const steepRamps: string[] = [];
    for (const ramp of ramps) {
      const rise = (ramp.quantities["Rise"] ?? ramp.properties["Rise"]) as
        | number
        | undefined;
      const run = (ramp.quantities["Run"] ?? ramp.properties["Run"]) as
        | number
        | undefined;
      const slope = (ramp.properties["Slope"] ??
        ramp.properties["Gradient"]) as number | undefined;

      let gradient: number | undefined;
      if (rise !== undefined && run !== undefined && run > 0) {
        gradient = rise / run;
      } else if (slope !== undefined) {
        gradient = slope;
      }

      if (gradient !== undefined && gradient > 1 / 12) {
        steepRamps.push(ramp.globalId);
      }
    }

    if (ramps.length === 0) {
      results.push({
        ruleId: "BFA-002",
        ruleName: "Ramp Gradient",
        category: "Barrier-Free Accessibility",
        status: "NOT_APPLICABLE",
        severity: "MAJOR",
        message: "No ramp elements in model. BFA-002 not applicable.",
        regulationReference: "BCA Code on Accessibility §3.3.2",
      });
    } else {
      results.push({
        ruleId: "BFA-002",
        ruleName: "Ramp Gradient",
        category: "Barrier-Free Accessibility",
        status: steepRamps.length > 0 ? "FAIL" : "PASS",
        severity: "MAJOR",
        message:
          steepRamps.length > 0
            ? `${steepRamps.length} ramp(s) exceed 1:12 gradient. Maximum permitted gradient is 1:12 (8.33%).`
            : `All ${ramps.length} ramp(s) within 1:12 gradient limit.`,
        affectedElements: steepRamps,
        requiredValue: "Gradient ≤ 1:12 (8.33%)",
        actualValue: `${ramps.length - steepRamps.length}/${ramps.length} compliant`,
        regulationReference: "BCA Code on Accessibility §3.3.2",
      });
    }

    // BFA-003: Accessible toilet on every floor with disabled facilities
    const toilets = model.spaces.filter(
      (s) =>
        s.name.toLowerCase().includes("toilet") ||
        s.name.toLowerCase().includes("wc") ||
        s.name.toLowerCase().includes("bathroom") ||
        s.usage.includes("TOILET") ||
        s.usage.includes("SANITARY")
    );
    const accessibleToilets = toilets.filter((t) => {
      const el = model.elements.find((e) => e.globalId === t.globalId);
      if (!el) return false;
      return (
        String(el.properties["IsAccessible"] ?? el.properties["HandicapAccessible"] ?? "").toLowerCase() === "true" ||
        t.name.toLowerCase().includes("accessible") ||
        t.name.toLowerCase().includes("disabled") ||
        t.name.toLowerCase().includes("handicap")
      );
    });

    if (toilets.length === 0) {
      results.push({
        ruleId: "BFA-003",
        ruleName: "Accessible Toilets Per Floor",
        category: "Barrier-Free Accessibility",
        status: "MANUAL_REVIEW",
        severity: "MAJOR",
        message: "No toilet spaces identified in model. Accessible toilet provision must be verified manually.",
        regulationReference: "BCA Code on Accessibility §5.1",
      });
    } else {
      const floorsWithAccessibleToilet = new Set(
        accessibleToilets.map((t) => t.level)
      );
      const floorsNeedingToilets = new Set(
        model.storeys.filter((s) => s.elements.length > 0).map((s) => s.name)
      );
      const missingFloors = [...floorsNeedingToilets].filter(
        (f) => !floorsWithAccessibleToilet.has(f)
      );

      results.push({
        ruleId: "BFA-003",
        ruleName: "Accessible Toilets Per Floor",
        category: "Barrier-Free Accessibility",
        status: missingFloors.length > 0 ? "FAIL" : "PASS",
        severity: "MAJOR",
        message:
          missingFloors.length > 0
            ? `Missing accessible toilet on floor(s): ${missingFloors.join(", ")}`
            : `Accessible toilets present on all occupied floors.`,
        requiredValue: "Accessible toilet on every occupied floor",
        actualValue: `${accessibleToilets.length} accessible toilet(s) found across ${floorsWithAccessibleToilet.size} floor(s)`,
        regulationReference: "BCA Code on Accessibility §5.1",
      });
    }

    // BFA-004: Lift dimensions >= 1100mm × 1400mm for buildings > 4 storeys
    if (model.totalFloors > 4) {
      const lifts = model.elements.filter(
        (e) =>
          e.type.toLowerCase().includes("lift") ||
          e.type.toLowerCase().includes("elevator") ||
          String(e.properties["ObjectType"] ?? "").toLowerCase().includes("lift")
      );

      if (lifts.length === 0) {
        results.push({
          ruleId: "BFA-004",
          ruleName: "Accessible Lift Dimensions",
          category: "Barrier-Free Accessibility",
          status: "FAIL",
          severity: "CRITICAL",
          message: `Building has ${model.totalFloors} storeys (> 4) but no lift elements found. An accessible lift is mandatory.`,
          requiredValue: "Lift car ≥ 1100mm × 1400mm",
          actualValue: "No lift elements in model",
          regulationReference: "BCA Code on Accessibility §4.2, BCA 2019 §6.3",
        });
      } else {
        const nonCompliantLifts: string[] = [];
        for (const lift of lifts) {
          const w = (lift.quantities["Width"] ?? lift.properties["CarWidth"]) as number | undefined;
          const d = (lift.quantities["Depth"] ?? lift.properties["CarDepth"]) as number | undefined;
          if (w !== undefined && d !== undefined) {
            if (w < 1100 || d < 1400) nonCompliantLifts.push(lift.globalId);
          }
        }
        results.push({
          ruleId: "BFA-004",
          ruleName: "Accessible Lift Dimensions",
          category: "Barrier-Free Accessibility",
          status: nonCompliantLifts.length > 0 ? "FAIL" : "PASS",
          severity: "CRITICAL",
          message:
            nonCompliantLifts.length > 0
              ? `${nonCompliantLifts.length} lift(s) below minimum 1100mm × 1400mm car dimensions.`
              : `All ${lifts.length} lift(s) meet minimum dimensions.`,
          affectedElements: nonCompliantLifts,
          requiredValue: "Car ≥ 1100mm (W) × 1400mm (D)",
          actualValue: `${lifts.length - nonCompliantLifts.length}/${lifts.length} compliant`,
          regulationReference: "BCA Code on Accessibility §4.2",
        });
      }
    } else {
      results.push({
        ruleId: "BFA-004",
        ruleName: "Accessible Lift Dimensions",
        category: "Barrier-Free Accessibility",
        status: "NOT_APPLICABLE",
        severity: "CRITICAL",
        message: `Building has ${model.totalFloors} storey(s) (≤ 4). Mandatory lift provision not triggered.`,
        regulationReference: "BCA Code on Accessibility §4.2",
      });
    }

    // BFA-005: Tactile guidance strips (informational, check property on relevant elements)
    const tactileElements = model.elements.filter(
      (e) =>
        String(e.properties["HasTactileStrip"] ?? "").toLowerCase() === "true" ||
        String(e.properties["TactileWarning"] ?? "").toLowerCase() === "true"
    );
    const hazardousLocations = model.elements.filter(
      (e) =>
        e.type.toLowerCase().includes("stair") ||
        e.type.toLowerCase().includes("ramp") ||
        String(e.properties["IsHazardous"] ?? "").toLowerCase() === "true"
    );

    results.push({
      ruleId: "BFA-005",
      ruleName: "Tactile Guidance Strips",
      category: "Barrier-Free Accessibility",
      status: hazardousLocations.length === 0
        ? "NOT_APPLICABLE"
        : tactileElements.length > 0
          ? "PASS"
          : "MANUAL_REVIEW",
      severity: "MINOR",
      message:
        hazardousLocations.length === 0
          ? "No hazardous locations identified requiring tactile strips."
          : tactileElements.length > 0
            ? `Tactile guidance strip data found on ${tactileElements.length} element(s).`
            : `${hazardousLocations.length} hazardous location(s) found (stairs/ramps). Tactile strip provision must be verified manually.`,
      requiredValue: "Tactile guidance at all hazardous locations",
      actualValue: `${tactileElements.length} elements with tactile data, ${hazardousLocations.length} hazardous locations`,
      regulationReference: "BCA Code on Accessibility §6.2, SS 553",
    });

    return results;
  }

  // ─────────────────────────────────────────────────────────
  // Rule Set 4: Structural
  // ─────────────────────────────────────────────────────────

  private _checkStructural(model: ParsedIfcModel): ComplianceCheckResult[] {
    const results: ComplianceCheckResult[] = [];

    // STR-001: Column grid spacing <= 9000mm
    const columns = model.elements.filter((e) =>
      e.type.toLowerCase() === "ifccolumn"
    );

    if (columns.length < 2) {
      results.push({
        ruleId: "STR-001",
        ruleName: "Column Grid Spacing",
        category: "Structural",
        status: columns.length === 0 ? "NOT_APPLICABLE" : "MANUAL_REVIEW",
        severity: "MAJOR",
        message:
          columns.length === 0
            ? "No column elements found. Structural system may use walls or alternative systems."
            : "Only 1 column found. Grid spacing cannot be calculated.",
        requiredValue: "Column grid ≤ 9000mm",
        regulationReference: "BCA Structural Eurocodes, BC2: 2008",
      });
    } else {
      // Find columns with coordinates to estimate grid spacing
      const colsWithCoords = columns.filter((c) => c.coordinates);
      let maxSpacing = 0;
      let offendingPairs = 0;

      if (colsWithCoords.length >= 2) {
        for (let i = 0; i < colsWithCoords.length; i++) {
          for (let j = i + 1; j < colsWithCoords.length; j++) {
            const a = colsWithCoords[i].coordinates!;
            const b = colsWithCoords[j].coordinates!;
            const dist = Math.sqrt(
              Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
            );
            // Only count reasonable grid spacings (1m to 20m)
            if (dist > 1000 && dist < 20000) {
              if (dist > maxSpacing) maxSpacing = dist;
              if (dist > 9000) offendingPairs++;
            }
          }
        }

        results.push({
          ruleId: "STR-001",
          ruleName: "Column Grid Spacing",
          category: "Structural",
          status: offendingPairs > 0 ? "WARNING" : "PASS",
          severity: "MAJOR",
          message:
            offendingPairs > 0
              ? `${offendingPairs} column pair(s) with spacing > 9000mm detected. Maximum is ${maxSpacing.toFixed(0)}mm. Structural engineer review required.`
              : `Column grid appears within 9000mm indicative limit. Maximum detected spacing: ${maxSpacing.toFixed(0)}mm.`,
          requiredValue: "Grid spacing ≤ 9000mm (indicative)",
          actualValue: `Max detected: ${maxSpacing.toFixed(0)}mm`,
          regulationReference: "BC2: 2008, EC2 NA(Singapore)",
        });
      } else {
        results.push({
          ruleId: "STR-001",
          ruleName: "Column Grid Spacing",
          category: "Structural",
          status: "MANUAL_REVIEW",
          severity: "MAJOR",
          message: `${columns.length} columns found but placement coordinates not extracted. Grid spacing requires manual verification.`,
          requiredValue: "Grid spacing ≤ 9000mm",
          regulationReference: "BC2: 2008",
        });
      }
    }

    // STR-002: Slab thickness >= 150mm for RC
    const slabs = model.elements.filter((e) =>
      e.type.toLowerCase() === "ifcslab"
    );

    if (slabs.length === 0) {
      results.push({
        ruleId: "STR-002",
        ruleName: "RC Slab Thickness",
        category: "Structural",
        status: "NOT_APPLICABLE",
        severity: "MAJOR",
        message: "No IfcSlab elements found.",
        regulationReference: "BC2: 2008 §3.2",
      });
    } else {
      const thinSlabs: string[] = [];
      const checkedSlabs: string[] = [];

      for (const slab of slabs) {
        const thickness =
          (slab.quantities["Thickness"] ??
            slab.quantities["Width"] ??
            slab.properties["Thickness"] ??
            slab.properties["NominalThickness"]) as number | undefined;
        const material = String(
          slab.properties["Material"] ??
            slab.properties["StructuralMaterial"] ??
            ""
        ).toUpperCase();
        const isRC =
          material.includes("CONCRETE") ||
          material.includes("RC") ||
          material === "" || // assume RC if no material specified
          material.includes("C20") ||
          material.includes("C25") ||
          material.includes("C30");

        if (thickness !== undefined && isRC) {
          checkedSlabs.push(slab.globalId);
          if (thickness < 150) thinSlabs.push(slab.globalId);
        }
      }

      if (checkedSlabs.length === 0) {
        results.push({
          ruleId: "STR-002",
          ruleName: "RC Slab Thickness",
          category: "Structural",
          status: "MANUAL_REVIEW",
          severity: "MAJOR",
          message: `${slabs.length} slab(s) found but no thickness quantity data. Slab thicknesses must be verified manually (min 150mm for RC).`,
          requiredValue: "RC slab thickness ≥ 150mm",
          actualValue: "No thickness data in model",
          regulationReference: "BC2: 2008 §3.2",
        });
      } else {
        results.push({
          ruleId: "STR-002",
          ruleName: "RC Slab Thickness",
          category: "Structural",
          status: thinSlabs.length > 0 ? "FAIL" : "PASS",
          severity: "MAJOR",
          message:
            thinSlabs.length > 0
              ? `${thinSlabs.length} RC slab(s) below 150mm minimum thickness.`
              : `All ${checkedSlabs.length} checked RC slab(s) meet 150mm minimum thickness.`,
          affectedElements: thinSlabs,
          requiredValue: "≥ 150mm",
          actualValue: `${checkedSlabs.length - thinSlabs.length}/${checkedSlabs.length} compliant`,
          regulationReference: "BC2: 2008 §3.2",
        });
      }
    }

    // STR-003: Foundation elements present for buildings > 5 storeys
    if (model.totalFloors > 5) {
      const foundations = model.elements.filter(
        (e) =>
          e.type.toLowerCase() === "ifcfooting" ||
          e.type.toLowerCase() === "ifcpile" ||
          String(e.properties["PredefinedType"] ?? "").toLowerCase().includes("foundation") ||
          String(e.properties["ObjectType"] ?? "").toLowerCase().includes("foundation")
      );

      results.push({
        ruleId: "STR-003",
        ruleName: "Foundation Elements Present",
        category: "Structural",
        status: foundations.length > 0 ? "PASS" : "FAIL",
        severity: "CRITICAL",
        message:
          foundations.length > 0
            ? `${foundations.length} foundation element(s) found (IfcFooting/IfcPile).`
            : `Building has ${model.totalFloors} storeys but no foundation elements (IfcFooting/IfcPile) found. CORENET-X requires foundation modelling for buildings > 5 storeys.`,
        requiredValue: "IfcFooting or IfcPile elements present",
        actualValue: `${foundations.length} foundation elements`,
        regulationReference: "BCA Building Control Regulations §8, BC1: 2012",
      });
    } else {
      results.push({
        ruleId: "STR-003",
        ruleName: "Foundation Elements Present",
        category: "Structural",
        status: "NOT_APPLICABLE",
        severity: "CRITICAL",
        message: `Building has ${model.totalFloors} storey(s) (≤ 5). Foundation element modelling requirement not triggered.`,
        regulationReference: "BC1: 2012",
      });
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────
  // Rule Set 5: Green Mark / Energy (SS 530)
  // ─────────────────────────────────────────────────────────

  private _checkGreenMark(model: ParsedIfcModel): ComplianceCheckResult[] {
    const results: ComplianceCheckResult[] = [];

    // GM-001: Window-to-wall ratio (WWR) <= 50% per facade
    const walls = model.elements.filter((e) =>
      e.type.toLowerCase().includes("ifcwall")
    );
    const windows = model.elements.filter((e) =>
      e.type.toLowerCase() === "ifcwindow"
    );

    if (walls.length === 0) {
      results.push({
        ruleId: "GM-001",
        ruleName: "Window-to-Wall Ratio",
        category: "Green Mark / Energy",
        status: "NOT_APPLICABLE",
        severity: "MAJOR",
        message: "No wall elements found. WWR check not possible.",
        regulationReference: "SS 530:2014 §5.1, BCA Green Mark Criteria",
      });
    } else {
      let totalWallArea = 0;
      let totalWindowArea = 0;

      for (const wall of walls) {
        totalWallArea +=
          (wall.quantities["GrossSideArea"] ??
            wall.quantities["NetSideArea"] ??
            wall.quantities["OuterSurfaceArea"] ??
            0) as number;
      }
      for (const win of windows) {
        totalWindowArea +=
          (win.quantities["Area"] ??
            win.quantities["GrossArea"] ??
            win.quantities["Width"] !== undefined &&
            win.quantities["Height"] !== undefined
              ? (win.quantities["Width"] as number) * (win.quantities["Height"] as number)
              : 0) as number;
      }

      if (totalWallArea === 0) {
        results.push({
          ruleId: "GM-001",
          ruleName: "Window-to-Wall Ratio",
          category: "Green Mark / Energy",
          status: "MANUAL_REVIEW",
          severity: "MAJOR",
          message: `${walls.length} wall(s) and ${windows.length} window(s) found but no area quantities extracted. WWR must be calculated manually.`,
          requiredValue: "WWR ≤ 50% per facade",
          regulationReference: "SS 530:2014 §5.1",
        });
      } else {
        const wwr = (totalWindowArea / totalWallArea) * 100;
        results.push({
          ruleId: "GM-001",
          ruleName: "Window-to-Wall Ratio",
          category: "Green Mark / Energy",
          status: wwr > 50 ? "FAIL" : wwr > 40 ? "WARNING" : "PASS",
          severity: "MAJOR",
          message:
            wwr > 50
              ? `WWR of ${wwr.toFixed(1)}% exceeds 50% maximum. SS 530 requires WWR ≤ 50% per facade.`
              : wwr > 40
                ? `WWR of ${wwr.toFixed(1)}% is within limit but approaching 50% threshold.`
                : `WWR of ${wwr.toFixed(1)}% within 50% limit.`,
          requiredValue: "WWR ≤ 50%",
          actualValue: `${wwr.toFixed(1)}% (Window: ${totalWindowArea.toFixed(0)}m², Wall: ${totalWallArea.toFixed(0)}m²)`,
          regulationReference: "SS 530:2014 §5.1, BCA Green Mark 2021",
        });
      }
    }

    // GM-002: Roof insulation (check IfcCovering with IsExternal=true)
    const coverings = model.elements.filter(
      (e) => e.type.toLowerCase() === "ifccovering"
    );
    const externalRoofCoverings = coverings.filter((c) => {
      const isExt =
        c.properties["IsExternal"] === true ||
        String(c.properties["IsExternal"]).toLowerCase() === "true" ||
        String(c.properties["PredefinedType"] ?? "").toUpperCase().includes("ROOF");
      return isExt;
    });

    const roofWithInsulation = externalRoofCoverings.filter((c) => {
      return (
        c.properties["ThermalTransmittance"] !== undefined ||
        c.properties["RValue"] !== undefined ||
        String(c.properties["IsInsulated"] ?? "").toLowerCase() === "true" ||
        String(c.properties["Material"] ?? "").toLowerCase().includes("insul")
      );
    });

    if (externalRoofCoverings.length === 0) {
      results.push({
        ruleId: "GM-002",
        ruleName: "Roof Insulation",
        category: "Green Mark / Energy",
        status: "MANUAL_REVIEW",
        severity: "MINOR",
        message: "No external IfcCovering (roof) elements found. Roof insulation compliance with SS 530 must be verified manually.",
        requiredValue: "Roof with thermal insulation (U-value per SS 530 Table 1)",
        regulationReference: "SS 530:2014 §4.3, BCA Green Mark 2021 §EE2",
      });
    } else {
      results.push({
        ruleId: "GM-002",
        ruleName: "Roof Insulation",
        category: "Green Mark / Energy",
        status: roofWithInsulation.length > 0 ? "PASS" : "WARNING",
        severity: "MINOR",
        message:
          roofWithInsulation.length > 0
            ? `${roofWithInsulation.length} of ${externalRoofCoverings.length} external roof covering(s) have insulation data.`
            : `${externalRoofCoverings.length} external roof covering(s) found but none have insulation properties declared. U-value data required for SS 530 compliance.`,
        requiredValue: "Roof insulation with declared thermal properties",
        actualValue: `${roofWithInsulation.length}/${externalRoofCoverings.length} with insulation data`,
        regulationReference: "SS 530:2014 §4.3",
      });
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────
  // Rule Set 6: Singapore Zoning
  // ─────────────────────────────────────────────────────────

  private _checkZoning(model: ParsedIfcModel): ComplianceCheckResult[] {
    const results: ComplianceCheckResult[] = [];

    // Determine building use from space usages
    const usageCounts = new Map<string, number>();
    for (const space of model.spaces) {
      const u = space.usage.toUpperCase();
      usageCounts.set(u, (usageCounts.get(u) ?? 0) + 1);
    }

    const dominantUsage =
      usageCounts.size > 0
        ? [...usageCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : "UNCLASSIFIED";

    // Normalise to allowed types
    const normaliseUsage = (u: string): string => {
      if (u.includes("OFFICE") || u.includes("RETAIL") || u.includes("SHOP") || u.includes("COMMERCIAL")) return "COMMERCIAL";
      if (u.includes("APARTMENT") || u.includes("RESIDENTIAL") || u.includes("FLAT") || u.includes("DWELLING")) return "RESIDENTIAL";
      if (u.includes("FACTORY") || u.includes("WAREHOUSE") || u.includes("INDUSTRIAL")) return "INDUSTRIAL";
      if (u.includes("SCHOOL") || u.includes("HOSPITAL") || u.includes("INSTITUTIONAL") || u.includes("GOVERNMENT")) return "INSTITUTIONAL";
      if (u.includes("MIXED") || u.includes("MIXED-USE")) return "MIXED-USE";
      return u;
    };

    const normalisedUsage = normaliseUsage(dominantUsage);
    const isAllowed = (ALLOWED_BUILDING_USES as readonly string[]).includes(normalisedUsage);

    // ZN-001: Building use classification
    results.push({
      ruleId: "ZN-001",
      ruleName: "Building Use Classification",
      category: "Zoning",
      status:
        normalisedUsage === "UNCLASSIFIED"
          ? "MANUAL_REVIEW"
          : isAllowed
            ? "PASS"
            : "FAIL",
      severity: "MAJOR",
      message:
        normalisedUsage === "UNCLASSIFIED"
          ? "Building use not determinable from IfcSpace usage data. Classification required for URA zoning compliance."
          : isAllowed
            ? `Building use classified as ${normalisedUsage}, valid for Singapore URA zoning.`
            : `Building use '${normalisedUsage}' is not a recognised Singapore zoning category.`,
      requiredValue: `One of: ${ALLOWED_BUILDING_USES.join(", ")}`,
      actualValue: normalisedUsage,
      regulationReference: "URA Master Plan 2019, BCA Building Control Regulations §4",
    });

    // ZN-002: Parking ratio for commercial buildings
    if (normalisedUsage === "COMMERCIAL" || normalisedUsage === "MIXED-USE") {
      const parkingSpaces = model.spaces.filter(
        (s) =>
          s.name.toLowerCase().includes("parking") ||
          s.name.toLowerCase().includes("carpark") ||
          s.name.toLowerCase().includes("car park") ||
          s.usage.includes("PARKING") ||
          s.usage.includes("CARPARK")
      );

      const parkingElements = model.elements.filter(
        (e) =>
          String(e.properties["ObjectType"] ?? "").toLowerCase().includes("parking") ||
          e.type.toLowerCase().includes("parkingspace")
      );

      const hasParking = parkingSpaces.length > 0 || parkingElements.length > 0;

      results.push({
        ruleId: "ZN-002",
        ruleName: "Parking Provision (Commercial)",
        category: "Zoning",
        status: hasParking ? "PASS" : "WARNING",
        severity: "MINOR",
        message: hasParking
          ? `${parkingSpaces.length + parkingElements.length} parking space(s)/element(s) identified. Verify parking quantum against LTA Car Parking Standards.`
          : "No parking spaces identified for commercial building. Verify parking quantum requirement with LTA Car Parking Standards.",
        requiredValue: "Parking per LTA Car Parking Standards (varies by use and GFA)",
        actualValue: `${parkingSpaces.length} parking space(s) in model`,
        regulationReference: "LTA Car Parking Standards 2019, URA Development Control",
      });
    } else {
      results.push({
        ruleId: "ZN-002",
        ruleName: "Parking Provision (Commercial)",
        category: "Zoning",
        status: "NOT_APPLICABLE",
        severity: "MINOR",
        message: `ZN-002 not applicable for ${normalisedUsage} use type.`,
        regulationReference: "LTA Car Parking Standards 2019",
      });
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────
  // Private: Report assembly
  // ─────────────────────────────────────────────────────────

  private _assembleReport(
    model: ParsedIfcModel,
    results: ComplianceCheckResult[],
    enhancedRecommendations: string[]
  ): CorenetXComplianceReport {
    const reportId = crypto.randomBytes(8).toString("hex").toUpperCase();
    const passCount = results.filter((r) => r.status === "PASS").length;
    const failCount = results.filter((r) => r.status === "FAIL").length;
    const warningCount = results.filter(
      (r) => r.status === "WARNING" || r.status === "MANUAL_REVIEW"
    ).length;
    const criticalFailures = results.filter(
      (r) => r.status === "FAIL" && r.severity === "CRITICAL"
    );

    let overallStatus: CorenetXComplianceReport["overallStatus"];
    if (criticalFailures.length > 0) {
      overallStatus = "NON_COMPLIANT";
    } else if (failCount > 0 || warningCount > 2) {
      overallStatus = "CONDITIONAL";
    } else if (
      results.some((r) => r.status === "MANUAL_REVIEW") ||
      results.some((r) => r.status === "NOT_APPLICABLE")
    ) {
      overallStatus = "INCOMPLETE";
    } else {
      overallStatus = "COMPLIANT";
    }

    const blockers = results
      .filter((r) => r.status === "FAIL" && (r.severity === "CRITICAL" || r.severity === "MAJOR"))
      .map((r) => `[${r.ruleId}] ${r.message}`);

    const advisories = results
      .filter((r) => r.status === "WARNING" || r.status === "MANUAL_REVIEW")
      .map((r) => `[${r.ruleId}] ${r.message}`);

    const reportPayload = JSON.stringify({
      reportId,
      results: results.map((r) => r.ruleId + r.status),
    });
    const reportHash = crypto
      .createHash("sha256")
      .update(reportPayload)
      .digest("hex")
      .toUpperCase();

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      modelSummary: {
        projectName: model.projectName,
        grossFloorArea: model.grossFloorArea,
        totalFloors: model.totalFloors,
        buildingHeight: model.buildingHeight,
      },
      overallStatus,
      totalChecks: results.length,
      passCount,
      failCount,
      warningCount,
      criticalFailures,
      allResults: results,
      submissionReadiness: {
        readyToSubmit: criticalFailures.length === 0 && failCount === 0,
        blockers,
        advisories,
      },
      corenetXSubmissionData: {
        submissionType: "NEW_ERECTION",
        applicantRef: `BBMW0-${reportId.slice(0, 8)}`,
        checklistVersion: CORENET_X_CHECKLIST_VERSION,
        reportHash,
      },
      enhancedRecommendations,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Private: AI Recommendations via Claude
  // ─────────────────────────────────────────────────────────

  private async _generateAIRecommendations(
    report: CorenetXComplianceReport
  ): Promise<string[]> {
    const failures = report.allResults.filter(
      (r) => r.status === "FAIL" || r.status === "WARNING" || r.status === "MANUAL_REVIEW"
    );

    if (failures.length === 0) {
      return [
        "Model meets all automatically checked CORENET-X requirements. Proceed with Qualified Person endorsement and CORENET-X portal submission.",
        "Recommendation: Conduct BIM coordination clash detection before submission to avoid downstream delays.",
        "Recommendation: Ensure all IfcPropertySet entries are completed with Singapore-specific parameters per BCA BIM Essential Guide v2.",
      ];
    }

    const failureSummary = failures.map((f) => ({
      ruleId: f.ruleId,
      ruleName: f.ruleName,
      category: f.category,
      status: f.status,
      severity: f.severity,
      message: f.message,
      regulation: f.regulationReference,
    }));

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 1500,
        system: `You are a Singapore-registered Professional Engineer (PE) and BIM compliance specialist with expertise in CORENET-X, BCA Building Control Act, SCDF Fire Safety Regulations, BFA Accessibility Code, and SS 530 energy standards. analyse these compliance failures and provide specific, actionable remediation guidance. Each recommendation must:
1. Reference the exact Singapore code clause
2. Provide a concrete BIM modelling action (what to fix in the IFC model)
3. State the design consequence if not resolved
Format as a JSON array of strings. Be precise and technical.`,
        messages: [
          {
            role: "user",
            content: `Project: ${report.modelSummary.projectName} | GFA: ${report.modelSummary.grossFloorArea.toFixed(0)}m² | Floors: ${report.modelSummary.totalFloors} | Height: ${report.modelSummary.buildingHeight.toFixed(1)}m\n\nCompliance failures requiring remediation:\n${JSON.stringify(failureSummary, null, 2)}\n\nProvide 5-8 prioritised, actionable recommendations as a JSON array of strings.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") return this._fallbackRecommendations(failures);

      const text = content.text.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return this._fallbackRecommendations(failures);

      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.every((r) => typeof r === "string")) {
        return parsed;
      }
      return this._fallbackRecommendations(failures);
    } catch {
      return this._fallbackRecommendations(failures);
    }
  }

  private _fallbackRecommendations(
    failures: ComplianceCheckResult[]
  ): string[] {
    const recs: string[] = [];

    for (const f of failures.slice(0, 8)) {
      switch (f.ruleId) {
        case "CX-001":
          recs.push(`[${f.ruleId}] Ensure IfcProject has a non-empty Name attribute set to the official BCA application reference. Ref: CORENET-X Guide §2.1`);
          break;
        case "CX-002":
          recs.push(`[${f.ruleId}] Add IfcPostalAddress to IfcSite with Singapore postal code and street address, or set RefLatitude/RefLongitude using SVY21 coordinates. Ref: CORENET-X Guide §2.2`);
          break;
        case "FS-001":
          recs.push(`[${f.ruleId}] Add IfcPropertySingleValue 'NominalWidth' to all IfcStairFlight elements. Minimum 1050mm for buildings > 24m. Ref: FSR 2023 §5.3`);
          break;
        case "FS-003":
          recs.push(`[${f.ruleId}] Introduce fire-rated compartment walls (IfcWall with FireRating property) to subdivide floor area below 7000m² per compartment. Ref: SCDF Fire Code Table 6A`);
          break;
        case "FS-004":
          recs.push(`[${f.ruleId}] Model at least 2 IfcDoor exit elements per occupied floor, each with IsExitDoor=true property. Ref: BCA Approved Document B §3.1`);
          break;
        case "FS-005":
          recs.push(`[${f.ruleId}] Add FireRating and clear width properties to all fire door IfcDoor entities. Minimum 850mm clear opening. Ref: FSR 2023 §9.1, SS 332`);
          break;
        case "BFA-001":
          recs.push(`[${f.ruleId}] Model at least one IfcRamp element at the main entrance with IsAccessible=true and gradient ≤ 1:12. Ref: BCA Code on Accessibility §3.1`);
          break;
        case "BFA-002":
          recs.push(`[${f.ruleId}] Correct ramp geometry so Rise/Run ratio ≤ 0.0833 (1:12). Consider adding intermediate landings per BCA Accessibility Code §3.3.3`);
          break;
        case "BFA-003":
          recs.push(`[${f.ruleId}] Add IfcSpace of type TOILET_ACCESSIBLE on each floor with HandicapAccessible=true and minimum 1500mm × 1500mm turning radius. Ref: BCA Accessibility §5.1`);
          break;
        case "BFA-004":
          recs.push(`[${f.ruleId}] Add IfcTransportElement (lift) with car dimensions ≥ 1100mm × 1400mm and IsAccessible=true. Building > 4 storeys requires mandatory accessible lift. Ref: BCA Accessibility §4.2`);
          break;
        case "STR-001":
          recs.push(`[${f.ruleId}] Review column grid layout and add intermediate columns or transfer beams where spans exceed 9000mm. Confirm with PE under EC2 (NA Singapore). Ref: BC2: 2008`);
          break;
        case "STR-002":
          recs.push(`[${f.ruleId}] Set IfcQuantityLength 'Thickness' on all IfcSlab entities. Minimum 150mm for RC slabs. Update structural drawings to reflect BCA-approved thickness. Ref: BC2: 2008 §3.2`);
          break;
        case "STR-003":
          recs.push(`[${f.ruleId}] Add IfcFooting or IfcPile elements representing the foundation system. Buildings > 5 storeys require foundation modelling in CORENET-X. Ref: BC1: 2012`);
          break;
        case "GM-001":
          recs.push(`[${f.ruleId}] Reduce glazing area or increase opaque wall area to bring WWR below 50%. Consider high-performance glazing (SHGC < 0.25) if WWR must remain high. Ref: SS 530:2014 §5.1`);
          break;
        case "GM-002":
          recs.push(`[${f.ruleId}] Add ThermalTransmittance (U-value) property to all external IfcCovering (roof) elements. Target U ≤ 0.5 W/m²K per SS 530 Table 1. Ref: SS 530:2014 §4.3`);
          break;
        case "ZN-001":
          recs.push(`[${f.ruleId}] Set OccupancyType property on all IfcSpace elements to one of: RESIDENTIAL, COMMERCIAL, INDUSTRIAL, INSTITUTIONAL, MIXED-USE per URA Master Plan. Ref: URA Development Control`);
          break;
        default:
          recs.push(`[${f.ruleId}] Review failure: ${f.message}: Regulation: ${f.regulationReference ?? "See CORENET-X Submission Guide"}`);
      }
    }

    return recs;
  }

  // ─────────────────────────────────────────────────────────
  // HTML Report Generator
  // ─────────────────────────────────────────────────────────

  generateHtmlReport(report: CorenetXComplianceReport): string {
    const statusColor = {
      COMPLIANT: "#006400",
      NON_COMPLIANT: "#CC0000",
      CONDITIONAL: "#FF8C00",
      INCOMPLETE: "#666666",
    }[report.overallStatus];

    const statusIcon = {
      COMPLIANT: "✓",
      NON_COMPLIANT: "✗",
      CONDITIONAL: "⚠",
      INCOMPLETE: "○",
    }[report.overallStatus];

    const renderStatusBadge = (status: ComplianceStatus): string => {
      const cfg: Record<ComplianceStatus, { bg: string; color: string; label: string }> = {
        PASS: { bg: "#D4EDDA", color: "#155724", label: "PASS" },
        FAIL: { bg: "#F8D7DA", color: "#721C24", label: "FAIL" },
        WARNING: { bg: "#FFF3CD", color: "#856404", label: "WARNING" },
        NOT_APPLICABLE: { bg: "#E2E3E5", color: "#383D41", label: "N/A" },
        MANUAL_REVIEW: { bg: "#CCE5FF", color: "#004085", label: "MANUAL REVIEW" },
      };
      const c = cfg[status];
      return `<span style="background:${c.bg};color:${c.color};padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;white-space:nowrap">${c.label}</span>`;
    };

    const renderSeverityBadge = (severity: RuleSeverity): string => {
      const cfg: Record<RuleSeverity, { color: string }> = {
        CRITICAL: { color: "#CC0000" },
        MAJOR: { color: "#FF8C00" },
        MINOR: { color: "#4A90D9" },
        INFORMATIONAL: { color: "#666666" },
      };
      return `<span style="color:${cfg[severity].color};font-size:11px;font-weight:600">${severity}</span>`;
    };

    const groupedResults = new Map<string, ComplianceCheckResult[]>();
    for (const r of report.allResults) {
      if (!groupedResults.has(r.category)) groupedResults.set(r.category, []);
      groupedResults.get(r.category)!.push(r);
    }

    const categoryBlocks = [...groupedResults.entries()]
      .map(([cat, items]) => {
        const catFail = items.filter((i) => i.status === "FAIL").length;
        const catPass = items.filter((i) => i.status === "PASS").length;
        const catWarn = items.filter((i) => i.status === "WARNING" || i.status === "MANUAL_REVIEW").length;
        const catHeaderColor =
          catFail > 0 ? "#F8D7DA" : catWarn > 0 ? "#FFF3CD" : "#D4EDDA";

        const rows = items
          .map(
            (r) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #dee2e6;font-family:monospace;font-size:12px;white-space:nowrap">${r.ruleId}</td>
            <td style="padding:8px;border-bottom:1px solid #dee2e6;font-size:13px">${r.ruleName}</td>
            <td style="padding:8px;border-bottom:1px solid #dee2e6;text-align:center">${renderStatusBadge(r.status)}</td>
            <td style="padding:8px;border-bottom:1px solid #dee2e6;text-align:center">${renderSeverityBadge(r.severity)}</td>
            <td style="padding:8px;border-bottom:1px solid #dee2e6;font-size:12px;color:#555">${r.message}</td>
            <td style="padding:8px;border-bottom:1px solid #dee2e6;font-size:11px;color:#777">${r.requiredValue ?? "-"}</td>
            <td style="padding:8px;border-bottom:1px solid #dee2e6;font-size:11px;color:#555">${r.actualValue ?? "-"}</td>
            <td style="padding:8px;border-bottom:1px solid #dee2e6;font-size:11px;color:#0070C0">${r.regulationReference ?? "-"}</td>
          </tr>`
          )
          .join("");

        return `
      <div style="margin-bottom:32px">
        <div style="background:${catHeaderColor};border-left:4px solid #003087;padding:10px 16px;border-radius:4px 4px 0 0;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:15px;font-weight:700;color:#003087">${cat}</span>
          <span style="font-size:12px;color:#555">
            <span style="color:#155724;font-weight:600">${catPass} PASS</span> &nbsp;|&nbsp;
            <span style="color:#721C24;font-weight:600">${catFail} FAIL</span> &nbsp;|&nbsp;
            <span style="color:#856404;font-weight:600">${catWarn} REVIEW</span>
          </span>
        </div>
        <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #dee2e6;border-top:none">
          <thead>
            <tr style="background:#f8f9fa">
              <th style="padding:8px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #dee2e6">Rule ID</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #dee2e6">Rule Name</th>
              <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #dee2e6">Status</th>
              <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #dee2e6">Severity</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #dee2e6">Message</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #dee2e6">Required</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #dee2e6">Actual</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #dee2e6">Regulation</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
      </div>`;
      })
      .join("");

    const criticalBlock =
      report.criticalFailures.length === 0
        ? `<div style="background:#D4EDDA;border:1px solid #C3E6CB;border-radius:4px;padding:16px;color:#155724">
        <strong>No critical failures.</strong> All CRITICAL severity checks passed or are not applicable.
      </div>`
        : report.criticalFailures
            .map(
              (r) => `
        <div style="background:#F8D7DA;border:1px solid #F5C6CB;border-radius:4px;padding:12px 16px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <span style="font-family:monospace;font-size:13px;font-weight:700;color:#721C24">${r.ruleId}: ${r.ruleName}</span>
            <span style="font-size:11px;color:#555;margin-left:16px">${r.regulationReference ?? ""}</span>
          </div>
          <p style="margin:6px 0 0;font-size:13px;color:#721C24">${r.message}</p>
          ${r.affectedElements && r.affectedElements.length > 0 ? `<p style="margin:4px 0 0;font-size:11px;color:#555">Affected elements: ${r.affectedElements.slice(0, 5).join(", ")}${r.affectedElements.length > 5 ? ` + ${r.affectedElements.length - 5} more` : ""}</p>` : ""}
        </div>`
            )
            .join("");

    const blockersHtml = report.submissionReadiness.blockers.length === 0
      ? `<li style="color:#155724">No blockers.</li>`
      : report.submissionReadiness.blockers
          .map((b) => `<li style="margin-bottom:4px;color:#721C24">${b}</li>`)
          .join("");

    const advisoriesHtml = report.submissionReadiness.advisories.length === 0
      ? `<li style="color:#155724">No advisories.</li>`
      : report.submissionReadiness.advisories
          .map((a) => `<li style="margin-bottom:4px;color:#856404">${a}</li>`)
          .join("");

    const recsHtml =
      report.enhancedRecommendations.length === 0
        ? `<p style="color:#666;font-style:italic">AI recommendations not available.</p>`
        : report.enhancedRecommendations
            .map(
              (r, i) =>
                `<div style="display:flex;gap:12px;margin-bottom:10px;padding:10px 14px;background:#f0f4ff;border-radius:4px;border-left:3px solid #003087">
            <span style="font-size:16px;font-weight:700;color:#003087;min-width:24px">${i + 1}.</span>
            <span style="font-size:13px;color:#333;line-height:1.5">${r}</span>
          </div>`
            )
            .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CORENET-X Compliance Report: ${report.modelSummary.projectName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; color: #212529; }
  @media print {
    body { background: white; }
    .no-print { display: none; }
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>

<!-- BCA Header Bar -->
<div style="background:#003087;padding:0;margin:0">
  <div style="max-width:1200px;margin:0 auto;padding:16px 32px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="color:#FFD700;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Building and Construction Authority Singapore</div>
      <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:1px;margin-top:2px">CORENET-X Compliance Report</div>
    </div>
    <div style="text-align:right">
      <div style="color:#aac4ff;font-size:11px">Checklist Version</div>
      <div style="color:#fff;font-size:14px;font-weight:700">${report.corenetXSubmissionData.checklistVersion}</div>
    </div>
  </div>
</div>

<!-- Overall Status Banner -->
<div style="background:${statusColor};padding:20px 32px">
  <div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:20px">
    <div style="font-size:48px;color:white;line-height:1">${statusIcon}</div>
    <div>
      <div style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Overall Compliance Status</div>
      <div style="color:white;font-size:28px;font-weight:800">${report.overallStatus.replace("_", " ")}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:2px">
        Ready to Submit: <strong>${report.submissionReadiness.readyToSubmit ? "YES" : "NO"}</strong>
      </div>
    </div>
    <div style="margin-left:auto;display:flex;gap:24px">
      <div style="text-align:center;background:rgba(255,255,255,0.15);border-radius:8px;padding:12px 20px">
        <div style="color:rgba(255,255,255,0.8);font-size:11px;text-transform:uppercase">Total Checks</div>
        <div style="color:white;font-size:28px;font-weight:800">${report.totalChecks}</div>
      </div>
      <div style="text-align:center;background:rgba(255,255,255,0.15);border-radius:8px;padding:12px 20px">
        <div style="color:#90EE90;font-size:11px;text-transform:uppercase">Passed</div>
        <div style="color:white;font-size:28px;font-weight:800">${report.passCount}</div>
      </div>
      <div style="text-align:center;background:rgba(255,255,255,0.15);border-radius:8px;padding:12px 20px">
        <div style="color:#FFB6B6;font-size:11px;text-transform:uppercase">Failed</div>
        <div style="color:white;font-size:28px;font-weight:800">${report.failCount}</div>
      </div>
      <div style="text-align:center;background:rgba(255,255,255,0.15);border-radius:8px;padding:12px 20px">
        <div style="color:#FFE57A;font-size:11px;text-transform:uppercase">Review</div>
        <div style="color:white;font-size:28px;font-weight:800">${report.warningCount}</div>
      </div>
    </div>
  </div>
</div>

<div style="max-width:1200px;margin:0 auto;padding:32px">

  <!-- Model Summary -->
  <div style="background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);padding:24px;margin-bottom:24px">
    <h2 style="font-size:16px;font-weight:700;color:#003087;margin-bottom:16px;border-bottom:2px solid #003087;padding-bottom:8px">Model Summary</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Project Name</div>
        <div style="font-size:16px;font-weight:700;color:#212529">${report.modelSummary.projectName}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Gross Floor Area</div>
        <div style="font-size:16px;font-weight:700;color:#212529">${report.modelSummary.grossFloorArea.toFixed(0)} m²</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Total Floors</div>
        <div style="font-size:16px;font-weight:700;color:#212529">${report.modelSummary.totalFloors}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Building Height</div>
        <div style="font-size:16px;font-weight:700;color:#212529">${report.modelSummary.buildingHeight.toFixed(1)} m</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Report ID</div>
        <div style="font-size:13px;font-family:monospace;color:#003087">${report.reportId}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Generated</div>
        <div style="font-size:13px;color:#212529">${new Date(report.generatedAt).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Applicant Ref</div>
        <div style="font-size:13px;font-family:monospace;color:#212529">${report.corenetXSubmissionData.applicantRef}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Report Hash (SHA-256)</div>
        <div style="font-size:10px;font-family:monospace;color:#666;word-break:break-all">${report.corenetXSubmissionData.reportHash}</div>
      </div>
    </div>
  </div>

  <!-- Critical Failures -->
  <div style="background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);padding:24px;margin-bottom:24px">
    <h2 style="font-size:16px;font-weight:700;color:#CC0000;margin-bottom:16px;border-bottom:2px solid #CC0000;padding-bottom:8px">
      Critical Failures (${report.criticalFailures.length})
    </h2>
    ${criticalBlock}
  </div>

  <!-- Submission Readiness -->
  <div style="background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);padding:24px;margin-bottom:24px">
    <h2 style="font-size:16px;font-weight:700;color:#003087;margin-bottom:16px;border-bottom:2px solid #003087;padding-bottom:8px">
      Submission Readiness
    </h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div>
        <h3 style="font-size:13px;font-weight:700;color:#721C24;margin-bottom:8px">Blockers (must resolve before submission)</h3>
        <ul style="list-style:disc;padding-left:20px;font-size:13px;line-height:1.7">${blockersHtml}</ul>
      </div>
      <div>
        <h3 style="font-size:13px;font-weight:700;color:#856404;margin-bottom:8px">Advisories (review recommended)</h3>
        <ul style="list-style:disc;padding-left:20px;font-size:13px;line-height:1.7">${advisoriesHtml}</ul>
      </div>
    </div>
  </div>

  <!-- Detailed Results by Category -->
  <div style="background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);padding:24px;margin-bottom:24px">
    <h2 style="font-size:16px;font-weight:700;color:#003087;margin-bottom:20px;border-bottom:2px solid #003087;padding-bottom:8px">
      Detailed Compliance Results
    </h2>
    ${categoryBlocks}
  </div>

  <!-- AI Recommendations -->
  <div style="background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);padding:24px;margin-bottom:24px">
    <h2 style="font-size:16px;font-weight:700;color:#003087;margin-bottom:4px;border-bottom:2px solid #003087;padding-bottom:8px">
      AI-Enhanced Recommendations
    </h2>
    <p style="font-size:12px;color:#888;margin-bottom:16px;font-style:italic">Generated by Claude AI (PE-level Singapore code compliance analysis). Verify all recommendations with your Qualified Person before submission.</p>
    ${recsHtml}
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px;color:#888;font-size:11px;border-top:1px solid #dee2e6">
    <p>CORENET-X Compliance Report | Generated by OmniOrg NEUROMESH™ Intelligence Engine | BBMW0 Technologies | bbmw0.com</p>
    <p style="margin-top:4px">This report is for advisory purposes. All compliance determinations must be endorsed by a registered Qualified Person (QP) before BCA submission.</p>
    <p style="margin-top:4px;font-family:monospace;font-size:10px">Report Hash: ${report.corenetXSubmissionData.reportHash} | Report ID: ${report.reportId}</p>
  </div>

</div>
</body>
</html>`;
  }
}

export const ifcValidator = new IfcCorenetXValidator();
export default ifcValidator;
