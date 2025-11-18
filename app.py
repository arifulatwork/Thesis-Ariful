from flask import Flask, render_template, request, jsonify
import os
from dotenv import load_dotenv
import requests

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configuration - using hardcoded key for testing ONLY
app.config['OPENROUTER_API_KEY'] = "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"
app.config['OPENROUTER_API_URL'] = 'https://openrouter.ai/api/v1/chat/completions'


# Routes for pages
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/team')
def team():
    return render_template('team.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

# API endpoint for AI plan generation
@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    try:
        print("Received request data:", request.json)  # Debug logging
        
        # Validate the request
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        data = request.get_json()
        
        # Validate required fields
        if not data.get('messages'):
            return jsonify({'error': 'Missing messages in request'}), 400
            
        # Debug print before API call
        print("Making request to OpenRouter with data:", {
            'model': data.get('model'),
            'message_count': len(data.get('messages', [])),
            'first_message': data.get('messages', [{}])[0].get('content', '')[:50] + '...'
        })
        
        # Make the request to OpenRouter
        response = requests.post(
            app.config['OPENROUTER_API_URL'],
            headers={
            'Authorization': f'Bearer {app.config["OPENROUTER_API_KEY"]}',
            'Content-Type': 'application/json',
            'HTTP-Referer': request.host_url,
            'X-Title': 'Quality Matrix Tool'
            },
            json=data,
            timeout=30
        )
        
        # Debug print response
        print("OpenRouter response status:", response.status_code)
        print("Response headers:", response.headers)
        
        # Handle errors from OpenRouter
        if not response.ok:
            error_data = response.json()
            print("OpenRouter error details:", error_data)
            error_message = error_data.get('error', {}).get('message', 'Unknown error')
            return jsonify({
                'error': 'OpenRouter API error',
                'message': error_message,
                'status_code': response.status_code
            }), response.status_code
        
        return jsonify(response.json())
    
    except requests.exceptions.RequestException as e:
        print("Request exception:", str(e))
        return jsonify({
            'error': 'API request failed',
            'details': str(e)
        }), 500
    except Exception as e:
        print("Unexpected error:", str(e))
        return jsonify({
            'error': 'Server error',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    print("Starting Flask server with OpenRouter integration")
    print(f"Using API key: {app.config['OPENROUTER_API_KEY'][:10]}...")  # Log partial key
    
    # Quick test to verify API connectivity
    try:
        test_response = requests.get("https://openrouter.ai/api/v1", timeout=5)
        print("OpenRouter API reachable:", test_response.ok)
    except Exception as e:
        print("OpenRouter connectivity test failed:", str(e))
    
    app.run(debug=True, port=5000)