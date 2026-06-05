'use strict'

async function* query(_options) {
  yield { type: 'result', subtype: 'success', result: '{}' }
}

function tool(name, _description, _schema, handler, _options) {
  return { name, handler }
}

function createSdkMcpServer(options) {
  return { type: 'sdk', name: options.name, instance: {} }
}

module.exports = { query, tool, createSdkMcpServer }
