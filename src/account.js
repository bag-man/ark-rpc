const arkjs = require('arkjs')
const Network = require('./network')

let network = new Network()

class Account {
  get (req, res, next) {
    let url = `/api/accounts?address=${req.params.address}`

    network.getFromNode(url, (err, response, body) => {
      if (err) return next()
      body = JSON.parse(body)
      res.send(body)
      return next()
    })
  }

  getTransactions (req, res, next) {
    let url = `/api/transactions?orderBy=timestamp:desc&senderId=${req.params.address}&recipientId=${req.params.address}`

    network.getFromNode(url, (err, response, body) => {
      if (err) return next()
      body = JSON.parse(body)
      res.send(body)
      next()
    })
  }

  create (req, res, next) {
    let account = arkjs.crypto.getKeys(req.params.passphrase)
    res.send({
      success: true,
      account: {
        publicKey: account.publicKey,
        address: arkjs.crypto.getAddress(account.publicKey)
      }
    })
    return next()
  }
}

module.exports = Account
