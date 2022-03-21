import { client } from './client';
import { Routes } from 'discord-api-types/v9';
import {CLIENT_ID, DISCORD_BOT_TOKEN} from './constants';
import { REST } from '@discordjs/rest';

import { SlashCommandBuilder } from '@discordjs/builders';
import { deleteMeme, exists, pickRandom, play, record } from './audio';
import { GuildMember } from 'discord.js';


const slashCommand = new SlashCommandBuilder()
  .setName("audiomeme")
  .setDescription("cuz why not?")
  .addSubcommand(subcommand => 
    subcommand
    .setName("record")
    .setDescription("Record an audio meme")
    .addStringOption(option =>
      option
      .setName("name")
      .setDescription("What to name the saved audio meme, used for retrieval")
      .setRequired(true)
    )
  ).addSubcommand(subCommand =>
    subCommand
    .setName("play")
    .setDescription("Play an audio meme")
    .addStringOption(option =>
      option
      .setName("name")
      .setDescription("What the saved audio meme was named")
      .setRequired(true)
    )
  ).addSubcommand(subCommand =>
   subCommand
   .setName("delete")
   .setDescription("Delete an audio meme")
   .addStringOption(option =>
    option
    .setName("name")
    .setDescription("The audio meme to delete")
    .setRequired(true)
    )
  ).addSubcommand(subCommand =>
    subCommand
    .setName("random")
    .setDescription("Play a random audio meme")
  );

const rest = new REST({version: '9'}).setToken(DISCORD_BOT_TOKEN);

client.on('interactionCreate', async interaction => {
  if (interaction.user.bot) return;
  if (!interaction.isCommand()) return;
  if (interaction.commandName !== 'audiomeme') return;
  if (!interaction.guild) {
    await interaction.reply({ephemeral: true, content: 'audiomeme only works in guild text channels'});
    return;
  }
  if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
    await interaction.reply({ephemeral: true, content: 'Join a voice channel and try again'});
    return;
  }
  const guildMember: GuildMember = interaction.member;

  let name: string = undefined;
  let err: NodeJS.ErrnoException = undefined;
  let memeExists: boolean = undefined;
  switch (interaction.options.getSubcommand()) {
    case 'record':
      name = interaction.options.getString("name");
      await interaction.reply(`🔴 recording ${name} from ${interaction.user.username}'s mic`);
      err = await record(interaction.guild, guildMember.voice.channel, interaction.user, name);
      if (err) {
        await interaction.followUp(`❌ Error recording file ${name} - ${err.message}`);
      }
      break;
    case 'play':
      name = interaction.options.getString("name");
      memeExists = !await exists(interaction.guild, name)
      if (memeExists) {
        await interaction.reply(`❌ ${name} not found`);
        break;
      }
      await interaction.reply(`▶ playing ${name}`);
      err = await play(interaction.guild, guildMember.voice.channel, name);
      if (err) {
        await interaction.followUp(`❌ Error playing ${name} - ${err.message}`);
      }
      break;
    case 'random':
      pickRandom(interaction.guild).then( async ([name, err]) => {
        if (err) {
          await interaction.followUp(`❌ Error picking random meme - ${err.message}`);
        }
        await interaction.reply(`▶ playing ${name}`);
        err = await play(interaction.guild, guildMember.voice.channel, name);
        if (err) {
          await interaction.followUp(`❌ Error playing ${name} - ${err.message}`);
        }
      })
      break;
    case 'delete':
      name = interaction.options.getString("name");
      deleteMeme(interaction.guild, name).then(async (err) => {
        if (err) {
          await interaction.followUp(`❌ Error deleting meme - ${err.message}`);
        }
        await interaction.reply(`🗑️ deleted ${name}`)
      });
      break;
    default:
      await interaction.reply({ephemeral: true, content: 'Available subcommands: record, play, delete, random'});
      break;
  }
  return;
});

(async() => {
  try {

    // register commands
    await rest.post(
      Routes.applicationCommands(CLIENT_ID), {body: slashCommand}
    );
    console.log(`Successfully registered /${slashCommand.name} commands.`);
  } catch (error) {
    console.error(error);
  }
})();

// log when bot is ready
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(DISCORD_BOT_TOKEN);
