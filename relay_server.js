// == KPOP-PET API Relay Server (v3 - Query Parameter Mode) ==
//
// This script creates a simple Node.js server to relay API requests.
// It uses a query parameter `?target=` to safely pass the destination URL,
// avoiding routing conflicts with Express.
//
// == How to Use ==
//
// 1. **Save this file** as `relay_server.js` on your Windows server.
//
// 2. **Install Node.js**: If you haven't, download and install the LTS version from https://nodejs.org/
//
// 3. **Open Command Prompt (CMD)** on your server and navigate to where you saved this file.
//    cd C:\Path\To\Your\Folder
//
// 4. **Install dependencies**: Run this command once to download the required libraries.
//    npm install express axios cors
//
// 5. **Run the server**:
//    node relay_server.js
//
// 6. **(Optional but Recommended) Keep it running with PM2**:
//    npm install pm2 -g
//    pm2 start relay_server.js --name "kpop-pet-relay"
//
// 7. **Configure Firewall**: Allow incoming TCP traffic on the port specified below (default is 3000).
//
// 8. **Update Extension**: The extension code will be updated to use this new relay format.
//

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
// --- CONFIGURATION ---
const PORT = 3000; // You can change this port if needed. Remember to update your firewall.
// ---------------------

// Enable CORS (Cross-Origin Resource Sharing) to allow requests from your browser extension.
app.use(cors());

// Middleware to parse JSON request bodies and raw text bodies.
app.use(express.json());
app.use(express.text({ type: '*/*' }));

// Define a dedicated relay endpoint.
app.all('/relay', async (req, res) => {
    const targetUrl = req.query.target;

    // 1. Validate that the 'target' query parameter exists.
    if (!targetUrl) {
        return res.status(400).send({
            message: 'Bad Request: Missing `target` query parameter.'
        });
    }

    // 2. Security check: ensure the target URL is a valid HTTP/HTTPS URL.
    if (!targetUrl.startsWith('http')) {
        return res.status(400).send({
            message: 'Bad Request: The `target` URL must be a valid, absolute URL starting with http or https.'
        });
    }

    console.log(`[${new Date().toISOString()}] Relay: ${req.method} -> ${targetUrl}`);

    try {
        // 3. Forward the request using axios.
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: {
                // Pass through the original headers.
                'Authorization': req.headers.authorization || undefined,
                'Content-Type': req.headers['content-type'] || 'application/json',
                'x-api-key': req.headers['x-api-key'] || undefined,
                'api-key': req.headers['api-key'] || undefined,
            },
            data: req.body, // Pass through the request body.
            timeout: 30000, // 30-second timeout.
            responseType: 'text' // Receive response as text to handle both JSON and non-JSON data.
        });

        // 4. Send the response from the target API back to the original client.
        res.set('Content-Type', response.headers['content-type'] || 'text/plain');
        res.status(response.status).send(response.data);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error relaying request to ${targetUrl}:`, error.message);

        if (error.response) {
            // If the target API returned an error, forward that error.
            res.set('Content-Type', error.response.headers['content-type'] || 'application/json');
            res.status(error.response.status).send(error.response.data);
        } else {
            // Otherwise, it's likely a network issue between this relay and the target.
            res.status(502).send({ message: `Bad Gateway: The relay server could not connect to the target API. Reason: ${error.message}` });
        }
    }
});

// Start the server.
app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  Generic API Relay Server (Query Mode) is running`);
    console.log(`  Listening on: 0.0.0.0:${PORT}`);
    console.log(`  Endpoint: /relay?target=<URL_TO_PROXY>`);
    console.log(`====================================================`);
});
