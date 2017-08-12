/**
 * Check weather or not file at given path exists
 * @param  {string} filePath
 * @return {Boolean}
 */
export function fileExists (filePath) {
  return NSFileManager.alloc().init().fileExistsAtPath(filePath);
}

/**
 * Read json file, parse content and return object
 * @param  {string} filePath
 * @return {Object}
 */
export function readJson (filePath) {
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
export function writeJson (jsonData, filePath) {
  log('writeJson')
  log(filePath)
  NSString
    .stringWithFormat(JSON.stringify(jsonData))
    .writeToFile_atomically_encoding_error(filePath, true, NSUTF8StringEncoding, null);
}