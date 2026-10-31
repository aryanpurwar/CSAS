// A 1-5 confidence selector shown with every answer. Confidence is the key input for
// calibration analysis (Brier score, overconfidence) in the study.
const LABELS = ['Guessing', 'Unsure', 'Fairly sure', 'Confident', 'Certain'];

export default function Confidence({ value, onChange, disabled }) {
  return (
    <fieldset className="confidence" disabled={disabled}>
      <legend>How sure are you?</legend>
      <div className="confidence-row" role="radiogroup" aria-label="Confidence">
        {LABELS.map((label, i) => {
          const v = i + 1;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value === v}
              className={`confidence-btn ${value === v ? 'active' : ''}`}
              onClick={() => onChange(v)}
            >
              <span className="confidence-num">{v}</span>
              <span className="confidence-label">{label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
