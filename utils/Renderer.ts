const render = (data) => `<!DOCTYPE html>
<!-- Previous head content remains the same -->
<head>
  <meta charset="utf-8">
  <title>Text2Tree</title>
  <style>
    /* Previous styles remain the same */
    body {
      margin: 0;
      overflow: hidden;
    }
    .node {
      cursor: pointer;
    }
    .node circle {
      fill: #fff;
      stroke: steelblue;
      stroke-width: 3px;
    }
    .node text {
      font: 16px sans-serif;
      dominant-baseline: middle; /* This helps center text vertically */
      text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.9), 
                  -2px -2px 4px rgba(255, 255, 255, 0.9),
                  2px -2px 4px rgba(255, 255, 255, 0.9),
                  -2px 2px 4px rgba(255, 255, 255, 0.9); /* White glow effect */
    }
    .link {
      fill: none;
      stroke: #ccc;
      stroke-width: 2px;
    }
    .root {
      margin-right: 150px;
    }
    #container {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    .controls {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .controls button {
      margin: 5px;
      padding: 5px 10px;
      cursor: pointer;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .controls button:hover {
      background-color: #f0f0f0;
    }
    button {
      margin: 5px;
      padding: 5px 10px;
      cursor: pointer;
    }

    .file-input {
      display: none;
    }
    
    /* Add styles for upload button group */
    .upload-group {
      display: inline-block;
      position: relative;
    }
    
    .upload-group input[type="file"] {
      display: none;
    }
    .empty-state {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 1.2em;
      color: #666;
      text-align: center;
    }
    
    button[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    
  </style>
</head>
<body>
  <div class="controls">
    <div class="upload-group">
      <button id="addFileBtn" onclick="document.getElementById('fileInput').click()">Add File</button>
      <input type="file" id="fileInput" accept=".txt,.csv"/>
    </div>
    <button onclick="zoomIn()" ${!data.length ? 'disabled' : ''}>Zoom In (+)</button>
    <button onclick="zoomOut()" ${!data.length ? 'disabled' : ''}>Zoom Out (-)</button>
    <button onclick="resetView()" ${!data.length ? 'disabled' : ''}>Reset View</button>
    <button onclick="exportAsPNG()" ${!data.length ? 'disabled' : ''}>Save as PNG</button>
  </div>
  <div id="container">
    ${!data.length ? '<div class="empty-state">Upload a file to start</div>' : ''}
  </div>

   <!-- Global variables -->
  <script>
    // Define global variables that will be used across functions
    var treeData = ${data};
    var margin, width, height;
    var svg, rootGroups, tree, diagonal, zoom;
    var i = 0, duration = 750;
  </script>

  <!-- Library loader -->
  <script>
    function loadScript(url, retries = 3) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () => {
          if (retries > 0) {
            setTimeout(() => {
              loadScript(url, retries - 1).then(resolve).catch(reject);
            }, 1000);
          } else {
            reject(new Error(\`Failed to load \${url}\`));
          }
        };
        document.body.appendChild(script);
      });
    }

    // Load libraries before initializing
    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js'),
      loadScript('https://unpkg.com/papaparse@5.4.1/papaparse.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/0.4.1/html2canvas.min.js')
    ]).then(() => {
      console.log('Libraries loaded, initializing application...');
      initializeApplication();
    }).catch(error => {
      console.error('Error loading libraries:', error);
      alert('Failed to load required libraries. Please refresh the page.');
    });
  </script>

  <!-- Main application code -->
  <script>
    function initializeApplication() {
      
      margin = {top: 50, right: 200, bottom: 50, left: 200};
      width = 5000 - margin.right - margin.left;
      height = 3000 - margin.top - margin.bottom;
      
      // Initialize D3 components
      tree = mindmapTree();
      diagonal = d3.svg.diagonal()
          .projection(function(d) { return [d.y, d.x]; });
      zoom = d3.behavior.zoom()
          .scaleExtent([0.05, 4])
          .on("zoom", zoomed);

      // Setup file input handler
      document.getElementById('fileInput').addEventListener('change', function(e) {
              handleFileUpload(e.target);
          });
    // Initialize visualization if we have data
      if (treeData.length) {
        initializeVisualization();
      }
    }

    // File handling functions
    async function handleFileUpload(input) {
  const file = input.files[0];
  if (!file) return;

  try {
    const content = await readFile(file);
    const newData = parseFileContent(file.name, content);
    
    // Clear existing data and initialize with new data
    treeData = newData;
    
    // Remove empty state message if it exists
    d3.select(".empty-state").remove();
    
    // Enable buttons
    document.querySelectorAll('.controls button').forEach(btn => {
      if (btn.textContent !== 'Add File') {
        btn.disabled = false;
      }
    });
    
    // Clear existing visualization and reinitialize
    d3.select("#container").selectAll("*").remove();
    initializeVisualization();
    
    // Reset file input
    input.value = '';
    
  } catch (error) {
    console.error('Error processing file:', error);
    alert('Error processing file. Please check the file format.');
  }
}

    function readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
    }

    function parseFileContent(filename, content) {
  if (filename.endsWith('.csv')) {
    // Parse CSV
    const results = Papa.parse(content, {
      header: false,
      skipEmptyLines: true
    });
    
    // Convert CSV data to tree structure
    // Use first row content as root instead of filename
    const firstRow = results.data[0];
    const root = { content: firstRow[1], children: [] };  // Use content from CSV instead of filename
    const nodeMap = new Map();
    nodeMap.set('1', root);
    
    // Start from second row since first row is root
    results.data.slice(1).forEach(([id, content]) => {
      if (!id || !content) return;
      
      const node = { content: content.trim(), children: [] };
      nodeMap.set(id, node);
      
      const parentId = id.substring(0, id.lastIndexOf('.'));
      const parent = nodeMap.get(parentId);
      if (parent) {
        parent.children.push(node);
      }
    });
    
    return [root];
  } else {
    // Parse text file (indentation-based)
    const lines = content.split('\\n');
    let root = null;
    const stack = [];
    let previousIndent = -1;

    lines.forEach(line => {
      if (!line.trim()) return;
      
      const indent = line.search(/\\S/);
      const content = line.trim();
      const node = { content, children: [] };

      if (indent === 0) {
        root = node;  // First non-empty line becomes root
        stack.length = 0;
        stack.push(node);
      } else {
        while (stack.length > 0 && indent <= previousIndent) {
          stack.pop();
          previousIndent = stack.length > 0 ? stack[stack.length - 1].level : -1;
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
}

    // Visualization initialization function
    function initializeVisualization() {
      d3.select("#container").selectAll("*").remove();
      
      svg = d3.select("#container").append("svg")
          .attr("width", "100%")
          .attr("height", "100%")
          .style("touch-action", "none") // Add this line
          .call(zoom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      svg.append("rect")
          .attr("width", width + margin.right + margin.left)
          .attr("height", height + margin.top + margin.bottom)
          .style("fill", "none")
          .style("pointer-events", "all");

      rootGroups = svg.selectAll("g.root")
          .data(treeData)
          .enter().append("g")
          .attr("class", "root");

      treeData.forEach((root, index) => {
          root.x0 = height / 2;
          root.y0 = width / 2;
          var rootGroup = rootGroups.filter((d, i) => i === index);
          update(root, rootGroup, index);
      });
    }

    function mindmapTree() {
        var tree = d3.layout.tree()
            .size([height, width])
            .separation(function(a, b) { 
                return (a.parent == b.parent ? 2 : 3);
            });

        var originalNodes = tree.nodes;
        tree.nodes = function(root) {
            var nodes = originalNodes(root);
            
            if (root.children && root.children.length > 0) {
                var leftNodes = [];
                var rightNodes = [];
                var midPoint = Math.ceil(root.children.length / 2);
                
                // Split nodes into left and right arrays
                root.children.forEach(function(child, i) {
                    if (i < midPoint) {
                        leftNodes.push(child);
                    } else {
                        rightNodes.push(child);
                    }
                });

                // Calculate vertical spacing
                var verticalSpacing = height / (Math.max(leftNodes.length, rightNodes.length) + 1);
                
                // Position nodes
                nodes.forEach(function(n) {
                    if (n.depth === 0) {
                        // Root node
                        n.x = height / 2;
                        n.y = width / 2;
                    } else if (n.depth === 1) {
                        // First level children
                        var index;
                        var isRight;
                        
                        if (leftNodes.includes(n)) {
                            index = leftNodes.indexOf(n);
                            isRight = false;
                        } else {
                            index = rightNodes.indexOf(n);
                            isRight = true;
                        }
                        
                        // Calculate vertical position
                        var startY = (height - (Math.max(leftNodes.length, rightNodes.length) - 1) * verticalSpacing) / 2;
                        n.x = startY + (index * verticalSpacing);
                        n.y = isRight ? width/2 + 400 : width/2 - 400;
                        n.isRight = isRight;
                    } else {
                        // Higher level children
                        n.isRight = n.parent.isRight;
                        if (n.isRight) {
                            n.y = n.parent.y + 400;
                        } else {
                            n.y = n.parent.y - 400;
                        }
                    }
                });
            }
            return nodes;
        };

        return tree;
    }

    // Previous update, click, and zoom functions remain the same
    function update(source, rootGroup, treeIndex) {
        var nodes = tree.nodes(source),
            links = tree.links(nodes);

        var node = rootGroup.selectAll("g.node")
            .data(nodes, function(d) { return d.id || (d.id = ++i); });

        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + (d.parent ? d.parent.y : d.y0) + "," + 
                                   (d.parent ? d.parent.x : d.x0) + ")";
            })
            .on("click", click);

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeEnter.append("text")
        .attr("x", function(d) {
            if (d.depth === 0) return 0;
            // Increased text offset to prevent overlapping
            var offset = calculateTextOffset(d);
            return d.isRight ? offset : -offset;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) {
            if (d.depth === 0) return "middle";
            return d.isRight ? "start" : "end";
        })
        .text(function(d) { return d.content; })
        .style("fill-opacity", 1e-6)
        .style("font-weight", "500");

        // Add a function to calculate text offset based on node content
    function calculateTextOffset(d) {
        var circleRadius = 12; // The radius of our circles
        var minOffset = circleRadius + 10; // Minimum spacing from circle edge
        var baseOffset = minOffset;

        // For nodes with longer text, increase the offset
        if (d.isRight) {
            return baseOffset; // Right side nodes already have space
        } else {
            var textLength = d.content.length;
            // Adjust offset based on text length for left side
            return baseOffset + Math.min(textLength * 1.5, 50); // Cap the max offset
        }
    }

        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeUpdate.select("circle")
            .attr("r", 12)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                var parent = d.parent || source;
                return "translate(" + parent.y + "," + parent.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        var link = rootGroup.selectAll("path.link")
            .data(links, function(d) { return d.target.id; });

        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: d.source.x,
                    y: d.source.y
                };
                return diagonal({source: o, target: o});
            });

        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: d.source.x,
                    y: d.source.y
                };
                return diagonal({source: o, target: o});
            })
            .remove();

        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    function click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
            
            if (d.children) {
                d.children.forEach(function(child) {
                    child.x0 = d.x;
                    child.y0 = d.y;
                });
            }
        }
        
        var treeRoot = d;
        while (treeRoot.parent) {
            treeRoot = treeRoot.parent;
        }
        
        var rootGroup = d3.select(this.parentNode.parentNode);
        update(treeRoot, rootGroup);
    }

    function zoomed() {
        svg.attr("transform",
            "translate(" + d3.event.translate + ")" +
            "scale(" + d3.event.scale + ")"
        );
    }

    function zoomIn() {
        zoom.scale(zoom.scale() * 1.2);
        zoom.event(svg);
    }

    function zoomOut() {
        zoom.scale(zoom.scale() * 0.8);
        zoom.event(svg);
    }

    function resetView() {
        zoom.scale(1);
        zoom.translate([margin.left, margin.top]);
        zoom.event(svg);
    }
    
    function exportAsPNG() {
    // Get the SVG element
    const svgElement = document.querySelector('svg');
    
    // Get the current transform and scale
    const currentTransform = svg.attr("transform");
    const currentScale = zoom.scale();
    const currentTranslate = zoom.translate();

    try {
        // Reset zoom and transform
        svg.attr("transform", "translate(" + margin.left + "," + margin.top + ") scale(1)");

        // Get the bounds
        const svgBounds = svgElement.getBBox();
        const padding = 100;

        // Set proper dimensions
        svgElement.setAttribute('width', svgBounds.width + padding * 2);
        svgElement.setAttribute('height', svgBounds.height + padding * 2);
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        // Get SVG string
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);

        // Create array of strings and join them (safer than direct concatenation)
        const xmlParts = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            source
        ];
        const finalSource = xmlParts.join('\\n');

        // Convert svg source to URL data
        const svgBlob = new Blob([finalSource], {type:"image/svg+xml;charset=utf-8"});
        const url = URL.createObjectURL(svgBlob);
        
        // Create download link
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "mindmap.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error during SVG export:', error);
        alert('There was an error exporting the SVG. Please try again.');
    } finally {
        // Restore original transform
        svg.attr("transform", currentTransform);
        zoom.scale(currentScale);
        zoom.translate(currentTranslate);
        zoom.event(svg);
    }
}

  </script>
</body>
</html>`;

exports.render = render;
