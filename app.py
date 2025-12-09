from flask import Flask, render_template, request, jsonify
import os
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)

# === OpenRouter configuration ===
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "tngtech/deepseek-r1t-chimera:free"  # or any other valid OpenRouter model


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/team")
def team():
    return render_template("team.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/generate-plan", methods=["POST"])
def generate_plan():
    """
    Proxy endpoint: receives { model, messages, temperature, max_tokens }
    from the frontend and forwards to OpenRouter.
    Returns the raw OpenRouter JSON.
    """
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json(silent=True)
        print("Received request data:", data)

        if data is None:
            return jsonify({"error": "Invalid JSON body"}), 400

        messages = data.get("messages")
        if not messages:
            return jsonify({"error": "Missing 'messages' in request"}), 400

        if not OPENROUTER_API_KEY:
            return jsonify({
                "error": "Server configuration error",
                "message": "OPENROUTER_API_KEY is not set in environment (.env)."
            }), 500

        model = data.get("model") or DEFAULT_MODEL
        temperature = data.get("temperature", 0.7)
        max_tokens = data.get("max_tokens", 2000)

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        print("Calling OpenRouter with:", {
            "model": model,
            "message_count": len(messages),
            "first_message_preview": messages[0].get("content", "")[:80] + "..."
        })

        response = requests.post(
            OPENROUTER_API_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": request.host_url.rstrip("/"),
                "X-Title": "Quality Matrix Tool",
            },
            json=payload,
            timeout=45,
        )

        print("OpenRouter status:", response.status_code)

        # Normal success path
        if response.ok:
            try:
                return jsonify(response.json()), response.status_code
            except ValueError:
                # Very unlikely if ok, but just in case
                return jsonify({
                    "error": "OpenRouter returned non-JSON success response",
                    "raw": response.text
                }), 502

        # Error from OpenRouter: try to parse JSON, fall back to raw text
        try:
            error_data = response.json()
            print("OpenRouter error JSON:", error_data)
            error_message = (
                error_data.get("error", {}).get("message")
                or error_data.get("message")
                or str(error_data)
            )
        except ValueError:
            error_message = response.text
            print("OpenRouter non-JSON error:", error_message)

        return jsonify({
            "error": "OpenRouter API error",
            "message": error_message,
            "status_code": response.status_code
        }), response.status_code

    except requests.exceptions.RequestException as e:
        # Network / timeout errors, etc.
        print("RequestException while calling OpenRouter:", str(e))
        return jsonify({
            "error": "API request failed",
            "details": str(e)
        }), 502
    except Exception as e:
        # Any other unexpected Python error
        print("Unexpected server error:", str(e))
        return jsonify({
            "error": "Server error",
            "details": str(e)
        }), 500


if __name__ == "__main__":
    print("Starting Flask server with OpenRouter integration")
    if OPENROUTER_API_KEY:
        print("OPENROUTER_API_KEY loaded from environment.")
    else:
        print("WARNING: OPENROUTER_API_KEY is NOT set. Requests will fail.")

    # Optional quick connectivity test
    try:
        test_response = requests.get("https://openrouter.ai/api/v1", timeout=5)
        print("OpenRouter API reachable:", test_response.ok)
    except Exception as e:
        print("OpenRouter connectivity test failed:", str(e))

    app.run(debug=True, port=5000)
