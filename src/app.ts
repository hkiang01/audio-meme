import { client } from './client';
import { Routes } from 'discord-api-types/v9';
import {CLIENT_ID, DISCORD_BOT_TOKEN} from './constants';
import { REST } from '@discordjs/rest';

import { SlashCommandBuilder } from '@discordjs/builders';
import { record } from './record';
import { GuildMember } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';


const slashCommand = new SlashCommandBuilder()
  .setName("audiomeme")
  .setDescription("cuz why not?")
  .addSubcommand(subcommand => 
    subcommand
    .setName("record")
    .setDescription("Record an audio meme")
    .addIntegerOption(option => 
      option
      .setName("durationseconds")
      .setDescription("How long in seconds to record the meme")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(30)
    )
);

const rest = new REST({version: '9'}).setToken(DISCORD_BOT_TOKEN);

client.on('interactionCreate', async interaction => {
  if (interaction.user.bot) return;
  if (!interaction.isCommand()) return;
  if (interaction.commandName !== 'audiomeme') return;
  if (!interaction.guild) {
    await interaction.reply('audiomeme only works in guild text channels');
    return;
  }

  switch (interaction.options.getSubcommand()) {
    case 'record':
      if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
        console.log('recording');
        const duration = interaction.options.getInteger("durationseconds") * 1000;
        const connection = joinVoiceChannel({
          channelId: interaction.member.voice.channel.id,
          guildId: interaction.guild.id,
          selfDeaf: false,
          selfMute: true,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        })
        record(interaction, connection, duration);
      } else {
        await interaction.reply('Join a voice channel and try again');
        return;
      }
      await interaction.reply({ephemeral: true, content: 'recording'});
      break;
    default:
      await interaction.reply('Available subcommands: record');
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
