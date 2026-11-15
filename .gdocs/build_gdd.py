"""Render the GDD template JSON files into Google Docs tabs.

Usage (run from .gdocs, where token.json lives):
    python build_gdd.py --doc <id> --only 00
    python build_gdd.py --doc <id>

Content files live in ./content/*.json and follow the schema in BRIEF.md.
"""
import argparse
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, r"C:\Users\ASUS\.claude\skills\gdocs-api\scripts")
from gdlib import service, batch as _gd_batch, PT, ulen  # noqa: E402


def batch(doc, reqs, chunk=300):
    """Retry connection resets as well as API throttling."""
    for attempt in range(6):
        try:
            return _gd_batch(doc, reqs, chunk=chunk)
        except (ConnectionResetError, TimeoutError, OSError):
            if attempt == 5:
                raise
            time.sleep(4 * (attempt + 1))

DOC_DEFAULT = "16vx3Ai3XW7bOYa2kJMxhspAVdl8qWVWRvd1SIAf9wXs"
TEXT_WIDTH = 504

PLAN = [
    ("00 Start Here", "00_start.json"),
    ("01 Vision & Strategy", "01_vision.json"),
    ("02 Gameplay & Systems", "02_gameplay.json"),
    ("03 Narrative & World", "03_narrative.json"),
    ("04 Experience: UX, UI, Audio", "04_experience.json"),
    ("05 Art & Content", "05_art.json"),
    ("06 Technical Design", "06_technical.json"),
    ("07 Production & Launch", "07_production.json"),
    ("08 Diagram Playbook", "08_diagrams.json"),
    ("09 Appendices", "09_appendix.json"),
]


def rgb(h):
    h = h.lstrip("#")
    return {"color": {"rgbColor": {
        "red": int(h[0:2], 16) / 255,
        "green": int(h[2:4], 16) / 255,
        "blue": int(h[4:6], 16) / 255,
    }}}


INK = rgb("101828")
NAVY = rgb("0B1F3A")
ACCENT = rgb("2F6FED")
TEAL = rgb("0E7C86")
AMBER = rgb("B45309")
MUTED = rgb("667085")
WHITE = rgb("FFFFFF")
BORDER = rgb("D0D5DD")
HAIRLINE = rgb("E4E7EC")
PALE = rgb("F9FAFB")
PALE_BLUE = rgb("F2F7FF")
PALE_BLUE_BORDER = rgb("D6E4FF")
EXAMPLE_INK = rgb("6B4A1F")

BODY_FONT = "Lato"
HEAD_FONT = "Montserrat"
MONO_FONT = "Roboto Mono"
QUOTE_FONT = "Playfair Display"


# ---------------------------------------------------------------- markup
def parse_markup(s):
    """Return (plain, [(start, end, style_dict)]) in UTF-16 units."""
    plain, spans = [], []
    bold = italic = ph = False
    bs = is_ = phs = 0
    pos = 0
    for tok in re.split(r"(\*\*|\*|\{\{|\}\})", s):
        if tok == "**":
            if bold:
                spans.append((bs, pos, {"bold": True}))
            else:
                bs = pos
            bold = not bold
        elif tok == "*":
            if italic:
                spans.append((is_, pos, {"italic": True}))
            else:
                is_ = pos
            italic = not italic
        elif tok == "{{":
            ph, phs = True, pos
        elif tok == "}}":
            if ph:
                spans.append((phs, pos, {"italic": True, "foregroundColor": ACCENT}))
            ph = False
        else:
            plain.append(tok)
            pos += ulen(tok)
    return "".join(plain), spans


def tstyle(font=BODY_FONT, size=10.5, bold=False, italic=False, color=INK):
    return {
        "weightedFontFamily": {"fontFamily": font, "weight": 700 if bold else 400},
        "fontSize": PT(size),
        "bold": bold,
        "italic": italic,
        "foregroundColor": color,
    }


def span_style(extra, base):
    s = dict(extra)
    if s.get("bold"):
        s["weightedFontFamily"] = {
            "fontFamily": base["weightedFontFamily"]["fontFamily"], "weight": 700}
    return s


def treq(start, end, style):
    return {"updateTextStyle": {
        "range": {"startIndex": start, "endIndex": end, "tabId": CURRENT_TAB},
        "textStyle": style, "fields": ",".join(style)}}


def preq(start, end, style):
    return {"updateParagraphStyle": {
        "range": {"startIndex": start, "endIndex": end, "tabId": CURRENT_TAB},
        "paragraphStyle": style, "fields": ",".join(style)}}


def pstyle(named="NORMAL_TEXT", align="START", line=135, above=0, below=6,
           indent=None, indent_end=None, keep=False, border=None):
    p = {"namedStyleType": named, "lineSpacing": line,
         "spaceAbove": PT(above), "spaceBelow": PT(below)}
    if align:
        p["alignment"] = align
    if indent is not None:
        p["indentStart"] = PT(indent)
    if indent_end is not None:
        p["indentEnd"] = PT(indent_end)
    if keep:
        p["keepWithNext"] = True
    if border:
        side, color, width, padding = border
        p["border" + side] = {"color": color, "width": PT(width),
                              "padding": PT(padding), "dashStyle": "SOLID"}
    return p


def inline_block(pos, markup, style, ps, bullet=None, prefix=""):
    """Insert one paragraph (markup must not include the trailing newline)."""
    plain, spans = parse_markup(markup)
    plain = prefix + plain
    n = ulen(plain)
    text = plain + "\n"
    total = n + 1
    reqs = [{"insertText": {"location": {"index": pos, "tabId": CURRENT_TAB}, "text": text}}]
    reqs.append(preq(pos, pos + total, ps))
    if bullet:
        reqs.append({"createParagraphBullets": {
            "range": {"startIndex": pos, "endIndex": pos + total, "tabId": CURRENT_TAB},
            "bulletPreset": bullet}})
    reqs.append(treq(pos, pos + n, style))
    for s, e, extra in spans:
        reqs.append(treq(pos + ulen(prefix) + s, pos + ulen(prefix) + e, span_style(extra, style)))
    return reqs, total


CURRENT_TAB = None


# ---------------------------------------------------------------- docs helpers
def fetch_all(doc):
    return service().documents().get(documentId=doc, includeTabsContent=True).execute()


def flatten(tabs):
    out = []
    for t in tabs:
        out.append(t)
        out.extend(flatten(t.get("childTabs", [])))
    return out


def find_tab(doc, title=None, tab_id=None):
    for t in flatten(fetch_all(doc).get("tabs", [])):
        if tab_id and t["tabProperties"]["tabId"] == tab_id:
            return t
        if title and t["tabProperties"]["title"] == title:
            return t
    raise LookupError(title or tab_id)


def body_end(tab):
    return tab["documentTab"]["body"]["content"][-1]["endIndex"]


def ensure_tabs(doc, plan):
    d = fetch_all(doc)
    tabs = flatten(d.get("tabs", []))
    first = tabs[0]
    if plan and plan[0][0].startswith("00") and first["tabProperties"]["title"] != plan[0][0]:
        batch(doc, [{"updateDocumentTabProperties": {
            "tabProperties": {"tabId": first["tabProperties"]["tabId"],
                              "title": plan[0][0], "index": 0},
            "fields": "title,index"}}])
    for i, (title, _) in enumerate(plan[1:], start=1):
        if any(t["tabProperties"]["title"] == title for t in flatten(fetch_all(doc).get("tabs", []))):
            continue
        batch(doc, [{"addDocumentTab": {"tabProperties": {"title": title, "index": i}}}])
        print("  + tab", title)


def clear_tab(doc, tab):
    content = tab["documentTab"]["body"]["content"]
    end = content[-1]["endIndex"]
    if end <= 2:
        return
    try:
        batch(doc, [{"deleteContentRange": {
            "range": {"startIndex": 1, "endIndex": end - 1, "tabId": tab["tabProperties"]["tabId"]}}}])
    except Exception as e:  # noqa: BLE001
        print("  ! could not clear tab:", e)


def apply_page_style(doc):
    batch(doc, [{"updateDocumentStyle": {
        "documentStyle": {
            "pageSize": {"width": PT(612), "height": PT(792)},
            "marginTop": PT(54), "marginBottom": PT(54),
            "marginLeft": PT(54), "marginRight": PT(54),
        },
        "fields": "pageSize,marginTop,marginBottom,marginLeft,marginRight"}}])


# ---------------------------------------------------------------- tables
def insert_table(doc, tab_id, pos, nrows, ncols):
    batch(doc, [{"insertTable": {"rows": nrows, "columns": ncols,
                                 "location": {"index": pos, "tabId": tab_id}}}])
    tab = find_tab(doc, tab_id=tab_id)
    for el in tab["documentTab"]["body"]["content"]:
        if "table" in el and el["startIndex"] == pos + 1:
            return tab, el
    # fallback: nearest table after pos
    tables = [e for e in tab["documentTab"]["body"]["content"] if "table" in e and e["startIndex"] > pos]
    return tab, tables[0]


def cell_lines_reqs(cell_start, lines):
    """lines = [(markup, text_style, para_style)] -> requests for one cell."""
    parsed = [parse_markup(x[0]) for x in lines]
    plain = "\n".join(p[0] for p in parsed)
    n = ulen(plain)
    if n == 0:
        return [], 0
    reqs = [{"insertText": {"location": {"index": cell_start, "tabId": CURRENT_TAB}, "text": plain}}]
    offset = 0
    for (markup, ts, ps), (txt, spans) in zip(lines, parsed):
        ln = ulen(txt)
        if ln:
            reqs.append(preq(cell_start + offset, cell_start + offset + ln + 1, ps))
        offset += ln + 1
    offset = 0
    for (markup, ts, ps), (txt, spans) in zip(lines, parsed):
        ln = ulen(txt)
        if ln:
            reqs.append(treq(cell_start + offset, cell_start + offset + ln, ts))
            for s, e, extra in spans:
                reqs.append(treq(cell_start + offset + s, cell_start + offset + e,
                                 span_style(extra, ts)))
        offset += ln + 1
    return reqs, n


def fill_grid(doc, tab_id, table_el, grid):
    """grid[ri][ci] = list of (markup, text_style, para_style). Fill bottom-up."""
    jobs = []
    for ri, row in enumerate(table_el["table"]["tableRows"]):
        for ci, cell in enumerate(row["tableCells"]):
            if ri < len(grid) and ci < len(grid[ri]) and grid[ri][ci]:
                jobs.append((cell["content"][0]["startIndex"], ri, ci, grid[ri][ci]))
    jobs.sort(key=lambda j: -j[0])
    reqs = []
    for start, ri, ci, lines in jobs:
        r, _ = cell_lines_reqs(start, lines)
        reqs += r
    if reqs:
        batch(doc, reqs, chunk=300)


def table_style_reqs(tab_id, table_el, widths, header_rows=1, header_bg=NAVY,
                     zebra=True, pad=5, border=BORDER, border_w=0.75,
                     pin=True):
    ts = table_el["startIndex"]
    t = table_el["table"]
    b = {"color": border, "width": PT(border_w), "dashStyle": "SOLID"}
    reqs = [{"updateTableCellStyle": {
        "tableRange": {"tableCellLocation": {
            "tableStartLocation": {"index": ts, "tabId": tab_id},
            "rowIndex": 0, "columnIndex": 0},
            "rowSpan": t["rows"], "columnSpan": t["columns"]},
        "tableCellStyle": {"paddingLeft": PT(pad), "paddingRight": PT(pad),
                           "paddingTop": PT(pad), "paddingBottom": PT(pad),
                           "contentAlignment": "MIDDLE",
                           "borderLeft": b, "borderRight": b,
                           "borderTop": b, "borderBottom": b},
        "fields": "paddingLeft,paddingRight,paddingTop,paddingBottom,contentAlignment,"
                  "borderLeft,borderRight,borderTop,borderBottom"}}]
    if header_rows:
        reqs.append({"updateTableCellStyle": {
            "tableRange": {"tableCellLocation": {
                "tableStartLocation": {"index": ts, "tabId": tab_id},
                "rowIndex": 0, "columnIndex": 0},
                "rowSpan": header_rows, "columnSpan": t["columns"]},
            "tableCellStyle": {"backgroundColor": header_bg}, "fields": "backgroundColor"}})
    if zebra:
        for r in range(header_rows + 1, t["rows"], 2):
            reqs.append({"updateTableCellStyle": {
                "tableRange": {"tableCellLocation": {
                    "tableStartLocation": {"index": ts, "tabId": tab_id},
                    "rowIndex": r, "columnIndex": 0},
                    "rowSpan": 1, "columnSpan": t["columns"]},
                "tableCellStyle": {"backgroundColor": PALE}, "fields": "backgroundColor"}})
    total = sum(widths) or 1
    widths = [w * TEXT_WIDTH / total for w in widths]
    for i, w in enumerate(widths):
        reqs.append({"updateTableColumnProperties": {
            "tableStartLocation": {"index": ts, "tabId": tab_id},
            "columnIndices": [i],
            "tableColumnProperties": {"widthType": "FIXED_WIDTH", "width": PT(w)},
            "fields": "widthType,width"}})
    if pin and header_rows:
        reqs.append({"pinTableHeaderRows": {
            "tableStartLocation": {"index": ts, "tabId": tab_id},
            "pinnedHeaderRowsCount": header_rows}})
    return reqs


# ---------------------------------------------------------------- block renderers
def render_table(doc, tab_id, pos, block):
    head = block.get("head", [])
    rows = block.get("rows", [])
    ncols = len(head) if head else (len(rows[0]) if rows else 1)
    nrows = len(rows) + (1 if head else 0)
    tab, tel = insert_table(doc, tab_id, pos, nrows, ncols)
    grid = []
    if head:
        grid.append([[(x, tstyle(HEAD_FONT, 8.5, bold=True, color=WHITE),
                       pstyle(line=100, below=0, align="CENTER"))] for x in head])
    for row in rows:
        grid.append([[(x, tstyle(BODY_FONT, 9, color=INK),
                       pstyle(line=100, below=0))] for x in row])
    fill_grid(doc, tab_id, tel, grid)
    batch(doc, table_style_reqs(tab_id, tel, block.get("w") or [TEXT_WIDTH / ncols] * ncols,
                                header_rows=1 if head else 0, zebra=bool(head)))
    tab = find_tab(doc, tab_id=tab_id)
    return body_end(tab) - 1


def render_fontdemo(doc, tab_id, pos, block):
    items = block["items"]
    tab, tel = insert_table(doc, tab_id, pos, len(items), 2)
    grid = []
    for it in items:
        left = [
            [it["label"].upper(), tstyle(MONO_FONT, 8, bold=True, color=MUTED),
             pstyle(line=110, below=2)],
            [it["desc"], tstyle(BODY_FONT, 8.5, color=MUTED),
             pstyle(line=115, below=0)],
        ]
        right = [[it["sample"],
                  tstyle(it.get("font", BODY_FONT), it.get("size", 10.5),
                         bold=it.get("bold", False), italic=it.get("italic", False),
                         color=globals().get(it.get("color", "INK"), INK)),
                  pstyle(line=125, below=0)]]
        grid.append([left, right])
    fill_grid(doc, tab_id, tel, grid)
    ts = tel["startIndex"]
    reqs = table_style_reqs(tab_id, tel, [190, 314], header_rows=0, zebra=False, pad=8)
    for r in range(len(items)):
        reqs.append({"updateTableCellStyle": {
            "tableRange": {"tableCellLocation": {
                "tableStartLocation": {"index": ts, "tabId": tab_id},
                "rowIndex": r, "columnIndex": 0},
                "rowSpan": 1, "columnSpan": 1},
            "tableCellStyle": {"backgroundColor": PALE}, "fields": "backgroundColor"}})
    batch(doc, reqs)
    tab = find_tab(doc, tab_id=tab_id)
    return body_end(tab) - 1


def render_callout(doc, tab_id, pos, block):
    tab, tel = insert_table(doc, tab_id, pos, 1, 1)
    cell_start = tel["table"]["tableRows"][0]["tableCells"][0]["content"][0]["startIndex"]
    label = block.get("label", "NOTE")
    text = block.get("x", "")
    lines = [
        [label, tstyle(HEAD_FONT, 8, bold=True, color=ACCENT),
         pstyle(line=100, below=2)],
        [text, tstyle(BODY_FONT, 9.5, color=INK),
         pstyle(line=125, below=0)],
    ]
    reqs, _ = cell_lines_reqs(cell_start, lines)
    batch(doc, reqs, chunk=300)
    ts = tel["startIndex"]
    b = {"color": PALE_BLUE_BORDER, "width": PT(0.5), "dashStyle": "SOLID"}
    batch(doc, [
        {"updateTableCellStyle": {
            "tableRange": {"tableCellLocation": {
                "tableStartLocation": {"index": ts, "tabId": tab_id},
                "rowIndex": 0, "columnIndex": 0},
                "rowSpan": 1, "columnSpan": 1},
            "tableCellStyle": {
                "backgroundColor": PALE_BLUE,
                "paddingLeft": PT(10), "paddingRight": PT(10),
                "paddingTop": PT(9), "paddingBottom": PT(9),
                "contentAlignment": "MIDDLE",
                "borderLeft": {"color": ACCENT, "width": PT(3), "dashStyle": "SOLID"},
                "borderTop": b, "borderBottom": b, "borderRight": b},
            "fields": "backgroundColor,paddingLeft,paddingRight,paddingTop,paddingBottom,"
                      "contentAlignment,borderLeft,borderTop,borderBottom,borderRight"}},
        {"updateTableColumnProperties": {
            "tableStartLocation": {"index": ts, "tabId": tab_id},
            "columnIndices": [0],
            "tableColumnProperties": {"widthType": "FIXED_WIDTH", "width": PT(TEXT_WIDTH)},
            "fields": "widthType,width"}},
    ])
    tab = find_tab(doc, tab_id=tab_id)
    return body_end(tab) - 1


def render_cover(doc, tab_id, pos, block):
    reqs = []
    p = pos
    def add(markup, style, ps, prefix=""):
        nonlocal p, reqs
        r, n = inline_block(p, markup, style, ps, prefix=prefix)
        reqs += r
        p += n
    add("GDD TEMPLATE  ·  VERSION 1.0", tstyle(MONO_FONT, 8.5, bold=True, color=ACCENT),
        pstyle(line=100, below=4))
    add(block["title"], tstyle(HEAD_FONT, 34, bold=True, color=NAVY),
        pstyle(line=100, below=6))
    add(block["subtitle"], tstyle(QUOTE_FONT, 16, italic=True, color=ACCENT),
        pstyle(line=110, below=8))
    add(block["tagline"], tstyle(BODY_FONT, 10.5, color=MUTED),
        pstyle(line=145, below=16))
    # rule
    add(" ", tstyle(BODY_FONT, 1, color=WHITE),
        pstyle(line=100, below=14, border=("Bottom", NAVY, 1.5, 0)))
    batch(doc, reqs)
    pos = p
    # meta table
    meta = block.get("meta", [])
    tab, tel = insert_table(doc, tab_id, pos, len(meta), 2)
    grid = []
    for label, value in meta:
        grid.append([
            [[label.upper(), tstyle(MONO_FONT, 8, bold=True, color=MUTED),
              pstyle(line=110, below=0)]],
            [[value, tstyle(BODY_FONT, 9.5, color=INK),
              pstyle(line=115, below=0)]],
        ])
    fill_grid(doc, tab_id, tel, grid)
    ts = tel["startIndex"]
    b = {"color": HAIRLINE, "width": PT(0.5), "dashStyle": "SOLID"}
    reqs = [{"updateTableCellStyle": {
        "tableRange": {"tableCellLocation": {
            "tableStartLocation": {"index": ts, "tabId": tab_id},
            "rowIndex": 0, "columnIndex": 0},
            "rowSpan": len(meta), "columnSpan": 2},
        "tableCellStyle": {"paddingLeft": PT(6), "paddingRight": PT(6),
                           "paddingTop": PT(5), "paddingBottom": PT(5),
                           "borderLeft": {"color": WHITE, "width": PT(0.5), "dashStyle": "SOLID"},
                           "borderRight": {"color": WHITE, "width": PT(0.5), "dashStyle": "SOLID"},
                           "borderTop": {"color": WHITE, "width": PT(0.5), "dashStyle": "SOLID"},
                           "borderBottom": b},
        "fields": "paddingLeft,paddingRight,paddingTop,paddingBottom,"
                  "borderLeft,borderRight,borderTop,borderBottom"}},
        {"updateTableColumnProperties": {
            "tableStartLocation": {"index": ts, "tabId": tab_id},
            "columnIndices": [0],
            "tableColumnProperties": {"widthType": "FIXED_WIDTH", "width": PT(118)},
            "fields": "widthType,width"}},
        {"updateTableColumnProperties": {
            "tableStartLocation": {"index": ts, "tabId": tab_id},
            "columnIndices": [1],
            "tableColumnProperties": {"widthType": "FIXED_WIDTH", "width": PT(386)},
            "fields": "widthType,width"}},
    ]
    batch(doc, reqs)
    tab = find_tab(doc, tab_id=tab_id)
    pos = body_end(tab) - 1
    batch(doc, [{"insertPageBreak": {"location": {"index": pos, "tabId": tab_id}}}])
    tab = find_tab(doc, tab_id=tab_id)
    return body_end(tab) - 1


def apply_named_styles(doc, tab_id):
    """Google Docs renders named-style text from the tab's named style, so make
    HEADING_1..3 match the template instead of the default 20pt regular."""
    specs = [
        ("HEADING_1", tstyle(HEAD_FONT, 24, bold=True, color=NAVY),
         pstyle(named="HEADING_1", line=105, above=0, below=6, keep=True)),
        ("HEADING_2", tstyle(HEAD_FONT, 14.5, bold=True, color=NAVY),
         pstyle(named="HEADING_2", line=110, above=20, below=5, keep=True)),
        ("HEADING_3", tstyle(HEAD_FONT, 11, bold=True, color=TEAL),
         pstyle(named="HEADING_3", line=115, above=12, below=2, keep=True)),
    ]
    reqs = []
    for ns, ts, ps in specs:
        reqs.append({"updateNamedStyle": {
            "namedStyle": {"namedStyleType": ns, "textStyle": ts, "paragraphStyle": ps},
            "fields": "namedStyleType,textStyle,paragraphStyle",
            "tabId": tab_id}})
    batch(doc, reqs)


def render_image(doc, tab_id, pos, key, caption):
    """Insert a rendered diagram from the manifest, centered, with a caption."""
    import json
    from pathlib import Path
    manifest = json.loads((Path(__file__).parent / "diagrams" / "manifest.json")
                          .read_text(encoding="utf-8"))
    m = manifest[key]
    w, h = m["w"], m["h"]
    width, height = 468.0, 468.0 * h / w
    if height > 600:
        height = 600.0
        width = 600.0 * w / h
    for attempt in range(4):
        try:
            batch(doc, [{"insertInlineImage": {
                "uri": m["url"],
                "location": {"index": pos, "tabId": tab_id},
                "objectSize": {"width": PT(width), "height": PT(height)}}}])
            break
        except Exception:  # noqa: BLE001
            if attempt == 3:
                raise
            time.sleep(3)
    batch(doc, [preq(pos, pos + 2, pstyle(align="CENTER", line=100, above=8, below=2))])
    plain, spans = parse_markup(caption)
    n = ulen(plain)
    batch(doc, [{"insertText": {"location": {"index": pos + 1, "tabId": tab_id},
                                "text": "\n" + plain + "\n"}}])
    batch(doc, [preq(pos + 2, pos + 2 + n + 1,
                     pstyle(align="CENTER", line=110, above=2, below=10)),
                treq(pos + 2, pos + 2 + n, tstyle(MONO_FONT, 7.5, color=MUTED))])
    tab = find_tab(doc, tab_id=tab_id)
    return body_end(tab) - 1


def render_example(doc, tab_id, pos, text):
    """Amber-bordered worked example, visually distinct from instructions."""
    prefix = "EXAMPLE  "
    plain, spans = parse_markup(text)
    full = prefix + plain
    n = ulen(full)
    reqs = [{"insertText": {"location": {"index": pos, "tabId": tab_id}, "text": full + "\n"}}]
    reqs.append(preq(pos, pos + n + 1, pstyle(line=130, above=2, below=10, indent=12,
                                              indent_end=9,
                                              border=("Left", AMBER, 2.5, 9))))
    reqs.append(treq(pos, pos + ulen(prefix),
                     tstyle(MONO_FONT, 7.5, bold=True, color=AMBER)))
    reqs.append(treq(pos + ulen(prefix), pos + n,
                     tstyle(BODY_FONT, 9.5, italic=True, color=rgb("6B4A1F"))))
    for s, e, extra in spans:
        reqs.append(treq(pos + ulen(prefix) + s, pos + ulen(prefix) + e,
                         span_style(extra, tstyle(BODY_FONT, 9.5, italic=True,
                                                  color=rgb("6B4A1F")))))
    batch(doc, reqs)
    return pos + n + 1


def render_code(doc, tab_id, pos, text):
    """Monospace diagram block in a light 1x1 table."""
    lines = text.split("\n")
    tab, tel = insert_table(doc, tab_id, pos, 1, 1)
    cell_start = tel["table"]["tableRows"][0]["tableCells"][0]["content"][0]["startIndex"]
    cell = [(line, tstyle(MONO_FONT, 8.2, color=INK), pstyle(line=100, below=0))
            for line in lines]
    grid = [[cell]]
    fill_grid(doc, tab_id, tel, grid)
    ts = tel["startIndex"]
    b = {"color": HAIRLINE, "width": PT(0.5), "dashStyle": "SOLID"}
    batch(doc, [
        {"updateTableCellStyle": {
            "tableRange": {"tableCellLocation": {
                "tableStartLocation": {"index": ts, "tabId": tab_id},
                "rowIndex": 0, "columnIndex": 0},
                "rowSpan": 1, "columnSpan": 1},
            "tableCellStyle": {"backgroundColor": PALE,
                               "paddingLeft": PT(9), "paddingRight": PT(9),
                               "paddingTop": PT(8), "paddingBottom": PT(8),
                               "borderLeft": b, "borderTop": b,
                               "borderBottom": b, "borderRight": b},
            "fields": "backgroundColor,paddingLeft,paddingRight,paddingTop,paddingBottom,"
                      "borderLeft,borderTop,borderBottom,borderRight"}},
        {"updateTableColumnProperties": {
            "tableStartLocation": {"index": ts, "tabId": tab_id},
            "columnIndices": [0],
            "tableColumnProperties": {"widthType": "FIXED_WIDTH", "width": PT(TEXT_WIDTH)},
            "fields": "widthType,width"}},
    ])
    tab = find_tab(doc, tab_id=tab_id)
    return body_end(tab) - 1


def is_code(text):
    return "\n" in text and (any(c in text for c in "→↓├└│┌┐┄") or ("[" in text and "]" in text))


def render_tab(doc, tab_id, blocks):
    global CURRENT_TAB
    CURRENT_TAB = tab_id
    apply_named_styles(doc, tab_id)
    tab = find_tab(doc, tab_id=tab_id)
    pos = body_end(tab) - 1
    pending = []

    def flush():
        nonlocal pending
        if pending:
            batch(doc, pending, chunk=300)
            pending = []

    for b in blocks:
        t = b["t"]
        if t in ("p", "fill") and is_code(b["x"]):
            flush()
            pos = render_code(doc, tab_id, pos, b["x"])
            continue
        if t in ("kicker", "h1", "purpose", "h2", "h3", "p", "fill", "ins",
                 "bul", "num", "check", "quote", "hr"):
            if t == "kicker":
                r, n = inline_block(pos, b["x"], tstyle(MONO_FONT, 8, bold=True, color=ACCENT),
                                    pstyle(line=100, below=2))
            elif t == "h1":
                r, n = inline_block(pos, b["x"], tstyle(HEAD_FONT, 24, bold=True, color=NAVY),
                                    pstyle(named="HEADING_1", line=105, below=6, keep=True,
                                           border=("Bottom", NAVY, 1.5, 4)))
            elif t == "purpose":
                r, n = inline_block(pos, b["x"], tstyle(BODY_FONT, 11.5, color=MUTED),
                                    pstyle(line=135, below=12))
            elif t == "h2":
                r, n = inline_block(pos, b["x"], tstyle(HEAD_FONT, 14.5, bold=True, color=NAVY),
                                    pstyle(named="HEADING_2", line=110, above=20, below=5,
                                           keep=True, border=("Bottom", HAIRLINE, 0.75, 2)))
            elif t == "h3":
                r, n = inline_block(pos, b["x"], tstyle(HEAD_FONT, 11, bold=True, color=TEAL),
                                    pstyle(named="HEADING_3", line=115, above=12, below=2, keep=True))
            elif t == "p":
                r, n = inline_block(pos, b["x"], tstyle(), pstyle())
            elif t == "fill":
                r, n = inline_block(pos, b["x"], tstyle(), pstyle())
            elif t == "ins":
                r, n = inline_block(pos, b["x"], tstyle(MONO_FONT, 8.5, color=MUTED),
                                    pstyle(line=125, above=2, below=10, indent=12,
                                           indent_end=8, border=("Left", ACCENT, 2, 8)),
                                    prefix="// ")
            elif t == "quote":
                r, n = inline_block(pos, b["x"], tstyle(QUOTE_FONT, 12.5, italic=True, color=NAVY),
                                    pstyle(line=135, above=8, below=12, indent=16,
                                           indent_end=10, border=("Left", AMBER, 2, 10)))
            elif t == "hr":
                r, n = inline_block(pos, " ", tstyle(BODY_FONT, 1, color=WHITE),
                                    pstyle(line=100, above=6, below=10,
                                           border=("Bottom", BORDER, 0.75, 0)))
            else:
                preset = {"bul": "BULLET_DISC_CIRCLE_SQUARE",
                          "num": "NUMBERED_DECIMAL_ALPHA_ROMAN",
                          "check": "BULLET_CHECKBOX"}[t]
                r, n = [], 0
                for item in b["x"]:
                    rr, nn = inline_block(pos + n, item, tstyle(), pstyle(line=130, below=3),
                                          bullet=preset)
                    r += rr
                    n += nn
            pending += r
            pos += n
        elif t == "image":
            flush()
            pos = render_image(doc, tab_id, pos, b["key"], b.get("caption", ""))
        elif t == "example":
            flush()
            pos = render_example(doc, tab_id, pos, b["x"])
        elif t == "table":
            flush()
            pos = render_table(doc, tab_id, pos, b)
        elif t == "fontdemo":
            flush()
            pos = render_fontdemo(doc, tab_id, pos, b)
        elif t == "callout":
            flush()
            pos = render_callout(doc, tab_id, pos, b)
        elif t == "cover":
            flush()
            pos = render_cover(doc, tab_id, pos, b)
        elif t == "pb":
            flush()
            batch(doc, [{"insertPageBreak": {"location": {"index": pos, "tabId": tab_id}}}])
            tab = find_tab(doc, tab_id=tab_id)
            pos = body_end(tab) - 1
        else:
            raise ValueError(f"unknown block type {t}")
    flush()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--doc", default=DOC_DEFAULT)
    ap.add_argument("--only", default=None, help="render only these tab numbers, e.g. 00 or 01,02")
    ap.add_argument("--skip-style", action="store_true")
    args = ap.parse_args()

    plan = PLAN
    if args.only:
        wanted = {x.strip() for x in args.only.split(",")}
        plan = [(t, f) for t, f in PLAN if t[:2] in wanted]
    content_dir = Path(__file__).parent / "content"

    missing = [f for _, f in plan if not (content_dir / f).exists()]
    if missing:
        print("missing content files:", missing)
        plan = [(t, f) for t, f in plan if f not in missing]

    if not args.skip_style:
        apply_page_style(args.doc)
    ensure_tabs(args.doc, PLAN)
    for title, fname in plan:
        path = content_dir / fname
        data = json.loads(path.read_text(encoding="utf-8"))
        tab = find_tab(args.doc, title=title)
        print(f"render {title} ({len(data['blocks'])} blocks)")
        clear_tab(args.doc, tab)
        render_tab(args.doc, tab["tabProperties"]["tabId"], data["blocks"])
    print("done")


if __name__ == "__main__":
    main()
