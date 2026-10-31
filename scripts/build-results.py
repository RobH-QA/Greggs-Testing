"""Build docs/test-results.xlsx and docs/test-results.pdf from the committed HTML report in docs/html-report/.

Run from the repo root after refreshing docs/html-report/:  python scripts/build-results.py
Needs openpyxl, plus Node with the project's Playwright install for the PDF.
"""
from collections import Counter
import base64, io, json, re, subprocess, tempfile, zipfile, html
from pathlib import Path
from datetime import datetime, timezone
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / 'docs'

src = (DOCS / 'html-report' / 'index.html').read_text(encoding='utf-8')
b64 = re.search(r'id="playwrightReportBase64">data:application/zip;base64,([A-Za-z0-9+/=]+)', src).group(1)
z = zipfile.ZipFile(io.BytesIO(base64.b64decode(b64)))
report = json.loads(z.read('report.json'))

SPEC_ORDER = ['navigation', 'search', 'filters', 'data-consistency', 'product-detail', 'responsive', 'accessibility', 'performance']
PROJECTS = report['projectNames']

def status(t):
    if t['outcome'] == 'skipped':
        return 'Skipped'
    if any(a['type'] == 'fail' for a in t['annotations']):
        return 'Expected failure'
    return 'Passed' if t['outcome'] == 'expected' else t['outcome'].capitalize()

def notes(t):
    out = []
    for a in t['annotations']:
        d = a.get('description', '')
        if a['type'] == 'fail':
            out.append(f'Known defect: {d}')
        elif a['type'] == 'skip':
            out.append(f'Skipped: {d}')
        elif a['type'] == 'known a11y finding':
            out.append(f'Allowlisted: {d.split(" — ")[0]}')
        elif a['type'] == 'timing':
            out.append(d)
    return '; '.join(out)

rows = []
for f in report['files']:
    order = {}
    for t in f['tests']:
        order.setdefault(t['title'], len(order))
        spec = t['location']['file']
        rows.append({
            'spec': spec,
            'suite': ' › '.join(t['path']),
            'test': t['title'],
            'project': t['projectName'],
            'status': status(t),
            'duration': round(t['duration'] / 1000, 1),
            'notes': notes(t),
            'key': (SPEC_ORDER.index(spec.replace('.spec.ts', '')), t['location']['line'], order[t['title']], PROJECTS.index(t['projectName'])),
        })
rows.sort(key=lambda r: r['key'])

started = datetime.fromtimestamp(report['startTime'] / 1000, tz=timezone.utc)
run_info = [
    ('Run started (UTC)', started.strftime('%Y-%m-%d %H:%M')),
    ('Wall-clock duration (s)', round(report['duration'] / 1000, 1)),
    ('Target', 'https://www.greggs.com/menu (live site)'),
    ('Projects', 'desktop-chromium (1280×800), mobile-chromium (Pixel 5)'),
    ('Workers', report['metadata'].get('actualWorkers')),
    ('Source', 'docs/html-report/ (local run, list + html reporters)'),
]
STATUSES = ['Passed', 'Expected failure', 'Skipped']

# ---------- xlsx ----------
FONT = 'Arial'
bold = Font(name=FONT, bold=True)
head_font = Font(name=FONT, bold=True, color='FFFFFF')
head_fill = PatternFill('solid', fgColor='00558C')
body = Font(name=FONT)
thin = Side(style='thin', color='BFBFBF')
grid = Border(left=thin, right=thin, top=thin, bottom=thin)
status_fill = {'Passed': 'E2F0D9', 'Expected failure': 'FFF2CC', 'Skipped': 'EDEDED'}

wb = Workbook()
summary = wb.active
summary.title = 'Summary'
results = wb.create_sheet('Results')

cols = [('#', 5), ('Spec', 24), ('Suite', 34), ('Test', 70), ('Project', 18), ('Status', 17), ('Duration (s)', 12), ('Notes', 80)]
for i, (name, width) in enumerate(cols, 1):
    c = results.cell(1, i, name)
    c.font, c.fill, c.border = head_font, head_fill, grid
    results.column_dimensions[get_column_letter(i)].width = width
for n, r in enumerate(rows, 1):
    vals = [n, r['spec'], r['suite'], r['test'], r['project'], r['status'], r['duration'], r['notes']]
    for i, v in enumerate(vals, 1):
        c = results.cell(n + 1, i, v)
        c.font, c.border = body, grid
        c.alignment = Alignment(vertical='top', wrap_text=i in (4, 8))
    results.cell(n + 1, 6).fill = PatternFill('solid', fgColor=status_fill[r['status']])
    results.cell(n + 1, 7).number_format = '0.0'
last = len(rows) + 1
results.freeze_panes = 'A2'
results.auto_filter.ref = f'A1:H{last}'

summary.column_dimensions['A'].width = 26
for col in 'BCD':
    summary.column_dimensions[col].width = 20
summary['A1'] = 'Greggs Menu – Playwright test results'
summary['A1'].font = Font(name=FONT, bold=True, size=14)
row = 3
for label, value in run_info:
    summary.cell(row, 1, label).font = bold
    summary.cell(row, 2, value).font = body
    row += 1

row += 1
hdr = ['Status'] + PROJECTS + ['Total']
for i, h in enumerate(hdr, 1):
    c = summary.cell(row, i, h)
    c.font, c.fill, c.border = head_font, head_fill, grid
first_count = row + 1
for s in STATUSES:
    row += 1
    summary.cell(row, 1, s)
    for j, p in enumerate(PROJECTS, 2):
        summary.cell(row, j, f'=COUNTIFS(Results!$F$2:$F${last},$A{row},Results!$E$2:$E${last},{get_column_letter(j)}${first_count - 1})')
    summary.cell(row, len(hdr), f'=SUM(B{row}:{get_column_letter(len(hdr) - 1)}{row})')
row += 1
summary.cell(row, 1, 'Total')
for j in range(2, len(hdr) + 1):
    L = get_column_letter(j)
    summary.cell(row, j, f'=SUM({L}{first_count}:{L}{row - 1})')
for rr in range(first_count, row + 1):
    for j in range(1, len(hdr) + 1):
        c = summary.cell(rr, j)
        c.font, c.border = (bold if rr == row or j == 1 else body), grid
    summary.cell(rr, 1).fill = PatternFill('solid', fgColor=status_fill.get(summary.cell(rr, 1).value, 'FFFFFF'))
row += 2
summary.cell(row, 1, 'Expected failure = a known site defect asserted with test.fail(); the suite stays green while it exists. '
                     'Skipped = viewport-specific test not applicable to that project. '
                     'Counts are COUNTIFS formulas over the Results sheet.').font = Font(name=FONT, italic=True, color='595959')

row += 2
hdr2 = ['Spec', 'Tests', 'Total duration (s)']
for i, h in enumerate(hdr2, 1):
    c = summary.cell(row, i, h)
    c.font, c.fill, c.border = head_font, head_fill, grid
for spec in [s + '.spec.ts' for s in SPEC_ORDER]:
    row += 1
    summary.cell(row, 1, spec)
    summary.cell(row, 2, f'=COUNTIF(Results!$B$2:$B${last},A{row})')
    summary.cell(row, 3, f'=SUMIF(Results!$B$2:$B${last},A{row},Results!$G$2:$G${last})').number_format = '0.0'
    for j in range(1, 4):
        summary.cell(row, j).font, summary.cell(row, j).border = body, grid
summary.cell(row + 1, 1, 'Total duration is summed per test; tests ran in parallel, so it exceeds the wall-clock time.').font = Font(name=FONT, italic=True, color='595959')

wb.calculation.fullCalcOnLoad = True
wb.save(fr'{REPO}\docs\test-results.xlsx')

# ---------- html for pdf ----------
e = html.escape
counts = Counter((r['status'], r['project']) for r in rows)
sum_rows = ''.join(
    f'<tr class="{s.split()[0].lower()}"><td>{s}</td>' + ''.join(f'<td>{counts[(s, p)]}</td>' for p in PROJECTS) +
    f'<td>{sum(counts[(s, p)] for p in PROJECTS)}</td></tr>' for s in STATUSES)
sum_rows += '<tr class="total"><td>Total</td>' + ''.join(f'<td>{sum(counts[(s, p)] for s in STATUSES)}</td>' for p in PROJECTS) + f'<td>{len(rows)}</td></tr>'
info = ''.join(f'<tr><th>{e(k)}</th><td>{e(str(v))}</td></tr>' for k, v in run_info)
detail = ''
for spec in [s + '.spec.ts' for s in SPEC_ORDER]:
    detail += f'<h2>{spec}</h2><table class="res"><thead><tr><th>Test</th><th>Project</th><th>Status</th><th>Time (s)</th><th>Notes</th></tr></thead><tbody>'
    for r in rows:
        if r['spec'] == spec:
            detail += (f'<tr><td>{e(r["test"])}</td><td>{r["project"]}</td><td class="st {r["status"].split()[0].lower()}">{r["status"]}</td>'
                       f'<td class="num">{r["duration"]:.1f}</td><td class="notes">{e(r["notes"])}</td></tr>')
    detail += '</tbody></table>'

page = f'''<!doctype html><html><head><meta charset="utf-8"><style>
body {{ font-family: Arial, sans-serif; font-size: 9pt; color: #222; }}
h1 {{ font-size: 16pt; margin: 0 0 4pt; }} h2 {{ font-size: 11pt; margin: 14pt 0 4pt; color: #00558C; }}
table {{ border-collapse: collapse; }} th, td {{ border: 1px solid #ccc; padding: 3pt 5pt; text-align: left; vertical-align: top; }}
thead th, .sum th {{ background: #00558C; color: #fff; }} .info th {{ background: #f2f2f2; }}
.res {{ width: 100%; }} tr {{ page-break-inside: avoid; }} thead {{ display: table-header-group; }}
.num {{ text-align: right; white-space: nowrap; }} .notes {{ font-size: 8pt; color: #555; }}
.passed {{ background: #E2F0D9; }} .expected {{ background: #FFF2CC; }} .skipped {{ background: #EDEDED; }} .total td {{ font-weight: bold; }}
.legend {{ font-style: italic; color: #595959; margin: 6pt 0; }} .row {{ display: flex; gap: 18pt; align-items: flex-start; }}
</style></head><body>
<h1>Greggs Menu – Playwright test results</h1>
<p class="legend">{len(rows)} tests · {counts_total if (counts_total := sum(1 for r in rows if r["status"] == "Passed")) else 0} passed · {sum(1 for r in rows if r["status"] == "Expected failure")} expected failures (known defects) · {sum(1 for r in rows if r["status"] == "Skipped")} skipped · 0 unexpected failures</p>
<div class="row"><table class="info">{info}</table>
<table class="sum"><thead><tr><th>Status</th>{''.join(f'<th>{p}</th>' for p in PROJECTS)}<th>Total</th></tr></thead>{sum_rows}</table></div>
<p class="legend">Expected failure = a known site defect asserted with test.fail(); the suite stays green while it exists. Skipped = viewport-specific test not applicable to that project.</p>
{detail}
</body></html>'''
with tempfile.TemporaryDirectory() as tmp:
    page_path = Path(tmp) / 'results.html'
    page_path.write_text(page, encoding='utf-8')
    subprocess.run(['node', str(REPO / 'scripts' / 'html-to-pdf.js'), str(page_path), str(DOCS / 'test-results.pdf')], check=True)
