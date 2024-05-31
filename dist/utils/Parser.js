function removeCircularReferences(node) {
    const visitedNodes = new Set();

    function removeCircular(node) {
        if (visitedNodes.has(node)) {
            // Circular reference found, remove it
            return null;
        }

        visitedNodes.add(node);

        node.children = node.children.map(child => removeCircular(child)).filter(Boolean);

        return node;
    }

    return removeCircular(node);
}

function parse(lines) {
    let tree = null;
    let currentParent = null;
    let currentLevel = -1;
    const stack = [];

    lines.forEach(line => {
        const level = line.search(/\S|$/); // Find the first non-whitespace character
        const content = line.trim();
        const node = { content: content, children: [] };

        if (!tree) {
            tree = node;
            currentParent = tree;
        } else if (level > currentLevel) {
            stack.push({ level: currentLevel, node: currentParent });
            currentParent = currentParent.children[currentParent.children.length - 1] || currentParent;
            currentLevel = level;
        } else if (level < currentLevel) {
            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }
            if (stack.length > 0) {
                currentParent = stack[stack.length - 1].node;
                currentLevel = stack[stack.length - 1].level;
            }
        }

        if (content !== "") {
            currentParent.children.push(node);
            stack.push({ level: level, node: node });
        }
    });

    // Remove circular references
    tree = removeCircularReferences(tree);

    return tree;
}

module.exports = { parse };
