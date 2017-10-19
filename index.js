/*var npm = require('npm');
npm.load(function(err) {
  // handle errors

  // install modules down below
  npm.commands.install(['discord.js', 'opusscript', 'ytdl-core', 'request', 'fs', 'get-youtube-id', 'youtube-info', 'ffmpeg-binaries'], function(er, data) {
    // log errors or data
  });

  npm.on('log', function(message) {
    // log installation progress
    console.log(message);
  });
});*/


const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require("ytdl-core");
const request = require("request");
const fs = require("fs");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");

var config = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));

const yt_api_key = config.yt_api_key;
const bot_controller = config.bot_controller;
const prefix = config.prefix;
const discord_token = config.discord_token;

var guilds = [];
var commands = [
                "play", 
                "skip", 
                "queue"
               ];

//setTimeout(function () {
client.login(process.env.BOT_TOKEN);
//}, 260000);

client.on('message', function (message) {
    const member = message.member;
    const mess = message.content.toLowerCase();
    const args = message.content.split(' ').slice(1).join(" ");

    if (!guilds[message.guild.id]) {
        guilds[message.guild.id] = {
            queue: [],
            queueNames: [],
            isPlaying: false,
            dispatcher: null,
            voiceChannel: null,
            skipReq: 0,
            skippers: []
        };
    }

    if (mess.startsWith(prefix + "play")) {
        message.delete();
        if (message.member.voiceChannel || guilds[message.guild.id].voiceChannel != null) {
        if (guilds[message.guild.id].queue.length > 0 || guilds[message.guild.id].isPlaying) {
            getID(args, function (id) {
                add_to_queue(id, message);
                fetchVideoInfo(id, function (err, videoInfo) {
                    if (err) throw new Error(err);
                    message.channel.sendEmbed(new Discord.RichEmbed()
                    .setColor(0x00AB29D4)
                    .addField(`Your song is queued! :vertical_traffic_light:`, `**${videoInfo.title}**`)).then(m => m.delete(7000));
                    guilds[message.guild.id].queueNames.push(videoInfo.title);
                });
            });
        } else {
            isPlaying = true;
            getID(args, function (id) {
                guilds[message.guild.id].queue.push(id);
                playMusic(id, message);
                fetchVideoInfo(id, function (err, videoInfo) {
                    if (err) throw new Error(err);
                    guilds[message.guild.id].queueNames.push(videoInfo.title);
                    message.channel.sendEmbed(new Discord.RichEmbed()
                    .setColor(0x00AB29D4)
                    .addField(`Now Playing! :headphones:`, `**${videoInfo.title}**`)).then(m => m.delete(7000));
                });
            });
          }
        } else {
            message.channel.sendEmbed(new Discord.RichEmbed()
                    .setColor(0x00AB29D4)
                    .addField(`Hold on! :no_entry:`, `You're not in a voice channel!`)).then(m => m.delete(7000));
        }
    } else if (mess.startsWith(prefix + "skip")) {
        message.delete();
        if (guilds[message.guild.id].skippers.indexOf(message.author.id) === -1) {
            guilds[message.guild.id].skippers.push(message.author.id);
            guilds[message.guild.id].skipReq++;
            if (guilds[message.guild.id].skipReq >= Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2)) {
                skip_song(message);
                message.channel.sendEmbed(new Discord.RichEmbed()
                    .setColor(0x00AB29D4)
                    .addField(`Succesfully skipped the song!`, `:fast_forward:`)).then(m => m.delete(7000));
            } else {
                message.channel.sendEmbed(new Discord.RichEmbed()
                    .setColor(0x00AB29D4)
                    .addField(`Sorry!`, `There **${Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2) - guilds[message.guild.id].skipReq}** more skip requests needed!`));
            }
        } else {
            message.channel.sendEmbed(new Discord.RichEmbed()
                    .setColor(0x00AB29D4)
                    .addField(`:smile: Sorry`, `You already voted to skip!`)).then(m => m.delete(7000));
        }
    } else if (mess.startsWith(prefix + "queue")) {
        message.delete();
        var message2 = "```";
        for (var i = 0; i < guilds[message.guild.id].queueNames.length; i++) {
            var temp = (i + 1) + ": " + guilds[message.guild.id].queueNames[i] + (i === 0 ? "**(Current Song)**" : "") + "\n";
            if ((message2 + temp).length <= 2000 - 3) {
                message2 += temp;
            } else {
                message2 += "```";
                message.channel.send(message2).then(m => m.delete(20000));
                message2 = "```";
            }
        }
        message2 += "```";
        message.channel.send(message2).then(m => m.delete(20000));
    } else if (mess.startsWith(prefix + "mhelp")) {
        message.delete()
        message.channel.sendEmbed(new Discord.RichEmbed()
           .setColor(0x00AB29D4)
           .addField('= Command List = ', `${commands.join("\n")}`)).then(m => m.delete(10000));
    }

});



client.on('ready', function () {
    console.log('I am ready!');
    let login = ',play | U Music!'
  client.user.setGame(login, 'https://www.twitch.tv/roblox');
client.user.setStatus('online');
});

function skip_song(message) {
    guilds[message.guild.id].dispatcher.end();
    if (guilds[message.guild.id].queue.length > 1) {
        playMusic(guilds[message.guild.id].queue[0], message);
    } else {
        guilds[message.guild.id].skipReq = 0;
        guilds[message.guild.id].skippers = [];
    }
}

function playMusic(id, message) {
    guilds[message.guild.id].voiceChannel = message.member.voiceChannel;

    guilds[message.guild.id].voiceChannel.join().then(function (connection) {
        stream = ytdl("https://www.youtube.com/watch?v=" + id, {
            filter: 'audioonly'
        });
        guilds[message.guild.id].skipReq = 0;
        guilds[message.guild.id].skippers = [];

        guilds[message.guild.id].dispatcher = connection.playStream(stream);
        guilds[message.guild.id].dispatcher.on('end', function () {
            guilds[message.guild.id].skipReq = 0;
            guilds[message.guild.id].skippers = [];
            guilds[message.guild.id].queue.shift();
            guilds[message.guild.id].queueNames.shift();
            if (guilds[message.guild.id].queue.length === 0) {
                guilds[message.guild.id].queue = [];
                guilds[message.guild.id].queueNames = [];
                guilds[message.guild.id].isPlaying = false;
                guilds[message.guild.id].voiceChannel.leave();
            } else {
                setTimeout(function () {
                   playMusic(guilds[message.guild.id].queue[0], message);
                }, 500);
            }
        });
    });
}

function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYouTubeID(str));
    } else {
        search_video(str, function (id) {
            cb(id);
        });
    }
}

function add_to_queue(strID, message) {
    if (isYoutube(strID)) {
        guilds[message.guild.id].queue.push(getYouTubeID(strID));
    } else {
        guilds[message.guild.id].queue.push(strID);
    }
}

function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        if (!json.items[0]) callback("s3Q80mk7bxE");
        else {
            callback(json.items[0].id.videoId);
        }
    });
}

function isYoutube(str) {
    return str.toLowerCase().indexOf("youtube.com") > -1;
}
