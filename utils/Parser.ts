const Papa = require('papaparse');

function parseText(lines) {
    const stack = [];
    let root = null;
    let previousIndent = -1;

    lines.forEach(line => {
        if (!line.trim()) return;
        
        const indent = line.search(/\S|$/);
        const content = line.trim();
        const node = { content, children: [] };

        if (indent === 0) {
            root = node;
            stack.length = 0;
            stack.push(node);
        } else {
            while (stack.length > 0 && indent <= previousIndent) {
                stack.pop();
                previousIndent = stack.length > 0 ? 
                    stack[stack.length - 1].level : -1;
            }
            
            if (stack.length > 0) {
                stack[stack.length - 1].children.push(node);
            }
            
            node.level = indent;
            stack.push(node);
        }
        previousIndent = indent;
    });

    return [root];
}

function parseCsv(csvContent) {
    const parsedData = Papa.parse(csvContent, {
        header: false,
        skipEmptyLines: true
    }).data;

    const nodeMap = new Map();
    let root = null;

    parsedData.forEach(([id, content]) => {
        const node = { content: content.trim(), children: [] };
        nodeMap.set(id, node);

        if (id === '1') {
            root = node;
            return;
        }

        // Get parent ID by removing last dot-number
        const parentId = id.substring(0, id.lastIndexOf('.'));
        const parent = nodeMap.get(parentId);
        
        if (parent) {
            parent.children.push(node);
        }
    });

    return [root];
}

function parse(input, type = 'text') {
    if (type === 'csv') {
        return parseCsv(input);
    }
    return parseText(Array.isArray(input) ? input : input.split('\n'));
}

module.exports = { parse };
