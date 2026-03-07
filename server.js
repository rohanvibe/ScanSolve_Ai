const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Handlers for mimicking Vercel's serverless routing
const solveHandler = require('./api/solve');
const actionHandler = require('./api/action');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public')));

// Since we are moving to Vercel standard api folder structures,
// we route the local express identically. Note that in this rewritten architecture,
// solving logic lies entirely within solve.js and action.js to keep code DRY across local and Vercel edge deployment.

app.post('/api/solve', async (req, res) => {
    await solveHandler(req, res);
});

app.post('/api/action', async (req, res) => {
    await actionHandler(req, res);
});


app.listen(port, () => {
    console.log(`Express Server running locally at http://localhost:${port}`);
});
