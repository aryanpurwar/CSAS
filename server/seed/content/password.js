import { strengthNotes } from '../../lib/passwordItems.js';

// Password-lab items are server-graded tasks, not a self-scored checklist. "Strongest
// password" items have their answer key computed with zxcvbn at seed time.
function strongest(prompt, options, difficulty = 'medium') {
  const { correctIndex, notes } = strengthNotes(options);
  return { module: 'password', category: 'strength', prompt, options, correctIndex, optionNotes: notes, difficulty, explanation: 'Strength is about how many guesses a password resists, estimated here with zxcvbn. Length and unpredictability beat added symbols. See the note under each option.' };
}
const q = (prompt, options, correctIndex, explanation, difficulty = 'medium') => ({ module: 'password', category: 'concept', prompt, options, correctIndex, explanation, difficulty });

export default [
  strongest('Which of these is the strongest password?', ['P@ssw0rd!', 'Correct)(!@#12', 'coffee-mug-telescope-harbor', 'Rahul@2003'], 'easy'),
  strongest('Which password would take the longest to crack?', ['Summer2026!', 'xkcd-horse-battery-staple-river', 'Qwerty!23', 'India@123'], 'medium'),
  strongest('Pick the strongest of these four:', ['Tr0ub4dour&3', 'January-Dolphin-Kettle-9521', 'Admin@12345', 'Pa$$w0rd2026'], 'hard'),
  q('Why is "MyName@Collegename2026" a weak password despite having symbols and numbers?', ['It is too long', 'It is built from personal details and common patterns an attacker can guess or find', 'It has no uppercase letters', 'Symbols make it weaker'], 1, 'Attackers seed guesses with names, your college, and years. Personal, patterned passwords fall quickly even if they look complex.', 'medium'),
  q('You reused one strong password across 6 sites and one site was breached. What is the risk?', ['None, the password is strong', 'Attackers try that email and password on other sites (credential stuffing), so all 6 are exposed', 'Only the breached site is affected', 'The password gets stronger'], 1, 'Credential stuffing uses leaked pairs across many sites. Strength does not help once the password is leaked; uniqueness does.', 'easy'),
  q('What is the best way to handle dozens of unique strong passwords?', ['Write them in a notebook on your desk', 'Reuse a few strong ones', 'Use a reputable password manager', 'Add 1, 2, 3 to the end of a base password'], 2, 'A password manager generates and stores a unique strong password per site, so you neither reuse nor memorise them.', 'easy'),
];
