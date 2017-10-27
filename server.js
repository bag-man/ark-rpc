const restify = require('restify')
const Account = require('./src/account')
const Transaction = require('./src/transaction')
const Network = require('./src/network')

let account = new Account()
let transaction = new Transaction()
let network = new Network()

function restrictToLocalhost (req, res, next) {
  if (req.connection.remoteAddress === '::1' ||
      req.connection.remoteAddress === '127.0.0.1' ||
      req.connection.remoteAddress === '::ffff:127.0.0.1') {
    return next()
  } else {
    res.end()
  }
}

let server = restify.createServer()

server.use(restrictToLocalhost)
server.use(restify.plugins.bodyParser({mapParams: true}))
server.use(network.connect)

server.get('/:network/account/:address', account.get)
server.get('/:network/transactions/:address', account.getTransactions)

server.post('/:network/account', account.create)
server.post('/:network/transaction', transaction.create)
server.post('/:network/broadcast', transaction.broadcast)

server.listen(8080, () => {
  console.log(`${server.name} listening at ${server.url}`)
})

module.exports = server
