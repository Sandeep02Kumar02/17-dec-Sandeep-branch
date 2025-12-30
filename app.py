"""
Flask HTTP server module for hello_world application.

This module provides a complete HTTP server implementation with three endpoints:
root welcome message, health check, and industries API. It serves as both a
functional server skeleton and a Python documentation example.

The server is a Python 3 Flask rewrite of the original Node.js implementation,
maintaining identical functionality and API responses.

Author: hxu
Version: 1.0.0
License: MIT

Example:
    Run the server directly::

        $ python app.py

    Or with custom port::

        $ PORT=8080 python app.py

    Or using Flask CLI::

        $ flask run --port=3000
"""

import os
import csv
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from functools import wraps

from flask import Flask, jsonify, request, Response


# =============================================================================
# Flask Application Instance
# =============================================================================

app = Flask(__name__)
"""
Flask application instance.

The main Flask application configured with JSON response handling
and CORS support for all endpoints.

Type:
    Flask
"""


# =============================================================================
# Configuration Constants
# =============================================================================

PORT: int = int(os.environ.get('PORT', 3000))
"""
Default port number for the HTTP server.

Can be overridden by setting the PORT environment variable.

Type:
    int
Default:
    3000
Example:
    Override via environment variable::
    
        PORT=8080 python app.py
"""

HOST: str = os.environ.get('HOST', 'localhost')
"""
Default hostname for the HTTP server to bind to.

Can be overridden by setting the HOST environment variable.
Use '0.0.0.0' to listen on all network interfaces in production.

Type:
    str
Default:
    'localhost'
Example:
    Override via environment variable::
    
        HOST=0.0.0.0 python app.py
"""

INDUSTRY_CSV_PATH: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'industry.csv')
"""
Path to the industry.csv data file.

Resolved relative to the current module's directory for portability.

Type:
    str
"""


# =============================================================================
# Module State
# =============================================================================

server_start_time: Optional[datetime] = None
"""
Server start timestamp for uptime calculation.

Set when the server starts and used to calculate uptime in seconds.

Type:
    Optional[datetime]
"""


# =============================================================================
# Response Helper Functions
# =============================================================================

def send_json_response(data: Dict[str, Any], status_code: int = 200) -> Tuple[Response, int]:
    """
    Create a JSON response with appropriate headers.

    Sets Content-Type to application/json and enables CORS support.
    This is the centralized response handler ensuring consistent response format.

    Args:
        data (Dict[str, Any]): Response data to be JSON-serialized and sent.
        status_code (int, optional): HTTP status code. Defaults to 200.

    Returns:
        Tuple[Response, int]: Flask response tuple with JSON data and status code.

    Example:
        Send a successful response::

            return send_json_response({'success': True, 'message': 'Hello World'}, 200)

        Send an error response::

            return send_json_response({'success': False, 'error': 'Not Found'}, 404)
    """
    response = jsonify(data)
    # CORS header allows cross-origin requests from any domain
    # In production, you may want to restrict this to specific origins
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response, status_code


def add_cors_headers(response: Response) -> Response:
    """
    Add CORS headers to a response.

    Middleware function to ensure all responses include CORS headers.

    Args:
        response (Response): The Flask response object.

    Returns:
        Response: The response with CORS headers added.
    """
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


# =============================================================================
# Register after_request handler for CORS
# =============================================================================

@app.after_request
def after_request_handler(response: Response) -> Response:
    """
    After-request handler to add CORS headers to all responses.

    This ensures consistent CORS support across all endpoints.

    Args:
        response (Response): The Flask response object.

    Returns:
        Response: The response with CORS headers.
    """
    return add_cors_headers(response)


# =============================================================================
# Endpoint Handlers
# =============================================================================

@app.route('/', methods=['GET'])
def get_root() -> Tuple[Response, int]:
    """
    Handle requests to the root endpoint (GET /).

    Returns a welcome message with API version and available endpoints documentation.
    This serves as the API discovery endpoint for clients.

    Returns:
        Tuple[Response, int]: JSON response with welcome message and endpoints info.

    Example:
        Response format::

            {
                "success": true,
                "message": "Welcome to hello_world API",
                "version": "1.0.0",
                "endpoints": {
                    "GET /": "This welcome message",
                    "GET /health": "Health check endpoint",
                    "GET /api/industries": "List of industry categories"
                }
            }
    """
    # Construct the welcome response with API documentation
    # This helps API consumers discover available endpoints
    response_data = {
        'success': True,
        'message': 'Welcome to hello_world API',
        'version': '1.0.0',
        'endpoints': {
            'GET /': 'This welcome message',
            'GET /health': 'Health check endpoint',
            'GET /api/industries': 'List of industry categories'
        }
    }

    # Send successful response with 200 OK status
    return send_json_response(response_data, 200)


@app.route('/health', methods=['GET'])
def get_health() -> Tuple[Response, int]:
    """
    Handle requests to the health check endpoint (GET /health).

    Returns the current health status, timestamp, and server uptime.
    Used by load balancers and monitoring systems to verify server availability.

    Returns:
        Tuple[Response, int]: JSON response with health status and uptime.

    Example:
        Response format::

            {
                "success": true,
                "status": "ok",
                "timestamp": "2024-01-15T10:30:00.000000",
                "uptime": 3600
            }
    """
    # Calculate server uptime in seconds
    # If server hasn't started properly, uptime will be 0
    global server_start_time
    uptime = 0
    if server_start_time:
        uptime = int((datetime.now() - server_start_time).total_seconds())

    # Construct health check response
    # The 'ok' status indicates the server is healthy and accepting requests
    response_data = {
        'success': True,
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'uptime': uptime
    }

    # Send successful response with 200 OK status
    return send_json_response(response_data, 200)


@app.route('/api/industries', methods=['GET'])
def get_industries() -> Tuple[Response, int]:
    """
    Handle requests to the industries API endpoint (GET /api/industries).

    Reads and parses the industry.csv file, returning a list of industry categories.
    The CSV file contains a single column with industry names, one per line.

    Returns:
        Tuple[Response, int]: JSON response with industries list or error message.

    Raises:
        Implicitly handles file read errors by sending error response.

    Example:
        Success response format::

            {
                "success": true,
                "data": ["Accounting/Finance", "Advertising/Public Relations", ...],
                "count": 43
            }

        Error response format (when CSV file is not accessible)::

            {
                "success": false,
                "error": "Failed to load industries data",
                "details": "No such file or directory"
            }
    """
    try:
        # Read the industry.csv file
        # Parse CSV to extract industry names
        industries: List[str] = []
        
        with open(INDUSTRY_CSV_PATH, 'r', encoding='utf-8') as csvfile:
            # Use csv.reader to properly parse the CSV
            reader = csv.reader(csvfile)
            
            # Skip the header row ('Industry')
            next(reader, None)
            
            # Extract each industry name, filtering empty lines
            for row in reader:
                if row and row[0].strip():
                    industries.append(row[0].strip())

        # Construct the success response with industry data
        response_data = {
            'success': True,
            'data': industries,
            'count': len(industries)
        }

        # Send successful response with 200 OK status
        return send_json_response(response_data, 200)

    except FileNotFoundError as e:
        # Handle file not found error
        print(f'Error reading industry.csv: {str(e)}')
        return send_json_response({
            'success': False,
            'error': 'Failed to load industries data',
            'details': str(e)
        }, 500)
    except Exception as e:
        # Handle other file read errors (e.g., permission denied)
        print(f'Error reading industry.csv: {str(e)}')
        return send_json_response({
            'success': False,
            'error': 'Failed to load industries data',
            'details': str(e)
        }, 500)


# =============================================================================
# Error Handlers
# =============================================================================

@app.errorhandler(404)
def handle_not_found(error) -> Tuple[Response, int]:
    """
    Handle 404 Not Found responses for unmatched routes.

    Provides helpful information about available endpoints.

    Args:
        error: The Flask error object.

    Returns:
        Tuple[Response, int]: JSON response with error details and available endpoints.

    Example:
        Response format::

            {
                "success": false,
                "error": "Not Found",
                "message": "The requested endpoint does not exist",
                "requestedPath": "/unknown",
                "availableEndpoints": ["GET /", "GET /health", "GET /api/industries"]
            }
    """
    # Construct a helpful 404 response that guides users to valid endpoints
    response_data = {
        'success': False,
        'error': 'Not Found',
        'message': 'The requested endpoint does not exist',
        'requestedPath': request.path,
        'availableEndpoints': [
            'GET /',
            'GET /health',
            'GET /api/industries'
        ]
    }

    # Send 404 Not Found response
    return send_json_response(response_data, 404)


@app.errorhandler(405)
def handle_method_not_allowed(error) -> Tuple[Response, int]:
    """
    Handle 405 Method Not Allowed responses for unsupported HTTP methods.

    Informs the client which methods are supported for the given endpoint.

    Args:
        error: The Flask error object.

    Returns:
        Tuple[Response, int]: JSON response with error details and allowed methods.

    Example:
        Response format for POST request to any endpoint::

            {
                "success": false,
                "error": "Method Not Allowed",
                "message": "POST method is not supported",
                "allowedMethods": ["GET"]
            }
    """
    # Construct response explaining the method restriction
    response_data = {
        'success': False,
        'error': 'Method Not Allowed',
        'message': f'{request.method} method is not supported',
        'allowedMethods': ['GET']
    }

    # Send 405 Method Not Allowed response
    response, status_code = send_json_response(response_data, 405)
    response.headers['Allow'] = 'GET'
    return response, status_code


@app.errorhandler(500)
def handle_internal_error(error) -> Tuple[Response, int]:
    """
    Handle 500 Internal Server Error responses.

    Provides a generic error message without exposing internal details.

    Args:
        error: The Flask error object.

    Returns:
        Tuple[Response, int]: JSON response with generic error message.
    """
    # Send a generic 500 Internal Server Error response
    # Don't expose internal error details in production for security
    response_data = {
        'success': False,
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred while processing your request'
    }

    return send_json_response(response_data, 500)


# =============================================================================
# Request Logging Middleware
# =============================================================================

@app.before_request
def log_request() -> None:
    """
    Log incoming requests for debugging and monitoring.

    Logs the HTTP method and path of each incoming request.
    """
    # Log the incoming request for debugging and monitoring
    print(f'[{datetime.now().isoformat()}] {request.method} {request.path}')


# =============================================================================
# Server Lifecycle Functions
# =============================================================================

def start_server(port: int = PORT, host: str = HOST, debug: bool = False) -> None:
    """
    Start the Flask server and begin listening for incoming connections.

    Configures the server and starts the Flask development server.

    Args:
        port (int, optional): Port number to listen on (1-65535). Defaults to PORT.
        host (str, optional): Hostname or IP address to bind to. Defaults to HOST.
        debug (bool, optional): Enable Flask debug mode. Defaults to False.

    Raises:
        ValueError: If port is invalid (not between 1 and 65535).
        ValueError: If host is empty string.

    Example:
        Start server with default configuration::

            start_server()

        Start server with custom port and host::

            start_server(port=8080, host='0.0.0.0')

        Start server in debug mode::

            start_server(debug=True)
    """
    global server_start_time

    # Validate port number
    if not isinstance(port, int) or port < 1 or port > 65535:
        raise ValueError(f'Invalid port number: {port}. Must be between 1 and 65535.')

    # Validate host
    if not isinstance(host, str) or len(host) == 0:
        raise ValueError('Invalid host: must be a non-empty string.')

    # Record the start time for uptime calculation
    server_start_time = datetime.now()

    # Log successful startup
    print('=' * 60)
    print('hello_world HTTP Server v1.0.0 (Flask)')
    print('=' * 60)
    print(f'Server running at http://{host}:{port}/')
    print(f'Health check: http://{host}:{port}/health')
    print(f'Industries API: http://{host}:{port}/api/industries')
    print('=' * 60)
    print(f'Started at: {server_start_time.isoformat()}')
    print(f'Process ID: {os.getpid()}')
    print(f'Python: {os.sys.version}')
    print('=' * 60)
    print('Press Ctrl+C to stop the server')
    print('')

    # Start the Flask development server
    app.run(host=host, port=port, debug=debug, threaded=True)


# =============================================================================
# Main Execution Block
# =============================================================================

if __name__ == '__main__':
    """
    Main entry point when the script is run directly (not imported as a module).

    Starts the server with configuration from environment variables.

    Example:
        Run directly from command line::

            python app.py

        With custom port::

            PORT=8080 python app.py

        With custom host (for production)::

            HOST=0.0.0.0 PORT=80 python app.py
    """
    try:
        # Start the server with environment configuration
        start_server(port=PORT, host=HOST)
    except KeyboardInterrupt:
        # Handle Ctrl+C gracefully
        print('\nReceived keyboard interrupt')
        print('Shutting down server...')
        print('Server stopped successfully')
    except Exception as e:
        # Handle startup errors
        print(f'Failed to start server: {str(e)}')
        exit(1)
