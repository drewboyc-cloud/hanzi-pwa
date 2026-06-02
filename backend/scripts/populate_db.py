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

CREATE_WORDS = """
CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    simplified TEXT NOT NULL,
    traditional TEXT,
    pinyin TEXT,
    english TEXT,
    char_count INTEGER,
    pinyin_normalized TEXT
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
    "CREATE INDEX IF NOT EXISTS idx_words_simp ON words(simplified);",
    "CREATE INDEX IF NOT EXISTS idx_words_py ON words(pinyin_normalized);",
]

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


def normalize_pinyin(py):
    """Strip tone numbers for normalized search key."""
    return re.sub(r'[1-5]', '', py).lower().replace(' ', '')


def parse_cedict():
    print('Parsing CEDICT...')
    char_entries = {}
    word_entries = []

    with gzip.open(CEDICT_GZ, 'rt', encoding='utf-8') as f:
        for line in f:
            if line.startswith('#'):
                continue
            m = re.match(r'^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/$', line.strip())
            if not m:
                continue
            trad, simp, pinyin_raw, defs = m.groups()
            pinyin = pinyin_raw.strip()
            english = '; '.join(defs.split('/'))

            # All entries go into words table
            word_entries.append({
                'simplified': simp,
                'traditional': trad if trad != simp else None,
                'pinyin': pinyin,
                'english': english,
                'char_count': len(simp),
                'pinyin_normalized': normalize_pinyin(pinyin),
            })

            # Single-char entries also go into characters table
            if len(simp) == 1:
                cid = char_to_id(simp)
                if cid not in char_entries:
                    char_entries[cid] = {
                        'id': cid,
                        'simplified_char': simp,
                        'traditional_char': trad if trad != simp else None,
                        'pinyin': pinyin,
                        'english_translation': english,
                        'alphabetical_sort_key': pinyin.lower(),
                        'frequency_hsk_level': HSK_LEVELS.get(simp),
                    }

    print(f'  Parsed {len(char_entries)} single-character entries')
    print(f'  Parsed {len(word_entries)} total word entries')
    return char_entries, word_entries


def load_stroke_data(entries):
    print('Loading hanzi-writer stroke data...')
    count = 0
    for root, dirs, files in os.walk(HANZI_WRITER_DIR):
        for fname in files:
            if not fname.endswith('.json'):
                continue
            char = fname[:-5]
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


def write_db(char_entries, word_entries):
    print(f'Writing to {DB_PATH}...')
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(CREATE_CHARACTERS)
    c.execute(CREATE_WORDS)
    c.execute(CREATE_SAVED_DRAWINGS)
    for idx in CREATE_INDEXES:
        c.execute(idx)

    # Write characters
    char_rows = []
    for e in char_entries.values():
        char_rows.append((
            e['id'], e['simplified_char'], e.get('traditional_char'),
            e.get('pinyin'), e.get('english_translation'),
            e.get('stroke_count'), e.get('stroke_order_json'),
            e.get('radical'), e.get('frequency_hsk_level'),
            e.get('alphabetical_sort_key') or e['simplified_char'],
        ))
    c.executemany('INSERT OR REPLACE INTO characters VALUES (?,?,?,?,?,?,?,?,?,?)', char_rows)
    print(f'  Wrote {len(char_rows)} characters')

    # Write words in batches
    word_rows = [(
        w['simplified'], w['traditional'], w['pinyin'],
        w['english'], w['char_count'], w['pinyin_normalized']
    ) for w in word_entries]
    c.executemany('INSERT INTO words VALUES (NULL,?,?,?,?,?,?)', word_rows)
    print(f'  Wrote {len(word_rows)} words')

    conn.commit()
    conn.close()
    print('Database populated successfully.')


if __name__ == '__main__':
    if not os.path.exists(CEDICT_GZ):
        print('ERROR: CEDICT not found. Run download_datasets.py first.')
        sys.exit(1)
    char_entries, word_entries = parse_cedict()
    if os.path.isdir(HANZI_WRITER_DIR):
        load_stroke_data(char_entries)
    else:
        print('WARNING: hanzi-writer-data not found, skipping stroke data.')
    write_db(char_entries, word_entries)
