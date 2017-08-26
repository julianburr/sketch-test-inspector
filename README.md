# sketch-test-inspector

Helper utils and plugin for running unit tests on sketch plugins.

## Why?

The Sketch plugin environment is great, and cocoascript giving you access to (almost) all Objective C classes makes it super powerful as well.

Unfortunately it is not reliable. When using Sketch core classes (because, lets be honest, the JS API is not far enough yet to completely replace those) you always risk running into issues when new versions introduce breaking changes. Also, for macOS and the usage of `NS*` classes it comes down to pretty much the same issue on every system update. That leads to sweat and long nights of testing and debugging on every new OS or Sketch version.

Sketch plugins are very hard to write unit tests for. This helper library (+ plugin) tries to solve that problem by providing a bunch of helpers that let you write tests for your plugin commands more easily, using your favorite test library as you are used to.

## Why can't I just use sketchtool?

Because sketchtool makes it easy to get information about a certain file, or to run a certain plugin command in sketch, but its quite hard to do both. This helper library is build on top of sketchtool (which comes with every Sketch version) to overcome these difficulties.

## Getting started

```bash
yarn add sketch-test-inspector --dev

# or
npm i sketch-test-instepctor --dev
```

Also, download the `sketch-test-inspector.sketchplugin` from this repo and double click on it to install it. Make sure it is activated in Sketch when you are using the node script.

## How to use it

To use it, e.g. with [`jest`](https://github.com/facebook/jest), simply import the inspector, set your plugin that you want to test, open a file that you want to test on and shoot plugin actions at it ... that's it, simple 😊

```js
const inspector = require('sketch-plugin-inspector');
const path = require('path');

// Set you plugin that you want to test
inspector.setPlugin('my-awesome-plugin');

// Have a test file somewhere, that you want to test your plugin on
const myTestFile = path.resolve(__dirname, 'Test.sketch');

describe('My awesome plugin', () => {
  // Test a specific command of your plugin
  describe('Test action', () => {
    it('Does something', done => {
      // Open the test file in sketch
      inspector.openFile(myTestFile);

      // Run a plugin command
      inspector.runPluginCommand('AwesomeCommand')
        .then(() => {
          // Check if everything is as you'd expect it
          // e.g. if the command was supposed to create 100 pages in the sketch file...
          expect(inspector.pages().length).toBe(100);
          done();
        })
        .catch(done.fail);
    });
  });

});
```

## Methods

For a bit of jsdocs run

```bash
yarn docs
```

### setPlugin(name)
Sets the plugin for your inspector.

**Params:**
 * **name:** The file name of your sketch plugin (with or without the `.sketchplugin` extension)
 
### openFile(path)
Opens the specified file in sketch so you can run commands on it.

**Params:**
 * **path** Absolute sketch file path that you want to open

### selectLayers(layers)
Changes the selection in the current document to specified layers.

**Params:**
 * **layers** Array of layers you want to select

### saveDocument
Saves the document in its current state. The Inspector will always work with temporary copies of the original file that you specified in `openFile`, so you never actually overwrite it. You do want to save the temporary file if you made changes (programatically) and want to test the output (sketchtool can only read the file from the disc!). NOTE: `runPluginCommand` automatically saves the temp. file before resolving the promise!

### closeDocument
Closes the current document. Mainly because right now the inspector physically opens Sketch. This function lets you close the opened document window.

### runPluginCommand(identifier)
Runs specified command identifier on plugin that has been specified before via `setPlugin`.

**Params:**
 * **identifier** The plugin command identifier you want to run on the currently opened file.

### dump
`sketchtool dump ${currentFilePath}`

### list(type)
`sketchtool list ${type} ${currentFilePath}`

**Params:**
 * **type** Sketchtool list type.

### pages
`sketchtool list pages ${currentFilePath}`

## Todos / Roadmap

 * [ ] Change to running `sketchtool` in the background rather than physically having to open the test file(s) in Sketch!
 * [ ] Add more utils, like Sketch action listeners, observer for logs and document messages, etc.
 * [ ] Optimise plugin command handling and promise resolving
 * [ ] Optimise automated resetting and garbage collection of temporary files
 * [ ] Think about test coverage
