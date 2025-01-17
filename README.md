# text2tree

![text2tree demo header](/docs/Header.png)

Turn simple text files with tab indentations to SVG mindmap trees inside the browser using a command line interface!

## Installation

Install the App

```Bash
$ npm install
```

## Usage

Run the App

```Bash
$ npm run dev
```

### Browser


This command will spin up a web server and renders the SVG tree within the browser for preview

```Bash
$ text2tree my-text-file.txt
```

The webserver will listen on `localhost:3000` by default, but you can alter this configuration by passing the `-p --port` flag to the cli.

```Bash
$ text2tree my-text-file.txt -p 3020
```

### Image export 

You can also export the tree graph to a `.svg` file when you click 'Save As PNG'
example of exported tree 
![exported PNG](/docs/mindmap.svg)
