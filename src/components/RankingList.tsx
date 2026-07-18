import Link from "next/link";
import { formatVotes } from "@/lib/money";

type RankItem = {
  rank: number;
  slug: string;
  stageName: string;
  city: string | null;
  votesCount: number;
};

export function RankingList({ items }: { items: RankItem[] }) {
  if (items.length === 0) {
    return <p className="muted">Aucun candidat en lice pour le moment.</p>;
  }

  return (
    <ol className="ranking-list">
      {items.map((item) => (
        <li key={item.slug} className={`rank-row rank-${item.rank}`}>
          <span className="rank-num">{item.rank}</span>
          <div className="rank-info">
            <Link href={`/candidats/${item.slug}`}>{item.stageName}</Link>
            {item.city ? <span className="muted">{item.city}</span> : null}
          </div>
          <div className="rank-votes">
            <strong>{formatVotes(item.votesCount)}</strong>
            <span>votes</span>
          </div>
          <Link className="btn-ghost" href={`/candidats/${item.slug}`}>
            Voter
          </Link>
        </li>
      ))}
    </ol>
  );
}
