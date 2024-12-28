import express, { Request, Response } from 'express';
import * as path from 'path';
import { parse } from './utils/Parser';
import { render } from './utils/Renderer';

const app = express();
const port = 3000;

function startServer() {
    // Serve static files from public directory
    app.use(express.static(path.join(__dirname, '../public')));
    
    app.get("/", (_req: Request, res: Response) => {
        res.send(render(JSON.stringify([], null, 4)));// Start with empty array
    });

    app.listen(port, () => {
        console.info(`🌲 SVG Tree available on http://127.0.0.1:${port}`);
    });
}

startServer();
