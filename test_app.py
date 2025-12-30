"""
Test suite for the hello_world Flask application.

This module contains unit and integration tests for all API endpoints
to ensure the Flask application behaves correctly.

Author: hxu
Version: 1.0.0
License: MIT

Example:
    Run all tests::

        $ pytest test_app.py -v
"""

import pytest
import json
from app import app


@pytest.fixture
def client():
    """
    Create a test client for the Flask application.
    
    This fixture provides a test client that can be used to make
    requests to the application without running the server.
    
    Yields:
        FlaskClient: A test client for making requests.
    """
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestRootEndpoint:
    """Tests for the GET / endpoint."""
    
    def test_root_returns_200(self, client):
        """Test that root endpoint returns 200 status code."""
        response = client.get('/')
        assert response.status_code == 200
    
    def test_root_returns_json(self, client):
        """Test that root endpoint returns JSON content type."""
        response = client.get('/')
        assert response.content_type == 'application/json'
    
    def test_root_has_success_true(self, client):
        """Test that root endpoint response has success: true."""
        response = client.get('/')
        data = json.loads(response.data)
        assert data['success'] is True
    
    def test_root_has_welcome_message(self, client):
        """Test that root endpoint has the welcome message."""
        response = client.get('/')
        data = json.loads(response.data)
        assert data['message'] == 'Welcome to hello_world API'
    
    def test_root_has_version(self, client):
        """Test that root endpoint has the API version."""
        response = client.get('/')
        data = json.loads(response.data)
        assert data['version'] == '1.0.0'
    
    def test_root_has_endpoints_list(self, client):
        """Test that root endpoint lists all available endpoints."""
        response = client.get('/')
        data = json.loads(response.data)
        assert 'endpoints' in data
        assert 'GET /' in data['endpoints']
        assert 'GET /health' in data['endpoints']
        assert 'GET /api/industries' in data['endpoints']
    
    def test_root_has_cors_header(self, client):
        """Test that root endpoint has CORS header."""
        response = client.get('/')
        assert 'Access-Control-Allow-Origin' in response.headers
        assert response.headers['Access-Control-Allow-Origin'] == '*'


class TestHealthEndpoint:
    """Tests for the GET /health endpoint."""
    
    def test_health_returns_200(self, client):
        """Test that health endpoint returns 200 status code."""
        response = client.get('/health')
        assert response.status_code == 200
    
    def test_health_returns_json(self, client):
        """Test that health endpoint returns JSON content type."""
        response = client.get('/health')
        assert response.content_type == 'application/json'
    
    def test_health_has_success_true(self, client):
        """Test that health endpoint response has success: true."""
        response = client.get('/health')
        data = json.loads(response.data)
        assert data['success'] is True
    
    def test_health_has_status_ok(self, client):
        """Test that health endpoint has status: ok."""
        response = client.get('/health')
        data = json.loads(response.data)
        assert data['status'] == 'ok'
    
    def test_health_has_timestamp(self, client):
        """Test that health endpoint has a timestamp."""
        response = client.get('/health')
        data = json.loads(response.data)
        assert 'timestamp' in data
        # Verify it looks like an ISO timestamp
        assert 'T' in data['timestamp']
    
    def test_health_has_uptime(self, client):
        """Test that health endpoint has uptime field."""
        response = client.get('/health')
        data = json.loads(response.data)
        assert 'uptime' in data
        assert isinstance(data['uptime'], int)


class TestIndustriesEndpoint:
    """Tests for the GET /api/industries endpoint."""
    
    def test_industries_returns_200(self, client):
        """Test that industries endpoint returns 200 status code."""
        response = client.get('/api/industries')
        assert response.status_code == 200
    
    def test_industries_returns_json(self, client):
        """Test that industries endpoint returns JSON content type."""
        response = client.get('/api/industries')
        assert response.content_type == 'application/json'
    
    def test_industries_has_success_true(self, client):
        """Test that industries endpoint response has success: true."""
        response = client.get('/api/industries')
        data = json.loads(response.data)
        assert data['success'] is True
    
    def test_industries_has_data_array(self, client):
        """Test that industries endpoint has data array."""
        response = client.get('/api/industries')
        data = json.loads(response.data)
        assert 'data' in data
        assert isinstance(data['data'], list)
    
    def test_industries_has_count(self, client):
        """Test that industries endpoint has count field."""
        response = client.get('/api/industries')
        data = json.loads(response.data)
        assert 'count' in data
        assert isinstance(data['count'], int)
    
    def test_industries_count_matches_data_length(self, client):
        """Test that count matches actual data length."""
        response = client.get('/api/industries')
        data = json.loads(response.data)
        assert data['count'] == len(data['data'])
    
    def test_industries_returns_43_items(self, client):
        """Test that industries endpoint returns 43 items."""
        response = client.get('/api/industries')
        data = json.loads(response.data)
        assert data['count'] == 43
    
    def test_industries_contains_accounting(self, client):
        """Test that industries contains Accounting/Finance."""
        response = client.get('/api/industries')
        data = json.loads(response.data)
        assert 'Accounting/Finance' in data['data']
    
    def test_industries_contains_technology(self, client):
        """Test that industries contains Technology."""
        response = client.get('/api/industries')
        data = json.loads(response.data)
        assert 'Technology' in data['data']
    
    def test_industries_contains_other(self, client):
        """Test that industries contains Other (last item)."""
        response = client.get('/api/industries')
        data = json.loads(response.data)
        assert 'Other' in data['data']


class TestNotFoundHandler:
    """Tests for the 404 Not Found handler."""
    
    def test_unknown_path_returns_404(self, client):
        """Test that unknown paths return 404 status code."""
        response = client.get('/unknown')
        assert response.status_code == 404
    
    def test_unknown_path_returns_json(self, client):
        """Test that 404 response is JSON."""
        response = client.get('/unknown')
        assert response.content_type == 'application/json'
    
    def test_unknown_path_has_success_false(self, client):
        """Test that 404 response has success: false."""
        response = client.get('/unknown')
        data = json.loads(response.data)
        assert data['success'] is False
    
    def test_unknown_path_has_error_message(self, client):
        """Test that 404 response has error message."""
        response = client.get('/unknown')
        data = json.loads(response.data)
        assert data['error'] == 'Not Found'
        assert 'message' in data
    
    def test_unknown_path_has_requested_path(self, client):
        """Test that 404 response includes requested path."""
        response = client.get('/unknown/path')
        data = json.loads(response.data)
        assert data['requestedPath'] == '/unknown/path'
    
    def test_unknown_path_lists_available_endpoints(self, client):
        """Test that 404 response lists available endpoints."""
        response = client.get('/unknown')
        data = json.loads(response.data)
        assert 'availableEndpoints' in data
        assert 'GET /' in data['availableEndpoints']
        assert 'GET /health' in data['availableEndpoints']
        assert 'GET /api/industries' in data['availableEndpoints']


class TestMethodNotAllowed:
    """Tests for the 405 Method Not Allowed handler."""
    
    def test_post_returns_405(self, client):
        """Test that POST to root returns 405."""
        response = client.post('/')
        assert response.status_code == 405
    
    def test_post_returns_json(self, client):
        """Test that 405 response is JSON."""
        response = client.post('/')
        assert response.content_type == 'application/json'
    
    def test_post_has_success_false(self, client):
        """Test that 405 response has success: false."""
        response = client.post('/')
        data = json.loads(response.data)
        assert data['success'] is False
    
    def test_post_has_error_message(self, client):
        """Test that 405 response has error message."""
        response = client.post('/')
        data = json.loads(response.data)
        assert data['error'] == 'Method Not Allowed'
    
    def test_post_has_allowed_methods(self, client):
        """Test that 405 response includes allowed methods."""
        response = client.post('/')
        data = json.loads(response.data)
        assert 'allowedMethods' in data
        assert 'GET' in data['allowedMethods']
    
    def test_put_returns_405(self, client):
        """Test that PUT to root returns 405."""
        response = client.put('/')
        assert response.status_code == 405
    
    def test_delete_returns_405(self, client):
        """Test that DELETE to root returns 405."""
        response = client.delete('/')
        assert response.status_code == 405


class TestCORSHeaders:
    """Tests for CORS headers on all endpoints."""
    
    def test_cors_on_root(self, client):
        """Test CORS headers on root endpoint."""
        response = client.get('/')
        assert response.headers.get('Access-Control-Allow-Origin') == '*'
    
    def test_cors_on_health(self, client):
        """Test CORS headers on health endpoint."""
        response = client.get('/health')
        assert response.headers.get('Access-Control-Allow-Origin') == '*'
    
    def test_cors_on_industries(self, client):
        """Test CORS headers on industries endpoint."""
        response = client.get('/api/industries')
        assert response.headers.get('Access-Control-Allow-Origin') == '*'
    
    def test_cors_on_404(self, client):
        """Test CORS headers on 404 response."""
        response = client.get('/unknown')
        assert response.headers.get('Access-Control-Allow-Origin') == '*'
    
    def test_cors_on_405(self, client):
        """Test CORS headers on 405 response."""
        response = client.post('/')
        assert response.headers.get('Access-Control-Allow-Origin') == '*'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
