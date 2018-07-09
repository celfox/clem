const duration = require('human-duration')
var previous_alerts = [] // fuck you javascript

function parse_components(components) { 
    var out = []
    for(var component of components) {
	if('drops' in component)  {
	    var drops = parse_drops_brevity(component.drops)
	    out.push(`${component.itemCount} ${component.name} \n ${drops}`)
	    
	} else {
	    out.push(`${component.itemCount} ${component.name}`)
	}
    }
    return out.join('\n')
}




function parse_relic_rewards(rewards) {
    return rewards.map(xs => `${xs.itemName} at ${xs.chance}%`)
}

function parse_drops(drops) {
    return drops.map(xs => `${xs.location} as a ${xs.type} at a chance of ${xs.chance * 100}%`)
}
function parse_drops_brevity(drops) {
    return drops.map(xs => `${xs.location} ${xs.chance * 100}%`)
}    

function precise(x) {
    return Number.parseFloat(x).toPrecision(4);
}
function process_alert(alert, important_only) {
    var out = `${alert.mission.type} on ${alert.mission.node} for ${alert.mission.reward.asString}`
    if(alert.mission.reward.asString.includes("Nitain") || alert.mission.reward.asString.includes("Catalyst")) {
	out = "🚨 " + out + " 🚨"
    } else {
	if(important_only) {
	    out = null
	}
    }
    return out
}

module.exports = {
    process_alerts: function process_alerts(data, diff, logger) {
	var out = []	
	if(diff) {
	    var alerts = data.map(xs => xs.id)
	    var new_alerts = alerts.filter(xs => !previous_alerts.includes(xs))
	    logger.info(new_alerts)
	    previous_alerts = alerts
	    var correct_data = data.filter(xs => new_alerts.includes(xs.id))
	    for(var alert of correct_data) {
		out.push(process_alert(alert, true))
	    }
	} else {
	    for(var alert of data) {
		out.push(process_alert(alert, false))
	    }
	}
	return out
    },
    parse_relics: function parse_relics(relics) {
	var out = []
	for(var relic of relics) {
	    try {
	    var rewards = parse_relic_rewards(relic.rewards.Radiant).join("\n")
		out.push(`(Radiant) \`\`\`${relic.tier} ${relic.name}\n${rewards}\`\`\``)
	    } catch (e) {
		
	    }
	}
	return out
    },
    transform_results: function transform_results(res) {
	var out = []
	for(var item of res) {
	    var com = parse_components(item.components || [])
	    var drops = parse_drops(item.drops || [])
	    if(item.category === 'Melee') {
		out.push( ` **${item.name}** 
\`\`\`
${item.description}
Mastery requirement: ${item.masteryReq || "N/A"}
Base damage: ${item.totalDamage}
DPS: ${item.damagePerSecond}
Critical chance: ${precise(item.criticalChance * 100)}%
Critical multiplier: ${precise(item.criticalMultiplier)}x
Proc chance: ${precise(item.procChance)*100}%
Swing rate: ${precise(item.fireRate)} (swings per second)
Build time: ${duration.fmt(item.buildTime*1000 || 0)}
Build price: ${item.buildPrice || 0} cr
${com.length > 0 ? "Components:\n" + com : ""}
\`\`\` `)
	    } else if(item.category === "Secondary" || item.category === "Primary") {
		out.push( ` **${item.name}** 
\`\`\`
${item.description}
Mastery requirement: ${item.masteryReq || "N/A"}
Base damage: ${item.totalDamage}
DPS: ${item.damagePerSecond}
Critical chance: ${precise(item.criticalChance * 100)}%
Critical multiplier: ${precise(item.criticalMultiplier)}x
Proc chance: ${precise(item.procChance)*100}%
Fire rate: ${precise(item.fireRate)} (rounds per second)
Accuracy: ${item.accuracy || "N/A"}%
Magazine size: ${item.magazineSize || "N/A"}
Build time: ${duration.fmt(item.buildTime*1000 || "N/A")}
Build price: ${item.buildPrice || "N/A"} cr
${com.length > 0 ? "Components:\n" + com : ""}
\`\`\` `)
	    } else if(item.category === "Resources") {
		
	    	out.push( ` **${item.name}** 
\`\`\`
${item.description}
${com.length > 0 ? "Components:\n" + com : ""}
${drops.length > 0 ? "Drops:\n" + drops : ""}
Build time: ${duration.fmt(item.buildTime*1000 || "N/A") || "N/A"}
Build price: ${item.buildPrice || "N/A"} cr
\`\`\` `)
	    } else if(item.category === "Mods") {
		
	    	out.push( ` **${item.name}** 
\`\`\`
Rarity: ${item.rarity || "N/A"}
Polarity: ${item.polarity || "N/A"}
${drops.length > 0 ? "Drops:\n" + drops : ""}

\`\`\` `)
	    }  else if(item.category === "Warframes") {
	    	out.push( ` **${item.name}** 
\`\`\`
${item.description}
${com.length > 0 ? "Components:\n" + com : ""}
${drops.length > 0 ? "Drops:\n" + drops : ""}
Build time: ${duration.fmt(item.buildTime*1000 || "N/A") || "N/A"}
Build price: ${item.buildPrice || "N/A"} cr

\`\`\` `)
	    } else if(item.category === "Relics") {
		var drops = "Vaulted" // damn you, lith k1
		if('drops' in item) {
		    drops = parse_drops_brevity(item.drops.slice(0,30) || [])
		}
		if(drops != "Vaulted")  {
	    	out.push( ` **${item.name}** 
${item.description}
\`\`\`
${drops.length > 0 ? "Drops:\n" + drops : ""}
\`\`\` `) 
		} else {
		    	out.push( ` ~~${item.name}~~

\`\`\`
This relic is vaulted and no longer available
\`\`\` `) 
		}
		break
	    }  
	}
	return out
    } 
}
