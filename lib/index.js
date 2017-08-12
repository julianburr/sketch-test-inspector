const fs = require('fs-extra');
const invariant = require('invariant');
const watch = require('watch');

const utils = require('./utils');
const sketchtool = require('./sketchtool-cli');

const PLUGIN_NAME = 'sketch-test-inspector';

const INSPECTOR_PLUGIN_PATH = `${sketchtool.pluginFolder()}/${PLUGIN_NAME}.sketchplugin`;
const CONTEXT_FILE_PATH = `${INSPECTOR_PLUGIN_PATH}/Contents/Resources/context.json`;
const ACTIONS_FILE_PATH = `${INSPECTOR_PLUGIN_PATH}/Contents/Resources/actions.json`;
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
  const contextFilePath = getContextFilePath();
  let context = jsonData;
  if (merge) {
    let currentContext = {};
    if (fs.existsSync(contextFilePath)) {
      currentContext = fs.readJsonSync(contextFilePath);
    }
    context = Object.assign({}, currentContext, context);
  }
  fs.writeJsonSync(contextFilePath, context);
}

/**
 * Override actions file (e.g. to clear it)
 * @param  {Object} jsonData
 */
function writeActions (jsonData) {
  fs.writeJsonSync(getActionsFilePath(), jsonData);
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
  const tmpFilePath = `${getTmpFolderPath()}/${tmpFileName}`;
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
  fs.emptyDirSync(getTmpFolderPath());
  writeContext({}, false);
  writeActions({});

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
    // Clear actions file, see below
    fs.writeJsonSync(getActionsFilePath(), []);

    // HACK: several things are going on here that are not helping us! Running plugin
    // commands seems to be async, which is fine. In order to work around that,
    // we have the inspector listen for sketch actions and write it into `action.json`.
    // Unfortunately the action `RunPluginCommand.finish` seems to be triggered to
    // early + sketchtools seems to use some kind of cache to retreive the data from
    // the file, so we need an additional timeout of at least 10s to get some reliable
    // data :(
    watch.createMonitor(`${getTestInspectorPluginPath()}/Contents/Resources/`, monitor => {
      monitor.on('changed', (f, curr, prev) => {
        if (f === getActionsFilePath()) {
          monitor.stop();
          // We need this to get the actual data and not the old information!
          setTimeout(resolve, 12000);
        }
      });

      // Run command with current plugin and given identifier
      setTimeout(() => {
        sketchtool.runPluginWithIdentifier(plugin.name, identifier, options);
      }, 500);
    });
  });
}

function selectLayers (layers) {
  writeContext({layers: layers});
  sketchtool.runPluginWithIdentifier(PLUGIN_NAME, 'selectLayers');
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
  selectLayers: selectLayers
};
