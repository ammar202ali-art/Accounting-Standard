import { describe, expect, it } from "vitest";

import { applicationSteps, getJob, jobs, relatedJobs } from "@/lib/portal-data";

describe("Job detail content", () => {
  it("finds a job by its id and returns undefined for a missing one", () => {
    expect(getJob("1")?.title).toBe("محاسب مالي أول");
    expect(getJob("99")).toBeUndefined();
  });

  it("gives every job a full description, responsibilities, qualifications and application docs", () => {
    for (const job of jobs) {
      expect(job.description.length, `description ${job.id}`).toBeGreaterThanOrEqual(2);
      expect(job.responsibilities.length, `responsibilities ${job.id}`).toBeGreaterThanOrEqual(4);
      expect(job.qualifications.length, `qualifications ${job.id}`).toBeGreaterThanOrEqual(4);
      expect(job.applyDocs.length, `applyDocs ${job.id}`).toBeGreaterThanOrEqual(3);
      expect(job.applyEmail, `email ${job.id}`).toMatch(/^[^@]+@[^@]+\.[a-z]+$/);
    }
  });

  it("describes the application process in ordered steps shared by all jobs", () => {
    expect(applicationSteps).toHaveLength(4);
    expect(applicationSteps[1]).toContain("PDF");
    expect(applicationSteps[2]).toContain("بريد التقديم");
  });

  it("suggests related jobs that share the role or the city, without repeating the current one", () => {
    const job = getJob("4")!;
    const related = relatedJobs(job);
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(3);
    expect(related.some(r => r.id === job.id)).toBe(false);
    for (const r of related) expect(r.role === job.role || r.location === job.location).toBe(true);
  });
});
