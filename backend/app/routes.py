from flask import Blueprint, request, jsonify
from . import db
from .models import Character, SavedDrawing, Word
from sqlalchemy import or_
import re

api = Blueprint('api', __name__)


@api.route('/health')
def health():
    return jsonify({'status': 'ok'})


@api.route('/characters')
def get_characters():
    page = request.args.get('page', 1, type=int)
    limit = min(request.args.get('limit', 50, type=int), 200)
    search = request.args.get('search', '').strip()
    hsk = request.args.get('hsk', type=int)

    query = Character.query

    if search:
        like = f'%{search}%'
        query = query.filter(
            or_(
                Character.pinyin.ilike(like),
                Character.english_translation.ilike(like),
                Character.simplified_char == search,
            )
        )

    if hsk:
        query = query.filter(Character.frequency_hsk_level == hsk)

    query = query.order_by(Character.alphabetical_sort_key)
    total = query.count()
    characters = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'characters': [c.to_dict() for c in characters],
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
    })


@api.route('/characters/all')
def get_all_characters():
    """Bulk endpoint for IndexedDB cache download."""
    characters = Character.query.order_by(Character.alphabetical_sort_key).all()
    return jsonify([c.to_dict() for c in characters])


@api.route('/character/<char_id>')
def get_character(char_id):
    char = Character.query.get_or_404(char_id)
    return jsonify(char.to_dict(include_strokes=True))


@api.route('/words')
def search_words():
    english = request.args.get('english', '').strip()
    pinyin = request.args.get('pinyin', '').strip()
    limit = min(request.args.get('limit', 30, type=int), 100)

    if not english and not pinyin:
        return jsonify([])

    query = Word.query

    if english:
        query = query.filter(Word.english.ilike(f'%{english}%'))

    if pinyin:
        # Normalize: strip tone numbers for broad match, keep them for exact
        norm = re.sub(r'[1-5]', '', pinyin).lower().replace(' ', '')
        # Also try matching with tone numbers intact
        query = query.filter(
            or_(
                Word.pinyin_normalized.ilike(f'%{norm}%'),
                Word.pinyin.ilike(f'%{pinyin}%'),
            )
        )

    # Sort: shorter words first (more common), then alphabetically
    results = query.order_by(Word.char_count, Word.pinyin).limit(limit).all()
    return jsonify([w.to_dict() for w in results])


@api.route('/save-drawing', methods=['POST'])
def save_drawing():
    data = request.get_json()
    if not data or 'characterId' not in data or 'drawingData' not in data:
        return jsonify({'error': 'Missing required fields'}), 400

    drawing = SavedDrawing(
        character_id=data['characterId'],
        drawing_data=data['drawingData'],
        strokes_count=data.get('strokesCount'),
        confidence_score=data.get('confidenceScore'),
    )
    db.session.add(drawing)
    db.session.commit()
    return jsonify(drawing.to_dict()), 201


@api.route('/saved-drawings')
def get_saved_drawings():
    drawings = SavedDrawing.query.order_by(SavedDrawing.created_at.desc()).all()
    return jsonify([d.to_dict() for d in drawings])


@api.route('/saved-drawings/<int:drawing_id>', methods=['DELETE'])
def delete_drawing(drawing_id):
    drawing = SavedDrawing.query.get_or_404(drawing_id)
    db.session.delete(drawing)
    db.session.commit()
    return jsonify({'deleted': drawing_id})
