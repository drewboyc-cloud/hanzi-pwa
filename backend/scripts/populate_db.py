"""
Reads CEDICT + hanzi-writer stroke data and populates SQLite DB.
Run from backend/ directory: python scripts/populate_db.py
"""
import os
import sys
import gzip
import json
import re
import sqlite3

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DB_PATH = os.path.join(DATA_DIR, 'hanzi.db')
CEDICT_GZ = os.path.join(DATA_DIR, 'cedict_raw.txt.gz')
HANZI_WRITER_DIR = os.path.join(DATA_DIR, 'hanzi_writer')

CREATE_CHARACTERS = """
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    simplified_char TEXT NOT NULL,
    traditional_char TEXT,
    pinyin TEXT,
    english_translation TEXT,
    stroke_count INTEGER,
    stroke_order_json TEXT,
    radical TEXT,
    frequency_hsk_level INTEGER,
    alphabetical_sort_key TEXT
);
"""

CREATE_SAVED_DRAWINGS = """
CREATE TABLE IF NOT EXISTS saved_drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL REFERENCES characters(id),
    drawing_data TEXT NOT NULL,
    strokes_count INTEGER,
    confidence_score REAL,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_char ON characters(simplified_char);",
    "CREATE INDEX IF NOT EXISTS idx_sort ON characters(alphabetical_sort_key);",
]

# Basic HSK 1-6 word lists (simplified, first char only used as indicator)
HSK_LEVELS = {}
HSK_LISTS = {
    1: ['的','一','是','在','不','了','有','和','人','这','中','大','为','上','个','国','我','以','要','他','时','来','用','们','生','到','作','地','于','出','就','分','对','成','会','可','主','发','年','动','同','工','也','能','下','过','子','说','产','种','面','而','方','后','多','定','行','学','法','所','民','得','经','十','三','之','进','着','等','部','度','家','电','力','里','如','水','化','高','自','二','理','起','小','物','现','实'],
    2: ['已','知','从','关','体','问','当','最','间','正','代','明','被','边','还','联','站','地','美','老','通','教','意','次','文','两','使','路','受','地','区'],
}
for level, chars in HSK_LISTS.items():
    for c in chars:
        if c not in HSK_LEVELS:
            HSK_LEVELS[c] = level


def char_to_id(char):
    return f'U+{ord(char):04X}'


def parse_cedict():
    print('Parsing CEDICT...')
    entries = {}
    with gzip.open(CEDICT_GZ, 'rt', encoding='utf-8') as f:
        for line in f:
            if line.startswith('#'):
                continue
            # Format: Traditional Simplified [pin1 yin1] /def1/def2/
            m = re.match(r'^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/$', line.strip())
            if not m:
                continue
            trad, simp, pinyin_raw, defs = m.groups()
            # Take first character entries for single chars
            if len(simp) == 1:
                cid = char_to_id(simp)
                if cid not in entries:
                    pinyin = pinyin_raw.strip()
                    english = '; '.join(defs.split('/'))
                    entries[cid] = {
                        'id': cid,
                        'simplified_char': simp,
                        'traditional_char': trad if trad != simp else None,
                        'pinyin': pinyin,
                        'english_translation': english,
                        'alphabetical_sort_key': pinyin.lower(),
                        'frequency_hsk_level': HSK_LEVELS.get(simp),
                    }
    print(f'  Parsed {len(entries)} single-character entries from CEDICT')
    return entries


def load_stroke_data(entries):
    print('Loading hanzi-writer stroke data...')
    count = 0
    # hanzi-writer-data stores files as <char>.json or in subdirs
    for root, dirs, files in os.walk(HANZI_WRITER_DIR):
        for fname in files:
            if not fname.endswith('.json'):
                continue
            char = fname[:-5]  # strip .json
            if len(char) != 1:
                continue
            cid = char_to_id(char)
            try:
                with open(os.path.join(root, fname), encoding='utf-8') as f:
                    data = json.load(f)
                stroke_count = len(data.get('strokes', []))
                stroke_json = json.dumps({'strokes': data.get('strokes', []), 'medians': data.get('medians', [])})
                if cid in entries:
                    entries[cid]['stroke_count'] = stroke_count
                    entries[cid]['stroke_order_json'] = stroke_json
                    count += 1
                else:
                    # Character exists in stroke data but not CEDICT — add minimal entry
                    entries[cid] = {
                        'id': cid,
                        'simplified_char': char,
                        'traditional_char': None,
                        'pinyin': None,
                        'english_translation': None,
                        'stroke_count': stroke_count,
                        'stroke_order_json': stroke_json,
                        'radical': None,
                        'frequency_hsk_level': None,
                        'alphabetical_sort_key': char,
                    }
            except Exception:
                pass
    print(f'  Added stroke data for {count} characters')


def write_db(entries):
    print(f'Writing {len(entries)} characters to {DB_PATH}...')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(CREATE_CHARACTERS)
    c.execute(CREATE_SAVED_DRAWINGS)
    for idx in CREATE_INDEXES:
        c.execute(idx)

    rows = []
    for e in entries.values():
        rows.append((
            e['id'],
            e['simplified_char'],
            e.get('traditional_char'),
            e.get('pinyin'),
            e.get('english_translation'),
            e.get('stroke_count'),
            e.get('stroke_order_json'),
            e.get('radical'),
            e.get('frequency_hsk_level'),
            e.get('alphabetical_sort_key') or e['simplified_char'],
        ))

    c.executemany(
        'INSERT OR REPLACE INTO characters VALUES (?,?,?,?,?,?,?,?,?,?)',
        rows
    )
    conn.commit()
    conn.close()
    print('Database populated successfully.')


if __name__ == '__main__':
    if not os.path.exists(CEDICT_GZ):
        print('ERROR: CEDICT not found. Run download_datasets.py first.')
        sys.exit(1)
    entries = parse_cedict()
    if os.path.isdir(HANZI_WRITER_DIR):
        load_stroke_data(entries)
    else:
        print('WARNING: hanzi-writer-data not found, skipping stroke data.')
    write_db(entries)
