const Items = require('warframe-items')
const Discord = require('discord.js')
const {Signale} = require('signale')
const clem = require('./lib')
const client = new Discord.Client()
const items = new Items()
const fuzzy = require('fuzzy')
const request = require('request')
const config = require('./config.json')

const channel_id = ""

const signale_options = {
  disabled: false,
  interactive: false,
  stream: process.stdout,
  scope: 'clem'
}

const logger = new Signale(signale_options)


var previous_alerts = []

var search_template = {
    extract: function(entry) {
	return entry.name
    }
}


function f_search(target) {
    var results = fuzzy.filter(target,items,search_template)
    return results.map(function(x) { return x.original })
}

function push_channel(channel, message) {
    try {
	client.channels.get(channel).send(message)
    } catch(err) {
	logger.error("Can't send messages! Do you have your channel ID set?")
    }
}


function get_worldstate_silently() {
    request('https://ws.warframestat.us/pc', function (error, response, body) {
	if(error) {
	    logger.error(error)
	}
	clem.process_alerts(JSON.parse(body).alerts, true, logger)
    })

}

function get_worldstate() {
    request('https://ws.warframestat.us/pc', function (error, response, body) {
	if(error) {
	    logger.error(error)
	}
	var alerts = clem.process_alerts(JSON.parse(body).alerts, true, logger)
	if(alerts.length > 0) {
	    push_channel(config.channel_id,alerts.join("\n"))
	}
    })

}

client.on('ready', () => {
    logger.info(`Clem has been gotten: ${client.user.tag}`)
    setInterval(get_worldstate, 600000)
    get_worldstate_silently()
})

client.on('message', msg => { 
    var content = msg.content.split(' ')
    var command = content[0]
    var predicate = content.slice(1,content.length).join(' ')
    if(msg.channel.id === config.channel_id) {
	switch (command) {
	case ".search": 
	    logger.info("Searching for " + predicate)
	    var query = f_search(predicate)
	    logger.info(`... got ${query.length} results.`)
	    var res = clem.transform_results(query)
	    if(res.length > 10) {
		res = res.slice(0,9)
	    }
	    for(var entry of res) {
		msg.reply(entry)
	    }
	    break
	case ".alerts":
	    request('https://ws.warframestat.us/pc', function (error, response, body) {
		 if(error) {
		     logger.error(error)
		 }
		 var alerts = process_alerts(JSON.parse(body).alerts, false)
		 if(alerts.length > 0) {
		     push_channel(channel_id,alerts.join("\n"))
		 }
	     })
	    break
	}
    }
})
try {
    client.login(config.token)
} catch (err) {
    logger.error("Can't login! There's probably something wrong with your token!")
}
