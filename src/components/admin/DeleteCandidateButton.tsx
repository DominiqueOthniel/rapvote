"use client";

type Props = {
  action: (formData: FormData) => Promise<void>;
  candidateId: string;
  stageName: string;
};

export function DeleteCandidateButton({ action, candidateId, stageName }: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const ok = window.confirm(
          `Supprimer ${stageName} ? Cette action est irréversible.`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="candidateId" value={candidateId} />
      <button className="btn-ghost btn-danger" type="submit">
        Supprimer
      </button>
    </form>
  );
}
