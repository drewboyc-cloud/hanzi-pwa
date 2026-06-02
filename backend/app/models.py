from . import db
from datetime import datetime

class Character(db.Model):
    __tablename__ = 'characters'

    id = db.Column(db.String(10), primary_key=True)  # Unicode codepoint e.g. "U+4E2D"
    simplified_char = db.Column(db.String(5), nullable=False, index=True)
    traditional_char = db.Column(db.String(5))
    pinyin = db.Column(db.String(100))
    english_translation = db.Column(db.Text)
    stroke_count = db.Column(db.Integer)
    stroke_order_json = db.Column(db.Text)  # JSON string of SVG paths from hanzi-writer-data
    radical = db.Column(db.String(10))
    frequency_hsk_level = db.Column(db.Integer)
    alphabetical_sort_key = db.Column(db.String(200), index=True)  # pinyin for A-Z sorting

    def to_dict(self, include_strokes=False):
        d = {
            'id': self.id,
            'char': self.simplified_char,
            'traditional': self.traditional_char,
            'pinyin': self.pinyin,
            'english': self.english_translation,
            'strokeCount': self.stroke_count,
            'radical': self.radical,
            'hskLevel': self.frequency_hsk_level,
        }
        if include_strokes:
            d['strokeOrderJson'] = self.stroke_order_json
        return d


class Word(db.Model):
    __tablename__ = 'words'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    simplified = db.Column(db.String(50), nullable=False, index=True)
    traditional = db.Column(db.String(50))
    pinyin = db.Column(db.String(200))
    english = db.Column(db.Text)
    char_count = db.Column(db.Integer)
    pinyin_normalized = db.Column(db.String(200), index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'simplified': self.simplified,
            'traditional': self.traditional,
            'pinyin': self.pinyin,
            'english': self.english,
            'charCount': self.char_count,
        }


class SavedDrawing(db.Model):
    __tablename__ = 'saved_drawings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    character_id = db.Column(db.String(10), db.ForeignKey('characters.id'), nullable=False)
    drawing_data = db.Column(db.Text, nullable=False)  # base64 canvas PNG
    strokes_count = db.Column(db.Integer)
    confidence_score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    character = db.relationship('Character', backref='saved_drawings')

    def to_dict(self):
        return {
            'id': self.id,
            'characterId': self.character_id,
            'char': self.character.simplified_char if self.character else None,
            'pinyin': self.character.pinyin if self.character else None,
            'drawingData': self.drawing_data,
            'strokesCount': self.strokes_count,
            'confidenceScore': self.confidence_score,
            'createdAt': self.created_at.isoformat(),
        }
