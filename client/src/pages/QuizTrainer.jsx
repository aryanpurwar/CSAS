import McqRunner from '../components/McqRunner';
import Icon from '../components/ui/Icon';

function Context(item) {
  return (
    <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
      <span className="pill pill-teal">{item.category?.replace('-', ' ')}</span>
      <span className="pill"><Icon name="clock" size={13} /> 30s per question</span>
    </div>
  );
}

export default function QuizTrainer() {
  return (
    <McqRunner
      title="Knowledge quiz"
      subtitle="Timed questions on current security guidance."
      startPath="/training/quiz/sessions"
      icon="quiz"
      renderContext={Context}
    />
  );
}
