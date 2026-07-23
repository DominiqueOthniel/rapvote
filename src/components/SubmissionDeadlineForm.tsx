import {
  formatDoualaClock,
  formatDoualaDateTime,
  toDoualaDateTimeLocalValue,
} from "@/lib/submission-deadline";
import { LATE_SUBMISSION_PENALTY } from "@/lib/scoring";
import { setPhaseSubmissionDeadline } from "@/lib/actions/submission-deadline";

type Props = {
  phaseId: string;
  phaseLabel: string;
  deadline: Date | null;
};

export function SubmissionDeadlineForm({
  phaseId,
  phaseLabel,
  deadline,
}: Props) {
  return (
    <form action={setPhaseSubmissionDeadline} className="deadline-form">
      <input type="hidden" name="phaseId" value={phaseId} />
      <div className="deadline-form-head">
        <h3 className="admin-form-title">Délai de soumission</h3>
        <p className="muted">
          {phaseLabel}. Heure Cameroun. Retard = -{LATE_SUBMISSION_PENALTY} sur
          la note de phase. Public débloqué à l&apos;heure dite. Jury : écoute
          possible 1 h avant.
        </p>
      </div>
      <label className="field">
        <span>Date et heure limite</span>
        <input
          type="datetime-local"
          name="deadline"
          defaultValue={
            deadline ? toDoualaDateTimeLocalValue(deadline) : undefined
          }
          required
        />
      </label>
      {deadline ? (
        <p className="muted deadline-current">
          Actuel : {formatDoualaDateTime(deadline)} (
          {formatDoualaClock(deadline)})
        </p>
      ) : (
        <p className="muted deadline-current">Aucun délai défini.</p>
      )}
      <div className="deadline-form-actions">
        <button className="btn-primary" type="submit">
          Enregistrer le délai
        </button>
        {deadline ? (
          <button
            className="btn-ghost"
            type="submit"
            name="clear"
            value="1"
            formNoValidate
          >
            Effacer
          </button>
        ) : null}
      </div>
    </form>
  );
}
