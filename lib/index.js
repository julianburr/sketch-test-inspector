const fs = require('fs-extra');
const invariant = require('invariant');
const watch = require('watch');

const sketchtool = require('sketchtool-cli');

const PLUGIN_NAME = 'sketch-test-inspector';

const INSPECTOR_PLUGIN_PATH = `${sketchtool.pluginFolder()}/${PLUGIN_NAME}.sketchplugin`;
const CONTEXT_FILE_PATH = `${INSPECTOR_PLUGIN_PATH}/Contents/Resources/context.json`;
const ACTIONS_FOLDER_PATH = `${INSPECTOR_PLUGIN_PATH}/Contents/Resources/actions/`;
const TMP_FOLDER_PATH = `${INSPECTOR_PLUGIN_PATH}/Contents/Resources/tmp`;

let plugin = {};

let currentFile = {
  source: null,
  path: null
};

/**
 * Set plugin in instance from which you want to run the commands
 * @param {string} name
 */
function setPlugin (name) {
  if (!name.endsWith('.sketchplugin')) {
    name += '.sketchplugin';
  }
  const pluginFolder = `${sketchtool.pluginFolder()}/${name}`;
  const check = fs.existsSync(pluginFolder);
  invariant(check, 'Could not find plugin!');

  const manifest = fs.readJsonSync(`${pluginFolder}/Contents/Sketch/manifest.json`);
  invariant(manifest, 'Could not find plugin manifest!');

  plugin.name = manifest.name;
  plugin.identifier = manifest.identifier;
}

/**
 * Util to write custom context that the inspector plugin can then pick up
 * NOTE: this is a workaround, as the `--context` option in sketchtool does
 *  not seem to work reliable enough
 * @param  {Object}  jsonData
 * @param  {Boolean} merge
 */
function writeContext (jsonData, merge = true) {
  let context = jsonData;
  if (merge) {
    let currentContext = {};
    if (fs.existsSync(CONTEXT_FILE_PATH)) {
      currentContext = fs.readJsonSync(CONTEXT_FILE_PATH);
    }
    context = Object.assign({}, currentContext, context);
  }
  fs.writeJsonSync(CONTEXT_FILE_PATH, context);
}

/**
 * Override actions file (e.g. to clear it)
 * @param  {Object} jsonData
 */
function writeActions (jsonData) {
  fs.writeJsonSync(ACTIONS_FILE_PATH, jsonData);
}

/**
 * Open Sketch via sketchtool and run `openFile` plugin handler, which
 * will open the specified file in the document so we can run plugin actions
 * on it...
 * @param  {string} filePath
 */
function openFile (filePath) {
  let exists = fs.existsSync(filePath);
  invariant(exists, `File at path '${filePath}' does not exist! Cannot open it in Sketch!`);

  const split = filePath.split('/');
  const tmpFileName = new Date().getTime() + '-' + split[split.length - 1];
  const tmpFilePath = `${TMP_FOLDER_PATH}/${tmpFileName}`;
  fs.copySync(filePath, tmpFilePath);

  exists = fs.existsSync(filePath);
  invariant(exists, `Could not copy requested file to tmp folder!`);

  // NOTE: passing in context doesn't work as expected atm
  // Workaround: save json in a file and load it in the plugin
  writeContext({filePath: tmpFilePath});

  currentFile = {
    source: filePath,
    path: tmpFilePath
  };

  // Run test-inspector openFile command that reads the filepath from the
  // context file and opens the file accordingly
  sketchtool.runPluginWithIdentifier(PLUGIN_NAME, 'openFile');
}

/**
 * Clear up tmp data etc.
 */
function reset () {
  fs.emptyDirSync(TMP_FOLDER_PATH);
  fs.emptyDirSync(ACTIONS_FOLDER_PATH);
  writeContext({}, false);

  plugin = {};

  currentFile = {
    source: null,
    path: null
  };

  sketchtool.runPluginWithIdentifier(PLUGIN_NAME, 'reset');
}

/**
 * Get the sketchtool dump of the currently opened file
 * @return {Object}
 */
function dump () {
  invariant(currentFile.path, 'No file open at the moment, cannot dump anything!');
  return sketchtool.dump(currentFile.path);
}

/**
 * Get the list of the specified type of the currently opened file
 * @param  {string} type
 * @return {Object}
 */
function list (type) {
  invariant(currentFile.path, 'No file open at the moment, cannot list anything!');
  return sketchtool.list(type, currentFile.path);
}

/**
 * Alias for `list(layers)`
 * @return {Object}
 */
function layers () {
  return list('layers');
}

/**
 * Alias for `list(pages)`
 * @return {Object}
 */
function pages () {
  return list('pages');
}

/**
 * Run a specific plugin command from the currently selected plugin
 * on the currently opened file
 * @param  {string} identifier
 * @param  {Object} options
 * @return {Promise}
 */
function runPluginCommand (identifier, options) {
  invariant(plugin.name, `You need to use 'setPlugin' before you can run commands!`);
  invariant(identifier, 'You need to specify a plugin command identifier that should be run!');

  return new Promise((resolve, reject) => {
    // We write sketch actions to a specitic file, so we can listen to this file
    // to know in node when an action has been fired
    watch.createMonitor(ACTIONS_FOLDER_PATH, monitor => {
      monitor.on('created', () => {
        saveDocument();
        setTimeout(() => {
          resolve();
          monitor.stop();
        }, 200);
      });

      // Run command with current plugin and given identifier
      sketchtool.runPluginWithIdentifier(plugin.name, identifier, options);
    });
  });
}

/**
 * Select specfic layers in the current document
 * @param  {Array} layers
 */
function selectLayers (layers) {
  writeContext({layers: layers});
  sketchtool.runPluginWithIdentifier(PLUGIN_NAME, 'selectLayers');
}

/**
 * Save current document
 */
function saveDocument () {
  sketchtool.runPluginWithIdentifier(PLUGIN_NAME, 'saveDocument');
}

/**
 * Close current document
 */
function closeDocument () {
  sketchtool.runPluginWithIdentifier(PLUGIN_NAME, 'closeDocument');
}

module.exports = {
  setPlugin: setPlugin,
  openFile: openFile,
  reset: reset,
  dump: dump,
  list: list,
  layers: layers,
  pages: pages,
  runPluginCommand: runPluginCommand,
  selectLayers: selectLayers,
  saveDocument: saveDocument,
  closeDocument: closeDocument
};
