var irc = require('irc');
var fetch = require('node-fetch');
var servers = require('./config.json').servers;

fetch.Promise = require('es6-promise').Promise;

function getFilePublicUrl(slackToken, fileid) {
  var url = 'https://slack.com/api/files.info';
  url += '?token=' + encodeURIComponent(slackToken);
  url += '&file=' + encodeURIComponent(fileid);
  return fetch(url)
    .then(function(response) {
      return response.json();
    }).then(function(json) {
      if (json && json.file && json.file.public_url_shared) {
        return json.file.permalink_public;
      }
    });
}

function makeFilePublic(slackToken, fileid) {
  var url = 'https://slack.com/api/files.sharedPublicURL';
  url += '?token=' + encodeURIComponent(slackToken);
  url += '&file=' + encodeURIComponent(fileid);
  return fetch(url);
}

function setupListeners(fromConfig, toConfig) {
  fromConfig.client.addListener('message', function(from, to, message) {
    if (from === fromConfig.nick) return;

    if (fromConfig.slackToken) {
      var linkre = new RegExp('https://[^\.]+\.slack.com/files/[^\.]+/([^\.]+)/[a-zA-Z0-9\.-_~!$&\'()*+,;=:@]+');
      if (message && linkre.test(message)) {
        var fileid = message.match(linkre)[1];
        makeFilePublic(fromConfig.slackToken, fileid)
          .then(function() {
            return getFilePublicUrl(fromConfig.slackToken, fileid);
          }).then(function(publicUrl) {
            if (publicUrl) {
              return publicUrl;
            } else {
              throw new Error('Public URL not found');
            }
          }).then(function(publicUrl) {
            // Send updated message with the public URL instead
            message = message.replace(linkre, publicUrl);
            toConfig.client.say(toConfig.channel, '<' + from + '> ' + message);
          }).catch(function(error) {
            // Fallback to original message if something went wrong
            toConfig.client.say(toConfig.channel, '<' + from + '> ' + message);
          });
        return;
      }
    }

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
