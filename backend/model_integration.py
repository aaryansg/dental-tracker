import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow warnings
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN custom operations

import warnings
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

import numpy as np
from PIL import Image
import io
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
import logging

# Suppress TensorFlow logging
tf.get_logger().setLevel('ERROR')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DentalModel:
    def __init__(self, model_path=os.path.join(os.path.dirname(__file__), 'model', 'model_vi.h5')):
        """
        Initialize the dental disease prediction model.
        """
        self.model_loaded = False
        # Model output classes - now includes Healthy as 6th class
        self.class_names = ['Calculus', 'Caries', 'Gingivitis', 'Mouth Ulcers', 'Tooth Discoloration', 'Healthy']
        
        if model_path is None:
            # Try multiple possible paths
            possible_paths = [
                os.path.join(os.path.dirname(__file__), 'model', 'model_vi.hs'),
                os.path.join(os.path.dirname(__file__), 'model', 'model_vi.keras'),
                os.path.join(os.path.dirname(__file__), 'model_vi.hs'),
                os.path.join(os.path.dirname(__file__), 'model_vi.keras'),
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    model_path = path
                    logger.info(f"Found model at: {path}")
                    break
        
        if model_path and os.path.exists(model_path):
            try:
                logger.info(f"Loading model from: {model_path}")
                # Suppress warnings during model loading
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    self.model = load_model(model_path, compile=False)
                self.model_loaded = True
                logger.info("✅ Model loaded successfully!")
                
            except Exception as e:
                logger.error(f"❌ Error loading model: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
                self.model_loaded = False
        else:
            logger.warning(f"Model file not found at: {model_path}")
            logger.warning("Using fallback mock predictions")
            self.model_loaded = False
    
    def preprocess_image(self, image_data):
        """
        Preprocess the image for the model.
        """
        try:
            if isinstance(image_data, bytes):
                image = Image.open(io.BytesIO(image_data))
            elif isinstance(image_data, Image.Image):
                image = image_data
            else:
                raise ValueError("image_data must be bytes or PIL Image")
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize to expected input size (224x224 for MobileNet)
            image = image.resize((224, 224))
            
            # Convert to array and normalize
            image_array = img_to_array(image)
            image_array = np.expand_dims(image_array, axis=0)
            
            # Normalize to [0, 1] range
            image_array = image_array / 255.0
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            raise
    
    def predict(self, image_data):
        """
        Make predictions on the dental image.
        Return raw model outputs.
        """
        logger.info("Starting prediction...")
        
        # If model isn't loaded, return mock data
        if not self.model_loaded:
            logger.warning("Model not loaded, using mock predictions")
            return self.get_mock_predictions()
        
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_data)
            
            # Make prediction
            predictions = self.model.predict(processed_image, verbose=0)[0]
            
            # Convert to list for JSON serialization
            predictions = predictions.astype('float32').tolist()
            
            logger.info(f"Raw predictions: {predictions}")
            
            # Create result with raw predictions
            result = {
                'model_loaded': True,
                'predictions': predictions,
                'class_names': self.class_names,
                'detected_conditions': [],
                'analysis': {}
            }
            
            # Get the highest prediction
            max_index = np.argmax(predictions)
            max_value = predictions[max_index]
            
            logger.info(f"Highest prediction: {self.class_names[max_index]} at {max_value:.3f}")
            
            # Detect conditions (excluding "Healthy" class)
            # "Healthy" is index 5, so we only check indices 0-4
            for i, pred in enumerate(predictions[:5]):  # Only first 5 classes (conditions)
                if pred > 0.75:  # Threshold for detection
                    result['detected_conditions'].append({
                        'name': self.class_names[i],
                        'confidence': float(pred)
                    })
                    logger.info(f"  ✓ Detected: {self.class_names[i]} ({pred:.1%} confidence)")
            
            # Check if "Healthy" class has high confidence
            healthy_score = predictions[5] if len(predictions) > 5 else 0
            
            # Add positive message if no conditions detected or if healthy score is high
            if len(result['detected_conditions']) == 0:
                if healthy_score > 0.5:
                    result['health_message'] = f'Your teeth appear clean and healthy! (Confidence: {healthy_score:.1%})'
                else:
                    result['health_message'] = 'Your teeth appear clean and healthy!'
            
            # Create analysis summary
            result['analysis'] = self._create_analysis_summary(result['detected_conditions'])
            result['analysis']['model_confidence'] = float(max_value)
            result['analysis']['healthy_score'] = float(healthy_score)
            
            return result
            
        except Exception as e:
            logger.error(f"Error during prediction: {e}", exc_info=True)
            return self.get_mock_predictions(error=str(e))
    
    def _create_analysis_summary(self, detected_conditions):
        """
        Create analysis summary from detected conditions.
        """
        analysis = {
            'plaque_detected': False,
            'gingivitis_risk': 'low',
            'cavity_risk': 'low',
            'staining_level': 'none',
            'overall_health_score': 8.0,
            'tooth_alignment': 'normal',
            'gum_health': 'good',
            'bad_breath_risk': 'low',
            'requires_dentist_visit': False,
            'urgency': 'none'
        }
        
        # Update based on detected conditions
        for condition in detected_conditions:
            name = condition['name']
            
            if name == 'Calculus':
                analysis['plaque_detected'] = True
                analysis['bad_breath_risk'] = 'high'
                analysis['requires_dentist_visit'] = True
                analysis['urgency'] = 'moderate'
                
            elif name == 'Caries':
                analysis['cavity_risk'] = 'high'
                analysis['requires_dentist_visit'] = True
                analysis['urgency'] = 'high'
                
            elif name == 'Gingivitis':
                analysis['gingivitis_risk'] = 'high'
                analysis['gum_health'] = 'poor'
                analysis['requires_dentist_visit'] = True
                analysis['urgency'] = 'moderate'
                
            elif name == 'Mouth Ulcers':
                analysis['gum_health'] = 'poor'
                analysis['requires_dentist_visit'] = True
                analysis['urgency'] = 'high'
                
            elif name == 'Tooth Discoloration':
                analysis['staining_level'] = 'moderate'
        
        # Calculate health score (simplified)
        health_score = 10.0
        for condition in detected_conditions:
            health_score -= condition['confidence'] * 2  # Subtract based on confidence
        
        analysis['overall_health_score'] = max(1.0, min(10.0, round(health_score, 1)))
        
        return analysis
    
    def get_mock_predictions(self, error=None):
        """
        Generate mock predictions for testing.
        """
        # Create some random predictions for testing (6 classes now)
        np.random.seed(42)
        mock_predictions = np.random.rand(6).tolist()
        
        # Normalize to make them look like probabilities
        total = sum(mock_predictions)
        mock_predictions = [p/total for p in mock_predictions]
        
        # Get detected conditions (above 0.2 threshold for mock, excluding Healthy)
        detected_conditions = []
        for i, pred in enumerate(mock_predictions[:5]):  # Only first 5 (not Healthy)
            if pred > 0.2:
                detected_conditions.append({
                    'name': self.class_names[i],
                    'confidence': float(pred)
                })
        
        result = {
            'model_loaded': False,
            'predictions': mock_predictions,
            'class_names': self.class_names,
            'detected_conditions': detected_conditions,
            'analysis': self._create_analysis_summary(detected_conditions)
        }
        
        result['analysis']['model_confidence'] = float(max(mock_predictions))
        
        if error:
            result['error'] = error
        
        return result

# Global model instance
_dental_model = None

def get_dental_model():
    """Singleton pattern to load model once"""
    global _dental_model
    if _dental_model is None:
        _dental_model = DentalModel()
    return _dental_model