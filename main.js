var markovc = require("markov-chain-nlg");
var { REST } = require('@discordjs/rest');
var { Routes } = require('discord-api-types/v9');
var fs = require("fs");
var settings = JSON.parse(fs.readFileSync("settings.json").toString("utf8"));

var token = process.argv[2];
var clientid = process.argv[3];

var uptime = [0, 0, 0];

if(settings.print_token) console.log("token: %s", token);
if(settings.print_appid) console.log("app id: %s", clientid);

var rest = new REST({ version: '9' }).setToken(token);

if (!fs.existsSync("private.json")) {
  fs.writeFileSync("private.json", JSON.stringify({ guilds: [], bank: { ncoin: { value: 0, history: [] }, players: [] }, xp: { users: [], data: [] } }));
}
var libbank = require("./bank")

var sprivate = JSON.parse(fs.readFileSync("private.json").toString("utf8"));



var update_commands = () => {
  sprivate.guilds.forEach(function (g) {
    if (g !== "removed") {
      try {
        rest.put(Routes.applicationGuildCommands(clientid, g), { body: settings.commands });
      } catch (err) {
        console.error(err);
      }
    }
  });
}

update_commands();

var save_private = () => {
  fs.writeFileSync("private.json", JSON.stringify(sprivate));
}
var read_private = () => {
  sprivate = JSON.parse(fs.readFileSync("private.json").toString("utf8"))
}

markovc.trainTxt("input_result.txt", "\n");

var { Client, Intents, MessageEmbed } = require('discord.js');
var client = new Client({ intents: [Intents.FLAGS.GUILDS] });

var is_ready = false;

var make_bank_message = (message) => {
  return new MessageEmbed().setColor('#0099ff').addFields({ name: 'Банк', value: message }).setTimestamp()
}

setInterval(() => {
  if(is_ready){
    client.user.setStatus("dnd");
    var gen = markovc.generate(150);
    client.user.setActivity({name: (gen.length < 4) ? "Ошибка" : gen, type: "COMPETING"})
  }
}, 10 * 1000);

setInterval(() => {
  uptime[0]++;

  if(uptime[0] == 60) {
    uptime[0] = 0;
    uptime[1]++;
  }
  
  if(uptime[1] == 60){
    uptime[1] = 0;
    uptime[2]++;
  }
}, 1000);

client.on('ready', () => {
  is_ready = true;
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'hello') {
    await interaction.reply('hello world!');
  }

  if (interaction.commandName === "bank-info") {
    await interaction.reply({ embeds: [make_bank_message(`
    **Валюта:** <:membrane:931940593179979806> ${settings.bank.currency}
    **Цена NCoin:** \`${sprivate.bank.ncoin.value}\` ⬇️
    **Игроков в банке:** \`${sprivate.bank.players.length}\`
    **Последняя версия структуры аккаунтов:** **\`${settings.bank.version}\`**
    `)]});
  }

  if (interaction.commandName === "gen") {
    var gen = markovc.generate(300);
    await interaction.reply((gen.length < 4) ? "**Ошибка**" : gen, {ephemeral: true});
  }

  if (interaction.commandName === "xp") {
    var id = interaction.user.id;
    await interaction.reply("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {ephemeral: true});
  }
  if (interaction.commandName === "bank-createaccount") {
    var user = interaction.options.getUser('user');
    var nick = interaction.options.getString('nick');
    var name = interaction.options.getString('name');
    var id = Math.round(Math.random() * 8192);
    console.log(libbank.get_bank_account(user.id).player_object);
    if(libbank.get_bank_account(user.id).is_valid == false || libbank.get_bank_account(user.id).player_object[6] == false) {


      //0 - discord id
      //1 - mc nickname
      //2 - account name
      //3 - balance
      //4 - linked discord ids (only supports Professional account)
      //5 - placeholder
      //6 - is access denied?
      //7 - account type
      //8 - account version
      sprivate.bank.players.push([user.id, nick, name, 0, [`${id}`], null, true, "personal", settings.bank.version]);
      save_private();
      if(interaction.user.id == user.id){
        await interaction.reply({embeds: [make_bank_message(`**Ваш аккаунт был успешно создан!**\nID аккаунта: **\`${id}\`**`)]}); 
      } else {
        await interaction.reply({embeds: [make_bank_message(`**Аккаунт был успешно создан!**\nID аккаунта: **\`${id}\`**`)]});
      }
    } else {
      await interaction.reply({embeds: [make_bank_message(`Извините!\nДанный аккаунт **уже был создан!**`)]});
    }
  }
  if (interaction.commandName === "bank-changestatus") {
    var id = interaction.options.getString('id');
    var status = interaction.options.getString('status');
    
    if(libbank.get_bank_account(id, 1).is_valid == false){
      interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]});
    } else {
      sprivate.bank.players[libbank.get_bank_account(id, 1).counter][7] = status;
      save_private();
      interaction.reply({embeds: [make_bank_message(`**Статус аккаунта был успешно изменён!**`)]});
    }
  }
  if(interaction.commandName === "bank-migrateaccount") {
    var user = interaction.user;

    if(libbank.get_bank_account(user.id, 0).is_valid == false){
      interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]});
    } else {
      switch(sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8]){
        case settings.bank.version: {
          interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **уже был мигрирован**`)]})
          break;
        }
        case "0.1": {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][4].unshift({bid: sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5], did: user.id});
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5] = null;
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.2";
          save_private();
          interaction.reply({embeds: [make_bank_message(`**Аккаунт был успешно мигрирован на 0.2!**`)]});
          break;
        }
        default: {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5] = `${sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5]}`;
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.1";
          save_private();
          interaction.reply({embeds: [make_bank_message(`**Аккаунт был успешно мигрирован на 0.1!**`)]});
          break;
        }
      }
    }
  }
  if (interaction.commandName === "bank-getaccount") {
    var user = interaction.options.getUser("user", false);
    if(user == null) user = interaction.user;
    console.log(user.id);
    if(libbank.get_bank_account(user.id).is_valid == true && libbank.get_bank_account(user.id).player_object[6] == true){
      var b = libbank.get_bank_account(user.id);
      interaction.reply({embeds: [make_bank_message(`
        ID аккаунта: **\`${b.player_object[5] == null ? b.player_object[4][0].bid : b.player_object[5]}\`**
        Название аккаунта: **\`${b.player_object[2]}\`**
        Тип аккаунта: **${(b.player_object[7] === "personal") ? "Персональный" : "Профессиональный"}**
        Никнейм владельца: **\`${b.player_object[1]}\`**
        Владелец: **<@${b.player_object[0]}>**
        Баланс: **${b.player_object[3]}** <:membrane:931940593179979806> ${settings.bank.currency}
        Соединённых аккаунтов: **${(b.player_object[4].length - 1 < 0 ? 0 : b.player_object[4].length - 1)}**

        Версия структуры аккаунта: **\`${(b.player_object[8] === undefined || b.player_object[8] === null) ? "Не мигрирован" : b.player_object[8]}\`**
      `)]});
    } else {
      interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]})
    }
  }
  if (interaction.commandName === "bank-changebalance") {
    var id1 = interaction.user.id;
    var id2 = interaction.options.getString("id2rem", true);
    var action = interaction.options.getString("action", true);
    var value = interaction.options.getInteger("value", true);

    if(value < 0) value = 0;
    
    if(libbank.get_bank_account(id1, 0).is_valid == false){
      interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]})
    } else {
      id1 = libbank.get_bank_account(interaction.user.id, 0).player_object[4][0].bid;
      switch(action){
        case "set": {
          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] = value;
          await interaction.reply({embeds: [make_bank_message(`**Успешно установлено** ${value} <:membrane:931940593179979806> ${settings.bank.currency} аккаунту **\`${id1}\`**!`)]});
          sprivate.bank.ncoin.value += Math.floor(value % 64 / 5);
          sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
          break;
        }
        case "add": {
          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] += value;
          await interaction.reply({embeds: [make_bank_message(`**Успешно зачислены** ${value} <:membrane:931940593179979806> ${settings.bank.currency} аккаунту **\`${id1}\`**!`)]});
          sprivate.bank.ncoin.value += Math.floor(value % 64 / 5);
          sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
          break;
        }
        case "remove": {
          //check access to id2 and id1
          if(libbank.get_bank_account(id2, 1).is_valid == false) {
            interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]})
          } else {
            if(libbank.check_access(id1, 1, id2, interaction.user.id) == 0){
              sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] -= value;
              sprivate.bank.players[libbank.get_bank_account(id2, 1).counter][3] += value;
              sprivate.bank.ncoin.value -= (sprivate.bank.ncoin.value == 0 || sprivate.bank.ncoin.value < 0) ? -(1) : Math.round(value % 64 / 5);
              sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
              await interaction.reply({embeds: [make_bank_message(`**Успешно вычислены** ${value} <:membrane:931940593179979806> ${settings.bank.currency} аккаунту **\`${id1}\`** и добавлены аккаунту **\`${id2}\`**!`)]});
            } else {
              interaction.reply({embeds: [make_bank_message(`Извините!\nУ Вас **нет доступа к запрошенному аккаунту!**`)]})
            }
          }
        }
      }
    }
    save_private();
  }
  if (interaction.commandName === "bank-addtimer") {
    await interaction.reply("WIP");
  }
  if (interaction.commandName === "bank-deleteaccount") {
    if(libbank.remove_bank_account(interaction.user.id) == -1){
      await interaction.reply({embeds: [make_bank_message(`Извините!\nДанный аккаунт **не существует!**`)]});
    } else {
      await interaction.reply({embeds: [make_bank_message(`
        **Аккаунт был успешно удалён!**
        `)]});
    }
  }
});
client.on("guildCreate", async (guild) => {
  sprivate.guilds.push(guild.id);
  fs.writeFileSync("private.json", JSON.stringify(sprivate));
  update_commands();
});
client.on("guildDelete", async (guild) => {
  var i = 0;
  sprivate.guilds.forEach(function (g) {
    if (g == guild.id) sprivate.guilds[i] = "removed";
    i++
  });
  fs.writeFileSync("private.json", JSON.stringify(sprivate));
});

client.login(token);
