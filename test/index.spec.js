/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const multiaddr = require('multiaddr')
const Peer = require('peer-info')
const Id = require('peer-id')

const Node = require('../src').Node
const rawPeer = require('./peer.json')
const id = new Id(rawPeer.id, rawPeer.privKey, rawPeer.pubKey)

describe('libp2p-ipfs-browser', function () {
  this.timeout(10000)
  let node

  it('start', (done) => {
    node = new Node()
    node.start(done)
  })

  it('echo', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
    const peer = new Peer(id)
    peer.multiaddr.add(mh)

    const message = 'Hello World!'
    node.swarm.dial(peer, '/echo/1.0.0', (err, conn) => {
      expect(err).to.not.exist

      conn.write(message)
      conn.on('data', (data) => {
        expect(data.toString()).to.equal(message)

        conn.end()
        done()
      })
    })
  })

  describe('stress', () => {
    it('one big write', (done) => {
      const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
      const peer = new Peer(id)
      peer.multiaddr.add(mh)

      const message = new Buffer(1000000).fill('a').toString('hex')
      node.swarm.dial(peer, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist

        conn.write(message)
        conn.write('STOP')

        let result = ''
        conn.on('data', (data) => {
          if (data.toString() === 'STOP') {
            conn.end()
            return
          }
          result += data.toString()
        })

        conn.on('end', () => {
          expect(result).to.equal(message)
          done()
        })
      })
    })

    it('many writes in 2 batches', (done) => {
      const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
      const peer = new Peer(id)
      peer.multiaddr.add(mh)

      let expected = ''
      let counter = 0

      node.swarm.dial(peer, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist

        while (++counter < 10000) {
          conn.write(`${counter} `)
          expected += `${counter} `
        }

        setTimeout(() => {
          while (++counter < 20000) {
            conn.write(`${counter} `)
            expected += `${counter} `
          }

          conn.write('STOP')
        }, 1000)

        let result = ''
        conn.on('data', (data) => {
          if (data.toString() === 'STOP') {
            conn.end()
            return
          }
          result += data.toString()
        })

        conn.on('end', () => {
          expect(result).to.equal(expected)
          done()
        })
      })
    })
  })
})