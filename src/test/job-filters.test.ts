import { describe, expect, it } from "vitest";

import {
  ALL_FILTERS,
  filterJobs,
  jobLocations,
  jobRoles,
  jobTypes,
  jobs,
} from "@/lib/portal-data";

describe("Job filters", () => {
  it("returns every listing when nothing is narrowed", () => {
    expect(filterJobs({ location: ALL_FILTERS, role: ALL_FILTERS, type: ALL_FILTERS })).toHaveLength(jobs.length);
  });

  it("keeps only the listings in the chosen city", () => {
    const riyadh = filterJobs({ location: "الرياض", role: ALL_FILTERS, type: ALL_FILTERS });

    expect(riyadh.map(j => j.id)).toEqual([1, 4, 5, 8]);
    expect(riyadh.every(j => j.location === "الرياض")).toBe(true);
  });

  it("narrows further when role and employment type are combined", () => {
    expect(filterJobs({ location: "الرياض", role: "محلل مالي", type: "عن بُعد" }).map(j => j.id)).toEqual([8]);
    expect(filterJobs({ location: ALL_FILTERS, role: "محاسب", type: ALL_FILTERS }).map(j => j.id)).toEqual([1, 6]);
  });

  it("returns nothing when no listing matches all three filters", () => {
    expect(filterJobs({ location: "الدمام", role: "مدير محاسبة", type: "دوام جزئي" })).toEqual([]);
  });

  it("offers only filter values that exist in the listings", () => {
    const fields = { location: jobLocations, role: jobRoles, type: jobTypes } as const;
    const read = { location: (j: (typeof jobs)[number]) => j.location, role: (j: (typeof jobs)[number]) => j.role, type: (j: (typeof jobs)[number]) => j.employmentType } as const;

    for (const [key, options] of Object.entries(fields)) {
      expect(options[0]).toBe(ALL_FILTERS);
      for (const option of options.slice(1)) {
        expect(jobs.some(j => read[key as keyof typeof read](j) === option)).toBe(true);
      }
    }
  });
});
