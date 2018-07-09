const Items = require('warframe-items')
const Discord = require('discord.js')
const {
  Signale
} = require('signale')
const clem = require('./lib')
const client = new Discord.Client()
const items = new Items()
const fuzzy = require('fuzzy')
const request = require('request')
const config = require('./config.json')
const capitalize = require('string-capitalize')

// TODO: Make the server / channel handling more generic. Also, make it support
// channel multiplexing

let server = ""

const signale_options = {
  disabled: false,
  interactive: false,
  stream: process.stdout,
  scope: 'clem'
}

const logger = new Signale(signale_options)

let search_template = {
  extract: function(entry) {
    return entry.name
  }
}


function f_search(target) {
  var results = fuzzy.filter(target, items, search_template)
  return results.map(function(x) {
    return x.original
  })
}

function push_channel(channel, message) {
  try {
    client.channels.get(channel).send(message)
  } catch (err) {
    logger.error("Can't send messages! Do you have your channel ID set?")
  }
}

// FIXME: Hello ugly hack my old friend
function get_worldstate_silently() {
  request('https://ws.warframestat.us/pc', function(error, response, body) {
    if (error) {
      logger.error(error)
    }
    clem.process_alerts(JSON.parse(body).alerts, true, logger)
  })

}
// TODO: Push worldstate functions to lib, generalize it, and make a generic
// handler for worldstate-related functions
function get_worldstate() {
  request('https://ws.warframestat.us/pc', function(error, response, body) {
    if (error) {
      logger.error(error)
    }
    var alerts = clem.process_alerts(JSON.parse(body).alerts, true, logger)
    logger.info(alerts.length)
    if (alerts.length >= 1) {
      logger.info(alerts.join("\n"))
      for (let alert of alerts) {
        if (alert) {
          push_channel(config.channel_id, alert)
          push_channel(config.channel_id, `${server.roles.find('name','Warframe')}`)
        }

      }

    }
  })

}

client.on('ready', () => {
  logger.info(`Clem has been gotten: ${client.user.tag}`)
  server = client.guilds.first()
  logger.info(`Got server:  ${server.name}`)
  setInterval(get_worldstate, 600000)
  get_worldstate_silently()
})

// TODO: Make message handling more generic. Modularize each command and make
// it less dumb.

client.on('message', msg => {
  var content = msg.content.split(' ')
  var command = content[0]
  var predicate = content.slice(1, content.length).join(' ')
  if (msg.channel.id === config.channel_id) {
    switch (command) {
      case ".search":
        logger.info("Searching for " + predicate)
        var query = f_search(predicate)
        logger.info(`... got ${query.length} results.`)
        var res = clem.transform_results(query)
        if (res.length > 10) {
          res = res.slice(0, 9)
        }
        for (var entry of res) {
          msg.reply(entry)
        }
        break
      case ".alerts":
        request('https://ws.warframestat.us/pc', function(error, response, body) {
          if (error) {
            logger.error(error)
          }
          var alerts = clem.process_alerts(JSON.parse(body).alerts, false)
          if (alerts.length > 0) {
            push_channel(config.channel_id, alerts.join("\n"))
          }
        })
        break
      case ".manualrefresh":
        get_worldstate()
        break
      case ".relic":
        if (content.length < 3) {
          msg.reply("Wrong format! Try .relic **tier** **name** (like .relic axi a1)")
        } else {
          var tier = capitalize(content[1])
          var name = capitalize(content[2])
          request(`https://drops.warframestat.us/data/relics/${tier}/${name}.json`, function(error, response, body) {
            if (error) {
              logger.error(error)
            } else {
              var json = []
              try {
                json = JSON.parse(body)
              } catch (e) {
                logger.error("Definitely not JSON!")
              }
              logger.info(json)
              var relics = clem.parse_relics([json])
              if (relics.length > 0) {
                for (var relic of relics) {
                  logger.info(relic)

                  push_channel(config.channel_id, relic.toString())
                }
              }
            }
          })
        }
        break
    }
  }
})
try {
  client.login(config.token)
} catch (err) {
  logger.error("Can't login! There's probably something wrong with your token!")
}
