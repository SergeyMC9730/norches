console.log("Norches Bot have crashed");

var dsc = require("discord.js");
var token = process.argv[2];
var clientid = process.argv[3];
var cln = new dsc.Client({intents: [dsc.Intents.FLAGS.GUILDS, dsc.Intents.FLAGS.GUILD_MESSAGES]});
cln.login(token);
cln.on("ready", () => {
    cln.user.setStatus("idle");
    cln.user.setActivity({
        name: "Norches Bot have crashed",
        type: "WATCHING"
    });
});