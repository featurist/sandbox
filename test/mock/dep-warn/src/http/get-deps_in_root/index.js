let root = require('root-dep')
let oob = require('@architect/inventory')

exports.handler = async function http (req) {
  return {
    statusCode: 200,
    body: 'Henlo'
  }
}
