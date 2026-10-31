export const CUE_LABELS = {
  'lookalike-domain': 'Lookalike domain',
  'sender-mismatch': 'Sender mismatch',
  'reply-to-mismatch': 'Reply-to mismatch',
  'auth-failure': 'Failed authentication',
  urgency: 'False urgency',
  threat: 'Threat / fear',
  'credential-request': 'Asks for credentials',
  'payment-request': 'Asks for payment',
  'otp-request': 'Asks for an OTP/PIN',
  'suspicious-link': 'Suspicious link',
  'link-text-mismatch': 'Link text ≠ destination',
  'generic-greeting': 'Generic greeting',
  'too-good-to-be-true': 'Too good to be true',
  'risky-attachment': 'Risky attachment',
  'unusual-request': 'Unusual request',
  'poor-language': 'Poor language',
};

export const cueLabel = (type) => CUE_LABELS[type] || type;
