from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
from models import db, User, DailyHabit, AICheckup, Reminder
import ai_service
from email_service import init_mail
from scheduler import start_scheduler
from datetime import datetime, date, timedelta, time
import json
import base64
import traceback

load_dotenv()

# Configure Flask to serve static files from the 'static' folder
app = Flask(__name__, static_folder='static', static_url_path='')

# Configure CORS based on environment
if os.environ.get('FLASK_ENV') == 'production':
    # In production, allow requests from Railway frontend
    CORS(app, supports_credentials=True, origins=['*'])
else:
    # In development, only allow localhost
    CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://localhost:5173"])

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Email configuration
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

# Initialize database
db.init_app(app)

# Initialize email service
init_mail(app)

# Create uploads directory
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Helper decorator to check if user is logged in
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password') or not data.get('username'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    hashed_password = generate_password_hash(data['password'])
    
    user = User(
        username=data['username'],
        email=data['email'],
        password=hashed_password
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Store user info in session
    session['user_id'] = user.id
    session['username'] = user.username
    session['email'] = user.email
    
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }), 200

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    user_id = session['user_id']
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'created_at': user.created_at.isoformat()
    }), 200

@app.route('/api/habits/today', methods=['GET', 'POST'])
@login_required
def handle_today_habit():
    user_id = session['user_id']
    today = date.today()
    
    if request.method == 'GET':
        habit = DailyHabit.query.filter_by(user_id=user_id, date=today).first()
        
        if habit:
            return jsonify({
                'brushed': habit.brushed,
                'flossed': habit.flossed,
                'brushing_time': habit.brushing_time,
                'date': habit.date.isoformat()
            }), 200
        else:
            return jsonify({
                'brushed': False,
                'flossed': False,
                'brushing_time': None,
                'date': today.isoformat()
            }), 200
    
    elif request.method == 'POST':
        data = request.get_json()
        
        habit = DailyHabit.query.filter_by(user_id=user_id, date=today).first()
        
        if not habit:
            habit = DailyHabit(user_id=user_id, date=today)
        
        if 'brushed' in data:
            habit.brushed = data['brushed']
        if 'flossed' in data:
            habit.flossed = data['flossed']
        if 'brushing_time' in data:
            habit.brushing_time = data['brushing_time']
        
        db.session.add(habit)
        db.session.commit()
        
        return jsonify({'message': 'Habit updated successfully'}), 200

@app.route('/api/habits/streak', methods=['GET'])
@login_required
def get_streak():
    user_id = session['user_id']
    
    # Get all habits sorted by date
    habits = DailyHabit.query.filter_by(user_id=user_id)\
        .order_by(DailyHabit.date.desc()).all()
    
    current_streak = 0
    last_date = date.today()
    
    for habit in habits:
        if habit.brushed and habit.date == last_date:
            current_streak += 1
            last_date = habit.date - timedelta(days=1)
        else:
            break
    
    # Calculate consistency over last 30 days
    thirty_days_ago = date.today() - timedelta(days=30)
    recent_habits = [h for h in habits if h.date >= thirty_days_ago]
    
    # Calculate percentage based on 30 days, not number of records
    if recent_habits:
        brushed_days = len([h for h in recent_habits if h.brushed])
        flossed_days = len([h for h in recent_habits if h.flossed])
        # Divide by 30 to get true percentage (not by len(recent_habits))
        brushing_consistency = (brushed_days / 30) * 100
        flossing_consistency = (flossed_days / 30) * 100
    else:
        brushing_consistency = 0
        flossing_consistency = 0
    
    # Calculate average brushing time
    brushing_times = [h.brushing_time for h in habits if h.brushing_time]
    avg_brushing_time = sum(brushing_times) / len(brushing_times) if brushing_times else 0
    
    return jsonify({
        'current_streak': current_streak,
        'longest_streak': max([current_streak, 0]),
        'brushing_consistency': round(brushing_consistency, 1),
        'flossing_consistency': round(flossing_consistency, 1),
        'avg_brushing_time': round(avg_brushing_time, 1),
        'total_tracked_days': len(habits)
    }), 200

@app.route('/api/habits/history', methods=['GET'])
@login_required
def get_habits_history():
    user_id = session['user_id']
    days = request.args.get('days', default=7, type=int)
    
    start_date = date.today() - timedelta(days=days)
    habits = DailyHabit.query.filter(
        DailyHabit.user_id == user_id,
        DailyHabit.date >= start_date
    ).order_by(DailyHabit.date.desc()).all()
    
    history = []
    for habit in habits:
        history.append({
            'date': habit.date.isoformat(),
            'brushed': habit.brushed,
            'flossed': habit.flossed,
            'brushing_time': habit.brushing_time
        })
    
    return jsonify({'history': history}), 200

@app.route('/api/ai-checkup', methods=['POST'])
@login_required
def ai_checkup():
    user_id = session['user_id']
    
    if 'image' not in request.files and 'image' not in request.json:
        return jsonify({'error': 'No image provided'}), 400
    
    try:
        # Handle image upload
        if 'image' in request.files:
            image_file = request.files['image']
            filename = f"checkup_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            image_file.save(filepath)
            
            with open(filepath, 'rb') as f:
                image_data = f.read()
        else:
            image_data = base64.b64decode(request.json['image'].split(',')[1])
            filename = f"checkup_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            
            with open(filepath, 'wb') as f:
                f.write(image_data)
        
        # Analyze image with the model
        print("Analyzing image with AI model...")
        model_results = ai_service.analyze_dental_image(image_data)
        
        # Get user's habits
        habits = DailyHabit.query.filter_by(user_id=user_id)\
            .order_by(DailyHabit.date.desc())\
            .limit(30).all()
        
        # Calculate habits data
        habits_data = {
            'days_tracked': len(habits),
            'current_streak': 0,
            'brushing_consistency': len([h for h in habits if h.brushed]) / max(len(habits), 1) * 100,
            'flossing_consistency': len([h for h in habits if h.flossed]) / max(len(habits), 1) * 100,
            'avg_brushing_time': sum([h.brushing_time or 0 for h in habits]) / max(len([h for h in habits if h.brushing_time]), 1)
        }
        
        # Get recommendations
        ai_recommendations = ai_service.get_ai_recommendations(
            model_results,
            habits_data
        )
        
        # Prepare analysis response
        analysis_response = {
            'model_loaded': model_results.get('model_loaded', False),
            'detected_conditions': model_results.get('detected_conditions', []),
            'overall_health_score': model_results.get('analysis', {}).get('overall_health_score', 8.0),
            'plaque_detected': model_results.get('analysis', {}).get('plaque_detected', False),
            'gingivitis_risk': model_results.get('analysis', {}).get('gingivitis_risk', 'low'),
            'cavity_risk': model_results.get('analysis', {}).get('cavity_risk', 'low'),
            'staining_level': model_results.get('analysis', {}).get('staining_level', 'none'),
            'tooth_alignment': model_results.get('analysis', {}).get('tooth_alignment', 'normal'),
            'gum_health': model_results.get('analysis', {}).get('gum_health', 'good'),
            'bad_breath_risk': model_results.get('analysis', {}).get('bad_breath_risk', 'low'),
            'requires_dentist_visit': model_results.get('analysis', {}).get('requires_dentist_visit', False),
            'urgency': model_results.get('analysis', {}).get('urgency', 'none'),
            'analysis_timestamp': model_results.get('analysis_timestamp', datetime.now().isoformat()),
            'model_used': model_results.get('model_used', 'Unknown')
        }
        
        # Save to database
        checkup = AICheckup(
            user_id=user_id,
            image_path=filepath,
            analysis_result=json.dumps(analysis_response),
            ai_recommendations=ai_recommendations
        )
        
        db.session.add(checkup)
        db.session.commit()
        
        response_data = {
            'analysis': analysis_response,
            'recommendations': ai_recommendations,
            'checkup_id': checkup.id,
            'timestamp': checkup.created_at.isoformat()
        }
        
        print(f"Analysis complete. Conditions detected: {len(analysis_response['detected_conditions'])}")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Error in AI checkup: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai-checkup/history', methods=['GET'])
@login_required
def get_checkup_history():
    user_id = session['user_id']
    
    checkups = AICheckup.query.filter_by(user_id=user_id)\
        .order_by(AICheckup.created_at.desc())\
        .all()
    
    history = []
    for checkup in checkups:
        try:
            analysis = json.loads(checkup.analysis_result) if checkup.analysis_result else {}
        except:
            analysis = {}
        
        history.append({
            'id': checkup.id,
            'created_at': checkup.created_at.isoformat(),
            'analysis_summary': {
                'detected_conditions': analysis.get('detected_conditions', []),
                'overall_health_score': analysis.get('overall_health_score', 0),
                'plaque_detected': analysis.get('plaque_detected', False),
                'model_confidence': analysis.get('model_confidence', 0)
            },
            'has_recommendations': bool(checkup.ai_recommendations)
        })
    
    return jsonify({'history': history}), 200

@app.route('/api/ai-checkup/<int:checkup_id>', methods=['GET'])
@login_required
def get_checkup_details(checkup_id):
    user_id = session['user_id']
    
    checkup = AICheckup.query.filter_by(id=checkup_id, user_id=user_id).first()
    
    if not checkup:
        return jsonify({'error': 'Checkup not found'}), 404
    
    try:
        analysis = json.loads(checkup.analysis_result) if checkup.analysis_result else {}
    except:
        analysis = {}
    
    return jsonify({
        'id': checkup.id,
        'created_at': checkup.created_at.isoformat(),
        'analysis': analysis,
        'recommendations': checkup.ai_recommendations
    }), 200

@app.route('/api/model-health', methods=['GET'])
def model_health():
    """Check the health and status of the AI model"""
    try:
        from model_integration import get_dental_model
        
        model = get_dental_model()
        
        health_status = {
            'model_loaded': model.model_loaded,
            'class_names': model.class_names,
            'display_names': model.display_names,
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy' if model.model_loaded else 'using_mock_data',
            'message': 'Model is ready for predictions' if model.model_loaded else 'Using mock data - model file not found'
        }
        
        return jsonify(health_status), 200
        
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/api/test-model', methods=['GET'])
def test_model():
    """Test endpoint to check if the model is working"""
    try:
        import numpy as np
        from PIL import Image
        from model_integration import get_dental_model
        
        print("\n🔍 TESTING MODEL ENDPOINT")
        print("=" * 50)
        
        model = get_dental_model()
        
        # Create a dummy image for testing
        dummy_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        pil_image = Image.fromarray(dummy_image)
        
        print(f"\nModel loaded: {model.model_loaded}")
        print(f"Class names: {model.class_names}")
        print(f"Display names: {model.display_names}")
        
        # Test prediction with different thresholds
        print("\nTesting with 70% confidence threshold:")
        result_70 = model.predict(pil_image, confidence_threshold=0.7)
        
        print("\nTesting with 50% confidence threshold:")
        result_50 = model.predict(pil_image, confidence_threshold=0.5)
        
        response_data = {
            'model_info': {
                'loaded': model.model_loaded,
                'class_names': model.class_names,
                'display_names': model.display_names
            },
            'test_predictions_70_threshold': {
                'detected_conditions': result_70.get('detected_conditions', []),
                'model_confidence': result_70.get('model_confidence', 0),
                'overall_health_score': result_70.get('overall_health_score', 0),
                'confidence_scores': result_70.get('confidence_scores', {})
            },
            'test_predictions_50_threshold': {
                'detected_conditions': result_50.get('detected_conditions', []),
                'model_confidence': result_50.get('model_confidence', 0),
                'overall_health_score': result_50.get('overall_health_score', 0),
                'confidence_scores': result_50.get('confidence_scores', {})
            },
            'notes': 'This is a test with a random image. Real predictions will vary.'
        }
        
        print(f"\nResult with 70% threshold:")
        print(f"  Confidence: {result_70.get('model_confidence', 0):.2%}")
        print(f"  Detected conditions: {result_70.get('detected_conditions', [])}")
        print(f"  Health score: {result_70.get('overall_health_score', 0)}/10")
        
        print(f"\nResult with 50% threshold:")
        print(f"  Confidence: {result_50.get('model_confidence', 0):.2%}")
        print(f"  Detected conditions: {result_50.get('detected_conditions', [])}")
        print(f"  Health score: {result_50.get('overall_health_score', 0)}/10")
        
        print("\n✅ Test completed successfully")
        print("=" * 50)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"\n❌ ERROR in test model: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e), 'details': 'Check server logs'}), 500

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({
                'authenticated': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }), 200
    
    return jsonify({'authenticated': False}), 200

# Reminder API endpoints
@app.route('/api/reminders', methods=['GET', 'POST', 'DELETE'])
@login_required
def handle_reminders():
    user_id = session['user_id']
    
    if request.method == 'GET':
        reminders = Reminder.query.filter_by(user_id=user_id)\
            .order_by(Reminder.date.asc(), Reminder.time.asc()).all()
        
        result = []
        for reminder in reminders:
            result.append({
                'id': reminder.id,
                'type': reminder.type,
                'title': reminder.title,
                'description': reminder.description,
                'date': reminder.date.isoformat(),
                'time': reminder.time.isoformat() if reminder.time else None,
                'completed': reminder.completed,
                'frequency_days': reminder.frequency_days,
                'pill_count': reminder.pill_count,
                'created_at': reminder.created_at.isoformat()
            })
        
        return jsonify({'reminders': result}), 200
    
    elif request.method == 'POST':
        data = request.get_json()
        
        if not data or not data.get('type') or not data.get('title') or not data.get('date'):
            return jsonify({'error': 'Missing required fields (type, title, date)'}), 400
        
        if data['type'] not in ['appointment', 'medication']:
            return jsonify({'error': 'Invalid type. Must be "appointment" or "medication"'}), 400
        
        try:
            reminder_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        reminder_time = None
        if data.get('time'):
            try:
                reminder_time = datetime.strptime(data['time'], '%H:%M').time()
            except ValueError:
                return jsonify({'error': 'Invalid time format. Use HH:MM'}), 400
        
        reminder = Reminder(
            user_id=user_id,
            type=data['type'],
            title=data['title'],
            description=data.get('description', ''),
            date=reminder_date,
            time=reminder_time,
            frequency_days=data.get('frequency_days'),
            pill_count=data.get('pill_count')
        )
        
        db.session.add(reminder)
        
        # If this is a recurring medication, create additional reminder instances
        created_reminders = [reminder]
        if data['type'] == 'medication' and data.get('frequency_days') and data.get('pill_count'):
            try:
                frequency_days = int(data['frequency_days'])
                pill_count = int(data['pill_count'])
                if frequency_days > 0 and pill_count > 1:
                    # Create (pill_count - 1) additional reminders (first one already created)
                    current_date = reminder_date
                    for i in range(pill_count - 1):  # Create pill_count total reminders
                        current_date = current_date + timedelta(days=frequency_days)
                        recurring_reminder = Reminder(
                            user_id=user_id,
                            type=data['type'],
                            title=data['title'],
                            description=data.get('description', ''),
                            date=current_date,
                            time=reminder_time,
                            frequency_days=data.get('frequency_days'),
                            pill_count=data.get('pill_count')
                        )
                        db.session.add(recurring_reminder)
                        created_reminders.append(recurring_reminder)
            except (ValueError, TypeError):
                pass  # If values are invalid, just create the single reminder
        
        db.session.commit()
        
        return jsonify({
            'message': f'Reminder{"s" if len(created_reminders) > 1 else ""} created successfully',
            'count': len(created_reminders),
            'reminder': {
                'id': reminder.id,
                'type': reminder.type,
                'title': reminder.title,
                'description': reminder.description,
                'date': reminder.date.isoformat(),
                'time': reminder.time.isoformat() if reminder.time else None,
                'completed': reminder.completed,
                'frequency_days': reminder.frequency_days,
                'pill_count': reminder.pill_count
            }
        }), 201
    
    elif request.method == 'DELETE':
        # Clear all reminders for the user
        try:
            deleted_count = Reminder.query.filter_by(user_id=user_id).delete()
            db.session.commit()
            return jsonify({
                'message': f'{deleted_count} reminders deleted successfully',
                'count': deleted_count
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# Clear all reminders - using separate path to avoid route conflicts
@app.route('/api/clear-reminders', methods=['POST', 'DELETE'])
@login_required
def clear_all_reminders(user_id):
    try:
        deleted_count = Reminder.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        return jsonify({
            'message': f'{deleted_count} reminders deleted successfully',
            'count': deleted_count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders/<int:reminder_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def handle_reminder(reminder_id):
    user_id = session['user_id']
    reminder = Reminder.query.filter_by(id=reminder_id, user_id=user_id).first()
    
    if not reminder:
        return jsonify({'error': 'Reminder not found'}), 404
    
    if request.method == 'GET':
        return jsonify({
            'id': reminder.id,
            'type': reminder.type,
            'title': reminder.title,
            'description': reminder.description,
            'date': reminder.date.isoformat(),
            'time': reminder.time.isoformat() if reminder.time else None,
            'completed': reminder.completed,
            'frequency_days': reminder.frequency_days,
            'pill_count': reminder.pill_count,
            'created_at': reminder.created_at.isoformat()
        }), 200
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        if data.get('type') and data['type'] not in ['appointment', 'medication']:
            return jsonify({'error': 'Invalid type. Must be "appointment" or "medication"'}), 400
        
        if data.get('type'):
            reminder.type = data['type']
        if data.get('title'):
            reminder.title = data['title']
        if 'description' in data:
            reminder.description = data['description']
        if data.get('date'):
            try:
                reminder.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        if 'time' in data:
            if data['time']:
                try:
                    reminder.time = datetime.strptime(data['time'], '%H:%M').time()
                except ValueError:
                    return jsonify({'error': 'Invalid time format. Use HH:MM'}), 400
            else:
                reminder.time = None
        if 'completed' in data:
            reminder.completed = bool(data['completed'])
        if 'frequency_days' in data:
            reminder.frequency_days = data['frequency_days']
        if 'pill_count' in data:
            reminder.pill_count = data['pill_count']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Reminder updated successfully',
            'reminder': {
                'id': reminder.id,
                'type': reminder.type,
                'title': reminder.title,
                'description': reminder.description,
                'date': reminder.date.isoformat(),
                'time': reminder.time.isoformat() if reminder.time else None,
                'completed': reminder.completed,
                'frequency_days': reminder.frequency_days,
                'pill_count': reminder.pill_count
            }
        }), 200
    
    elif request.method == 'DELETE':
        db.session.delete(reminder)
        db.session.commit()
        return jsonify({'message': 'Reminder deleted successfully'}), 200

@app.route('/api/reminders/upcoming', methods=['GET'])
@login_required
def get_upcoming_reminders():
    user_id = session['user_id']
    days = request.args.get('days', default=7, type=int)
    
    end_date = date.today() + timedelta(days=days)
    
    reminders = Reminder.query.filter(
        Reminder.user_id == user_id,
        Reminder.completed == False,
        Reminder.date >= date.today(),
        Reminder.date <= end_date
    ).order_by(Reminder.date.asc(), Reminder.time.asc()).all()
    
    result = []
    for reminder in reminders:
        result.append({
            'id': reminder.id,
            'type': reminder.type,
            'title': reminder.title,
            'description': reminder.description,
            'date': reminder.date.isoformat(),
            'time': reminder.time.isoformat() if reminder.time else None,
            'completed': reminder.completed,
            'frequency_days': reminder.frequency_days,
            'pill_count': reminder.pill_count
        })
    
    return jsonify({'reminders': result}), 200

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'Backend is working!'}), 200

# Serve React frontend
@app.route('/')
def serve_root():
    """Serve the React app's index.html"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files or index.html for React Router"""
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        # For React Router - serve index.html for all non-existent routes
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    # Start email reminder scheduler
    try:
        start_scheduler(app)
        print("✓ Email reminder scheduler initialized")
    except Exception as e:
        print(f"Warning: Could not start scheduler: {str(e)}")
    
    # Get port from environment variable for Railway deployment
    port = int(os.environ.get('PORT', 5000))
    # Disable reloader to prevent Flask from reloading when Keras/TF files are accessed
    app.run(debug=False, host='0.0.0.0', port=port, use_reloader=False)