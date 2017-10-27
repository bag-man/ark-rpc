const request = require('request')
const async = require('async')
const arkjs = require('arkjs')

class Network {
  constructor () {
    this.network = null
    this.server = null

    this.networks = {
      devnet: {
        name: 'devnet',
        nethash: '578e820911f24e039733b45e4882b73e301f813a0d2c31330dafda84534ffa23',
        slip44: 1,
        version: 30,
        peers: [
          '167.114.29.52:4002',
          '167.114.29.53:4002',
          '167.114.29.54:4002',
          '167.114.29.55:4002'
        ]
      },
      mainnet: {
        name: 'mainnet',
        slip44: 111,
        nethash: '6e84d08bd299ed97c212c886c98a57e36545c8f5d645ca7eeae63a8bd62d8988',
        version: 23,
        peers: [
          '5.39.9.240:4001',
          '5.39.9.241:4001',
          '5.39.9.242:4001',
          '5.39.9.243:4001',
          '5.39.9.244:4001',
          '5.39.9.250:4001',
          '5.39.9.251:4001',
          '5.39.9.252:4001',
          '5.39.9.253:4001',
          '5.39.9.254:4001',
          '5.39.9.255:4001',
          '193.70.72.90:4001'
        ]
      }
    }
  }

  getFromNode (url, cb) {
    let nethash = this.network ? this.network.nethash : ''

    if (!url.startsWith('http')) {
      url = `http://${this.server}${url}`
    }

    request({ url,
      headers: {
        nethash,
        version: '1.0.0',
        port: 1
      },
      timeout: 2000
    }, cb)
  }

  findEnabledPeers (cb) {
    let peers = []

    this.getFromNode('/peer/list', (err, response, body) => {
      if (err || body === 'undefined') {
        return cb(peers)
      }

      let respeers = JSON.parse(body).peers

      respeers.filter((peer) => {
        return peer.status === 'OK'
      }).map((peer) => {
        return `${peer.ip}:${peer.port}`
      })

      async.each(respeers, (peer, next) => {
        let url = `http://${peer}/api/blocks/getHeight`

        this.getFromNode(url, (error, res, body) => {
          if (!error && body !== 'Forbidden') {
            peers.push(peer)
          }
          return next()
        })
      }, (error) => {
        if (error) return cb(error)

        return cb(peers)
      })
    })
  }

  postTransaction (transaction, cb) {
    request({ url: `http://${this.server}/peer/transactions`,
      headers: {
        nethash: this.network.nethash,
        version: '1.0.0',
        port: 1
      },
      method: 'POST',
      json: true,
      body: { transactions: [ transaction ] }
    }, cb)
  }

  broadcast (transaction, callback) {
    this.network.peers.slice(0, 10).forEach((peer) => {
      request({
        url: `http://${peer}/peer/transactions`,
        headers: {
          nethash: this.network.nethash,
          version: '1.0.0',
          port: 1
        },
        method: 'POST',
        json: true,
        body: {transactions: [transaction]}
      })
    })

    return callback()
  }

  connect2network (netw, callback) {
    this.network = netw
    this.server = netw.peers[Math.floor(Math.random() * 1000) % netw.peers.length]

    this.findEnabledPeers((peers) => {
      if (peers.length > 0) {
        [ this.server ] = peers
        netw.peers = peers
      }
      return callback()
    })

    this.getFromNode('/api/loader/autoconfigure', (err, response, body) => {
      if (err) return

      if (!body || !body.startsWith('{')) {
        this.connect2network(netw, callback)
      } else {
        netw.config = JSON.parse(body).network
      }
    })
  }

  connect (req, res, next) {
    // This is the wrong context so doesn't have access to the rest of the clsss
    if (!this.server || !this.network || this.network.name !== req.params.network) {
      arkjs.crypto.setNetworkVersion(this.networks[req.params.network].version)
      this.connect2network(this.networks[req.params.network], next)
    } else {
      return next()
    }
  }
}

module.exports = Network
