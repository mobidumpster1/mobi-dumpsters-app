export function AddressLink({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  return (
    <a
      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "hover:underline"}
      title="Get directions"
    >
      {address}
    </a>
  );
}
