// Created by BBMW0 Technologies | bbmw0.com
// IFC-CORENET-X Compliance System — IFC Parser
// Parses IFC STEP (.ifc) and JSON-IFC formats into a normalized BuildingModel graph

import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────
// Public interfaces
// ─────────────────────────────────────────────────────────────

export interface IfcElement {
  globalId: string;
  type: string;
  name?: string;
  description?: string;
  properties: Record<string, unknown>;
  quantities: Record<string, number>;
  level?: string;
  coordinates?: { x: number; y: number; z: number };
}

export interface ParsedIfcModel {
  projectName: string;
  projectDescription: string;
  siteAddress?: string;
  totalFloors: number;
  grossFloorArea: number;
  buildingHeight: number;
  elements: IfcElement[];
  storeys: Array<{ name: string; elevation: number; elements: string[] }>;
  spaces: Array<{
    globalId: string;
    name: string;
    area: number;
    usage: string;
    level: string;
  }>;
  stats: {
    elementCount: number;
    wallCount: number;
    doorCount: number;
    windowCount: number;
    stairCount: number;
    columnCount: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Internal types used during parsing
// ─────────────────────────────────────────────────────────────

interface RawEntity {
  id: string;
  type: string;
  attributes: string[];
  rawLine: string;
}

interface PropertySetData {
  name: string;
  properties: Record<string, unknown>;
}

interface QuantitySetData {
  name: string;
  quantities: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────
// IfcParser
// ─────────────────────────────────────────────────────────────

export class IfcParser {
  // ── STEP format parser ─────────────────────────────────────

  parseStep(ifcContent: string): ParsedIfcModel {
    const lines = ifcContent.split(/\r?\n/);
    const entities = new Map<string, RawEntity>();

    // Pass 1 — collect all entity lines, handle line continuations
    let accumulated = "";
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("ISO-10303") || line.startsWith("HEADER") ||
          line.startsWith("ENDSEC") || line.startsWith("DATA") || line === "END-ISO-10303-21;") {
        continue;
      }
      accumulated += line;
      if (line.endsWith(";")) {
        const entityMatch = accumulated.match(/^#(\d+)\s*=\s*([A-Z][A-Z0-9_]*)\s*\((.*)\)\s*;$/s);
        if (entityMatch) {
          const id = entityMatch[1];
          const type = entityMatch[2];
          const attribRaw = entityMatch[3];
          entities.set(id, {
            id,
            type,
            attributes: this._splitAttributes(attribRaw),
            rawLine: accumulated,
          });
        }
        accumulated = "";
      }
    }

    return this._buildModel(entities);
  }

  // ── JSON-IFC parser ────────────────────────────────────────

  parseJsonIfc(jsonContent: string): ParsedIfcModel {
    let data: unknown;
    try {
      data = JSON.parse(jsonContent);
    } catch {
      throw new Error("Invalid JSON-IFC content");
    }

    const entityArray: unknown[] = Array.isArray(data)
      ? data
      : (data as Record<string, unknown>)["entities"]
        ? ((data as Record<string, unknown>)["entities"] as unknown[])
        : [];

    const entities = new Map<string, RawEntity>();

    for (const item of entityArray) {
      if (typeof item !== "object" || item === null) continue;
      const obj = item as Record<string, unknown>;
      const type = (obj["type"] as string | undefined)?.toUpperCase() ?? "";
      const globalId =
        (obj["GlobalId"] as string | undefined) ??
        (obj["globalId"] as string | undefined) ??
        `json-${Math.random().toString(36).slice(2)}`;
      const id = (obj["id"] as string | undefined)?.replace("#", "") ?? globalId;

      // Normalise attributes from JSON object
      const attributes: string[] = [
        `'${globalId}'`,
        this._jsonVal(obj["OwnerHistory"] ?? obj["ownerHistory"]),
        `'${obj["Name"] ?? obj["name"] ?? ""}'`,
        `'${obj["Description"] ?? obj["description"] ?? ""}'`,
        this._jsonVal(obj["ObjectType"] ?? obj["objectType"]),
        this._jsonVal(obj["LongName"] ?? obj["longName"]),
        this._jsonVal(obj["Phase"] ?? obj["phase"]),
        this._jsonVal(obj["Elevation"] ?? obj["elevation"]),
      ];

      entities.set(id, { id, type, attributes, rawLine: JSON.stringify(obj) });
    }

    return this._buildModel(entities);
  }

  // ── File dispatcher ────────────────────────────────────────

  parseFile(filePath: string): ParsedIfcModel {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`IFC file not found: ${resolved}`);
    }
    const content = fs.readFileSync(resolved, "utf-8");
    const trimmed = content.trimStart();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      return this.parseJsonIfc(content);
    }
    return this.parseStep(content);
  }

  // ── Property extraction helper ─────────────────────────────

  extractPropertyValue(
    props: Record<string, unknown>,
    key: string
  ): unknown {
    const lk = key.toLowerCase();
    for (const [k, v] of Object.entries(props)) {
      if (k.toLowerCase() === lk) return v;
      // Search nested property sets
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        const nested = v as Record<string, unknown>;
        for (const [nk, nv] of Object.entries(nested)) {
          if (nk.toLowerCase() === lk) return nv;
        }
      }
    }
    return undefined;
  }

  // ─────────────────────────────────────────────────────────
  // Private — core model builder
  // ─────────────────────────────────────────────────────────

  private _buildModel(entities: Map<string, RawEntity>): ParsedIfcModel {
    // Collect property sets
    const propertySets = new Map<string, PropertySetData>();
    const quantitySets = new Map<string, QuantitySetData>();

    for (const [, entity] of entities) {
      if (entity.type === "IFCPROPERTYSET") {
        const ps = this._parsePropertySet(entity, entities);
        propertySets.set(entity.id, ps);
      }
      if (
        entity.type === "IFCELEMENTQUANTITY" ||
        entity.type === "IFCQUANTITYSET"
      ) {
        const qs = this._parseQuantitySet(entity, entities);
        quantitySets.set(entity.id, qs);
      }
    }

    // Map element → property sets via IfcRelDefinesByProperties
    const elemToPsets = new Map<string, string[]>();
    const elemToQsets = new Map<string, string[]>();

    for (const [, entity] of entities) {
      if (entity.type === "IFCRELDEFINESBYPROPERTIES") {
        const relatedObjs = this._getRefList(entity.attributes[4]);
        const definingRef = this._deref(entity.attributes[5]);
        for (const objId of relatedObjs) {
          if (propertySets.has(definingRef)) {
            if (!elemToPsets.has(objId)) elemToPsets.set(objId, []);
            elemToPsets.get(objId)!.push(definingRef);
          }
          if (quantitySets.has(definingRef)) {
            if (!elemToQsets.has(objId)) elemToQsets.set(objId, []);
            elemToQsets.get(objId)!.push(definingRef);
          }
        }
      }
    }

    // Map storeys → elements via IfcRelContainedInSpatialStructure
    const storeyToElements = new Map<string, string[]>();
    const elementToStorey = new Map<string, string>();

    for (const [, entity] of entities) {
      if (entity.type === "IFCRELCONTAINEDINSPATIALSTRUCTURE") {
        const related = this._getRefList(entity.attributes[4]);
        const storeyRef = this._deref(entity.attributes[5]);
        for (const eid of related) {
          elementToStorey.set(eid, storeyRef);
          if (!storeyToElements.has(storeyRef)) storeyToElements.set(storeyRef, []);
          storeyToElements.get(storeyRef)!.push(eid);
        }
      }
    }

    // Map spaces → storeys via IfcRelAggregates
    const spaceToStorey = new Map<string, string>();
    for (const [, entity] of entities) {
      if (entity.type === "IFCRELAGGREGATES") {
        const relating = this._deref(entity.attributes[4]);
        const related = this._getRefList(entity.attributes[5]);
        for (const eid of related) {
          spaceToStorey.set(eid, relating);
        }
      }
    }

    // Build storeys
    const storeyEntities: RawEntity[] = [];
    for (const [, entity] of entities) {
      if (entity.type === "IFCBUILDINGSTOREY") {
        storeyEntities.push(entity);
      }
    }
    storeyEntities.sort((a, b) => {
      const ea = parseFloat(a.attributes[9] ?? "0") || 0;
      const eb = parseFloat(b.attributes[9] ?? "0") || 0;
      return ea - eb;
    });

    const storeys = storeyEntities.map((se) => {
      const globalId = this._unquote(se.attributes[0]);
      const name = this._unquote(se.attributes[2]);
      const elevation = parseFloat(se.attributes[9] ?? "0") || 0;
      const containedElementIds = storeyToElements.get(se.id) ?? [];
      const containedGlobalIds = containedElementIds
        .map((eid) => {
          const e = entities.get(eid);
          return e ? this._unquote(e.attributes[0]) : null;
        })
        .filter(Boolean) as string[];
      return { name: name || globalId, elevation, elements: containedGlobalIds };
    });

    // Build globalId → storey name lookup
    const storeyIdToName = new Map<string, string>();
    for (const se of storeyEntities) {
      storeyIdToName.set(se.id, this._unquote(se.attributes[2]) || se.id);
    }

    // Build elements
    const BUILDING_ELEMENT_TYPES = new Set([
      "IFCWALL", "IFCWALLSTANDARDCASE", "IFCSLAB", "IFCCOLUMN", "IFCBEAM",
      "IFCDOOR", "IFCWINDOW", "IFCSTAIR", "IFCSTAIRFLIGHT", "IFCRAMP",
      "IFCRAMPFLIGHT", "IFCRAILING", "IFCFIRESUPPRESSIONTERMINAL",
      "IFCSANITARYTERMINAL", "IFCLAMP", "IFCCOVERING", "IFCPLATE",
      "IFCMEMBER", "IFCFOOTING", "IFCPILE", "IFCBUILDINGELEMENTPROXY",
      "IFCSPACE", "IFCZONE", "IFCFURNISHINGELEMENT", "IFCFLOWSEGMENT",
      "IFCFLOWFITTING", "IFCFLOWTERMINAL",
    ]);

    const elements: IfcElement[] = [];

    for (const [, entity] of entities) {
      if (!BUILDING_ELEMENT_TYPES.has(entity.type)) continue;

      const globalId = this._unquote(entity.attributes[0]);
      const name = this._unquote(entity.attributes[2]) || undefined;
      const description = this._unquote(entity.attributes[3]) || undefined;

      // Merge all property sets
      const mergedProps: Record<string, unknown> = {};
      for (const psid of elemToPsets.get(entity.id) ?? []) {
        const ps = propertySets.get(psid);
        if (ps) Object.assign(mergedProps, ps.properties);
      }

      // Merge all quantity sets
      const mergedQty: Record<string, number> = {};
      for (const qsid of elemToQsets.get(entity.id) ?? []) {
        const qs = quantitySets.get(qsid);
        if (qs) Object.assign(mergedQty, qs.quantities);
      }

      // Resolve storey name
      const storeyId = elementToStorey.get(entity.id);
      const level = storeyId ? storeyIdToName.get(storeyId) : undefined;

      // Try to extract placement coordinates (attribute index 5 is ObjectPlacement)
      const coords = this._tryExtractCoords(entity, entities);

      elements.push({
        globalId,
        type: entity.type
          .replace(/^IFC/, "Ifc")
          .replace(/([A-Z])/g, (m, g, o) => (o === 0 ? g : g))
          .replace("Ifc", "Ifc"),
        name,
        description,
        properties: mergedProps,
        quantities: mergedQty,
        level,
        coordinates: coords,
      });
    }

    // Type the element types properly
    const fixType = (t: string) => {
      // Convert IFCWALL → IfcWall style
      return t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, "");
    };
    for (const el of elements) {
      el.type = fixType(el.type);
    }

    // Build spaces
    const spaces = elements
      .filter((el) => el.type.toLowerCase() === "ifcspace")
      .map((el) => {
        const area =
          (el.quantities["NetFloorArea"] ??
            el.quantities["GrossFloorArea"] ??
            el.quantities["FloorArea"] ??
            0);
        const usage =
          String(
            el.properties["OccupancyType"] ??
              el.properties["SpaceType"] ??
              el.properties["Usage"] ??
              "UNCLASSIFIED"
          ).toUpperCase();
        const storeyId = elementToStorey.get(
          [...entities.entries()].find(
            ([, e]) => this._unquote(e.attributes[0]) === el.globalId
          )?.[0] ?? ""
        );
        return {
          globalId: el.globalId,
          name: el.name ?? el.globalId,
          area,
          usage,
          level: el.level ?? (storeyId ? storeyIdToName.get(storeyId) ?? "" : ""),
        };
      });

    // Project / site metadata
    let projectName = "Unnamed Project";
    let projectDescription = "";
    let siteAddress: string | undefined;
    let buildingHeight = 0;
    let grossFloorArea = 0;

    for (const [, entity] of entities) {
      if (entity.type === "IFCPROJECT") {
        projectName = this._unquote(entity.attributes[2]) || projectName;
        projectDescription = this._unquote(entity.attributes[3]) || "";
      }
      if (entity.type === "IFCSITE") {
        const addr = this._unquote(entity.attributes[8]);
        if (addr) siteAddress = addr;
      }
      if (entity.type === "IFCBUILDING") {
        buildingHeight =
          parseFloat(entity.attributes[10] ?? "0") ||
          parseFloat(entity.attributes[9] ?? "0") ||
          0;
      }
    }

    // Calculate GFA from spaces
    const spaceGFA = spaces.reduce((sum, s) => sum + s.area, 0);
    if (spaceGFA > 0) grossFloorArea = spaceGFA;

    // Fallback GFA: count IfcSlab areas
    if (grossFloorArea === 0) {
      for (const el of elements) {
        if (el.type.toLowerCase() === "ifcslab") {
          grossFloorArea +=
            el.quantities["GrossArea"] ??
            el.quantities["NetArea"] ??
            el.quantities["Area"] ??
            0;
        }
      }
    }

    // Fallback building height from storey elevations
    if (buildingHeight === 0 && storeys.length > 0) {
      const maxElev = Math.max(...storeys.map((s) => s.elevation));
      // Add typical floor-to-floor height for top storey
      buildingHeight = maxElev + 3.5;
    }

    const wallCount = elements.filter((e) =>
      e.type.toLowerCase().includes("ifcwall")
    ).length;
    const doorCount = elements.filter((e) =>
      e.type.toLowerCase() === "ifcdoor"
    ).length;
    const windowCount = elements.filter((e) =>
      e.type.toLowerCase() === "ifcwindow"
    ).length;
    const stairCount = elements.filter((e) =>
      e.type.toLowerCase().includes("ifcstair")
    ).length;
    const columnCount = elements.filter((e) =>
      e.type.toLowerCase() === "ifccolumn"
    ).length;

    return {
      projectName,
      projectDescription,
      siteAddress,
      totalFloors: storeys.length || 1,
      grossFloorArea,
      buildingHeight,
      elements,
      storeys,
      spaces,
      stats: {
        elementCount: elements.length,
        wallCount,
        doorCount,
        windowCount,
        stairCount,
        columnCount,
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // Private — STEP attribute helpers
  // ─────────────────────────────────────────────────────────

  private _splitAttributes(raw: string): string[] {
    const attrs: string[] = [];
    let depth = 0;
    let inStr = false;
    let start = 0;

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === "'" && raw[i - 1] !== "\\") inStr = !inStr;
      if (inStr) continue;
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
      else if (ch === "," && depth === 0) {
        attrs.push(raw.slice(start, i).trim());
        start = i + 1;
      }
    }
    attrs.push(raw.slice(start).trim());
    return attrs;
  }

  private _unquote(val: string | undefined): string {
    if (!val) return "";
    const v = val.trim();
    if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
    if (v === "$" || v === "*") return "";
    return v;
  }

  private _deref(val: string | undefined): string {
    if (!val) return "";
    return val.trim().replace(/^#/, "");
  }

  private _getRefList(val: string | undefined): string[] {
    if (!val) return [];
    const v = val.trim();
    const inner = v.startsWith("(") && v.endsWith(")") ? v.slice(1, -1) : v;
    return inner
      .split(",")
      .map((r) => r.trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  private _parsePropertySet(
    entity: RawEntity,
    entities: Map<string, RawEntity>
  ): PropertySetData {
    const name = this._unquote(entity.attributes[2]);
    const properties: Record<string, unknown> = {};

    const propRefs = this._getRefList(entity.attributes[4]);
    for (const pref of propRefs) {
      const propEntity = entities.get(pref);
      if (!propEntity) continue;

      if (
        propEntity.type === "IFCPROPERTYSINGLEVALUE" ||
        propEntity.type === "IFCPROPERTYBOUNDEDVALUE"
      ) {
        const propName = this._unquote(propEntity.attributes[0]);
        const rawVal = propEntity.attributes[2] ?? propEntity.attributes[1];
        properties[propName] = this._parseTypedValue(rawVal);
      } else if (propEntity.type === "IFCPROPERTYENUMERATEDVALUE") {
        const propName = this._unquote(propEntity.attributes[0]);
        const vals = this._getRefList(propEntity.attributes[2]).map((r) =>
          this._unquote(r)
        );
        properties[propName] = vals.length === 1 ? vals[0] : vals;
      }
    }
    return { name, properties };
  }

  private _parseQuantitySet(
    entity: RawEntity,
    entities: Map<string, RawEntity>
  ): QuantitySetData {
    const name = this._unquote(entity.attributes[2]);
    const quantities: Record<string, number> = {};

    const qtyRefs = this._getRefList(entity.attributes[4]);
    for (const qref of qtyRefs) {
      const qe = entities.get(qref);
      if (!qe) continue;
      if (
        qe.type.startsWith("IFCQUANTITY") ||
        qe.type === "IFCPHYSICALCOMPLEXQUANTITY"
      ) {
        const qName = this._unquote(qe.attributes[0]);
        const qVal = parseFloat(qe.attributes[3] ?? qe.attributes[2] ?? "0") || 0;
        quantities[qName] = qVal;
      }
    }
    return { name, quantities };
  }

  private _parseTypedValue(raw: string | undefined): unknown {
    if (!raw || raw === "$") return null;
    const v = raw.trim();
    // IFC typed value e.g. IFCBOOLEAN(.TRUE.) or IFCLABEL('text')
    const typedMatch = v.match(/^IFC\w+\((.+)\)$/);
    if (typedMatch) return this._parseTypedValue(typedMatch[1]);
    if (v === ".TRUE." || v === ".T.") return true;
    if (v === ".FALSE." || v === ".F.") return false;
    if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
    const num = parseFloat(v);
    if (!isNaN(num)) return num;
    return v;
  }

  private _tryExtractCoords(
    entity: RawEntity,
    entities: Map<string, RawEntity>
  ): { x: number; y: number; z: number } | undefined {
    try {
      // Attribute 5 is typically ObjectPlacement → IfcLocalPlacement
      const placementRef = this._deref(entity.attributes[5]);
      if (!placementRef) return undefined;
      const placement = entities.get(placementRef);
      if (!placement || placement.type !== "IFCLOCALPLACEMENT") return undefined;
      // Attribute 1 of IfcLocalPlacement is RelativePlacement → IfcAxis2Placement3D
      const axisRef = this._deref(placement.attributes[1]);
      if (!axisRef) return undefined;
      const axis = entities.get(axisRef);
      if (!axis) return undefined;
      // Attribute 0 of IfcAxis2Placement3D is Location → IfcCartesianPoint
      const ptRef = this._deref(axis.attributes[0]);
      if (!ptRef) return undefined;
      const pt = entities.get(ptRef);
      if (!pt || pt.type !== "IFCCARTESIANPOINT") return undefined;
      const coords = this._getRefList(pt.attributes[0]);
      const x = parseFloat(coords[0] ?? "0") || 0;
      const y = parseFloat(coords[1] ?? "0") || 0;
      const z = parseFloat(coords[2] ?? "0") || 0;
      return { x, y, z };
    } catch {
      return undefined;
    }
  }

  private _jsonVal(v: unknown): string {
    if (v === undefined || v === null) return "$";
    if (typeof v === "string") return `'${v}'`;
    return String(v);
  }
}

export const ifcParser = new IfcParser();
export default ifcParser;
