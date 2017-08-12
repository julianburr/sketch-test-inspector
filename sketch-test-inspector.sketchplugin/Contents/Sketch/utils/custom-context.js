import { readJson } from './fs';

/**
 * Read custom context json file to and return it
 * @param  {Object} context
 * @return {Object}
 */
export function getCustomContext (context) {
  const path = context.scriptPath
    .stringByDeletingLastPathComponent()
    .stringByDeletingLastPathComponent();
  const contextPath = String(path) + '/Resources/context.json';
  const customContext = readJson(contextPath) || {};
  return customContext;
}