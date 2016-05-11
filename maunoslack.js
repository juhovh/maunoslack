var irc = require('irc');
var servers = require('./config.json').servers;

function setupListeners(fromConfig, toConfig) {
  fromConfig.client.addListener('message', function(from, to, message) {
    if (from === fromConfig.nick) return;

    toConfig.client.say(toConfig.channel, '<' + from + '> ' + message);
  });
  fromConfig.client.addListener('topic', function(channel, topic, nick) {
    if (nick === fromConfig.nick) return;

    toConfig.client.send('TOPIC', toConfig.channel, topic);
    toConfig.client.action(toConfig.channel, 'Topic changed by ' + nick);
  });
  fromConfig.client.addListener('join', function(channel, nick) {
    if (nick === fromConfig.nick) return;

    toConfig.client.action(toConfig.channel, nick + ' has joined');
  });
  fromConfig.client.addListener('part', function(channel, nick, reason) {
    if (nick === fromConfig.nick) return;

    if (reason) {
      toConfig.client.action(toConfig.channel, nick + ' has parted: ' + reason);
    } else {
      toConfig.client.action(toConfig.channel, nick + ' has parted');
    }
  });
  fromConfig.client.addListener('quit', function(nick, reason) {
    if (nick === fromConfig.nick) return;

    toConfig.client.action(toConfig.channel, nick + ' has quit: ' + reason);
  });
  fromConfig.client.addListener('error', function(message) {
    console.log('error: ' + message);
  });
}

servers.forEach(function(config) {
  config.options = config.options || {};
  config.options.channels = [config.channel];
  config.client = new irc.Client(config.server, config.nick, config.options);
});

servers.forEach(function(config, idx) {
  var targets = servers.slice();
  targets.splice(idx, 1);
  targets.forEach(function(target) {
    console.log('Setting up', config.channel, config.nick, target.channel, target.nick);
    setupListeners(config, target);
  });
});
