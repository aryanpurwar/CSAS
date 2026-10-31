// Small, dependency-free statistics used by the study dashboard.
// These are standard textbook formulas; results should be cross-checked in
// R/Python/SPSS for the final report (the CSV export exists for that).

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export function sd(xs) {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export function median(xs) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// log-gamma via Lanczos approximation
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const cj of c) ser += cj / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// Continued fraction for the regularized incomplete beta function (Numerical Recipes, betacf)
function betacf(a, b, x) {
  const MAXIT = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

export function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// Two-tailed p-value for a t statistic with df degrees of freedom.
export const tTestPValue = (t, df) => incompleteBeta(df / (df + t * t), df / 2, 0.5);

// Welch's t-test (unequal variances) for two independent groups.
export function welchTTest(a, b) {
  if (a.length < 2 || b.length < 2) return null;
  const va = sd(a) ** 2 / a.length;
  const vb = sd(b) ** 2 / b.length;
  const se = Math.sqrt(va + vb);
  if (!se) return null;
  const t = (mean(a) - mean(b)) / se;
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  const pooled = Math.sqrt(((a.length - 1) * sd(a) ** 2 + (b.length - 1) * sd(b) ** 2) / (a.length + b.length - 2));
  return { t, df, p: tTestPValue(t, df), d: pooled ? (mean(a) - mean(b)) / pooled : NaN };
}

// Paired t-test (e.g. the same participants before and after training).
export function pairedTTest(before, after) {
  if (before.length !== after.length || before.length < 2) return null;
  const diffs = after.map((x, i) => x - before[i]);
  const s = sd(diffs);
  if (!s) return null;
  const t = mean(diffs) / (s / Math.sqrt(diffs.length));
  const df = diffs.length - 1;
  return { t, df, p: tTestPValue(t, df), meanDiff: mean(diffs), dz: mean(diffs) / s };
}

// Brier score: mean squared error between stated confidence (0..1) and outcome (0/1).
// 0 is perfect calibration; always answering 50% gives 0.25.
export const brierScore = (pairs) => mean(pairs.map(([p, o]) => (p - o) ** 2));

// Overconfidence: mean stated confidence minus actual accuracy. Positive = overconfident.
export const overconfidence = (pairs) => mean(pairs.map(([p]) => p)) - mean(pairs.map(([, o]) => o));

// System Usability Scale (Brooke, 1996). answers: 10 integers in 1..5.
export function susScore(answers) {
  if (!Array.isArray(answers) || answers.length !== 10 || !answers.every((a) => Number.isInteger(a) && a >= 1 && a <= 5)) {
    throw new Error('SUS requires 10 integer answers between 1 and 5');
  }
  const sum = answers.reduce((acc, a, i) => acc + (i % 2 === 0 ? a - 1 : 5 - a), 0);
  return sum * 2.5;
}
