import { useEffect, useMemo, useState } from 'react';

// zxcvbn-ts is big, so it is loaded on first use. The server uses the same library
// for its password policy, so both sides agree on what counts as strong.
let enginePromise = null;
async function loadEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [{ zxcvbn, zxcvbnOptions }, common, en] = await Promise.all([
        import('@zxcvbn-ts/core'),
        import('@zxcvbn-ts/language-common'),
        import('@zxcvbn-ts/language-en'),
      ]);
      zxcvbnOptions.setOptions({
        dictionary: { ...common.dictionary, ...en.dictionary },
        graphs: common.adjacencyGraphs,
        translations: en.translations,
      });
      return zxcvbn;
    })();
  }
  return enginePromise;
}

export function useStrength(password, userInputs = []) {
  const [zxcvbn, setZxcvbn] = useState(null);
  // The scorer is itself a function, so it has to be wrapped: setState(fn) would make
  // React call it as an updater with the old state (null) and crash inside zxcvbn.
  useEffect(() => {
    let alive = true;
    loadEngine().then((fn) => { if (alive) setZxcvbn(() => fn); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const inputsKey = userInputs.filter(Boolean).join('|');

  return useMemo(() => {
    if (!password) return { score: 0, ready: Boolean(zxcvbn), label: '', crackTime: '', warning: '', suggestions: [] };
    if (!zxcvbn) return { score: 0, ready: false, label: 'Checking…', crackTime: '', warning: '', suggestions: [] };
    const r = zxcvbn(password, inputsKey ? inputsKey.split('|') : []);
    const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
    return {
      ready: true,
      score: r.score,
      label: labels[r.score],
      crackTime: r.crackTimesDisplay.offlineSlowHashing1e4PerSecond,
      warning: r.feedback.warning,
      suggestions: r.feedback.suggestions,
    };
  }, [password, zxcvbn, inputsKey]);
}

export const strengthColor = (score) => ['var(--danger)', 'var(--danger)', 'var(--amber)', 'var(--teal)', 'var(--success)'][score];
