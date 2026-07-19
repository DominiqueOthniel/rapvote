"use client";

import { useMemo, useState } from "react";
import type { RubricDef } from "@/lib/judging";
import { computeRubricTotal, parseBreakdown } from "@/lib/judging";

type Props = {
  entryId: string;
  rubric: RubricDef;
  action: (formData: FormData) => Promise<void>;
  initialBreakdown?: unknown;
  initialTotal?: number;
};

export function JuryScoreForm({
  entryId,
  rubric,
  action,
  initialBreakdown,
  initialTotal,
}: Props) {
  const parsed = parseBreakdown(initialBreakdown);
  const [values, setValues] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const criterion of rubric.criteria) {
      next[criterion.key] = parsed[criterion.key] ?? 0;
    }
    return next;
  });

  const total = useMemo(
    () => computeRubricTotal(rubric, values),
    [rubric, values],
  );

  return (
    <form action={action} className="jury-rubric-form">
      <input type="hidden" name="entryId" value={entryId} />
      <div className="jury-criteria-grid">
        {rubric.criteria.map((criterion) => (
          <label key={criterion.key} className="field jury-criterion">
            <span>
              {criterion.label}
              <strong> /{criterion.max}</strong>
            </span>
            {criterion.hints?.length ? (
              <span className="field-hint">{criterion.hints.join(" · ")}</span>
            ) : null}
            <input
              className="jury-input"
              name={`c_${criterion.key}`}
              type="number"
              min={0}
              max={criterion.max}
              step={1}
              required
              value={values[criterion.key] ?? 0}
              onChange={(event) => {
                const next = Number(event.target.value);
                setValues((prev) => ({
                  ...prev,
                  [criterion.key]: Number.isNaN(next) ? 0 : next,
                }));
              }}
            />
          </label>
        ))}
      </div>
      <div className="jury-rubric-foot">
        <p className="jury-total">
          Total jury : <strong>{total}/100</strong>
          {typeof initialTotal === "number" && initialTotal > 0 ? (
            <span className="muted"> (enregistré : {initialTotal}/100)</span>
          ) : null}
        </p>
        <button className="btn-primary" type="submit">
          Enregistrer la note
        </button>
      </div>
    </form>
  );
}
