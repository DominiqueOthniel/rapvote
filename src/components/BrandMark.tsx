import Image from "next/image";

type Props = {
  label: string;
};

export function BrandMark({ label }: Props) {
  return (
    <div className="brand admin-brand">
      <Image
        src="/logo.png"
        alt="For The Culture"
        width={40}
        height={40}
        className="brand-logo"
      />
      <span className="brand-name">{label}</span>
    </div>
  );
}
