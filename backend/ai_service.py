import os
import json
from PIL import Image
import io
from huggingface_hub import InferenceClient
from datetime import datetime
from model_integration import get_dental_model
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Updated image analysis function using actual model
def analyze_dental_image(image_data):
    """
    Analyze dental image using AI model.
    Returns raw model predictions.
    """
    logger.info("Analyzing dental image...")
    
    try:
        # Get the model
        model = get_dental_model()
        
        # Make prediction
        result = model.predict(image_data)
        
        # Add timestamp
        result['analysis_timestamp'] = datetime.now().isoformat()
        result['model_used'] = 'MobileNet_Dental_v1' if result.get('model_loaded') else 'Mock_Fallback'
        
        logger.info(f"Analysis complete. Detected conditions: {len(result.get('detected_conditions', []))}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in dental image analysis: {e}", exc_info=True)
        # Fallback to mock data
        model = get_dental_model()
        return model.get_mock_predictions(error=str(e))

def get_ai_recommendations(analysis_results, habits_data):
    """
    Get comprehensive, disease-specific recommendations based on analysis and habits
    """
    try:
        detected_conditions = analysis_results.get('detected_conditions', [])
        analysis = analysis_results.get('analysis', {})
        
        # Extract user habits
        brushing_consistency = habits_data.get('brushing_consistency', 0)
        flossing_consistency = habits_data.get('flossing_consistency', 0)
        avg_brushing_time = habits_data.get('avg_brushing_time', 0)
        
        recommendations = []
        priority_actions = []
        lifestyle_tips = []
        
        # Disease-specific recommendations
        for condition in detected_conditions:
            name = condition['name']
            confidence = condition['confidence']
            severity = 'high' if confidence > 0.85 else 'moderate' if confidence > 0.75 else 'low'
            
            if name == 'Calculus':
                priority_actions.append(f"🦷 **Calculus (Tartar) Detected** ({confidence:.1%} confidence)")
                if severity == 'high':
                    recommendations.append("⚠️ **Immediate Action Required**: Schedule a professional dental cleaning within 1-2 weeks")
                    recommendations.append("Heavy tartar buildup can lead to gum disease and tooth decay if untreated")
                else:
                    recommendations.append("Schedule a professional dental cleaning within the next month")
                
                recommendations.append("**Home Care Tips:**")
                recommendations.append("- Brush at least twice daily, especially along the gumline")
                recommendations.append("- Use an electric toothbrush for more effective plaque removal")
                recommendations.append("- Floss daily to prevent tartar buildup between teeth")
                recommendations.append("- Use anti-tartar toothpaste with fluoride")
                recommendations.append("- Consider using an antimicrobial mouthwash")
                
                lifestyle_tips.append("Avoid sugary and acidic foods that promote tartar formation")
                lifestyle_tips.append("Reduce coffee and tea consumption to prevent further staining")
                
            elif name == 'Caries':
                priority_actions.append(f"🦷 **Dental Caries (Cavities) Detected** ({confidence:.1%} confidence)")
                if severity == 'high':
                    recommendations.append("🚨 **Urgent**: Schedule a dentist appointment IMMEDIATELY (within 2-3 days)")
                    recommendations.append("Untreated cavities can lead to severe pain, infection, and tooth loss")
                else:
                    recommendations.append("Schedule a dentist appointment within 1 week for cavity treatment")
                
                recommendations.append("**What to Expect**: Your dentist will likely recommend a filling or other restoration")
                recommendations.append("**Prevention Strategy:**")
                recommendations.append("- Brush with fluoride toothpaste after every meal")
                recommendations.append("- Floss daily to remove food particles between teeth")
                recommendations.append("- Avoid sticky and sugary foods (candy, soda, pastries)")
                recommendations.append("- Rinse with fluoride mouthwash daily")
                recommendations.append("- Consider dental sealants for cavity-prone teeth")
                
                lifestyle_tips.append("Limit snacking between meals to reduce acid attacks on teeth")
                lifestyle_tips.append("Drink water throughout the day to wash away food particles")
                lifestyle_tips.append("Chew sugar-free gum after meals to stimulate saliva production")
                
            elif name == 'Gingivitis':
                priority_actions.append(f"🦷 **Gingivitis (Gum Inflammation) Detected** ({confidence:.1%} confidence)")
                if severity == 'high':
                    recommendations.append("⚠️ Schedule a dental checkup within 2 weeks")
                    recommendations.append("Severe gingivitis can progress to periodontitis, causing permanent damage")
                else:
                    recommendations.append("Schedule a dental checkup within 3-4 weeks")
                
                recommendations.append("**Good News**: Gingivitis is reversible with proper oral hygiene!")
                recommendations.append("**Intensive Gum Care Routine:**")
                recommendations.append("- Brush teeth for 2 minutes, twice daily, focusing on the gumline")
                recommendations.append("- Floss at least once daily - this is CRITICAL for gum health")
                recommendations.append("- Use a soft-bristled toothbrush to avoid irritating gums")
                recommendations.append("- Rinse with antiseptic mouthwash (chlorhexidine or essential oils)")
                recommendations.append("- Massage gums gently with your toothbrush in circular motions")
                
                if flossing_consistency < 50:
                    recommendations.append("- **IMPORTANT**: Your flossing consistency is low - increase to daily!")
                
                lifestyle_tips.append("Avoid tobacco products - they significantly worsen gum disease")
                lifestyle_tips.append("Eat foods rich in Vitamin C (oranges, strawberries) to support gum health")
                lifestyle_tips.append("Stay hydrated to maintain healthy saliva flow")
                
            elif name == 'Mouth Ulcers':
                priority_actions.append(f"🦷 **Mouth Ulcers Detected** ({confidence:.1%} confidence)")
                recommendations.append("**Immediate Relief:**")
                recommendations.append("- Rinse with warm salt water (1 tsp salt in 1 cup water) 3-4 times daily")
                recommendations.append("- Apply over-the-counter oral gel (benzocaine or lidocaine)")
                recommendations.append("- Avoid spicy, acidic, or rough foods that irritate ulcers")
                recommendations.append("- Use a soft-bristled toothbrush to prevent further irritation")
                
                recommendations.append("**Healing Timeline**: Most ulcers heal within 1-2 weeks")
                recommendations.append("**When to See a Doctor:**")
                recommendations.append("- If ulcers persist beyond 3 weeks")
                recommendations.append("- If you have frequent recurring ulcers")
                recommendations.append("- If accompanied by fever or severe pain")
                
                lifestyle_tips.append("Reduce stress through relaxation techniques (meditation, exercise)")
                lifestyle_tips.append("Take vitamin B12 and folic acid supplements if deficient")
                lifestyle_tips.append("Avoid foods that trigger ulcers (nuts, chips, acidic fruits)")
                
            elif name == 'Tooth Discoloration':
                priority_actions.append(f"🦷 **Tooth Discoloration Detected** ({confidence:.1%} confidence)")
                recommendations.append("**Whitening Options:**")
                recommendations.append("- Professional in-office whitening (fastest, most effective)")
                recommendations.append("- Dentist-provided take-home whitening trays (gradual results)")
                recommendations.append("- Over-the-counter whitening strips (moderate results)")
                recommendations.append("- Whitening toothpaste for maintenance (mild results)")
                
                recommendations.append("**Prevention & Maintenance:**")
                recommendations.append("- Brush within 30 minutes of consuming staining foods/drinks")
                recommendations.append("- Use a straw when drinking coffee, tea, or dark sodas")
                recommendations.append("- Rinse mouth with water after consuming pigmented beverages")
                recommendations.append("- Get professional cleanings every 6 months")
                
                lifestyle_tips.append("Limit consumption of staining foods (coffee, tea, red wine, berries)")
                lifestyle_tips.append("Quit smoking/tobacco use - major cause of discoloration")
                lifestyle_tips.append("Maintain excellent oral hygiene to prevent surface stains")
        
        # No conditions detected - healthy teeth
        if not detected_conditions:
            health_score = analysis.get('overall_health_score', 8)
            healthy_score = analysis.get('healthy_score', 0)
            
            if healthy_score > 0.5:
                recommendations.append(f"✅ **Excellent News!** Your teeth appear healthy (Confidence: {healthy_score:.1%})")
            else:
                recommendations.append("✅ **Good News!** No significant dental issues detected")
            
            recommendations.append("**Maintenance Routine:**")
            recommendations.append("- Continue brushing twice daily for 2 minutes")
            recommendations.append("- Floss at least once daily")
            recommendations.append("- Use fluoride toothpaste")
            recommendations.append("- Schedule dental checkups every 6 months")
            
            # Personalized tips based on habits
            if brushing_consistency < 80:
                recommendations.append(f"- **Tip**: Your brushing consistency is {brushing_consistency:.0f}% - try to improve to 90%+")
            if flossing_consistency < 50:
                recommendations.append(f"- **Tip**: Your flossing consistency is {flossing_consistency:.0f}% - aim for at least 70%")
            if avg_brushing_time < 120:
                recommendations.append(f"- **Tip**: Average brushing time is {avg_brushing_time:.0f}s - aim for 120 seconds")
        
        # Add habit-based recommendations
        if brushing_consistency < 60:
            lifestyle_tips.append("Set reminders on your phone to brush twice daily")
        if flossing_consistency < 40:
            lifestyle_tips.append("Keep floss in visible locations (bathroom counter, bedside table)")
        
        # Format the final response
        result = "# AI Dental Analysis & Recommendations\n\n"
        
        # Priority actions
        if priority_actions:
            result += "## 🔴 Detected Conditions\n\n"
            for action in priority_actions:
                result += f"{action}\n\n"
        
        # Main recommendations
        if recommendations:
            result += "## 📋 Personalized Recommendations\n\n"
            for rec in recommendations:
                # Add extra line break after headers for markdown
                if rec.startswith('**') and rec.endswith(':**'):
                    result += f"\n{rec}\n\n"
                elif rec.startswith('-'):
                    result += f"{rec}\n"
                else:
                    result += f"{rec}\n\n"
            result += "\n"
        
        # Lifestyle tips
        if lifestyle_tips:
            result += "## 💡 Lifestyle & Prevention Tips\n\n"
            for tip in lifestyle_tips:
                result += f"- {tip}\n"
            result += "\n"
        
        # Health score
        health_score = analysis.get('overall_health_score', 8)
        result += f"## 📊 Overall Oral Health Score: {health_score}/10\n\n"
        
        # Urgency banner
        if analysis.get('requires_dentist_visit'):
            urgency = analysis.get('urgency', 'moderate')
            if urgency == 'high':
                result += "⚠️ **URGENT**: Schedule a dentist appointment IMMEDIATELY\n\n"
            elif urgency == 'moderate':
                result += "📅 **Recommended**: Schedule a dentist appointment soon\n\n"
        
        # Disclaimer
        result += "---\n"
        result += "*Note: This is AI-generated advice based on image analysis. Always consult a licensed dental professional for accurate diagnosis and treatment.*"
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        return "# AI Dental Recommendations\n\n1. Brush teeth twice daily for 2 minutes\n2. Floss regularly\n3. Use fluoride toothpaste\n4. Visit dentist for regular checkups\n\n*Note: Consult a dental professional for personalized advice.*"