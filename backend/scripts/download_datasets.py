"""
Downloads CEDICT and hanzi-writer-data stroke order JSON.
Run from backend/ directory: python scripts/download_datasets.py
"""
import os
import requests
import zipfile
import json

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)

CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz'
HANZI_WRITER_URL = 'https://raw.githubusercontent.com/chanind/hanzi-writer-data/master/data/all.zip'


def download_cedict():
    out = os.path.join(DATA_DIR, 'cedict_raw.txt.gz')
    if os.path.exists(out):
        print('CEDICT already downloaded, skipping.')
        return
    print('Downloading CEDICT...')
    r = requests.get(CEDICT_URL, stream=True, timeout=60)
    r.raise_for_status()
    with open(out, 'wb') as f:
        for chunk in r.iter_content(8192):
            f.write(chunk)
    print(f'Saved CEDICT to {out}')


def download_hanzi_writer_data():
    out_dir = os.path.join(DATA_DIR, 'hanzi_writer')
    if os.path.isdir(out_dir) and len(os.listdir(out_dir)) > 100:
        print('Hanzi writer data already downloaded, skipping.')
        return
    os.makedirs(out_dir, exist_ok=True)
    print('Downloading hanzi-writer-data...')
    r = requests.get(HANZI_WRITER_URL, stream=True, timeout=120)
    r.raise_for_status()
    zip_path = os.path.join(DATA_DIR, 'hanzi_writer.zip')
    with open(zip_path, 'wb') as f:
        for chunk in r.iter_content(8192):
            f.write(chunk)
    print('Extracting...')
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(out_dir)
    os.remove(zip_path)
    print(f'Hanzi writer data extracted to {out_dir}')


if __name__ == '__main__':
    download_cedict()
    download_hanzi_writer_data()
    print('Done. Run populate_db.py next.')
