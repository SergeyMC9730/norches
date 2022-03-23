try {
    var m = require("./main");
} catch (e){
    console.log(`${m.getTraslatedString("norches.crash", "en", [])} ${e}`);
    if(m.settings.backup_bot) {
        onsole.log(m.getTraslatedString("norches.backup", "ru", []));

        var dsc = require("discord.js");
        var cln = new dsc.Client({intents: [Intents.FLAGS.GUILDS, djs.Intents.FLAGS.GUILD_MESSAGES]});
        cln.login(m.token);
        cln.on("ready", () => {
            cln.user.setStatus("idle");
            cln.user.setActivity({
                name: "Norches Bot have crashed",
                type: "WATCHING"
            })
        })
    }
}