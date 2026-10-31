import McqRunner from '../components/McqRunner';
import Icon from '../components/ui/Icon';

const CHANNEL_LABEL = { phone: 'Phone call', sms: 'SMS', chat: 'Chat', 'in-person': 'In person', whatsapp: 'WhatsApp', email: 'Email' };

function Context(item) {
  return (
    <div>
      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="pill pill-amber"><Icon name="phone" size={13} /> {CHANNEL_LABEL[item.channel] || item.channel}</span>
        {item.sender && <span className="pill mono">{item.sender}</span>}
      </div>
      {item.transcript?.length > 0 && (
        <div className="transcript">
          {item.transcript.map((t, i) => (
            <div key={i} className={`bubble ${t.from}`}>{t.text}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SocialTrainer() {
  return (
    <McqRunner
      title="Social engineering"
      subtitle="Read the situation and choose the safest response."
      startPath="/training/social/sessions"
      icon="phone"
      renderContext={Context}
    />
  );
}
