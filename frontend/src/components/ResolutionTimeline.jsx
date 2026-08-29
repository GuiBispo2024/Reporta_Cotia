const steps = [
  ["aberta", "Reportado"],
  ["em_andamento", "Em andamento"],
  ["resolvida", "Resolvido"]
];

export default function ResolutionTimeline({ status = "aberta" }) {
  const current = steps.findIndex(([value]) => value === status);
  return (
    <div className="rc-timeline" aria-label={`Status da resolução: ${status}`}>
      {steps.map(([value, label], index) => (
        <div className={`rc-step ${index <= current ? "active" : ""}`} key={value}>
          <span>{index + 1}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}
