/**
 * Opens file from given custom context
 * @param  {Object} context
 */
function openFile (context) {
  const customContext = getCustomContext(context);
  if (!customContext.filePath) {
    log('Could not find file path to be opened!');
    return;
  }

  const documentController = NSDocumentController.sharedDocumentController();
  const url = NSURL.fileURLWithPath(customContext.filePath);

  const openedDocument = documentController
    .openDocumentWithContentsOfURL_display_error(url, true, null);

  openedDocument.documentWindow().makeKeyAndOrderFront(null);
}

/**
 * Select layer from custom context
 * @param  {Object} context
 */
function selectLayers (context) {
  const customContext = getCustomContext(context);
  const layers = customContext.layers || [];
  let i = 0;
  context.document.pages().forEach(page => {
    page.layers().forEach(layer => {
      if (layers.find(l => l.id === String(layer.objectID()))) {
        layer.select_byExpandingSelection(true, i > 0); // Resets selection for first item!
        i++;
      }
    })
  });
}

/**
 * Log command actions so we can listen to them on the node
 * side of things
 * @param  {Object} context
 */
function logPluginCommandAction (context) {
  const cmd = context.actionContext.command;
  const actionName = String(cmd);

  if (!cmd || actionName.startsWith('com.julianburr.test-inspector')) {
    return;
  }

  const path = context.scriptPath
    .stringByDeletingLastPathComponent()
    .stringByDeletingLastPathComponent();
  const actionsPath = String(path) + '/Resources/actions.json';

  const ts = NSDate.date().timeIntervalSince1970();
  const actions = readJson(actionsPath) || [];
  log('actions')
  log(actions)
  actions.push({
    command: actionName,
    ts: String(ts)
  });
  writeJson(actions, actionsPath);
}

/**
 * Reset action for possible rollbacks and reset functionality
 * @param  {Object} context
 */
function reset (context) {
  log('reset me...')
}

/**
 * Save document changes
 * @param  {Object} context
 */
function saveDocument (context) {
  context.document.saveDocument('test-inspector');
}

/**
 * Close current document
 * @param  {Object} context
 */
function closeDocument (context) {
  context.document.close();
}

// #######################################################

/**
 * Check weather or not file at given path exists
 * @param  {string} filePath
 * @return {Boolean}
 */
function fileExists (filePath) {
  return NSFileManager.alloc().init().fileExistsAtPath(filePath);
}

/**
 * Read json file, parse content and return object
 * @param  {string} filePath
 * @return {Object}
 */
function readJson (filePath) {
  if (!fileExists(filePath)) {
    log(`Could not find file at path '${filePath}'`);
    return;
  }

  const content = NSString.alloc().initWithContentsOfFile(filePath);
  try {
    return JSON.parse(content);
  } catch (e) {
    log(e.message);
  }
}

/**
 * Write object to json file
 * @param  {Object} jsonData
 * @param  {string} filePath
 */
function writeJson (jsonData, filePath) {
  log('writeJson')
  log(filePath)
  NSString
    .stringWithFormat(JSON.stringify(jsonData))
    .writeToFile_atomically_encoding_error(filePath, true, NSUTF8StringEncoding, null);
}

// #######################################################

/**
 * Read custom context json file to and return it
 * @param  {Object} context
 * @return {Object}
 */
function getCustomContext (context) {
  const path = context.scriptPath
    .stringByDeletingLastPathComponent()
    .stringByDeletingLastPathComponent();
  const contextPath = String(path) + '/Resources/context.json';
  const customContext = readJson(contextPath) || {};
  return customContext;
}

