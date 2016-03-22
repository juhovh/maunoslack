var irc = require('irc');
var servers = require('./config.json').servers;

function setupListeners(fromClient, fromChannel, fromNick, toClient, toChannel, toNick) {
  fromClient.addListener('message', function(from, to, message) {
    if (from !== fromNick) {
      toClient.say(toChannel, '<' + from + '> ' + message);
    }
  });
  fromClient.addListener('topic', function(channel, topic, nick) {
    if (nick !== fromNick) {
      toClient.send('TOPIC', toChannel, topic);
      toClient.action(toChannel, 'Topic changed by ' + nick);
    }
  });
  fromClient.addListener('join', function(channel, nick) {
    if (nick !== fromNick) {
      toClient.action(toChannel, nick + ' has joined');
    }
  });
  fromClient.addListener('part', function(channel, nick, reason) {
    if (nick !== fromNick) {
      toClient.action(toChannel, nick + ' has parted: ' + reason);
    }
  });
  fromClient.addListener('quit', function(nick, reason) {
    if (nick !== fromNick) {
      toClient.action(toChannel, nick + ' has quit: ' + reason);
    }
  });
  fromClient.addListener('error', function(message) {
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
    setupListeners(config.client, config.channel, config.nick, target.client, target.channel, target.nick);
  });
});
