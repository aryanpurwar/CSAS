import zxcvbn from 'zxcvbn';

// NIST SP 800-63B-aligned account password policy:
//  - length matters most (minimum 10 here, maximum 128 so passphrases fit)
//  - no composition rules (no "must contain a symbol")
//  - reject passwords that are common, guessable, or built from the user's own details
export function checkAccountPassword(password, userInputs = []) {
  if (typeof password !== 'string' || password.length < 10) return { ok: false, message: 'Use at least 10 characters. A few unrelated words works well.' };
  if (password.length > 128) return { ok: false, message: 'Use 128 characters or fewer.' };
  const result = zxcvbn(password, userInputs.filter(Boolean));
  if (result.score < 3) {
    const hint = result.feedback.warning || result.feedback.suggestions[0] || 'It is too easy to guess.';
    return { ok: false, message: `That password is too guessable. ${hint}`.trim(), score: result.score };
  }
  return { ok: true, score: result.score };
}
