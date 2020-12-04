const discordToken = process.argv[2]
const topggToken = 'abc' // unnecessary to debug

const path = require('path')

const AutoPoster = require('..')

const DiscordJS = require('discord.js')
const Eris = require('eris')

const shardCount = Math.floor(Math.random() * 3) + 2

let currentRunning = 'ESTABLISH'
let kill

function debug (msg) {
  console.debug(`[TEST] ${currentRunning}: ${msg}`)
}

debug(`Spawning ${shardCount} shards.`)

const runs = {
  'discord.js': () => new Promise(resolve => {
    const client = new DiscordJS.Client({ shardCount })

    client.on('ready', () => {
      debug('Received READY')

      resolve()
    })

    new AutoPoster(topggToken, client)

    client.login(discordToken)
    kill = () => {
      client.destroy()
    }
  }),
  'eris': () => new Promise(resolve => {
    const client = new Eris.Client(discordToken, { maxShards: shardCount })

    client.on('ready', () => {
      debug('Received READY')

      new AutoPoster(topggToken, client)

      resolve()
    })

    client.connect()
    kill = () => {
      client.disconnect()
    }
  }),
  'discord.js - traditional': () => new Promise(resolve => {
    const sharder = new DiscordJS.ShardingManager('./tests/fork.js', { token: discordToken, totalShards: shardCount, respawn: false })

    debug('Spawning shards, please wait...')
    sharder.spawn().then(() => {
      debug('Adding TopGG Client to all shards')
      return sharder.broadcastEval(`
        const AutoPoster = require('${path.resolve(__dirname, '..')}')
        new AutoPoster('${topggToken}', this)
      `)
    }).then(() => resolve())

    kill = () => {
      sharder.shards.forEach(x => x.kill())
    }
  })
}

const wait = (time) => new Promise(resolve => setTimeout(() => resolve(), time))

async function run () {
  for (const cur in runs) {
    currentRunning = cur
    debug('Loading')

    await runs[cur]()

    debug('Cleaning up')

    await wait(5000)
    kill()
  }

  process.exit()
}

run()