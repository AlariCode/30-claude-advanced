'use strict'

async function* query(_options) {
  yield { type: 'result', subtype: 'success', result: '{}' }
}

module.exports = { query }
