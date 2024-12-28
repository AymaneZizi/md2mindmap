#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const { parse } = require('./utils/Parser');
const { render } = require('./utils/Renderer');
const express = require('express');
const chokidar = require('chokidar');

const app = express();
const port = 3000;

function startServer() {
    app.get("/", (req, res) => {
        res.send(render(JSON.stringify([], null, 4))); // Start with empty array
    });

    app.listen(port, () => {
        console.info(`🌲 SVG Tree available on http://127.0.0.1:${port}`);
    });
}

startServer();
