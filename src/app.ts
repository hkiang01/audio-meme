import { client } from './client';
import { Routes } from 'discord-api-types/v9';
import {CLIENT_ID, DISCORD_BOT_TOKEN} from './constants';
import { REST } from '@discordjs/rest';

import { SlashCommandBuilder } from '@discordjs/builders';
import { play, record } from './record';
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
  );

const rest = new REST({version: '9'}).setToken(DISCORD_BOT_TOKEN);

client.on('interactionCreate', async interaction => {
  if (interaction.user.bot) return;
  if (!interaction.isCommand()) return;
  if (interaction.commandName !== 'audiomeme') return;
  if (!interaction.guild) {
    await interaction.reply('audiomeme only works in gu ild text channels');
    return;
  }

  switch (interaction.options.getSubcommand()) {
    case 'record':
      if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
        const name = interaction.options.getString("name");
        record(interaction.guild, interaction.member.voice.channel, interaction.user, name);
      } else {
        await interaction.reply({ephemeral: true, content: 'Join a voice channel and try again'});
        return;
      }
      await interaction.reply({ephemeral: true, content: 'recording'});
      break;
    case 'play':
      if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
        const name = interaction.options.getString("name");
        play(interaction.guild, interaction.member.voice.channel, name);
      } else {
        await interaction.reply({ephemeral: true, content: 'Join a voice channel and try again'});
        return;
      }
      break;
    default:
      await interaction.reply('Available subcommands: record, play');
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
