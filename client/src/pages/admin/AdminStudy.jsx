import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner } from '../../components/ui/common';
import Icon from '../../components/ui/Icon';
import AdminTabs from './AdminTabs';
import './Admin.css';

const pct = (x) => (x == null || Number.isNaN(x) ? '—' : `${Math.round(x * 100)}%`);
const num = (x, d = 2) => (x == null || Number.isNaN(x) ? '—' : x.toFixed(d));

export default function AdminStudy() {
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/admin/study/summary').then((r) => setData(r.data)); }, []);

  const download = async (type) => {
    try {
      const res = await api.get(`/admin/study/export?type=${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `csas-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed.'); }
  };

  if (!data) return <Spinner />;
  const { groups, betweenGroups } = data;

  return (
    <div className="stack" style={{ gap: '1.3rem' }}>
      <PageHeader title="Study results" subtitle="Pre/post/retention comparison between the adaptive and control groups.">
        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={() => download('responses')}><Icon name="download" size={15} /> Responses CSV</button>
          <button className="btn btn-sm" onClick={() => download('assessments')}><Icon name="download" size={15} /> Assessments CSV</button>
          <button className="btn btn-sm" onClick={() => download('sus')}><Icon name="download" size={15} /> SUS CSV</button>
        </div>
      </PageHeader>
      <AdminTabs />

      <div className="banner banner-teal">
        <Icon name="book" size={18} />
        <span>Primary outcome: change in mean assessment score (0–1) from pre-test to post-test. These figures are indicative — confirm every statistic in R or SPSS using the CSV export before writing the report.</span>
      </div>

      <div className="group-compare">
        {['adaptive', 'control'].map((g) => {
          const grp = groups[g];
          const pre = grp.phases.pre.meanScore;
          const post = grp.phases.post.meanScore;
          const ret = grp.phases.retention.meanScore;
          return (
            <div key={g} className="card group-card">
              <h3>
                <span style={{ textTransform: 'capitalize' }}>{g} group</span>
                <span className="pill">{grp.enrolled} enrolled</span>
              </h3>
              <div className="stack" style={{ marginTop: '0.6rem' }}>
                <div className="metric-row"><span>Pre-test (n={pre.n})</span><span className="mono">{pct(pre.mean)} <span className="faint">±{num(pre.sd, 2)}</span></span></div>
                <div className="metric-row"><span>Post-test (n={post.n})</span><span className="mono">{pct(post.mean)} <span className="faint">±{num(post.sd, 2)}</span></span></div>
                <div className="metric-row"><span>Retention (n={ret.n})</span><span className="mono">{pct(ret.mean)} <span className="faint">±{num(ret.sd, 2)}</span></span></div>
                <div className="metric-row"><span>Mean gain (pre→post)</span><span className="mono">{grp.gain.mean != null ? (grp.gain.mean >= 0 ? '+' : '') + pct(grp.gain.mean) : '—'}</span></div>
                <div className="metric-row"><span>SUS usability (n={grp.sus.n})</span><span className="mono">{num(grp.sus.mean, 1)}</span></div>
                <div className="metric-row"><span>Campaign click rate</span><span className="mono">{pct(grp.campaigns.clickRate)}</span></div>
                <div className="metric-row"><span>Campaign report rate</span><span className="mono">{pct(grp.campaigns.reportRate)}</span></div>
              </div>
              {grp.withinGroupPrePost && (
                <p className="sig-note faint" style={{ marginTop: '0.6rem' }}>
                  Within-group pre→post: t({num(grp.withinGroupPrePost.df, 0)}) = {num(grp.withinGroupPrePost.t)}, p = {num(grp.withinGroupPrePost.p, 4)}, dz = {num(grp.withinGroupPrePost.dz)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: '1.2rem' }}>
        <h3>Between-group comparison (the research question)</h3>
        <p className="muted" style={{ fontSize: '0.88rem', marginTop: '0.3rem' }}>Does adaptive gamified training improve phishing-detection gain more than static training?</p>
        <div className="stack" style={{ marginTop: '0.8rem' }}>
          <SigRow label="Gain difference (pre→post)" test={betweenGroups.gain} />
          <SigRow label="Retained gain (pre→retention)" test={betweenGroups.retainedGain} />
        </div>
        {!betweenGroups.gain && <p className="faint" style={{ marginTop: '0.6rem' }}>Not enough completed pre/post pairs yet to run the comparison.</p>}
      </div>
    </div>
  );
}

function SigRow({ label, test }) {
  if (!test) return <div className="metric-row"><span>{label}</span><span className="faint">insufficient data</span></div>;
  const sig = test.p != null && test.p < 0.05;
  return (
    <div className="metric-row">
      <span>{label}</span>
      <span className="mono">
        t({num(test.df, 0)}) = {num(test.t)}, p = {num(test.p, 4)}, d = {num(test.d)}
        {sig && <span className="pill pill-success" style={{ marginLeft: '0.5rem' }}>p &lt; .05</span>}
      </span>
    </div>
  );
}
