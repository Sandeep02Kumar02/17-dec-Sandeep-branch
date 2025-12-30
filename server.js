/**
 * @module server
 * @description HTTP server module for hello_world application. This module provides a complete
 * HTTP server implementation with three endpoints: root welcome message, health check, and
 * industries API. It serves as both a functional server skeleton and a JSDoc documentation example.
 * @author hxu
 * @version 1.0.0
 * @license MIT
 * @see {@link https://nodejs.org/api/http.html} for Node.js HTTP module documentation
 */

'use strict';

// =============================================================================
// Module Dependencies
// =============================================================================

/**
 * Node.js built-in HTTP module for creating the server and handling requests.
 * Provides the core functionality for creating an HTTP server, processing
 * incoming requests, and sending responses.
 * @see {@link https://nodejs.org/api/http.html}
 */
const http = require('http');

/**
 * Node.js built-in File System module for reading the industry.csv data file.
 * Used to load industry taxonomy data that is served via the /api/industries endpoint.
 * @see {@link https://nodejs.org/api/fs.html}
 */
const fs = require('fs');

/**
 * Node.js built-in Path module for handling file path operations.
 * Ensures cross-platform compatibility when constructing paths to data files.
 * @see {@link https://nodejs.org/api/path.html}
 */
const path = require('path');

// =============================================================================
// Configuration Constants
// =============================================================================

/**
 * Default port number for the HTTP server.
 * Can be overridden by setting the PORT environment variable.
 * @const {number}
 * @default 3000
 * @example
 * // Override via environment variable
 * // PORT=8080 node server.js
 */
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

/**
 * Default hostname for the HTTP server to bind to.
 * Can be overridden by setting the HOST environment variable.
 * Use '0.0.0.0' to listen on all network interfaces in production.
 * @const {string}
 * @default 'localhost'
 * @example
 * // Override via environment variable
 * // HOST=0.0.0.0 node server.js
 */
const HOST = process.env.HOST || 'localhost';

/**
 * Path to the industry.csv data file.
 * Resolved relative to the current module's directory for portability.
 * @const {string}
 */
const INDUSTRY_CSV_PATH = path.join(__dirname, 'industry.csv');

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Server configuration options for starting the HTTP server.
 * @typedef {Object} ServerConfig
 * @property {number} port - Port number to listen on (1-65535)
 * @property {string} host - Hostname or IP address to bind to
 */

/**
 * Response format for the /api/industries endpoint.
 * Contains the list of industry categories loaded from industry.csv.
 * @typedef {Object} IndustryResponse
 * @property {boolean} success - Indicates if the request was successful
 * @property {string[]} data - Array of industry category names
 * @property {number} count - Total number of industries returned
 */

/**
 * Response format for the /health endpoint.
 * Provides server health status and current timestamp.
 * @typedef {Object} HealthResponse
 * @property {string} status - Health status ('ok' when healthy)
 * @property {string} timestamp - ISO 8601 formatted timestamp
 * @property {number} uptime - Server uptime in seconds
 */

/**
 * Standard API response format for all endpoints.
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indicates if the request was successful
 * @property {*} [data] - Response data (format varies by endpoint)
 * @property {string} [message] - Human-readable message
 * @property {string} [error] - Error message if success is false
 */

/**
 * Response format for the root endpoint.
 * @typedef {Object} WelcomeResponse
 * @property {boolean} success - Always true for successful requests
 * @property {string} message - Welcome message
 * @property {string} version - API version number
 * @property {Object} endpoints - Available endpoints documentation
 */

// =============================================================================
// Module State
// =============================================================================

/**
 * Reference to the active HTTP server instance.
 * Used for graceful shutdown operations.
 * @type {http.Server|null}
 * @private
 */
let serverInstance = null;

/**
 * Server start timestamp for uptime calculation.
 * @type {Date|null}
 * @private
 */
let serverStartTime = null;

// =============================================================================
// Response Helper Functions
// =============================================================================

/**
 * Sends an HTTP response to the client with JSON-formatted data.
 * Sets appropriate headers for JSON content type and CORS support.
 * This is the centralized response handler ensuring consistent response format.
 *
 * @function sendResponse
 * @param {http.ServerResponse} res - The HTTP response object
 * @param {number} statusCode - HTTP status code (e.g., 200, 404, 500)
 * @param {Object} data - Response data to be JSON-serialized and sent
 * @returns {void}
 * @example
 * // Send a successful response
 * sendResponse(res, 200, { success: true, message: 'Hello World' });
 *
 * @example
 * // Send an error response
 * sendResponse(res, 404, { success: false, error: 'Not Found' });
 */
function sendResponse(res, statusCode, data) {
    // Set response headers for JSON content and CORS
    // Content-Type tells the client to expect JSON data
    res.setHeader('Content-Type', 'application/json');

    // CORS header allows cross-origin requests from any domain
    // In production, you may want to restrict this to specific origins
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Set the HTTP status code for the response
    res.statusCode = statusCode;

    // Convert the data object to a JSON string with pretty formatting
    // The null, 2 arguments add indentation for readability
    const jsonResponse = JSON.stringify(data, null, 2);

    // End the response by sending the JSON data to the client
    res.end(jsonResponse);
}

// =============================================================================
// Endpoint Handlers
// =============================================================================

/**
 * Handles requests to the root endpoint (GET /).
 * Returns a welcome message with API version and available endpoints documentation.
 * This serves as the API discovery endpoint for clients.
 *
 * @function getRoot
 * @param {http.IncomingMessage} req - The incoming HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {void}
 * @example
 * // Response format:
 * // {
 * //   "success": true,
 * //   "message": "Welcome to hello_world API",
 * //   "version": "1.0.0",
 * //   "endpoints": {
 * //     "GET /": "This welcome message",
 * //     "GET /health": "Health check endpoint",
 * //     "GET /api/industries": "List of industry categories"
 * //   }
 * // }
 */
function getRoot(req, res) {
    // Construct the welcome response with API documentation
    // This helps API consumers discover available endpoints
    const response = {
        success: true,
        message: 'Welcome to hello_world API',
        version: '1.0.0',
        endpoints: {
            'GET /': 'This welcome message',
            'GET /health': 'Health check endpoint',
            'GET /api/industries': 'List of industry categories'
        }
    };

    // Send successful response with 200 OK status
    sendResponse(res, 200, response);
}

/**
 * Handles requests to the health check endpoint (GET /health).
 * Returns the current health status, timestamp, and server uptime.
 * Used by load balancers and monitoring systems to verify server availability.
 *
 * @function getHealth
 * @param {http.IncomingMessage} req - The incoming HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {void}
 * @example
 * // Response format:
 * // {
 * //   "success": true,
 * //   "status": "ok",
 * //   "timestamp": "2024-01-15T10:30:00.000Z",
 * //   "uptime": 3600
 * // }
 */
function getHealth(req, res) {
    // Calculate server uptime in seconds
    // If server hasn't started properly, uptime will be 0
    const uptime = serverStartTime
        ? Math.floor((Date.now() - serverStartTime.getTime()) / 1000)
        : 0;

    // Construct health check response
    // The 'ok' status indicates the server is healthy and accepting requests
    const response = {
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: uptime
    };

    // Send successful response with 200 OK status
    sendResponse(res, 200, response);
}

/**
 * Handles requests to the industries API endpoint (GET /api/industries).
 * Reads and parses the industry.csv file, returning a list of industry categories.
 * The CSV file contains a single column with industry names, one per line.
 *
 * @function getIndustries
 * @param {http.IncomingMessage} req - The incoming HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {void}
 * @throws {Error} Implicitly handles file read errors by sending error response
 * @example
 * // Success response format:
 * // {
 * //   "success": true,
 * //   "data": ["Accounting/Finance", "Advertising/Public Relations", ...],
 * //   "count": 43
 * // }
 *
 * @example
 * // Error response format (when CSV file is not accessible):
 * // {
 * //   "success": false,
 * //   "error": "Failed to load industries data",
 * //   "details": "ENOENT: no such file or directory"
 * // }
 */
function getIndustries(req, res) {
    // Read the industry.csv file asynchronously
    // Using utf8 encoding to get string data instead of a Buffer
    fs.readFile(INDUSTRY_CSV_PATH, 'utf8', (err, data) => {
        // Handle file read errors (e.g., file not found, permission denied)
        if (err) {
            // Log the error for server-side debugging
            console.error('Error reading industry.csv:', err.message);

            // Send error response with 500 Internal Server Error status
            sendResponse(res, 500, {
                success: false,
                error: 'Failed to load industries data',
                details: err.message
            });
            return;
        }

        // Parse the CSV data by splitting on newlines
        // The CSV has a header row 'Industry' followed by data rows
        const lines = data.split('\n');

        // Filter out the header row and any empty lines
        // The first line is the header ('Industry'), so we skip it
        // We also filter out empty strings that may result from trailing newlines
        const industries = lines
            .slice(1) // Skip the header row
            .map(line => line.trim()) // Remove whitespace from each line
            .filter(line => line.length > 0); // Remove empty lines

        // Construct the success response with industry data
        const response = {
            success: true,
            data: industries,
            count: industries.length
        };

        // Send successful response with 200 OK status
        sendResponse(res, 200, response);
    });
}

/**
 * Handles 404 Not Found responses for unmatched routes.
 * Provides helpful information about available endpoints.
 *
 * @function handleNotFound
 * @param {http.IncomingMessage} req - The incoming HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {void}
 * @example
 * // Response format:
 * // {
 * //   "success": false,
 * //   "error": "Not Found",
 * //   "message": "The requested endpoint does not exist",
 * //   "requestedPath": "/unknown",
 * //   "availableEndpoints": ["GET /", "GET /health", "GET /api/industries"]
 * // }
 */
function handleNotFound(req, res) {
    // Construct a helpful 404 response that guides users to valid endpoints
    const response = {
        success: false,
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        requestedPath: req.url,
        availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /api/industries'
        ]
    };

    // Send 404 Not Found response
    sendResponse(res, 404, response);
}

/**
 * Handles 405 Method Not Allowed responses for unsupported HTTP methods.
 * Informs the client which methods are supported for the given endpoint.
 *
 * @function handleMethodNotAllowed
 * @param {http.IncomingMessage} req - The incoming HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {void}
 * @example
 * // Response format for POST request to any endpoint:
 * // {
 * //   "success": false,
 * //   "error": "Method Not Allowed",
 * //   "message": "POST method is not supported",
 * //   "allowedMethods": ["GET"]
 * // }
 */
function handleMethodNotAllowed(req, res) {
    // Set the Allow header to indicate supported methods
    res.setHeader('Allow', 'GET');

    // Construct response explaining the method restriction
    const response = {
        success: false,
        error: 'Method Not Allowed',
        message: `${req.method} method is not supported`,
        allowedMethods: ['GET']
    };

    // Send 405 Method Not Allowed response
    sendResponse(res, 405, response);
}

// =============================================================================
// Request Routing
// =============================================================================

/**
 * Routes incoming HTTP requests to the appropriate endpoint handler.
 * Implements a simple routing mechanism based on URL path and HTTP method.
 * Only GET requests are supported; other methods receive 405 responses.
 *
 * @function routeRequest
 * @param {http.IncomingMessage} req - The incoming HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {void}
 * @example
 * // This function is called internally by handleRequest
 * // GET / -> getRoot()
 * // GET /health -> getHealth()
 * // GET /api/industries -> getIndustries()
 * // GET /unknown -> handleNotFound()
 * // POST /any -> handleMethodNotAllowed()
 */
function routeRequest(req, res) {
    // Extract the URL path from the request
    // Parse URL to handle query strings properly (e.g., /path?query=value)
    const urlPath = req.url.split('?')[0];

    // Extract the HTTP method (GET, POST, etc.)
    const method = req.method.toUpperCase();

    // Log the incoming request for debugging and monitoring
    console.log(`[${new Date().toISOString()}] ${method} ${urlPath}`);

    // Only allow GET requests for this simple API
    // All endpoints in this server are read-only
    if (method !== 'GET') {
        handleMethodNotAllowed(req, res);
        return;
    }

    // Route to the appropriate handler based on the URL path
    // Using a switch statement for clean, readable routing logic
    switch (urlPath) {
        case '/':
            // Root endpoint - returns welcome message and API info
            getRoot(req, res);
            break;

        case '/health':
            // Health check endpoint - returns server status
            getHealth(req, res);
            break;

        case '/api/industries':
            // Industries API - returns list from industry.csv
            getIndustries(req, res);
            break;

        default:
            // Unknown path - return 404 Not Found
            handleNotFound(req, res);
            break;
    }
}

// =============================================================================
// Request Handling
// =============================================================================

/**
 * Main request handler for all incoming HTTP requests.
 * Wraps the routing logic with error handling to prevent server crashes.
 * This is the entry point for all HTTP traffic to the server.
 *
 * @function handleRequest
 * @param {http.IncomingMessage} req - The incoming HTTP request object containing
 *   request headers, URL, method, and body stream
 * @param {http.ServerResponse} res - The HTTP response object used to send
 *   the response back to the client
 * @returns {void}
 * @example
 * // This function is passed to http.createServer() as the request listener
 * const server = http.createServer(handleRequest);
 */
function handleRequest(req, res) {
    // Wrap request handling in try-catch to prevent unhandled exceptions
    // from crashing the server
    try {
        // Delegate to the routing function
        routeRequest(req, res);
    } catch (error) {
        // Log the error for debugging and monitoring
        console.error('Unhandled error in request handler:', error);

        // Send a generic 500 Internal Server Error response
        // Don't expose internal error details in production for security
        sendResponse(res, 500, {
            success: false,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while processing your request'
        });
    }
}

// =============================================================================
// Server Lifecycle Functions
// =============================================================================

/**
 * Creates and configures a new HTTP server instance.
 * The server is configured with the main request handler but not yet started.
 * Use startServer() to begin accepting connections.
 *
 * @function createServer
 * @returns {http.Server} Configured HTTP server instance ready to be started
 * @example
 * // Create a server instance
 * const server = createServer();
 *
 * // Start listening on port 3000
 * server.listen(3000, () => {
 *   console.log('Server started');
 * });
 */
function createServer() {
    // Create HTTP server with the main request handler
    // The handleRequest function will be called for every incoming request
    const server = http.createServer(handleRequest);

    // Configure server timeout (30 seconds default)
    // This prevents hanging connections from consuming resources
    server.timeout = 30000;

    // Configure keep-alive timeout (5 seconds)
    // Allows connection reuse while preventing idle connection buildup
    server.keepAliveTimeout = 5000;

    // Configure headers timeout (slightly longer than keep-alive)
    // Prevents slow header attacks
    server.headersTimeout = 6000;

    return server;
}

/**
 * Starts the HTTP server and begins listening for incoming connections.
 * This is an async function that resolves when the server is ready to accept requests.
 *
 * @async
 * @function startServer
 * @param {number} [port=PORT] - Port number to listen on (1-65535)
 * @param {string} [host=HOST] - Hostname or IP address to bind to
 * @returns {Promise<http.Server>} Promise that resolves with the server instance
 *   when the server is successfully listening
 * @throws {Error} Throws if port is already in use or binding fails
 * @example
 * // Start server with default configuration
 * startServer()
 *   .then(server => console.log('Server started'))
 *   .catch(err => console.error('Failed to start:', err));
 *
 * @example
 * // Start server with custom port and host
 * await startServer(8080, '0.0.0.0');
 *
 * @example
 * // Using async/await with error handling
 * try {
 *   const server = await startServer(3000, 'localhost');
 *   console.log('Server is running');
 * } catch (error) {
 *   console.error('Startup failed:', error.message);
 * }
 */
async function startServer(port = PORT, host = HOST) {
    // Return a promise that resolves when the server starts
    // or rejects if there's an error during startup
    return new Promise((resolve, reject) => {
        // Validate port number
        if (typeof port !== 'number' || port < 1 || port > 65535) {
            reject(new Error(`Invalid port number: ${port}. Must be between 1 and 65535.`));
            return;
        }

        // Validate host
        if (typeof host !== 'string' || host.length === 0) {
            reject(new Error('Invalid host: must be a non-empty string.'));
            return;
        }

        // Create the server instance if it doesn't exist
        if (!serverInstance) {
            serverInstance = createServer();
        }

        // Handle server errors during startup
        serverInstance.once('error', (err) => {
            // Handle common startup errors with helpful messages
            if (err.code === 'EADDRINUSE') {
                reject(new Error(`Port ${port} is already in use. Please choose a different port.`));
            } else if (err.code === 'EACCES') {
                reject(new Error(`Permission denied for port ${port}. Try a port > 1024 or run with elevated privileges.`));
            } else {
                reject(err);
            }
        });

        // Start listening on the specified port and host
        serverInstance.listen(port, host, () => {
            // Record the start time for uptime calculation
            serverStartTime = new Date();

            // Log successful startup
            console.log('='.repeat(60));
            console.log(`hello_world HTTP Server v1.0.0`);
            console.log('='.repeat(60));
            console.log(`Server running at http://${host}:${port}/`);
            console.log(`Health check: http://${host}:${port}/health`);
            console.log(`Industries API: http://${host}:${port}/api/industries`);
            console.log('='.repeat(60));
            console.log(`Started at: ${serverStartTime.toISOString()}`);
            console.log(`Process ID: ${process.pid}`);
            console.log(`Node.js: ${process.version}`);
            console.log('='.repeat(60));
            console.log('Press Ctrl+C to stop the server');
            console.log('');

            // Resolve with the server instance
            resolve(serverInstance);
        });
    });
}

/**
 * Gracefully stops the HTTP server and closes all active connections.
 * Waits for existing requests to complete before fully shutting down.
 * This is an async function that resolves when the server has stopped.
 *
 * @async
 * @function stopServer
 * @returns {Promise<void>} Promise that resolves when the server has stopped
 * @example
 * // Gracefully stop the server
 * await stopServer();
 * console.log('Server stopped');
 *
 * @example
 * // Stop with promise handling
 * stopServer()
 *   .then(() => console.log('Server stopped successfully'))
 *   .catch(err => console.error('Error stopping server:', err));
 */
async function stopServer() {
    return new Promise((resolve, reject) => {
        // If no server instance exists, resolve immediately
        if (!serverInstance) {
            console.log('No server instance to stop');
            resolve();
            return;
        }

        console.log('\nShutting down server...');

        // Close the server to stop accepting new connections
        serverInstance.close((err) => {
            if (err) {
                console.error('Error during server shutdown:', err.message);
                reject(err);
                return;
            }

            // Calculate final uptime
            const uptime = serverStartTime
                ? Math.floor((Date.now() - serverStartTime.getTime()) / 1000)
                : 0;

            // Log shutdown information
            console.log('='.repeat(60));
            console.log('Server stopped successfully');
            console.log(`Total uptime: ${uptime} seconds`);
            console.log(`Shutdown at: ${new Date().toISOString()}`);
            console.log('='.repeat(60));

            // Clear the server instance and start time
            serverInstance = null;
            serverStartTime = null;

            resolve();
        });
    });
}

// =============================================================================
// Main Execution Block
// =============================================================================

/**
 * Main entry point when the script is run directly (not imported as a module).
 * Starts the server and sets up graceful shutdown handlers for SIGINT and SIGTERM.
 *
 * @example
 * // Run directly from command line:
 * // node server.js
 *
 * // With custom port:
 * // PORT=8080 node server.js
 *
 * // With custom host (for production):
 * // HOST=0.0.0.0 PORT=80 node server.js
 */
if (require.main === module) {
    // This block only runs when server.js is executed directly
    // It will not run if the module is imported/required by another file

    /**
     * Handles graceful shutdown on process termination signals.
     * Ensures the server stops cleanly when receiving SIGINT (Ctrl+C) or SIGTERM.
     *
     * @param {string} signal - The signal that triggered the shutdown
     * @returns {void}
     */
    const handleShutdown = async (signal) => {
        console.log(`\nReceived ${signal} signal`);

        try {
            await stopServer();
            console.log('Graceful shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error.message);
            process.exit(1);
        }
    };

    // Register signal handlers for graceful shutdown
    // SIGINT is sent when user presses Ctrl+C
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    // SIGTERM is sent by process managers (e.g., Docker, Kubernetes, systemd)
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    // Handle uncaught exceptions to prevent silent failures
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        handleShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Don't exit on unhandled rejection in Node.js 15+
        // but log for debugging
    });

    // Start the server
    startServer()
        .then(() => {
            // Server started successfully
            // The server will keep running until shutdown signal is received
        })
        .catch((error) => {
            // Server failed to start
            console.error('Failed to start server:', error.message);
            process.exit(1);
        });
}

// =============================================================================
// Module Exports
// =============================================================================

/**
 * Export server functions for use as a module.
 * Allows other files to import and use the server programmatically.
 *
 * @example
 * // Import in another file
 * const { startServer, stopServer } = require('./server');
 *
 * // Start server programmatically
 * const server = await startServer(8080, '0.0.0.0');
 *
 * // Stop server when done
 * await stopServer();
 */
module.exports = {
    createServer,
    handleRequest,
    sendResponse,
    routeRequest,
    getRoot,
    getHealth,
    getIndustries,
    handleNotFound,
    handleMethodNotAllowed,
    startServer,
    stopServer,
    // Export constants for testing and configuration
    PORT,
    HOST,
    INDUSTRY_CSV_PATH
};
