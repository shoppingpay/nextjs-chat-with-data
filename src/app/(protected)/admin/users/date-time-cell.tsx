function formatDateTimeParts(value: string) {
  const date = new Date(value);

  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString(),
  };
}

export function DateTimeCell({ value }: { value: string }) {
  const parts = formatDateTimeParts(value);

  return (
    <span className="block leading-5">
      <span className="block whitespace-nowrap">{parts.date}</span>
      <span className="block whitespace-nowrap">{parts.time}</span>
    </span>
  );
}
