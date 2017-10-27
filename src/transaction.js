const arkjs = require('arkjs')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const Network = require('./network')

let network = new Network()

class Transaction {
  constructor () {
    this.adapter = new FileSync('storage.lowdb')
    this.db = low(this.adapter)
    this.db.defaults({ transactions: [] }).write()
  }

  get (req, res, next) {
    let url = `/api/transactions/get?id=${req.params.id}`

    network.getFromNode(url, (err, response, body) => {
      if (err) return next()
      body = JSON.parse(body)
      res.send(body)
      return next()
    })
  }

  create (req, res, next) {
    let tx = arkjs.transaction.createTransaction(req.params.recipientId, req.params.amount, null, req.params.passphrase)

    this.db.get('transactions')
      .push(tx)
      .write()

    res.send(tx)
    return next()
  }

  getAll (req, res, next) {
    // Avar tx = db.get('transactions');
    return next()
  }

  broadcast (req, res, next) {
    let tx = this.db.get('transactions')
      .find({id: req.params.id})
      .value() || req.params

    if (!arkjs.crypto.verify(tx)) {
      res.send({
        success: false,
        error: 'transaction does not verify',
        transaction: tx
      })
      return next()
    }

    network.broadcast(tx, () => {
      res.send({ success: true })
      return next()
    })
  }
}

module.exports = Transaction
