// 統計函式回歸測試：從 index.html 取出 `const S = (() => { … })();`，與 SciPy 1.x 算出的參考值比對。
// 執行：node --test "tests/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const S = (() => {');
const end = html.indexOf('\n})();', start);
assert.ok(start >= 0 && end > start, '找不到 index.html 裡的統計模組 S');
const S = vm.runInNewContext(html.slice(start, end + 6) + '\nS;');

// scipy.stats 參考值（norm/t/chi2/f 的 cdf、ppf，ttest_ind、f_oneway、skew/kurtosis 不偏估計）
const REF = {"pnorm": [[-3, 0.0013498980316300933], [-1.96, 0.024997895148220435], [0, 0.5], [1, 0.8413447460685429], [2.5, 0.9937903346742238]], "qnorm": [[0.001, -3.090232306167813], [0.025, -1.9599639845400545], [0.5, 0.0], [0.975, 1.959963984540054]], "pt": [[2.1, 5, 0.9551233750577006], [-1.5, 12, 0.07972875175660343], [0.3, 1, 0.5927735790777423], [4, 30, 0.9998090771819581]], "qt": [[0.975, 5, 2.5705818356363146], [0.975, 30, 2.0422724563012378], [0.95, 2, 2.9199855803537242]], "pchisq": [[3.84, 1, 0.9499564787512949], [11.07, 5, 0.9499903813775946], [0.5, 3, 0.08110858834532418]], "pf": [[4.26, 2, 9, 0.950089969618451], [2.5, 3, 40, 0.9267456479820502]], "welch": [4.058518232581933, 0.002022993376569931], "student": [4.157767490130169, 0.0011247819174346923], "anova": [23.187005004288835, 1.8746946337715473e-05], "skew": 0.062359350346532894, "kurt": -1.4380124309154447};
const close = (got, want, tol, label) => assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want}`);

test('常態分配 CDF 與反函數', () => {
  for (const [x, want] of REF.pnorm) close(S.pnorm(x), want, 5e-8, `pnorm(${x})`);
  for (const [p, want] of REF.qnorm) close(S.qnorm(p), want, 1e-7, `qnorm(${p})`);
});

test('t、卡方、F 分配', () => {
  for (const [x, v, want] of REF.pt) close(S.pt(x, v), want, 1e-10, `pt(${x},${v})`);
  for (const [p, v, want] of REF.qt) close(S.qt(p, v), want, 1e-9, `qt(${p},${v})`);
  for (const [x, k, want] of REF.pchisq) close(S.pchisq(x, k), want, 1e-10, `pchisq(${x},${k})`);
  for (const [x, d1, d2, want] of REF.pf) close(S.pf(x, d1, d2), want, 1e-10, `pf(${x},${d1},${d2})`);
});

const a = [5.1, 4.9, 6.2, 5.8, 6.0, 5.5, 5.3];
const b = [4.2, 4.8, 5.0, 4.4, 4.6, 5.1, 4.3, 4.9];
const c = [6.1, 6.3, 5.9, 6.6];

test('獨立樣本 t 檢定（Student 與 Welch）', () => {
  const welch = S.tTestInd(a, b, true);
  close(welch.t, REF.welch[0], 1e-9, 'welch t');
  close(welch.p, REF.welch[1], 1e-9, 'welch p');
  const student = S.tTestInd(a, b, false);
  close(student.t, REF.student[0], 1e-9, 'student t');
  close(student.p, REF.student[1], 1e-9, 'student p');
});

test('單因子 ANOVA', () => {
  const r = S.anova1([a, b, c]);
  close(r.F, REF.anova[0], 1e-9, 'F');
  close(r.p, REF.anova[1], 1e-9, 'p');
});

test('偏態與峰態（不偏估計）', () => {
  close(S.skewness(a), REF.skew, 1e-12, 'skewness');
  close(S.kurtosis(a), REF.kurt, 1e-12, 'kurtosis');
});

test('四分位數採 type 7（與 Excel QUARTILE.INC 相同）', () => {
  assert.equal(S.quantile([1, 2, 3, 4], 0.25), 1.75);
  assert.equal(S.median([3, 1, 2]), 2);
});
